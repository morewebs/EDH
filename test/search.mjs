import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zstdCompressSync } from 'node:zlib'
import {
  apply,
  boundaryIndex,
  clampText,
  compareHits,
  createSearch,
  createSearchStore,
  DEFAULT_LIMIT,
  emptyIndex,
  indexableMessage,
  inject,
  isSafeKey,
  limitOf,
  locateMatch,
  MAX_CANDIDATES,
  MAX_LIMIT,
  MAX_OFFSET,
  MAX_QUERY,
  MAX_SESSION_ID,
  MAX_TEXT,
  MIN_QUERY,
  name,
  normalizeIndex,
  normalizeQuery,
  normalizeSessionRecord,
  parseSearchQuery,
  queryOf,
  rankOf,
  resolveSearchStorePath,
  searchIndex,
  searchResponse,
  SEARCH_PATH,
  snippetOf,
  textOfBlocks,
  titleOf,
} from '../search.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

/** Throwaway directories, removed however this suite ends. */
const fixtures = []

function makeTempDir() {
  const dir = mkdtempSync(join(tmpdir(), 'edh-search-'))
  fixtures.push(dir)
  return dir
}

process.on('exit', () => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// Fixtures: real Zstandard frames, one per append, exactly like the artifact
// ---------------------------------------------------------------------------

/** One artifact: each batch becomes one frame, as the writer appends one per batch. */
function artifactOf(batches) {
  return Buffer.concat(
    batches.map(batch => zstdCompressSync(Buffer.from(`${batch.map(event => JSON.stringify(event)).join('\n')}\n`))),
  )
}

const human = (seq, text, time = 1_000 + seq) => ({
  type: 'user/message',
  seq,
  time,
  data: { role: 'user', source: { kind: 'user' }, content: [{ type: 'text', text }] },
})
const approval = (seq, text) => ({
  type: 'user/message',
  seq,
  time: 1_000 + seq,
  data: { role: 'user', source: { kind: 'user-approval' }, content: [{ type: 'text', text }] },
})
const noise = (seq, text, kind = 'runtime-context') => ({
  type: 'user/message',
  seq,
  time: 1_000 + seq,
  data: { role: 'user', source: { kind }, content: [{ type: 'text', text }] },
})
const assistant = (seq, text, time = 1_000 + seq) => ({
  type: 'assistant/message',
  seq,
  time,
  data: { message: { role: 'assistant', content: [{ type: 'text', text }, { type: 'tool-call', name: 'bash' }] } },
})
const toolOnly = seq => ({
  type: 'assistant/message',
  seq,
  time: 1_000 + seq,
  data: { message: { role: 'assistant', content: [{ type: 'tool-call', name: 'bash' }] } },
})
const titled = (seq, value) => ({ type: 'session/title', seq, time: 1_000 + seq, data: { title: value } })

/** A stand-in artifact file: the test can grow it, and every read is recorded. */
function artifact(buffer) {
  const reads = []
  let bytes = buffer
  return {
    reads,
    grow(next) {
      bytes = next
    },
    // The same contract as `readLogTail`: a saved offset past the end of a file
    // that shrank is not usable, so the read starts at zero instead.
    read(path, from) {
      reads.push({ path, from })
      const start = Number.isSafeInteger(from) && from <= bytes.length ? from : 0
      return { buffer: bytes.subarray(start), from: start, size: bytes.length }
    },
    get size() {
      return bytes.length
    },
  }
}

/** A stand-in for `ctx.sessionPersistence`: headers, and the backend's own locate hook. */
function persistenceFor(entries) {
  const calls = { list: 0, locate: [] }
  const byId = new Map(entries.map(entry => [entry.id, entry.path]))
  return {
    calls,
    persistence: {
      async list() {
        calls.list += 1
        return entries.map(entry => ({ header: { id: entry.id, cwd: entry.cwd } }))
      },
      locate(meta) {
        calls.locate.push(meta)
        const path = byId.get(meta?.id)
        return typeof path === 'string' ? { kind: 'jsonl', path } : { kind: 'jsonl' }
      },
    },
  }
}

/** An in-memory store, so an indexer test never touches a file. */
function memoryStore() {
  const writes = []
  let document
  return {
    path: 'C:\\profile\\.edh\\search.json',
    writes,
    store: {
      path: 'C:\\profile\\.edh\\search.json',
      read() {
        return document === undefined ? { index: emptyIndex() } : { index: normalizeIndex(document) }
      },
      write(index) {
        writes.push(index.sessions.size)
        document = { version: 1, builtAt: index.builtAt, sessions: Object.fromEntries(index.sessions) }
        return { ok: true }
      },
    },
    get document() {
      return document
    },
  }
}

/** An indexer whose ticks are pumped by the test, one step at a time. */
function makeIndexer(options = {}) {
  const pending = []
  const search = createSearch({
    schedule: run => {
      pending.push(run)
      return { clear: () => {} }
    },
    sessionsPerTick: 2,
    passIntervalMs: 60_000,
    saveIntervalMs: 0,
    ...options,
  })
  const pump = async (limit = 400) => {
    let steps = 0
    while (pending.length > 0 && steps < limit) {
      if (search.indexed().ready === true && options.pumpPastReady !== true) break
      const run = pending.shift()
      await run()
      steps += 1
    }
    return steps
  }
  return { search, pending, pump }
}

/** One index map for the query-engine tests. */
function indexOf(sessions) {
  const map = new Map()
  for (const [id, messages] of sessions) {
    map.set(id, {
      title: `${id} title`,
      offset: 10,
      size: 10,
      lastSeq: 99,
      messages: messages.map((message, position) => ({
        seq: message.seq ?? position + 1,
        time: message.time ?? 1_000 + position,
        role: message.role ?? 'assistant',
        text: message.text,
      })),
    })
  }
  return { version: 1, builtAt: 0, sessions: map }
}

// ---------------------------------------------------------------------------
// 1 — the store round-trips, and a corrupt one is a rebuild rather than a crash
// ---------------------------------------------------------------------------
{
  assert.equal(name, 'edh-search')
  assert.deepEqual(inject, ['connection'], 'the route needs the Host connection')
  assert.equal(SEARCH_PATH, '/api/edh.search')

  const dir = makeTempDir()
  const path = join(dir, 'search.json')
  assert.equal(resolveSearchStorePath({ DSH_PROFILE_DIR: dir }), join(dir, '.edh', 'search.json'))

  const store = createSearchStore(path)
  assert.deepEqual(store.read().index.sessions.size, 0, 'a missing file is an empty index')

  const index = emptyIndex()
  index.sessions.set('session-a', {
    title: 'A title',
    offset: 120,
    size: 120,
    lastSeq: 7,
    messages: [{ seq: 5, time: 1_700, role: 'user', text: 'hello there' }],
  })
  assert.deepEqual(store.write(index), { ok: true })
  const reread = store.read()
  assert.equal(reread.index.sessions.size, 1)
  assert.deepEqual(reread.index.sessions.get('session-a'), {
    title: 'A title',
    offset: 120,
    size: 120,
    lastSeq: 7,
    messages: [{ seq: 5, time: 1_700, role: 'user', text: 'hello there' }],
  }, 'the index round-trips through the file')
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).version, 1)

  // A corrupt file is an empty index plus an error, never a throw.
  writeFileSync(path, '{ not json', 'utf8')
  const corrupt = store.read()
  assert.equal(corrupt.index.sessions.size, 0)
  assert.match(corrupt.error, /not valid JSON/u)

  // A file from another version is ignored rather than half-read.
  writeFileSync(path, JSON.stringify({ version: 99, sessions: { x: {} } }), 'utf8')
  const foreign = store.read()
  assert.equal(foreign.index.sessions.size, 0)
  assert.match(foreign.error, /another version/u)

  // Normalisation refuses what a hand edit could smuggle in.
  assert.equal(normalizeSessionRecord('nope'), undefined)
  assert.equal(normalizeSessionRecord({ messages: 'nope' }).messages.length, 0)
  const weird = normalizeSessionRecord({
    title: 42,
    offset: -5,
    size: 'big',
    lastSeq: 1.5,
    messages: [
      { seq: 2, time: 1, role: 'wizard', text: 'kept' },
      { seq: 1, time: 1, role: 'user', text: '  ' },
      { seq: 'x', text: 'dropped' },
      'nope',
    ],
  })
  assert.deepEqual(weird, {
    title: '',
    offset: 0,
    size: 0,
    lastSeq: 0,
    messages: [{ seq: 2, time: 1, role: 'assistant', text: 'kept' }],
  }, 'every field is defaulted, every message re-clamped')
  const tooMany = normalizeSessionRecord({
    messages: Array.from({ length: 350 }, (_, position) => ({ seq: position + 1, text: 'x' })),
  })
  assert.equal(tooMany.messages.length <= 300, true, 'the per-Session cap holds on load too')
  assert.equal(tooMany.messages.at(-1).seq, 350, 'and the newest survive')

  assert.deepEqual(normalizeIndex({ version: 1, sessions: { a: { messages: [] } } }).sessions.size, 1)
  assert.deepEqual(normalizeIndex({ version: 2, sessions: { a: { messages: [] } } }).sessions.size, 0)
  assert.deepEqual(resolveSearchStorePath({ DSH_HOME: 'C:\\h', DSH_PROFILE: 'p' }), join('C:\\h', 'profiles', 'p', '.edh', 'search.json'))
}

