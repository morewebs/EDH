import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ANSWER_MAX_TOKENS,
  ASK_PATH,
  askResponse,
  apply,
  candidateLine,
  collectCandidates,
  createAsk,
  DEADLINE_MS,
  DEFAULT_LIMIT,
  drainStream,
  firstJsonObject,
  genericAnswer,
  inject,
  leastEffortOf,
  MAX_ANSWER,
  MAX_CANDIDATES,
  MAX_LIMIT,
  MAX_PICKS,
  MAX_QUERIES,
  MAX_QUESTION,
  MIN_QUESTION,
  name,
  parsePlan,
  parseSynthesis,
  planQueries,
  PLAN_MAX_TOKENS,
} from '../ask.js'
import { createSearchStore, emptyIndex, INDEX_VERSION } from '../search.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

/** Throwaway directories, removed however this suite ends. */
const fixtures = []
const temporaryStore = () => {
  const dir = mkdtempSync(join(tmpdir(), 'edh-ask-'))
  fixtures.push(dir)
  return join(dir, 'search.json')
}

/** One index with a few Sessions, written where `createAsk` will read it. */
function indexWithStore() {
  const path = temporaryStore()
  const sessions = new Map([
    [
      'session-a',
      {
        title: 'Frames',
        offset: 0,
        size: 0,
        lastSeq: 2,
        messages: [
          { seq: 1, time: 1_000, role: 'user', text: 'the zstandard frames arrive one per append' },
          { seq: 2, time: 1_100, role: 'assistant', text: 'so I split them structurally' },
        ],
      },
    ],
    [
      'session-b',
      {
        title: 'Proxy',
        offset: 0,
        size: 0,
        lastSeq: 1,
        messages: [{ seq: 1, time: 2_000, role: 'assistant', text: 'the proxy rewrites Host and Origin' }],
      },
    ],
    [
      'session-c',
      {
        title: 'Both',
        offset: 0,
        size: 0,
        lastSeq: 1,
        messages: [{ seq: 1, time: 3_000, role: 'user', text: 'zstandard frames and a proxy on the LAN' }],
      },
    ],
  ])
  createSearchStore(path).write({ version: INDEX_VERSION, builtAt: 1, sessions })
  return path
}

/** A fake `llm` service: one scripted stream per call, in order. */
function fakeLlm(rounds, options = {}) {
  const calls = []
  return {
    calls,
    resolveModelInfo: options.resolveInfo ?? (async () => ({ provider: 'p', id: 'm', name: 'M', reasoning: { efforts: [{ id: 'max' }, { id: 'high' }, { id: 'off' }] } })),
    resolveError: options.resolveError,
    stream(streamOptions) {
      calls.push(streamOptions)
      const round = rounds[calls.length - 1]
      if (round === undefined) throw new Error('the flow made more calls than the test scripted')
      return round
    },
  }
}

/** A stream of text deltas and one finish reason. */
const answerStream = (text, kind = 'stop', code = '') =>
  (async function* () {
    // `[\s\S]`, because `.` would drop the newlines the answer format depends on.
    for (const piece of String(text).match(/[\s\S]{1,24}/gu) ?? []) {
      yield { type: 'text-delta', index: 0, text: piece }
    }
    yield { type: 'finish', reason: { kind, ...(code === '' ? {} : { failure: { code, message: 'no' } }) } }
  })()

/** A stream that never produces anything: the deadline must end it. */
const hangStream = () =>
  (async function* () {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    await new Promise(() => {})
  })()

/** The service map for one flow. */
function services({ llm, models = { currentSelection: () => ({ provider: 'anthropic', model: 'claude' }) } } = {}) {
  return { llm, agentDefaultModel: models }
}

/** Run one ask with a scripted model and a real index on disk. */
function makeAsk({ rounds, storePath, deadlineMs = DEADLINE_MS, llmOptions = {}, models }) {
  const llm = fakeLlm(rounds, llmOptions)
  const map = services({ llm, models })
  const ask = createAsk({
    get: serviceName => map[serviceName],
    storePath,
    deadlineMs,
    ...(llmOptions.resolveError === undefined ? { now: undefined } : {}),
  })
  return { ask, llm, map }
}

// ---------------------------------------------------------------------------
// 1 — the plan parse matrix
// ---------------------------------------------------------------------------
{
  assert.equal(name, 'edh-ask')
  assert.deepEqual(inject, ['connection'], 'the route needs the Host connection')
  assert.equal(ASK_PATH, '/api/edh.ask')

  assert.deepEqual(parsePlan('{"queries":["zstd frame","decompress"]}'), { queries: ['zstd frame', 'decompress'] })
  assert.deepEqual(firstJsonObject('{"queries":["a b"]}'), { queries: ['a b'] })

  // Fenced, prose-wrapped, and the outermost braces of a chatty reply.
  assert.deepEqual(parsePlan('```json\n{"queries":["a b","c d"]}\n```'), { queries: ['a b', 'c d'] })
  assert.deepEqual(parsePlan('```\n{"queries":["a b"]}\n```'), { queries: ['a b'] })
  assert.deepEqual(parsePlan('Sure! Here is my answer: {"queries":["one two"]} — hope that helps'), { queries: ['one two'] })
  assert.deepEqual(parsePlan('I think these: ```json\n{"queries": ["x y"]}\n``` done'), { queries: ['x y'] })

  // Broken, empty, and wrong shapes: no queries, never a throw.
  assert.deepEqual(parsePlan(''), { queries: [] })
  assert.deepEqual(parsePlan('queries: zstd, frame'), { queries: [] })
  assert.deepEqual(parsePlan('{"queries":'), { queries: [] })
  assert.deepEqual(parsePlan('{}'), { queries: [] })
  assert.deepEqual(parsePlan('{"queries":[]}'), { queries: [] })
  assert.deepEqual(parsePlan('{"queries":"zstd frame"}'), { queries: [] }, 'a string is not an array')
  assert.deepEqual(parsePlan('{"queries":[1,null,{"a":1}]}'), { queries: [] }, 'non-strings are dropped')
  assert.deepEqual(parsePlan('[{"queries":["a b"]}]'), { queries: ['a b'] }, 'an array wrapper is unwrapped by the brace scan')
  assert.deepEqual(parsePlan('null'), { queries: [] })

  // Cleaning: collapsed, deduped case-insensitively, at most three, no one-char terms.
  assert.deepEqual(parsePlan('{"queries":["  a   b  ","A B","x y","z w","q r"]}'), { queries: ['a b', 'x y', 'z w'] })
  assert.deepEqual(parsePlan('{"queries":["a","..","ok ok"]}'), { queries: ['ok ok'] })
  assert.equal(parsePlan('{"queries":["a1","b2","c3","d4"]}').queries.length, MAX_QUERIES)

  // A model that answers with `ideas` is doing the same thing under another name.
  assert.deepEqual(parsePlan('{"ideas":["zstd frame"]}'), { queries: ['zstd frame'] })
  assert.deepEqual(parsePlan('{"queries":["a b"],"ideas":["c d"]}'), { queries: ['a b'] }, 'queries wins')
}

// ---------------------------------------------------------------------------
// 2 — the fallback to the user's own words
// ---------------------------------------------------------------------------
{
  assert.deepEqual(planQueries('{"queries":["zstd frame"]}', 'anything'), { queries: ['zstd frame'], source: 'model' })
  const fallback = planQueries('I could not do that.', 'Which conversation is about zstd frames?')
  assert.equal(fallback.source, 'question')
  assert.deepEqual(fallback.queries, ['Which conversation is about zstd frames'], 'the question, minus the question mark')
  assert.deepEqual(planQueries('', '  zstd  ').queries, ['zstd'])
  assert.deepEqual(planQueries('', '"zstd" frame?'), { queries: ['zstd frame'], source: 'question' })
  assert.deepEqual(planQueries('', '   ').queries, [], 'nothing usable is nothing usable')
  assert.deepEqual(planQueries('{"queries":["x"]}', 'a real question').queries, ['a real question'], 'a one-character query is no query')
}

// ---------------------------------------------------------------------------
// 3 — the search step: dedupe, hit count, ordering, cap
// ---------------------------------------------------------------------------
{
  const index = {
    version: INDEX_VERSION,
    builtAt: 0,
    sessions: new Map([
      ['session-a', { title: 'A', offset: 0, size: 0, lastSeq: 1, messages: [{ seq: 1, time: 100, role: 'user', text: 'the zstd frame split' }] }],
      ['session-b', { title: 'B', offset: 0, size: 0, lastSeq: 1, messages: [{ seq: 1, time: 200, role: 'user', text: 'zstd frame and decompress and frame' }] }],
      ['session-c', { title: 'C', offset: 0, size: 0, lastSeq: 1, messages: [{ seq: 1, time: 300, role: 'user', text: 'a proxy on the LAN' }] }],
    ]),
  }
  const found = collectCandidates(index, ['zstd frame', 'decompress'], 10)
  assert.deepEqual(found.map(row => row.sessionId), ['session-b', 'session-a'], 'a Session is one row, and two hits beat one')
  assert.equal(found[0].hits, 2)
  assert.equal(found[1].hits, 1)
  assert.equal(found[0].query, 'zstd frame', 'the row remembers which phrase found it')
  assert.equal(collectCandidates(index, ['proxy'], 10).length, 1)
  assert.deepEqual(collectCandidates(emptyIndex(), ['anything'], 10), [], 'an empty index is an empty list, not a throw')
  assert.deepEqual(collectCandidates(undefined, ['anything'], 10), [])
  assert.equal(collectCandidates(index, ['zstd frame'], 1).length, 1, 'the cap holds')
  assert.equal(collectCandidates(index, ['zstd frame'], 1)[0].sessionId, 'session-b', 'and keeps the best row')

  // Ties break by recency, then session, so the list is deterministic.
  const tied = {
    version: INDEX_VERSION,
    builtAt: 0,
    sessions: new Map([
      ['session-z', { title: 'Z', offset: 0, size: 0, lastSeq: 1, messages: [{ seq: 1, time: 500, role: 'user', text: 'same phrase' }] }],
      ['session-y', { title: 'Y', offset: 0, size: 0, lastSeq: 1, messages: [{ seq: 1, time: 500, role: 'user', text: 'same phrase' }] }],
    ]),
  }
  assert.deepEqual(collectCandidates(tied, ['same phrase'], 10).map(row => row.sessionId), ['session-y', 'session-z'])

  const line = candidateLine({ sessionId: 'session-a', sessionTitle: 'Frames', snippet: '…zstd frame…' }, 0)
  assert.equal(line.startsWith('1. session-a | Frames | '), true, 'the model sees a numbered, piped line')
  assert.equal(candidateLine({ sessionId: 's', sessionTitle: '', snippet: 'x' }, 2).includes('(untitled)'), true)

  assert.equal(MAX_CANDIDATES, 10)
  assert.equal(MAX_PICKS, 3)
  assert.equal(genericAnswer(0).startsWith('No conversation'), true)
  assert.equal(genericAnswer(2).startsWith('2 past conversations'), true)
}