// ---------------------------------------------------------------------------
// 2 — what is worth indexing, and the noise rule
// ---------------------------------------------------------------------------
{
  // A human user message and a tool approval count; the runtime context, the
  // agent instructions and the skill catalog do not.
  assert.deepEqual(indexableMessage(human(5, 'please fix the proxy')), {
    seq: 5,
    time: 1_005,
    role: 'user',
    text: 'please fix the proxy',
  })
  assert.equal(indexableMessage(approval(6, 'yes, go ahead')).role, 'user')
  for (const kind of ['runtime-context', 'agent-instructions', 'skill-catalog', 'time-context', 'agent-message', 'compaction']) {
    assert.equal(indexableMessage(noise(7, 'You are a helpful agent.', kind)), undefined, `${kind} is noise, not a message`)
  }
  assert.equal(indexableMessage(noise(7, 'no source at all', undefined)), undefined, 'a message with no source at all is noise')

  // An assistant message is its text blocks, joined; tool calls are dropped.
  assert.deepEqual(indexableMessage(assistant(8, 'here is the answer')), {
    seq: 8,
    time: 1_008,
    role: 'assistant',
    text: 'here is the answer',
  })
  assert.equal(indexableMessage(toolOnly(9)), undefined, 'a tool-only message has no prose')
  assert.equal(
    indexableMessage({
      type: 'assistant/message',
      seq: 10,
      time: 1,
      data: { message: { content: [{ type: 'text', text: 'a' }, { type: 'text', text: 'b' }, { type: 'tool-call' }] } },
    }).text,
    'a b',
    'text blocks are joined',
  )
  assert.equal(indexableMessage({ type: 'assistant/message', seq: 11, data: {} }), undefined)
  assert.equal(indexableMessage({ type: 'assistant/message' }), undefined, 'no seq, nothing to key on')

  // A replacement is skipped: the palette must not offer text the conversation no
  // longer shows.
  assert.equal(
    indexableMessage({ ...assistant(12, 'replaced summary'), surfaceOp: { op: 'replace' } }),
    undefined,
  )

  // Whitespace collapses at index time, so a phrase written across a newline is
  // searchable with a space and `matched` is a single line.
  assert.equal(clampText('line one\n\nline two\tend'), 'line one line two end')
  assert.equal(clampText(`  ${'x'.repeat(MAX_TEXT + 100)}  `).length, MAX_TEXT, 'the text cap is exact')
  assert.equal(textOfBlocks([{ type: 'text', text: 'a\nb' }]), 'a b')
  assert.equal(textOfBlocks([]), undefined)
  assert.equal(textOfBlocks('plain'), 'plain')
  assert.equal(textOfBlocks([{ type: 'tool-call' }]), undefined)

  // Titles come from the newest `session/title` event.
  assert.equal(titleOf(titled(3, '  Refactor the proxy  ')), 'Refactor the proxy')
  assert.equal(titleOf(titled(3, '   ')), undefined)
  assert.equal(titleOf(human(4, 'x')), undefined)
}