// ---------------------------------------------------------------------------
// 4 — the synthesis parse
// ---------------------------------------------------------------------------
{
  const candidates = [{ sessionId: 'session-a' }, { sessionId: 'session-b' }, { sessionId: 'session-c' }]
  const clean = parseSynthesis('ANSWER: You fixed the frames.\nSESSIONS: session-a (zstd frames), session-b (the proxy)', candidates)
  assert.equal(clean.answer, 'You fixed the frames.')
  assert.deepEqual(clean.picks, [
    { sessionId: 'session-a', reason: 'zstd frames' },
    { sessionId: 'session-b', reason: 'the proxy' },
  ])

  // Markdown emphasis, and a `SESSIONS` marker on its own line.
  assert.deepEqual(parseSynthesis('**ANSWER:** yes.\n**SESSIONS**: session-a', candidates), {
    answer: 'yes.',
    picks: [{ sessionId: 'session-a' }],
  })
  assert.deepEqual(parseSynthesis('ANSWER:\nIt worked.\nSESSIONS:\nsession-c', candidates), {
    answer: 'It worked.',
    picks: [{ sessionId: 'session-c' }],
  })

  // An id the model invented is dropped; the order it kept is preserved.
  assert.deepEqual(parseSynthesis('ANSWER: a\nSESSIONS: session-b, made-up-id, session-a', candidates).picks.map(pick => pick.sessionId), [
    'session-b',
    'session-a',
  ])
  // Never more than three, even if the model lists all ten.
  assert.equal(parseSynthesis(`ANSWER: a\nSESSIONS: ${candidates.map(c => c.sessionId).join(', ')}, extra1, extra2`, [...candidates, { sessionId: 'extra1' }, { sessionId: 'extra2' }]).picks.length, MAX_PICKS)
  // Duplicates collapse.
  assert.equal(parseSynthesis('ANSWER: a\nSESSIONS: session-a, session-a', candidates).picks.length, 1)
  // Dashes and colons all read as "reason follows".
  assert.equal(parseSynthesis('ANSWER: a\nSESSIONS: session-a — because frames', candidates).picks[0].reason, 'because frames')
  assert.equal(parseSynthesis('ANSWER: a\nSESSIONS: session-a: because frames', candidates).picks[0].reason, 'because frames')

  // No SESSIONS line: no picks, and the sentence survives.
  assert.deepEqual(parseSynthesis('ANSWER: nothing looks right.', candidates), {
    answer: 'nothing looks right.',
    picks: [],
  })
  assert.deepEqual(parseSynthesis('SESSIONS: session-a', candidates).answer, '')
  assert.deepEqual(parseSynthesis('', candidates), { answer: '', picks: [] })
  assert.deepEqual(parseSynthesis('ANSWER: a\nSESSIONS:', candidates).picks, [])

  // The sentence is collapsed and capped, and prose without markers still reads.
  assert.equal(parseSynthesis('just prose\nno markers', candidates).answer, 'just prose no markers')
  const longAnswer = parseSynthesis(`ANSWER: ${'word '.repeat(200)}`, candidates).answer
  assert.equal(longAnswer.length <= MAX_ANSWER, true)

  // Ids that merely look like ids from the candidate list are the only ones kept.
  assert.deepEqual(parseSynthesis('ANSWER: a\nSESSIONS: session-a', []).picks, [], 'with no candidates nothing can be picked')
}