// ---------------------------------------------------------------------------
// 3 — the indexer: a full build, then only the appended bytes
// ---------------------------------------------------------------------------
{
  const first = artifactOf([
    [titled(1, 'First session'), human(2, 'the alpha question'), noise(3, 'runtime context noise', 'runtime-context')],
    [assistant(4, 'the alpha answer')],
  ])
  const file = artifact(first)
  const { persistence, calls } = persistenceFor([{ id: 'session-a', cwd: 'C:\\work', path: 'C:\\logs\\a.zstd' }])
  const memory = memoryStore()
  const { search, pump } = makeIndexer({
    store: memory.store,
    persistence,
    readLog: file.read,
  })

  search.start()
  await pump()

  const indexed = search.indexed()
  assert.deepEqual(indexed, { sessions: 1, total: 1, ready: true }, 'one Session, fully indexed')
  assert.equal(calls.locate.length, 1)
  assert.deepEqual(calls.locate[0], { id: 'session-a', cwd: 'C:\\work' }, 'locate gets the header, never a request value')
  assert.equal(file.reads.length, 1)
  assert.equal(file.reads[0].path, 'C:\\logs\\a.zstd', 'the path is exactly what locate returned')
  assert.equal(file.reads[0].from, 0, 'a first pass starts at zero')

  const found = search.search('alpha', 10)
  assert.equal(found.results.length, 2, 'both messages are searchable')
  assert.equal(found.results.some(message => message.snippet.includes('noise')), false, 'the runtime context was not indexed')
  assert.equal(found.results[0].role, 'assistant')
  assert.equal(found.results[0].sessionTitle, 'First session')
  assert.equal(found.results[0].sessionId, 'session-a')

  // One more append: only the new frame is read, and nothing is indexed twice.
  const grown = Buffer.concat([first, artifactOf([[human(5, 'a second alpha question')]])])
  file.grow(grown)
  search.refresh()
  await pump()
  assert.equal(file.reads.length, 2)
  assert.equal(file.reads[1].from, first.length, 'the delta starts at the saved frame boundary')
  assert.equal(search.search('alpha', 10).results.length, 3, 'exactly one new message')
  assert.equal(search.indexed().ready, true)

  // Nothing appended: a pass reads the tail, finds no bytes, and stays ready
  // without re-indexing anything.
  search.refresh()
  await pump()
  assert.equal(file.reads[2].from, grown.length)
  assert.equal(search.search('alpha', 10).results.length, 3)

  // A torn append: the offset stays on the last complete frame and `ready` is
  // honest about it, then the finished frame is picked up once.
  const whole = artifactOf([[assistant(6, 'a torn alpha tail')]])
  const torn = Buffer.concat([grown, whole.subarray(0, whole.length - 5)])
  file.grow(torn)
  search.refresh()
  await pump()
  assert.equal(search.indexed().ready, false, 'a torn append is not indexed yet')
  assert.equal(search.search('alpha', 10).results.length, 3, 'and nothing half-written was indexed')
  file.grow(Buffer.concat([grown, whole]))
  search.refresh()
  await pump()
  assert.equal(search.indexed().ready, true)
  assert.equal(search.search('torn', 10).results.length, 1, 'the completed frame is indexed exactly once')

  // The artifact shrank underneath us: that Session starts again, cleanly.
  const smaller = artifactOf([[titled(1, 'Replaced'), human(2, 'a fresh alpha start')]])
  file.grow(smaller)
  search.refresh()
  await pump()
  const afterShrink = search.search('alpha', 10)
  assert.equal(afterShrink.results.length, 1, 'no duplicates from the previous generation')
  assert.equal(afterShrink.results[0].snippet.includes('fresh'), true)
  assert.equal(search.search('answer', 10).results.length, 0, 'the old text is gone with the log')

  search.dispose()
}

// ---------------------------------------------------------------------------
// 4 — a live event is folded only when its Session is caught up
// ---------------------------------------------------------------------------
{
  const file = artifact(artifactOf([[human(2, 'first words')]]))
  const { persistence } = persistenceFor([{ id: 'session-a', cwd: 'C:\\work', path: 'C:\\logs\\a.zstd' }])
  const { search, pump } = makeIndexer({ store: memoryStore().store, persistence, readLog: file.read })
  search.start()
  await pump()
  assert.equal(search.indexed().ready, true)

  // Caught up: the event itself is folded, with no second read of the log.
  const reads = file.reads.length
  assert.equal(search.nudge({ id: 'session-a' }, human(3, 'live folded words')), true)
  assert.equal(file.reads.length, reads, 'a live fold does not read the log')
  assert.equal(search.search('folded', 10).results.length, 1)
  assert.equal(search.search('folded', 10).results[0].seq, 3)

  // The same event twice is folded once: `seq` is the watermark.
  assert.equal(search.nudge({ id: 'session-a' }, human(3, 'live folded words')), false)
  assert.equal(search.search('folded', 10).results.length, 1)

  // A newer title lands live too.
  assert.equal(search.nudge({ id: 'session-a' }, titled(4, 'Live title')), true)
  assert.equal(search.search('words', 10).results[0].sessionTitle, 'Live title')

  // A Session that no pass has folded is not folded from an event — its earlier
  // `seq`s are missing — so a pass is scheduled instead.
  const pendingBefore = undefined
  assert.equal(search.nudge({ id: 'unknown-session' }, human(1, 'never folded')), false)
  assert.equal(search.search('never', 10).results.length, 0)
  await pump()
  assert.equal(pendingBefore, undefined)

  search.dispose()
}