// ---------------------------------------------------------------------------
// 5 — one chunk stream, every finish kind
// ---------------------------------------------------------------------------
{
  const streamOf = chunks =>
    (async function* () {
      for (const chunk of chunks) yield chunk
    })()

  assert.deepEqual(await drainStream(streamOf([
    { type: 'block-start', index: 0, blockType: 'text' },
    { type: 'text-delta', index: 0, text: 'hello ' },
    { type: 'reasoning-delta', index: 0, text: 'not the answer' },
    { type: 'text-delta', index: 0, text: 'world' },
    { type: 'finish', reason: { kind: 'stop' } },
  ])), { text: 'hello world', kind: 'stop', code: '' }, 'only text deltas are the answer')

  for (const kind of ['stop', 'tool-calls', 'max-tokens', 'aborted', 'error']) {
    const outcome = await drainStream(streamOf([{ type: 'finish', reason: { kind, ...(kind === 'error' || kind === 'aborted' ? { failure: { code: 'QUOTA', message: 'x' } } : {}) } }]))
    assert.equal(outcome.kind, kind)
    if (kind === 'error' || kind === 'aborted') assert.equal(outcome.code, 'QUOTA', `${kind} carries its code`)
  }
  assert.deepEqual(await drainStream(streamOf([{ type: 'text-delta', index: 0, text: 'x' }])), { text: 'x', kind: 'incomplete', code: '' }, 'a stream that stops talking did not finish')
  assert.equal((await drainStream(undefined)).kind, 'error', 'no stream at all is an error, not a crash')
  assert.deepEqual(await drainStream(streamOf([null, 'nope', { type: 'text-delta' }])), { text: '', kind: 'incomplete', code: '' })

  // The effort override: least available, and never `max` on this profile.
  assert.equal(leastEffortOf({ reasoning: { efforts: [{ id: 'max' }, { id: 'high' }, { id: 'off' }] } }), 'off')
  assert.equal(leastEffortOf({ reasoning: { efforts: [{ id: 'max' }, { id: 'low' }] } }), 'low')
  assert.equal(leastEffortOf({ reasoning: { efforts: [{ id: 'max' }, { id: 'high' }] } }), 'max', 'no lesser effort exists, so the first stands')
  assert.equal(leastEffortOf({}), undefined, 'a model with no reasoning list gets no override')
}

// ---------------------------------------------------------------------------
// 6 — the flow, end to end: two calls, no Session id, explicit caps
// ---------------------------------------------------------------------------
{
  const storePath = indexWithStore()
  const { ask, llm } = makeAsk({
    rounds: [
      answerStream('{"queries":["zstandard frames"]}'),
      answerStream('ANSWER: You were fixing the zstd frame reader.\nSESSIONS: session-a (zstd frames), session-c (frames and proxy)'),
    ],
    storePath,
  })
  const answer = await ask.run({ question: 'which conversation is about the zstd frames?', limit: 5 })
  assert.equal(answer.ok, true)
  assert.equal(answer.usedTool, false, 'no tools were offered, so none were used')
  assert.equal(answer.turns, 2, 'plan and synthesis, nothing else')
  assert.equal(typeof answer.elapsedMs, 'number')
  assert.equal(answer.answer, 'You were fixing the zstd frame reader.')
  assert.deepEqual(answer.candidates.map(row => row.sessionId), ['session-a', 'session-c'])
  assert.deepEqual(answer.candidates[0], {
    sessionId: 'session-a',
    sessionTitle: 'Frames',
    reason: 'zstd frames',
    snippet: answer.candidates[0].snippet,
    time: answer.candidates[0].time,
  })
  assert.equal(answer.candidates[0].snippet.includes('zstandard'), true)

  // The call options: no Session, no purpose, an explicit cap, no tools, cheap reasoning.
  assert.equal(llm.calls.length, 2)
  for (const call of llm.calls) {
    assert.equal('sessionId' in call, false, 'a Session id is how an ask would create one')
    assert.equal('purpose' in call, false)
    assert.equal('tools' in call, false)
    assert.equal(call.temperature, 0)
    assert.equal(call.reasoningEffort, 'off', 'never the profile default of `max`')
    assert.equal(call.provider, 'anthropic')
    assert.equal(call.model, 'claude')
    assert.equal(Array.isArray(call.messages), true)
    assert.equal(call.messages[0].role, 'user')
    assert.equal(call.messages[0].content[0].type, 'text')
    assert.equal(typeof call.system, 'string')
  }
  assert.equal(llm.calls[0].maxTokens, PLAN_MAX_TOKENS)
  assert.equal(llm.calls[1].maxTokens, ANSWER_MAX_TOKENS)
  assert.equal(PLAN_MAX_TOKENS < 1200, true, 'far below the 200 000 an omitted cap materialises')
  // The question reaches the plan prompt; the candidates reach the synthesis one.
  assert.equal(llm.calls[0].messages[0].content[0].text.includes('zstd frames'), true)
  assert.equal(llm.calls[1].messages[0].content[0].text.includes('session-a | Frames'), true)
  assert.equal(llm.calls[1].messages[0].content[0].text.includes('session-a | Frames | '), true)
}