// ---------------------------------------------------------------------------
// 5 — the query engine: word boundaries, ranking, recency, limits
// ---------------------------------------------------------------------------
{
  // Case-insensitive, and words beat substrings.
  assert.equal(rankOf('Run the TEST now', 'test', ['test']), 0)
  assert.equal(rankOf('the latest build', 'test', ['test']), 1, 'a mid-word hit still matches, one rank lower')
  assert.equal(rankOf('nothing here', 'test', ['test']), -1)
  assert.equal(boundaryIndex('latest test', 'test'), 7)
  assert.equal(boundaryIndex('testing', 'test'), -1)
  assert.equal(boundaryIndex('a_test_case', 'test'), -1, 'underscores are word characters')

  // The phrase beats every word present, which beats one word.
  assert.equal(rankOf('the session log is here', 'session log', ['session', 'log']), 0, 'the phrase as words')
  assert.equal(rankOf('log of the session', 'session log', ['session', 'log']), 1, 'all words, not adjacent')
  assert.equal(rankOf('only the session', 'session log', ['session', 'log']), 2, 'one word, as a word')
  assert.equal(rankOf('sessions only', 'session log', ['session', 'log']), 3, 'one word, inside another')

  // Ranking order and the recency tie-break, through the index.
  const index = indexOf([
    ['session-a', [{ text: 'the session log is here', time: 100 }, { text: 'log of the session', time: 200 }]],
    ['session-b', [{ text: 'only the session', time: 50 }]],
  ])
  const ranked = searchIndex(index, 'session log', { limit: 10 })
  assert.deepEqual(
    ranked.results.map(message => message.snippet),
    ['the session log is here', 'log of the session', 'only the session'],
    'phrase first, then all words, then one word',
  )
  const byRecency = searchIndex(
    indexOf([
      ['session-a', [{ text: 'same words', time: 100 }]],
      ['session-b', [{ text: 'same words', time: 900 }]],
    ]),
    'same words',
    { limit: 10 },
  )
  assert.deepEqual(byRecency.results.map(message => message.sessionId), ['session-b', 'session-a'], 'a tie is broken by recency')

  // Paging: `total` is the real number of matches, and the page is a slice of it.
  const many = indexOf([['session-a', Array.from({ length: 30 }, (_, position) => ({ text: `alpha ${position}`, seq: position + 1 }))]])
  const two = searchIndex(many, 'alpha', { limit: 2 })
  assert.equal(two.results.length, 2)
  assert.equal(two.total, 30, 'total counts every match, before paging')
  assert.equal(two.truncated, false, 'the scan finished, so the total is final')
  const all = searchIndex(many, 'alpha', { limit: 100 })
  assert.equal(all.results.length, 30)
  assert.equal(all.total, 30)
  assert.equal(all.truncated, false)
  assert.equal(searchIndex(many, 'alpha', {}).results.length, DEFAULT_LIMIT, 'the default limit applies')

  // The candidate cap: a query that matches everything stops scanning, so `total`
  // is a lower bound and `truncated` says so.
  const huge = indexOf([
    ['session-a', Array.from({ length: 5200 }, (_, position) => ({ text: `filler number ${position}`, seq: position + 1 }))],
  ])
  const capped = searchIndex(huge, 'filler', { limit: 100 })
  assert.equal(capped.results.length, 100)
  assert.equal(capped.total, MAX_CANDIDATES, 'the count found so far')
  assert.equal(capped.truncated, true, 'the scan cap is reported')

  // An empty index and a nonsense query are quiet.
  assert.deepEqual(searchIndex(emptyIndex(), 'anything', { limit: 5 }), { results: [], total: 0, truncated: false })
  assert.equal(normalizeQuery('  a  '), undefined, 'one character is too short')
  assert.equal(normalizeQuery(''), undefined)
  assert.equal(normalizeQuery('  hello   world  '), 'hello world', 'whitespace is collapsed')
  assert.equal(normalizeQuery('x'.repeat(MAX_QUERY + 50)).length, MAX_QUERY)
  assert.equal(MIN_QUERY, 2)
}

// ---------------------------------------------------------------------------
// 6 — snippets: context on both sides, the exact matched text, ellipses
// ---------------------------------------------------------------------------
{
  const text = `${'a'.repeat(120)} needle ${'b'.repeat(120)}`
  const middle = locateMatch(text, 'needle', ['needle'])
  assert.equal(text.slice(middle.index, middle.index + middle.length), 'needle')
  const middleSnippet = snippetOf(text, middle)
  assert.equal(middleSnippet.matched, 'needle')
  assert.equal(middleSnippet.snippet.startsWith('…'), true, 'cut on the left')
  assert.equal(middleSnippet.snippet.endsWith('…'), true, 'cut on the right')
  assert.equal(middleSnippet.snippet.includes('needle'), true)

  const atStart = snippetOf('needle then a long tail of words here', locateMatch('needle then a long tail of words here', 'needle', ['needle']))
  assert.equal(atStart.snippet.startsWith('…'), false, 'no ellipsis when the start is the start')
  assert.equal(atStart.snippet.startsWith('needle'), true)

  const atEnd = snippetOf('a long head of words then needle', locateMatch('a long head of words then needle', 'needle', ['needle']))
  assert.equal(atEnd.snippet.endsWith('…'), false, 'no ellipsis when the end is the end')
  assert.equal(atEnd.snippet.endsWith('needle'), true)

  // A match spanning what was a newline: the index collapsed it, so the phrase is
  // found with a space and `matched` appears in the snippet verbatim.
  const collapsed = clampText('the first line\nsecond line')
  const spanning = locateMatch(collapsed, 'line second', ['line', 'second'])
  const spanningSnippet = snippetOf(collapsed, spanning)
  assert.equal(spanningSnippet.matched, 'line second')
  assert.equal(spanningSnippet.snippet.includes(spanningSnippet.matched), true, 'matched is inside the snippet, so a highlight cannot miss')
  assert.equal(spanningSnippet.snippet.includes('\n'), false, 'and the snippet is one line')

  // The matched text keeps the document's case.
  const cased = snippetOf('Run the TEST now', locateMatch('Run the TEST now', 'test', ['test']))
  assert.equal(cased.matched, 'TEST')
  assert.equal(snippetOf('short', { index: 0, length: 0 }).snippet, 'short')
  assert.equal(snippetOf('', { index: 0, length: 0 }).matched, '')
}

// ---------------------------------------------------------------------------
// 7 — the route: query strings, the matrix of refusals, and the answer shape
// ---------------------------------------------------------------------------
{
  const fakeSearch = {
    seen: [],
    search(query, options) {
      fakeSearch.seen.push({ query, options })
      const results = [
        { sessionId: 'session-a', sessionTitle: 'T', seq: 3, time: 9, role: 'user', snippet: '…x…', matched: 'x' },
        { sessionId: 'session-a', sessionTitle: 'T', seq: 1, time: 8, role: 'assistant', snippet: '…y…', matched: 'y' },
      ]
      const offset = options?.offset ?? 0
      return { results: results.slice(offset, offset + (options?.limit ?? DEFAULT_LIMIT)), total: 2, truncated: false }
    },
    indexed: () => ({ sessions: 4, total: 7, ready: false }),
    available: () => true,
    knows: id => id === 'session-a',
  }
  const answer = async (url, method = 'GET', search = fakeSearch) => {
    const response = searchResponse({ method, url }, { search })
    return { status: response.status, body: await response.json() }
  }

  const found = await answer('/api/edh.search?q=proxy')
  assert.equal(found.status, 200)
  assert.deepEqual(Object.keys(found.body).sort(), ['indexed', 'ok', 'q', 'results', 'total', 'truncated'])
  assert.equal(found.body.ok, true)
  assert.equal(found.body.q, 'proxy')
  assert.equal(found.body.total, 2)
  assert.deepEqual(found.body.indexed, { sessions: 4, total: 7, ready: false })
  assert.equal(found.body.truncated, false)
  assert.equal(found.body.results.length, 2)
  assert.deepEqual(Object.keys(found.body.results[0]).sort(), ['matched', 'role', 'seq', 'sessionId', 'sessionTitle', 'snippet', 'time'])

  // A query still being typed is `too-short` and is not an error status.
  const short = await answer('/api/edh.search?q=a')
  assert.equal(short.status, 200)
  assert.equal(short.body.ok, false)
  assert.equal(short.body.reason, 'too-short')
  assert.equal(short.body.message.includes('a '), false, 'the query is not echoed back')

  // An empty box is "still typing", not a mistake; a missing or repeated `q` is.
  const empty = await answer('/api/edh.search?q=')
  assert.equal(empty.status, 200)
  assert.equal(empty.body.reason, 'too-short')
  for (const url of ['/api/edh.search', '/api/edh.search?q=one&q=two']) {
    const bad = await answer(url)
    assert.equal(bad.status, 400, url)
    assert.equal(bad.body.reason, 'bad-input')
  }

  // limit: default, clamp, and refused when it is not a number.
  assert.equal(queryOf({ url: '/api/edh.search?q=abc' }), 'abc')
  assert.equal(queryOf({ url: '/api/edh.search?q=a&q=b' }), undefined)
  assert.deepEqual(limitOf({ url: '/api/edh.search' }), { ok: true, limit: DEFAULT_LIMIT })
  assert.deepEqual(limitOf({ url: '/api/edh.search?limit=7' }), { ok: true, limit: 7 })
  assert.deepEqual(limitOf({ url: '/api/edh.search?limit=5000' }), { ok: true, limit: MAX_LIMIT }, 'a big limit clamps')
  for (const bad of ['abc', '0', '-1', '2.5', '']) {
    assert.equal(limitOf({ url: `/api/edh.search?limit=${bad}` }).ok, false, `limit=${bad}`)
    const rejected = await answer(`/api/edh.search?q=proxy&limit=${bad}`)
    assert.equal(rejected.status, 400)
    assert.equal(rejected.body.reason, 'bad-input')
  }

  // Methods.
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const rejected = await answer('/api/edh.search?q=proxy', method)
    assert.equal(rejected.status, 405, method)
    assert.equal(rejected.body.reason, 'unsupported-method')
  }

  // No indexer at all, and an indexer whose persistence is missing.
  const missing = await answer('/api/edh.search?q=proxy', 'GET', null)
  assert.equal(missing.status, 200)
  assert.equal(missing.body.reason, 'unavailable')
  const unavailable = await answer('/api/edh.search?q=proxy', 'GET', { search: () => undefined, indexed: () => ({}), available: () => false })
  assert.equal(unavailable.body.reason, 'unavailable')

  // A throwing index is `error`, never a 500.
  const exploding = await answer('/api/edh.search?q=proxy', 'GET', {
    search() {
      throw new Error('boom')
    },
    indexed: () => ({}),
    available: () => true,
  })
  assert.equal(exploding.status, 200)
  assert.equal(exploding.body.ok, false)
  assert.equal(exploding.body.reason, 'error')
  assert.equal(JSON.stringify(exploding.body).includes('boom'), false, 'the throw is not echoed')

  // No answer ever names a path or the store.
  for (const body of [found.body, short.body, missing.body, exploding.body]) {
    const text = JSON.stringify(body)
    assert.equal(text.includes('search.json'), false)
    assert.equal(text.includes('\\\\'), false)
  }
}