// ---------------------------------------------------------------------------
// 7 — the model misbehaves: rambling plan, no picks, unknown ids
// ---------------------------------------------------------------------------
{
  const storePath = indexWithStore()

  // A plan nobody could parse: the question's own words are searched instead.
  {
    const { ask, llm } = makeAsk({
      rounds: [answerStream('I am not sure what you mean, sorry.'), answerStream('ANSWER: Probably this one.\nSESSIONS: session-b')],
      storePath,
    })
    const answer = await ask.run({ question: 'proxy', limit: 5 })
    assert.equal(answer.ok, true)
    assert.equal(llm.calls[1].messages[0].content[0].text.includes('proxy'), true, 'the question was searched')
    assert.deepEqual(answer.candidates.map(row => row.sessionId), ['session-b'])
  }

  // A synthesis with no SESSIONS line: the top index hits come back, explained generically.
  {
    const { ask } = makeAsk({
      rounds: [answerStream('{"queries":["zstandard frames"]}'), answerStream('ANSWER: Not sure which one.')],
      storePath,
    })
    const answer = await ask.run({ question: 'zstd frames', limit: 2 })
    assert.equal(answer.ok, true)
    assert.equal(answer.answer, 'Not sure which one.')
    assert.equal(answer.candidates.length, 2, 'prose never arrives with nothing under it')
    assert.equal(answer.candidates.every(row => row.reason.startsWith('Matches "')), true)
  }

  // Unknown ids are dropped, and the order the model chose is kept.
  {
    const { ask } = makeAsk({
      rounds: [answerStream('{"queries":["zstandard frames"]}'), answerStream('ANSWER: Two of them.\nSESSIONS: ghost, session-c, session-a')],
      storePath,
    })
    const answer = await ask.run({ question: 'zstd frames', limit: 5 })
    assert.deepEqual(answer.candidates.map(row => row.sessionId), ['session-c', 'session-a'])
  }

  // Nothing in the index matches: no second call, no fabricated rows.
  {
    const { ask, llm } = makeAsk({
      rounds: [answerStream('{"queries":["quantum chromodynamics"]}')],
      storePath,
    })
    const answer = await ask.run({ question: 'quantum chromodynamics', limit: 5 })
    assert.equal(answer.ok, true)
    assert.deepEqual(answer.candidates, [])
    assert.equal(answer.turns, 1, 'the synthesis call is skipped when there is nothing to show')
    assert.equal(llm.calls.length, 1)
    assert.equal(answer.answer, genericAnswer(0))
  }
}

// ---------------------------------------------------------------------------
// 8 — truncation: a cut plan falls back, a cut synthesis still shows rows
// ---------------------------------------------------------------------------
{
  const storePath = indexWithStore()

  // A plan cut off at max-tokens with nothing usable → the question's words.
  {
    const { ask, llm } = makeAsk({
      rounds: [answerStream('{"queries": ["zstand', 'max-tokens'), answerStream('ANSWER: Found it.\nSESSIONS: session-a')],
      storePath,
    })
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.ok, true, 'a truncated plan is not a failure')
    assert.deepEqual(answer.candidates.map(row => row.sessionId), ['session-a'])
    assert.equal(llm.calls[1].messages[0].content[0].text.includes('zstandard frames'), true)
  }

  // A truncated plan that is still valid JSON: use its queries.
  {
    const { ask } = makeAsk({
      rounds: [answerStream('{"queries":["zstandard frames"]}', 'max-tokens'), answerStream('ANSWER: a\nSESSIONS: session-a')],
      storePath,
    })
    const answer = await ask.run({ question: 'frames', limit: 5 })
    assert.equal(answer.ok, true)
    assert.equal(answer.candidates[0].sessionId, 'session-a')
  }

  // A synthesis cut off at max-tokens: the rows still come back.
  {
    const { ask } = makeAsk({
      rounds: [answerStream('{"queries":["zstandard frames"]}'), answerStream('ANSWER: You were', 'max-tokens')],
      storePath,
    })
    const answer = await ask.run({ question: 'zstd frames', limit: 3 })
    assert.equal(answer.ok, true)
    assert.equal(answer.answer, 'You were')
    assert.equal(answer.candidates.length, 2, 'every candidate there is, capped by the limit')
    assert.equal(answer.candidates.every(row => row.reason.startsWith('Matches "')), true)
  }

  // A question with nothing searchable in it, and a plan with no queries: the one
  // honest `truncated` — there is nothing to look for.
  {
    const { ask } = makeAsk({ rounds: [answerStream('{"queries":[]}')], storePath })
    const answer = await ask.run({ question: '??', limit: 5 })
    assert.equal(answer.ok, false)
    assert.equal(answer.reason, 'truncated')
    assert.equal(answer.message.includes('naming the topic') || answer.message.includes('search phrases'), true)
  }
}