// ---------------------------------------------------------------------------
// 8 — the indexer on a Host with no persistence, and a throwing store
// ---------------------------------------------------------------------------
{
  // No persistence service: the indexer runs, indexes nothing, and says so.
  const { search, pump } = makeIndexer({ store: memoryStore().store, persistence: undefined, readLog: () => ({ buffer: Buffer.alloc(0), from: 0, size: 0 }) })
  search.start()
  await pump()
  assert.deepEqual(search.indexed(), { sessions: 0, total: 0, ready: true })
  assert.equal(search.available(), false, 'without persistence the route says unavailable')
  assert.deepEqual(search.search('anything', { limit: 5 }), { results: [], total: 0, truncated: false })
  search.dispose()

  // A store that throws on read: the indexer starts empty rather than failing.
  const warnings = []
  const { search: resilient } = makeIndexer({
    store: {
      path: 'C:\\profile\\.edh\\search.json',
      read() {
        throw new Error('EACCES')
      },
      write: () => ({ ok: false, error: 'read-only profile' }),
    },
    persistence: undefined,
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
  })
  assert.deepEqual(resilient.indexed().sessions, 0)
  resilient.dispose()
  assert.equal(warnings.length >= 1, true, 'a store that cannot be read is a warning, not a throw')
  assert.match(warnings[0], /could not be read/u)

  // And a persistence whose list throws is one bad pass, not a broken indexer.
  const bad = makeIndexer({
    store: memoryStore().store,
    persistence: {
      async list() {
        throw new Error('root unreadable')
      },
      locate: () => ({}),
    },
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
  })
  bad.search.start()
  await bad.pump()
  assert.deepEqual(bad.search.indexed(), { sessions: 0, total: 0, ready: true })
  bad.search.dispose()
}

// ---------------------------------------------------------------------------
// 9 — the row: one registration, disposal, and no services at all
// ---------------------------------------------------------------------------
{
  const routes = []
  const disposers = []
  const warnings = []
  const ctx = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    get: () => undefined,
    inject: (deps, callback) => {
      if (deps.every(name => name === 'sessionPersistence')) return undefined
      return callback()
    },
    connection: {
      fetch: {
        register(route) {
          routes.push(route)
          return () => {
            const at = routes.indexOf(route)
            if (at !== -1) routes.splice(at, 1)
          }
        },
      },
    },
  }
  apply(ctx)
  assert.equal(routes.length, 1, 'the search route is registered')
  assert.equal(routes[0].path, SEARCH_PATH)
  assert.equal(routes[0].methods.includes('GET'), true)
  assert.equal(routes[0].requestBody, 'buffered')
  assert.equal(typeof routes[0].fetch, 'function')

  const answered = await routes[0].fetch(new Request('http://127.0.0.1/api/edh.search?q=proxy'))
  assert.equal(answered.status, 200)
  const body = await answered.json()
  assert.equal(body.reason, 'unavailable', 'a Host with no persistence says so')

  for (const dispose of [...disposers].reverse()) dispose()
  assert.equal(routes.length, 0, 'disposal unregisters the route')

  // A context with nothing on it must not throw either.
  const bare = {
    logger: { warn: () => {} },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
  }
  assert.doesNotThrow(() => apply(bare), 'a Host without the connection service must not throw')

  // A refused registration is a warning and the rest of EDH keeps running.
  const refused = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
    get: () => undefined,
    inject: () => undefined,
    connection: {
      fetch: {
        register() {
          throw new Error('connection: exact Fetch route already registered')
        },
      },
    },
  }
  assert.doesNotThrow(() => apply(refused))
  assert.equal(warnings.some(line => /registration failed/u.test(line)), true)
}

// ---------------------------------------------------------------------------
// 10 — a structural guard: no second decoder, no path from a request
// ---------------------------------------------------------------------------
{
  const source = readFileSync(join(ROOT, 'search.js'), 'utf8')
  assert.equal(source.includes("from './usage.js'"), true, 'the Zstandard machinery is reused, not copied')
  assert.equal(source.includes('splitZstdFrames'), false, 'this module never splits frames itself')
  assert.equal(/zstdDecompressSync/u.test(source), false, 'and never decompresses frames itself')
  assert.equal(/readFileSync\s*\(/u.test(source), true, 'the index file is read whole — it is the index')
  assert.equal(/readLogTail|decodeLogFrames/u.test(source), true, 'logs are read through the usage.js helpers')
  // No request value is ever joined onto a path.
  const joins = [...source.matchAll(/join\(([^)]*)\)/gu)].map(match => match[1])
  for (const args of joins) {
    assert.equal(/\bq\b|\bquery\b|\blimit\b|searchParams/u.test(args), false, `join(${args.trim()}) takes no request value`)
  }
}

// ---------------------------------------------------------------------------
// 11 — filters: session, role, and the inclusive date bounds
// ---------------------------------------------------------------------------
{
  const index = indexOf([
    [
      'session-a',
      [
        { text: 'alpha from a human', role: 'user', time: 100 },
        { text: 'alpha from the model', role: 'assistant', time: 200 },
        { text: 'alpha late', role: 'assistant', time: 300 },
      ],
    ],
    ['session-b', [{ text: 'alpha elsewhere', role: 'user', time: 400 }]],
  ])
  const ids = found => found.results.map(row => `${row.sessionId}:${row.seq}`)

  // One session.
  const onlyA = searchIndex(index, 'alpha', { sessionId: 'session-a', limit: 10 })
  assert.deepEqual(onlyA.results.map(row => row.sessionId), ['session-a', 'session-a', 'session-a'])
  assert.equal(onlyA.total, 3, 'total counts the filtered set, not the whole index')
  const onlyB = searchIndex(index, 'alpha', { sessionId: 'session-b', limit: 10 })
  assert.equal(onlyB.total, 1)
  assert.equal(searchIndex(index, 'alpha', { sessionId: 'nobody', limit: 10 }).total, 0, 'an unknown session matches nothing here')

  // Role: user means a person wrote it, assistant means model text.
  assert.equal(searchIndex(index, 'alpha', { role: 'user', limit: 10 }).total, 2)
  assert.equal(searchIndex(index, 'alpha', { role: 'assistant', limit: 10 }).total, 2)
  assert.deepEqual(
    searchIndex(index, 'alpha', { role: 'assistant', limit: 10 }).results.map(row => row.seq),
    [3, 2],
    'and the order is still most-recent first within the role',
  )
  assert.equal(searchIndex(index, 'alpha', { role: undefined, limit: 10 }).total, 4, 'no role means every role')

  // Date bounds are inclusive on both edges.
  assert.deepEqual(searchIndex(index, 'alpha', { from: 200, limit: 10 }).results.map(row => row.time), [400, 300, 200])
  assert.deepEqual(searchIndex(index, 'alpha', { to: 200, limit: 10 }).results.map(row => row.time), [200, 100])
  assert.deepEqual(searchIndex(index, 'alpha', { from: 200, to: 300, limit: 10 }).results.map(row => row.time), [300, 200])
  assert.deepEqual(searchIndex(index, 'alpha', { from: 200, to: 200, limit: 10 }).results.map(row => row.time), [200], 'an exact millisecond is one row')
  assert.equal(searchIndex(index, 'alpha', { from: 401, limit: 10 }).total, 0)
  assert.equal(searchIndex(index, 'alpha', { to: 99, limit: 10 }).total, 0)

  // Everything at once.
  const combined = searchIndex(index, 'alpha', { sessionId: 'session-a', role: 'assistant', from: 150, to: 250, limit: 10 })
  assert.deepEqual(ids(combined), ['session-a:2'])
  assert.equal(combined.total, 1)
}