// ---------------------------------------------------------------------------
// 9 — the deadline, and every provider failure
// ---------------------------------------------------------------------------
{
  const storePath = indexWithStore()

  // A plan round that never finishes ends at the deadline.
  {
    const { ask } = makeAsk({ rounds: [hangStream()], storePath, deadlineMs: 30 })
    const started = Date.now()
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.ok, false)
    assert.equal(answer.reason, 'timeout')
    assert.equal(Date.now() - started < 2000, true, 'the deadline is what ended it')
  }

  // A synthesis round that never finishes does the same.
  {
    const { ask } = makeAsk({ rounds: [answerStream('{"queries":["zstandard frames"]}'), hangStream()], storePath, deadlineMs: 30 })
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.reason, 'timeout')
  }

  // Provider failures: a `finish` error, an abort, and a stream that stops talking.
  for (const [kind, code] of [['error', 'QUOTA'], ['error', 'RATE_LIMIT'], ['error', 'AUTH'], ['aborted', 'ABORTED']]) {
    const { ask } = makeAsk({ rounds: [answerStream('', kind, code)], storePath, deadlineMs: 5000 })
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.ok, false, `${kind}/${code}`)
    assert.equal(answer.reason, 'llm-error')
    assert.equal(answer.message.includes(code), true, 'the provider code is in the message')
  }

  // A plan that stopped talking without a `finish` chunk still parsed, so the flow
  // carried on — a missing marker is a truncation of the marker, not of the text.
  {
    const mute = (async function* () {
      yield { type: 'text-delta', index: 0, text: '{"queries":["zstandard frames"]}' }
    })()
    const { ask } = makeAsk({ rounds: [mute, answerStream('ANSWER: a\nSESSIONS: session-a')], storePath, deadlineMs: 5000 })
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.ok, true)
    assert.deepEqual(answer.candidates.map(row => row.sessionId), ['session-a'])
  }

  // A synthesis failure is `llm-error` too, not a silent empty answer.
  {
    const { ask } = makeAsk({ rounds: [answerStream('{"queries":["zstandard frames"]}'), answerStream('', 'error', 'AUTH')], storePath })
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.reason, 'llm-error')
    assert.equal(answer.message.includes('AUTH'), true)
  }
}

// ---------------------------------------------------------------------------
// 10 — no model, no llm, no index
// ---------------------------------------------------------------------------
{
  // No `llm` service at all.
  {
    const ask = createAsk({ get: () => undefined, storePath: temporaryStore() })
    assert.equal(ask.available(), false)
    const answer = await ask.run({ question: 'zstd frames' })
    assert.equal(answer.ok, false)
    assert.equal(answer.reason, 'unavailable')
  }
  // `llm` but no default model.
  {
    const llm = fakeLlm([])
    const ask = createAsk({ get: serviceName => ({ llm })[serviceName], storePath: temporaryStore() })
    const answer = await ask.run({ question: 'zstd frames' })
    assert.equal(answer.reason, 'no-model')
    assert.equal(llm.calls.length, 0, 'nothing is spent without a model')
  }
  // A selection with an empty provider or model.
  for (const selection of [{ provider: '', model: 'x' }, { provider: 'x', model: '' }, {}]) {
    const llm = fakeLlm([])
    const ask = createAsk({
      get: serviceName => ({ llm, agentDefaultModel: { currentSelection: () => selection } })[serviceName],
      storePath: temporaryStore(),
    })
    assert.equal((await ask.run({ question: 'zstd frames' })).reason, 'no-model')
  }
  // `currentSelection` that throws.
  {
    const llm = fakeLlm([])
    const ask = createAsk({
      get: serviceName => ({ llm, agentDefaultModel: { currentSelection: () => { throw new Error('no settings') } } })[serviceName],
      storePath: temporaryStore(),
    })
    assert.equal((await ask.run({ question: 'zstd frames' })).reason, 'no-model')
  }
  // `resolveModelInfo` says there is no adapter: that is `no-model`, not `llm-error`.
  {
    const llm = fakeLlm([], { resolveInfo: async () => { throw Object.assign(new Error('no adapter'), { code: 'NO_ADAPTER' }) } })
    const ask = createAsk({
      get: serviceName => ({ llm, agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) } })[serviceName],
      storePath: temporaryStore(),
    })
    assert.equal((await ask.run({ question: 'zstd frames' })).reason, 'no-model')
  }
  // Any other resolve failure is `llm-error` with its code.
  {
    const llm = fakeLlm([], { resolveInfo: async () => { throw Object.assign(new Error('nope'), { code: 'AUTH' }) } })
    const ask = createAsk({
      get: serviceName => ({ llm, agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) } })[serviceName],
      storePath: temporaryStore(),
    })
    const answer = await ask.run({ question: 'zstd frames' })
    assert.equal(answer.reason, 'llm-error')
    assert.equal(answer.message.includes('AUTH'), true)
  }
  // No index on disk: that is "the index was never built", not "nothing matched" —
  // the difference decides whether the user believes their history lacks the answer.
  {
    const { ask } = makeAsk({ rounds: [answerStream('{"queries":["zstandard frames"]}')], storePath: join(temporaryStore(), 'missing', 'nope.json') })
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.ok, false)
    assert.equal(answer.reason, 'unavailable')
    assert.equal(answer.message.includes('not been built'), true)
  }
  // A built index with nothing in it: an honest empty answer.
  {
    const emptyPath = temporaryStore()
    createSearchStore(emptyPath).write(emptyIndex())
    const { ask } = makeAsk({ rounds: [answerStream('{"queries":["zstandard frames"]}')], storePath: emptyPath })
    const answer = await ask.run({ question: 'zstandard frames', limit: 5 })
    assert.equal(answer.ok, true)
    assert.deepEqual(answer.candidates, [])
    assert.equal(answer.answer, genericAnswer(0))
  }
  // A question too short never reaches the model.
  {
    const { ask, llm } = makeAsk({ rounds: [], storePath: temporaryStore() })
    const answer = await ask.run({ question: ' a ' })
    assert.equal(answer.reason, 'too-short')
    assert.equal(llm.calls.length, 0)
  }
}

// ---------------------------------------------------------------------------
// 11 — one ask at a time
// ---------------------------------------------------------------------------
{
  const storePath = indexWithStore()
  let release
  const gated = (async function* () {
    await new Promise(resolve => {
      release = resolve
    })
    yield { type: 'text-delta', index: 0, text: '{"queries":["zstandard frames"]}' }
    yield { type: 'finish', reason: { kind: 'stop' } }
  })()
  const { ask } = makeAsk({
    rounds: [gated, answerStream('ANSWER: a\nSESSIONS: session-a')],
    storePath,
    deadlineMs: 5000,
  })
  const first = ask.run({ question: 'zstandard frames', limit: 5 })
  assert.equal(ask.busy(), true, 'the first ask holds the slot')
  const second = await ask.run({ question: 'zstandard frames', limit: 5 })
  assert.equal(second.ok, false)
  assert.equal(second.reason, 'busy')
  // The gated stream starts only when the flow reaches it, so wait for the gate.
  while (release === undefined) await new Promise(resolve => {
    setTimeout(resolve, 1)
  })
  release()
  const answer = await first
  assert.equal(answer.ok, true)
  assert.equal(ask.busy(), false, 'and releases it, however the first ended')
}

// ---------------------------------------------------------------------------
// 12 — the route: body, limits, statuses, and never a 500
// ---------------------------------------------------------------------------
{
  const storePath = indexWithStore()
  const makeRoute = (rounds = [answerStream('{"queries":["zstandard frames"]}'), answerStream('ANSWER: a\nSESSIONS: session-a')], deadlineMs = undefined) =>
    makeAsk({ rounds, storePath, ...(deadlineMs === undefined ? {} : { deadlineMs }) })
  const call = async (setup, body, method = 'POST') => {
    const { ask } = setup
    const request = {
      method,
      url: ASK_PATH,
      text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)),
    }
    const response = await askResponse(request, { ask })
    return { status: response.status, body: await response.json(), headers: response.headers }
  }

  const ok = await call(makeRoute(), { q: 'which conversation is about zstd frames?', limit: 4 })
  assert.equal(ok.status, 200)
  assert.equal(ok.body.ok, true)
  assert.deepEqual(Object.keys(ok.body).sort(), ['answer', 'candidates', 'elapsedMs', 'ok', 'turns', 'usedTool'])
  assert.equal(ok.body.usedTool, false)
  assert.deepEqual(Object.keys(ok.body.candidates[0]).sort(), ['reason', 'sessionId', 'sessionTitle', 'snippet', 'time'])

  // Defaults and limits.
  assert.equal((await call(makeRoute(), { q: 'zstandard frames' })).status, 200)
  assert.equal((await call(makeRoute(), { q: 'zstandard frames', limit: MAX_LIMIT })).status, 200)
  assert.equal((await call(makeRoute(), { q: 'zstandard frames', limit: null })).status, 200, 'null is "not given"')
  for (const limit of [0, 11, 1.5, '3', true, {}]) {
    const rejected = await call(makeRoute(), { q: 'zstandard frames', limit })
    assert.equal(rejected.status, 400, `limit ${JSON.stringify(limit)}`)
    assert.equal(rejected.body.reason, 'bad-input')
  }

  // Too short is 200; a body that is not a JSON object is 400.
  const short = await call(makeRoute(), { q: ' a ' })
  assert.equal(short.status, 200)
  assert.equal(short.body.reason, 'too-short')
  for (const body of [undefined, 'not json', '[]', '"text"', '{}', { q: 42 }, { q: 'x'.repeat(MAX_QUESTION + 1) }, 'x'.repeat(9000)]) {
    const rejected = await call(makeRoute(), body)
    assert.equal(rejected.status, 400, JSON.stringify(body)?.slice(0, 20))
    assert.equal(rejected.body.reason, 'bad-input')
  }

  // Methods: anything but POST is a 405 with an `allow` header.
  for (const method of ['GET', 'PUT', 'DELETE', 'OPTIONS']) {
    const rejected = await call(makeRoute(), { q: 'zstandard frames' }, method)
    assert.equal(rejected.status, 405, method)
    assert.equal(rejected.body.reason, 'unsupported-method')
    assert.equal(rejected.headers.get('allow'), 'POST')
  }

  // No ask at all, and one that throws.
  const missing = await askResponse({ method: 'POST', url: ASK_PATH, text: async () => '{"q":"zstd frames"}' }, { ask: null })
  assert.equal(missing.status, 200)
  assert.equal((await missing.json()).reason, 'unavailable')
  const throwing = await call(
    { ask: { available: () => true, busy: () => false, run: async () => { throw new Error('boom') } } },
    { q: 'zstandard frames' },
  )
  assert.equal(throwing.status, 200)
  assert.equal(throwing.body.reason, 'error')
  assert.equal(JSON.stringify(throwing.body).includes('boom'), false, 'the throw is not echoed')

  // A second concurrent ask is 429 with a retry hint.
  {
    // A short deadline on purpose: the first ask is abandoned mid-flight, and its
    // 28 s timer would otherwise be the last thing holding the process open — the
    // suite must exit on its own, not after the product deadline.
    const setup = makeRoute([hangStream()], 120)
    const running = call(setup, { q: 'zstandard frames' })
    const busy = await call(setup, { q: 'zstandard frames' })
    assert.equal(busy.status, 429)
    assert.equal(busy.body.reason, 'busy')
    assert.equal(busy.headers.get('retry-after'), '1')
    // Let the abandoned ask reach its deadline, so `inFlight` is released and
    // nothing is left running when this block ends.
    const settled = await running
    assert.equal(settled.status, 200)
    assert.equal(settled.body.reason, 'timeout')
    assert.equal(setup.ask.busy(), false, 'the slot is free again')
  }

  // `unavailable` when the Host has no model, through the route.
  const noLlm = createAsk({ get: () => undefined, storePath })
  const unavailable = await askResponse({ method: 'POST', url: ASK_PATH, text: async () => '{"q":"zstd frames"}' }, { ask: noLlm })
  assert.equal(unavailable.status, 200)
  assert.equal((await unavailable.json()).reason, 'unavailable')

  // Nothing about the question or the answer is written to the console.
  const notes = []
  const spy = createAsk({
    get: serviceName => ({ llm: fakeLlm([answerStream('{"queries":["zstandard frames"]}'), answerStream('ANSWER: secret sentence\nSESSIONS: session-a')]), agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) } })[serviceName],
    storePath,
    logger: { warn: (...args) => notes.push(args.map(String).join(' ')) },
  })
  const quiet = await spy.run({ question: 'a question about the zstd frames', limit: 5 })
  assert.equal(quiet.ok, true)
  assert.equal(notes.length, 0, 'a healthy flow logs nothing')

  // And a failing flow logs its reason, never the conversation: not the question,
  // not the answer, not a snippet.
  const noisy = []
  const failing = createAsk({
    get: serviceName =>
      ({
        llm: fakeLlm([answerStream('{"queries":["zstandard frames"]}'), answerStream('ANSWER: a very secret answer\nSESSIONS: session-a', 'error', 'QUOTA')]),
        agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
      })[serviceName],
    storePath,
    logger: { warn: (...args) => noisy.push(args.map(String).join(' ')) },
  })
  const failed = await failing.run({ question: 'why did the zstandard-frames rewrite stall', limit: 5 })
  assert.equal(failed.ok, false)
  const written = noisy.join('\n')
  assert.equal(written.includes('zstandard-frames rewrite'), false, 'the question is never logged')
  assert.equal(written.includes('secret answer'), false, 'the answer is never logged')
}