// ---------------------------------------------------------------------------
// 12 — paging is stable, under both sorts
// ---------------------------------------------------------------------------
{
  const messages = Array.from({ length: 10 }, (_, position) => ({
    text: `alpha message ${position}`,
    role: position % 2 === 0 ? 'user' : 'assistant',
    time: 1_000 + position,
    seq: position + 1,
  }))
  const index = indexOf([['session-a', messages]])

  const page = (offset, sort = 'relevance') => searchIndex(index, 'alpha', { limit: 3, offset, sort })
  const first = page(0)
  const second = page(3)
  const third = page(6)
  const last = page(9)
  assert.equal(first.total, 10)
  assert.deepEqual([first, second, third, last].map(found => found.results.length), [3, 3, 3, 1])
  assert.equal(last.total, 10, 'the last page still reports the full total')

  const all = searchIndex(index, 'alpha', { limit: 100 })
  const paged = [...first.results, ...second.results, ...third.results, ...last.results]
  assert.deepEqual(
    paged.map(row => row.seq),
    all.results.map(row => row.seq),
    'the pages concatenate to exactly the unpaged result',
  )
  // No overlap between consecutive pages, under both sorts.
  for (const sort of ['relevance', 'recent']) {
    for (const [left, right] of [[page(0, sort), page(3, sort)], [page(3, sort), page(6, sort)]]) {
      const seen = new Set(left.results.map(row => row.seq))
      assert.equal(right.results.some(row => seen.has(row.seq)), false, `${sort}: no row appears twice`)
      assert.equal(left.total, right.total, `${sort}: total does not depend on the page`)
    }
  }

  // A page past the end is empty with the correct total.
  const beyond = page(20)
  assert.deepEqual(beyond.results, [])
  assert.equal(beyond.total, 10)

  // `sort=recent` is time-descending, whatever the rank order says.
  const recent = searchIndex(index, 'alpha', { limit: 100, sort: 'recent' })
  assert.deepEqual(recent.results.map(row => row.time), [...recent.results.map(row => row.time)].sort((left, right) => right - left))
  assert.equal(recent.results[0].time, 1_009)

  // Relevance orders by rank first; recent ignores it, so a rank-3 row with the
  // newest time leads.
  const mixed = indexOf([
    [
      'session-a',
      [
        { text: 'alpha in words', time: 10, seq: 1 },
        { text: 'alphabet soup', time: 20, seq: 2 },
      ],
    ],
  ])
  assert.deepEqual(searchIndex(mixed, 'alpha', { limit: 5 }).results.map(row => row.seq), [1, 2], 'a word beats a substring')
  assert.deepEqual(
    searchIndex(mixed, 'alpha', { limit: 5, sort: 'recent' }).results.map(row => row.seq),
    [2, 1],
    'recent puts the newer row first even though it ranks lower',
  )

  // The comparator is a strict total order: equal rank and equal time still sort
  // deterministically, by session and then `seq`.
  const tied = [
    { sessionId: 'session-b', message: { time: 5, seq: 2 }, rank: 0 },
    { sessionId: 'session-a', message: { time: 5, seq: 9 }, rank: 0 },
    { sessionId: 'session-a', message: { time: 5, seq: 1 }, rank: 0 },
  ]
  const ordered = [...tied].sort(compareHits('relevance'))
  assert.deepEqual(
    ordered.map(hit => `${hit.sessionId}:${hit.message.seq}`),
    ['session-a:1', 'session-a:9', 'session-b:2'],
    'ties break by session, then seq — so a boundary always lands in the same place',
  )
  const shuffled = [tied[1], tied[2], tied[0]].sort(compareHits('relevance'))
  assert.deepEqual(shuffled, ordered, 'and the order does not depend on insertion order')

  // Rows present in two scans keep their relative order when the corpus grows: a
  // newer match at the front shifts page numbers, never the rows' own order.
  const grown = indexOf([['session-a', [...messages, { text: 'alpha brand new', time: 2_000, seq: 11 }]]])
  const before = searchIndex(index, 'alpha', { limit: 100, sort: 'recent' }).results.map(row => row.seq)
  const after = searchIndex(grown, 'alpha', { limit: 100, sort: 'recent' }).results.map(row => row.seq)
  assert.equal(after[0], 11, 'the new row leads')
  assert.deepEqual(after.slice(1), before, 'and every older row keeps its place behind it')
}