// ---------------------------------------------------------------------------
// 13 — the row: registration, disposal, and no connection at all
// ---------------------------------------------------------------------------
{
  const routes = []
  const disposers = []
  const warnings = []
  const map = {
    llm: fakeLlm([answerStream('{"queries":["zstandard frames"]}'), answerStream('ANSWER: a\nSESSIONS: session-a')]),
    agentDefaultModel: { currentSelection: () => ({ provider: 'p', model: 'm' }) },
  }
  const ctx = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    get: serviceName => map[serviceName],
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    inject: () => undefined,
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
  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, ASK_PATH)
  assert.deepEqual([...routes[0].methods], ['POST', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
  assert.equal(routes[0].requestBody, 'buffered')

  for (const dispose of [...disposers].reverse()) dispose()
  assert.equal(routes.length, 0, 'disposal unregisters the route')

  // A Host with no connection must not throw.
  const bare = {
    logger: { warn: () => {} },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
  }
  assert.doesNotThrow(() => apply(bare))

  // A refused registration is a warning, not a crash.
  const refused = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    get: () => undefined,
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
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
// 14 — structural guards: no shipped import, no Session, no tool loop
// ---------------------------------------------------------------------------
{
  const source = readFileSync(join(ROOT, 'ask.js'), 'utf8')
  assert.equal(source.includes("from './search.js'"), true, 'the index is reused, not duplicated')
  assert.equal(/from '@deepseek-ai\//u.test(source), false, 'EDH imports no shipped package')
  assert.equal(source.includes('prepareCall'), true, 'the one-shot API is named only to be avoided')
  assert.equal(/ctx\.llm\s*\(/u.test(source), false)
  // No request value is joined onto a path.
  const joins = [...source.matchAll(/join\(([^)]*)\)/gu)].map(match => match[1])
  for (const args of joins) {
    assert.equal(/question|query|body|searchParams/u.test(args), false, `join(${args.trim()}) takes no request value`)
  }
  // The option bag is built in one place, and it never names a Session.
  const options = source.slice(source.indexOf('const roundOptions'), source.indexOf('const stream = selection.llm.stream'))
  assert.equal(options.includes('sessionId'), false)
  assert.equal(options.includes('purpose'), false)
  assert.equal(options.includes('maxTokens'), true)
  assert.equal(options.includes('signal'), true)
}

for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
console.log('edh ask: all checks passed')