// ---------------------------------------------------------------------------
// 13 — the query-string contract, parameter by parameter
// ---------------------------------------------------------------------------
{
  const parse = url => parseSearchQuery({ url })
  const good = parse('/api/edh.search?q=proxy')
  assert.equal(good.ok, true)
  assert.deepEqual(
    { query: good.query, limit: good.limit, offset: good.offset, role: good.role, from: good.from, to: good.to, sort: good.sort },
    { query: 'proxy', limit: DEFAULT_LIMIT, offset: 0, role: undefined, from: undefined, to: undefined, sort: 'relevance' },
    'every default in one place',
  )
  assert.equal(good.sessionId, undefined)

  // q: required and given once; an empty value (with or without `=`) is a box
  // that has not been typed into yet, which is `too-short` rather than an error.
  for (const url of ['/api/edh.search', '/api/edh.search?q=one&q=two']) {
    const bad = parse(url)
    assert.equal(bad.ok, false, url)
    assert.equal(bad.reason, 'bad-input')
    assert.equal(bad.status, 400)
  }
  for (const url of ['/api/edh.search?q=a', '/api/edh.search?q=%20%20', '/api/edh.search?q', '/api/edh.search?q=']) {
    const short = parse(url)
    assert.equal(short.reason, 'too-short', url)
    assert.equal(short.status, 200, 'still typing is not an error')
  }

  // limit and offset.
  assert.equal(parse('/api/edh.search?q=ok&limit=7').limit, 7)
  assert.equal(parse('/api/edh.search?q=ok&limit=5000').limit, MAX_LIMIT, 'a big limit clamps')
  assert.equal(parse('/api/edh.search?q=ok&offset=10000').offset, MAX_OFFSET)
  for (const url of ['/api/edh.search?q=ok&limit=0', '/api/edh.search?q=ok&limit=abc', '/api/edh.search?q=ok&limit=-1']) {
    assert.equal(parse(url).reason, 'bad-input', url)
  }
  for (const url of ['/api/edh.search?q=ok&offset=10001', '/api/edh.search?q=ok&offset=abc', '/api/edh.search?q=ok&offset=-2']) {
    const bad = parse(url)
    assert.equal(bad.ok, false, url)
    assert.equal(bad.reason, 'bad-input', 'an impossible page is refused, never silently clamped')
  }

  // role and sort.
  assert.equal(parse('/api/edh.search?q=ok&role=user').role, 'user')
  assert.equal(parse('/api/edh.search?q=ok&role=ASSISTANT').role, 'assistant', 'case-insensitive')
  assert.equal(parse('/api/edh.search?q=ok&role=any').role, undefined)
  assert.equal(parse('/api/edh.search?q=ok&role=').role, undefined, 'an empty field means any')
  assert.equal(parse('/api/edh.search?q=ok&role=admin').reason, 'bad-input')
  assert.equal(parse('/api/edh.search?q=ok&sort=recent').sort, 'recent')
  assert.equal(parse('/api/edh.search?q=ok&sort=RELEVANCE').sort, 'relevance')
  assert.equal(parse('/api/edh.search?q=ok&sort=random').reason, 'bad-input')

  // sessionId.
  assert.equal(parse('/api/edh.search?q=ok&sessionId=session-a').sessionId, 'session-a')
  assert.equal(parse('/api/edh.search?q=ok&sessionId=any').sessionId, undefined)
  assert.equal(parse('/api/edh.search?q=ok&sessionId=').sessionId, undefined)
  for (const value of ['../../win.ini', 'C:\\x', 'a:b', 'a/b', 'x'.repeat(MAX_SESSION_ID + 1)]) {
    assert.equal(parse(`/api/edh.search?q=ok&sessionId=${encodeURIComponent(value)}`).reason, 'bad-input', value)
  }
  assert.equal(parse('/api/edh.search?q=ok&sessionId=a&sessionId=b').reason, 'bad-input')
  assert.equal(isSafeKey('session-a'), true)

  // date bounds: inclusive integers, no silent swap.
  assert.equal(parse('/api/edh.search?q=ok&from=100&to=200').from, 100)
  assert.equal(parse('/api/edh.search?q=ok&from=100&to=200').to, 200)
  assert.equal(parse('/api/edh.search?q=ok&from=').from, undefined, 'an empty field is no bound')
  for (const url of ['/api/edh.search?q=ok&from=200&to=100', '/api/edh.search?q=ok&from=abc', '/api/edh.search?q=ok&to=-5']) {
    assert.equal(parse(url).reason, 'bad-input', url)
  }
  assert.equal(parse('/api/edh.search?q=ok&from=1.5').reason, 'bad-input')

  // The route hands the parsed filters straight to the indexer.
  const seen = []
  const fake = {
    search(query, options) {
      seen.push({ query, options })
      return { results: [], total: 0, truncated: false }
    },
    indexed: () => ({ sessions: 0, total: 0, ready: true }),
    available: () => true,
    knows: () => true,
  }
  const call = async url => {
    const response = searchResponse({ method: 'GET', url }, { search: fake })
    return { status: response.status, body: await response.json() }
  }
  await call('/api/edh.search?q=proxy&limit=5&offset=10&role=user&from=100&to=200&sort=recent&sessionId=session-a')
  assert.deepEqual(seen[0], {
    query: 'proxy',
    options: { limit: 5, offset: 10, sessionId: 'session-a', role: 'user', from: 100, to: 200, sort: 'recent' },
  })

  // An unknown session is `not-found`, not an empty result set.
  const unknown = await searchResponse(
    { method: 'GET', url: '/api/edh.search?q=proxy&sessionId=session-z' },
    { search: { ...fake, knows: id => id === 'session-a' } },
  )
  assert.equal(unknown.status, 404)
  const unknownBody = await unknown.json()
  assert.equal(unknownBody.ok, false)
  assert.equal(unknownBody.reason, 'not-found')
  assert.equal(JSON.stringify(unknownBody).includes('session-z'), false, 'the id is not echoed back')

  // A known session is filtered, not refused.
  const known = await call('/api/edh.search?q=proxy&sessionId=session-a')
  assert.equal(known.status, 200)
  assert.equal(known.body.ok, true)
}

console.log('edh search: all checks passed')
