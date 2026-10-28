import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { zstdCompressSync } from 'node:zlib'
import {
  apply,
  bucketTotal,
  cacheTotals,
  CACHE_VERSION,
  createDayKey,
  createFileStore,
  createUsage,
  decodeLogFrames,
  emptyCache,
  emptySessionEntry,
  foldSessionRecord,
  foldSessionRecords,
  longestSessionOf,
  machineTimeZone,
  normalizeCache,
  readLogTail,
  resolveStorePath,
  scopeOfSession,
  splitZstdFrames,
  STORE_FILE,
  streaksOf,
  summarizeCache,
  USAGE_PATH,
  usageNotes,
  usageResponse,
  usageView,
  zeroBuckets,
} from '../usage.js'

// ---------------------------------------------------------------------------
// Fakes: a Session log, a persistence service, a store, a scheduler, a context
// ---------------------------------------------------------------------------

const ZONE = 'Europe/London'

/** The local-date key builder every fold in this suite uses. */
const dayKey = createDayKey(ZONE)

/** One instant, from a UTC calendar day at noon. */
const noon = (year, month, day) => Date.UTC(year, month - 1, day, 12, 0, 0, 0)

/** The header record every synthetic artifact starts with. */
function headerRecord(id, createdAt) {
  return {
    type: 'session',
    version: 4,
    id,
    createdAt,
    cwd: 'C:\\work',
    isSeeded: false,
    delegationDepth: 0,
  }
}

/** One usage sample, with the optional cache fields only when they are given. */
function usageSample(options = {}) {
  const sample = { inputTokens: options.input ?? 100, outputTokens: options.output ?? 10, totalTokens: options.total ?? 110 }
  if (options.cacheRead !== undefined) sample.cacheReadTokens = options.cacheRead
  if (options.cacheWrite !== undefined) sample.cacheWriteTokens = options.cacheWrite
  return sample
}

/** One `assistant/message` event, shaped exactly as the log stores it. */
function assistantMessage(options = {}) {
  const event = {
    type: 'assistant/message',
    seq: options.seq,
    time: options.time,
    data: {
      turn: options.turn ?? 1,
      step: options.step ?? 1,
      message: {
        role: 'assistant',
        content: [{ type: 'text', text: 'hello' }],
        source: { kind: 'model', provider: options.provider ?? 'provider-a', model: options.model ?? 'model-a' },
      },
    },
  }
  if (options.usage !== undefined) event.data.usage = options.usage
  if (options.interrupted === true) event.interrupted = true
  return event
}

/** One `assistant/attempt` event whose stream ends with a usage chunk. */
function assistantAttempt(options = {}) {
  const event = {
    type: 'assistant/attempt',
    seq: options.seq,
    time: options.time,
    data: {
      turn: options.turn ?? 1,
      step: options.step ?? 1,
      stream: [],
    },
  }
  if (options.usage !== undefined) {
    event.data.stream.push({ type: 'chunk', time: options.time, chunk: { type: 'usage', usage: options.usage } })
  }
  return event
}

/** One JSONL frame, exactly as one append writes it: records and a final newline. */
function frameOf(records) {
  return zstdCompressSync(Buffer.from(`${records.map(record => JSON.stringify(record)).join('\n')}\n`, 'utf8'))
}

/** One artifact: a header frame, then one frame per appended batch. */
function artifactOf(id, createdAt, batches) {
  return Buffer.concat([frameOf([headerRecord(id, createdAt)]), ...batches.map(batch => frameOf(batch))])
}

/** A store that keeps the cache in memory and reports the same contract as the file one. */
function createMemoryStore(state) {
  const box = { state: state === undefined ? undefined : structuredClone(state) }
  return {
    box,
    path: '<memory>',
    read: () => ({ state: box.state === undefined ? undefined : structuredClone(box.state) }),
    write: next => {
      box.state = structuredClone(next)
      return { ok: true }
    },
  }
}

/**
 * A persistence service over an in-memory path table.
 *
 * `logs` maps a synthetic path to a Buffer, so nothing here touches the real
 * profile, and a test can append a frame the way the writer would.
 */
function createPersistence(logs, headers = new Map()) {
  const listed = []
  return {
    listed,
    list: async () =>
      [...logs.entries()].map(([path, buffer]) => ({
        header: headers.get(path) ?? { id: path, createdAt: noon(2026, 10, 26), cwd: 'C:\\work' },
        formatStatus: 'current',
        revision: `rev:${buffer.length}`,
        sizeBytes: buffer.length,
      })),
    locate: header => {
      const path = header?.id
      return logs.has(path) ? { kind: 'jsonl', path } : undefined
    },
  }
}

/** The seam the manager reads an artifact through, over one table. */
function readLogFrom(logs) {
  return (path, from = 0) => {
    const buffer = logs.get(path)
    if (buffer === undefined) throw new Error('ENOENT')
    const start = from <= buffer.length ? from : 0
    return { buffer: buffer.subarray(start), from: start, size: buffer.length }
  }
}

/** A scheduler a test drives by hand, so no tick depends on real time. */
function createScheduler() {
  const pending = []
  return {
    pending,
    schedule: run => {
      pending.push(run)
      return { unref() {} }
    },
    async drain() {
      for (let guard = 0; guard < 100; guard += 1) {
        await new Promise(resolve => setImmediate(resolve))
        if (pending.length === 0) return
        const run = pending.shift()
        await run()
      }
      throw new Error('the scheduler never drained')
    },
  }
}

/** A manager over synthetic logs, with every seam replaced. */
function createHarness(options = {}) {
  const logs = new Map(options.logs ?? [])
  const headers = new Map(options.headers ?? [])
  const persistence = options.persistence ?? createPersistence(logs, headers)
  const store = options.store ?? createMemoryStore()
  const scheduler = options.scheduler ?? createScheduler()
  const warnings = []
  const usage = createUsage({
    store,
    timeZone: ZONE,
    now: options.now ?? (() => noon(2026, 10, 28)),
    schedule: scheduler.schedule,
    sessionsPerTick: options.sessionsPerTick ?? 4,
    budgetMs: 1000,
    readLog: readLogFrom(logs),
    logger: { warn: message => warnings.push(String(message)) },
    getPersistence: () => (options.noPersistence === true ? undefined : persistence),
    getSessionQuery: options.getSessionQuery,
    getProjectionCache: options.getProjectionCache,
  })
  return { usage, logs, headers, persistence, store, scheduler, warnings }
}

/** A context-shaped Host: the effect scope, the route registry, events, a logger. */
function createContext() {
  const routes = []
  const disposers = []
  const warnings = []
  const listeners = []
  const ctx = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    inject(names, callback) {
      ctx.injected = names
      if (typeof callback === 'function') callback({ effect: fn => fn() })
    },
    on(name, listener, options) {
      listeners.push({ name, listener, options })
      return () => listeners.splice(0, listeners.length)
    },
    get: () => undefined,
    connection: {
      fetch: {
        register(route) {
          routes.push(route)
          return () => routes.splice(routes.indexOf(route), 1)
        },
      },
    },
  }
  return { ctx, routes, disposers, warnings, listeners }
}

/** One request against the route. */
const get = () => new Request(`http://host${USAGE_PATH}`)
const post = body => new Request(`http://host${USAGE_PATH}`, { method: 'POST', body: JSON.stringify(body) })

// ---------------------------------------------------------------------------
// 1 — the fold: two models over two days, missing cache fields, replay replaced
// ---------------------------------------------------------------------------
{
  const entry = emptySessionEntry({ header: { id: 'session-1', createdAt: noon(2026, 10, 26) } })
  const day1 = noon(2026, 10, 26)
  const day2 = noon(2026, 10, 27)
  const events = [
    headerRecord('session-1', day1),
    { type: 'session/title', seq: 1, time: day1, data: { title: '  A first session  ' } },
    { type: 'turn/start', seq: 2, time: day1, data: { turn: 1 } },
    assistantMessage({
      seq: 3,
      time: day1,
      usage: usageSample({ input: 1000, output: 100, total: 1300, cacheRead: 200 }),
    }),
    // A replay of (turn 1, step 1) lands right after it, as a retry does, and
    // replaces the sample instead of adding a second one.
    assistantMessage({
      seq: 4,
      time: day1,
      usage: usageSample({ input: 1000, output: 180, total: 1400, cacheRead: 220 }),
    }),
    { type: 'turn/end', seq: 5, time: day1, data: { turn: 1 } },
    assistantMessage({
      seq: 6,
      time: day2,
      turn: 2,
      model: 'model-b',
      provider: 'provider-b',
      // No cache fields at all: they count as zero, not as a missing row.
      usage: usageSample({ input: 50, output: 5, total: 55 }),
    }),
    // An interrupted message records no usage and contributes nothing.
    assistantMessage({ seq: 7, time: day2, turn: 2, step: 2, model: 'model-b', provider: 'provider-b', interrupted: true }),
  ]
  const counted = foldSessionRecords(entry, events, { dayKey, timeZone: ZONE })
  assert.equal(counted, 3, 'two distinct steps, and the replacement is one of them')

  assert.deepEqual(Object.keys(entry.days).sort(), ['2026-10-26', '2026-10-27'])
  assert.deepEqual(entry.days['2026-10-26']['model-a'], {
    input: 1000,
    output: 180,
    cacheRead: 220,
    cacheWrite: 0,
    count: 1,
  })
  assert.deepEqual(entry.days['2026-10-27']['model-b'], {
    input: 50,
    output: 5,
    cacheRead: 0,
    cacheWrite: 0,
    count: 1,
  })
  assert.equal(entry.providers['model-a'], 'provider-a')
  assert.equal(entry.providers['model-b'], 'provider-b')
  assert.equal(entry.title, 'A first session', 'the newest title event wins, trimmed')
  assert.equal(entry.lastSeq, 7)
  assert.equal(entry.firstTime, day1)
  assert.equal(entry.lastTime, day2)
  assert.equal(entry.createdAt, noon(2026, 10, 26))
  assert.equal(entry.origin, 'main')

  // A record already folded is not folded again.
  assert.equal(foldSessionRecord(entry, assistantMessage({ seq: 3, time: day1, usage: usageSample() }), { dayKey, timeZone: ZONE }), false)

  // The four buckets, never totalTokens: 1000+180+220+0.
  assert.equal(bucketTotal(entry.days['2026-10-26']['model-a']), 1400)
  assert.equal(entry.days['2026-10-26']['model-a'].count, 1, 'a replay counts one message, not two')

  // The slot is a single "last" one, exactly as `tokenUsage` keeps it, so a
  // replay of an OLDER step that arrives after a newer one adds rather than
  // replacing. This is pinned here because it is a limit, not an accident.
  const stale = emptySessionEntry()
  foldSessionRecords(
    stale,
    [
      assistantMessage({ seq: 10, time: day1, turn: 1, step: 1, usage: usageSample({ input: 10 }) }),
      assistantMessage({ seq: 11, time: day1, turn: 1, step: 2, usage: usageSample({ input: 20 }) }),
      assistantMessage({ seq: 12, time: day1, turn: 1, step: 1, usage: usageSample({ input: 10 }) }),
    ],
    { dayKey, timeZone: ZONE },
  )
  assert.equal(stale.days['2026-10-26']['model-a'].input, 40)
}

// ---------------------------------------------------------------------------
// 2 — the replacement slot: an attempt then its message, and a retry that adds
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)

  // Same (turn, step): the attempt's sample is replaced by the message's.
  const replaced = emptySessionEntry()
  foldSessionRecords(
    replaced,
    [
      assistantAttempt({ seq: 10, time, usage: usageSample({ input: 500, output: 0, total: 500 }) }),
      assistantMessage({ seq: 11, time, usage: usageSample({ input: 500, output: 40, total: 540 }) }),
    ],
    { dayKey, timeZone: ZONE },
  )
  assert.deepEqual(replaced.days['2026-10-26']['model-a'], { input: 500, output: 40, cacheRead: 0, cacheWrite: 0, count: 1 })

  // `llm/retry-started` closes the slot, so the retried attempt ADDS to the total.
  const retried = emptySessionEntry()
  foldSessionRecords(
    retried,
    [
      assistantAttempt({ seq: 20, time, usage: usageSample({ input: 500, output: 0, total: 500 }) }),
      { type: 'llm/retry-started', seq: 21, time, data: { turn: 1, step: 1 } },
      assistantMessage({ seq: 22, time, usage: usageSample({ input: 600, output: 40, total: 640 }) }),
    ],
    { dayKey, timeZone: ZONE },
  )
  // The attempt names no route — an attempt event carries no model — so its
  // tokens are counted under `unknown`, and the retried message is attributed.
  assert.deepEqual(retried.days['2026-10-26']['model-a'], { input: 600, output: 40, cacheRead: 0, cacheWrite: 0, count: 1 })
  assert.deepEqual(retried.days['2026-10-26'].unknown, { input: 500, output: 0, cacheRead: 0, cacheWrite: 0, count: 1 })
  assert.equal(cacheTotals({ perSession: { retried } }).input, 1100)
  assert.equal(cacheTotals({ perSession: { retried } }).messages, 2)

  // A sample whose required counts are not integers is refused, not zeroed.
  const invalid = emptySessionEntry()
  foldSessionRecords(
    invalid,
    [assistantMessage({ seq: 30, time, usage: { inputTokens: -1, outputTokens: 4 } })],
    { dayKey, timeZone: ZONE },
  )
  assert.deepEqual(invalid.days, {})

  // A failed attempt reports a placeholder sample with every count at zero.
  // It carries no tokens, so it is neither a message nor an empty row, and a
  // real message that follows it for the same step is counted exactly once.
  const placeholder = emptySessionEntry()
  foldSessionRecords(
    placeholder,
    [
      assistantAttempt({ seq: 31, time, usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 } }),
      assistantMessage({ seq: 32, time, usage: usageSample({ input: 70, output: 7 }) }),
    ],
    { dayKey, timeZone: ZONE },
  )
  assert.deepEqual(placeholder.days['2026-10-26']['model-a'], { input: 70, output: 7, cacheRead: 0, cacheWrite: 0, count: 1 })
  assert.equal(placeholder.days['2026-10-26'].unknown, undefined, 'no empty model row is created')
  assert.equal(cacheTotals({ perSession: { placeholder } }).messages, 1)

  // A different step is a different slot, so it adds.
  const twoSteps = emptySessionEntry()
  foldSessionRecords(
    twoSteps,
    [
      assistantMessage({ seq: 40, time, turn: 1, step: 1, usage: usageSample({ input: 10 }) }),
      assistantMessage({ seq: 41, time, turn: 1, step: 2, usage: usageSample({ input: 20 }) }),
    ],
    { dayKey, timeZone: ZONE },
  )
  assert.equal(twoSteps.days['2026-10-26']['model-a'].count, 2)
  assert.equal(twoSteps.days['2026-10-26']['model-a'].input, 30)
}

// ---------------------------------------------------------------------------
// 3 — frames: split, decode whole, decode from a byte offset
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)
  const artifact = artifactOf('session-frames', time, [
    [assistantMessage({ seq: 10, time, usage: usageSample() })],
    [assistantMessage({ seq: 11, time, usage: usageSample() }), assistantMessage({ seq: 12, time, usage: usageSample() })],
  ])
  const scan = splitZstdFrames(artifact)
  assert.equal(scan.frames.length, 3, 'a header frame plus one frame per append')
  assert.equal(scan.tornStart, undefined)
  for (const frame of scan.frames) assert.ok(frame.end > frame.start)

  const whole = decodeLogFrames(artifact, 0)
  assert.equal(whole.records.length, 4, 'the header line plus three events')
  assert.equal(whole.records[0].type, 'session')
  assert.equal(whole.offset, artifact.length)
  assert.equal(whole.torn, false)

  // The point of a byte offset: only the bytes after it are decoded.
  const second = decodeLogFrames(artifact.subarray(scan.frames[1].start), 0)
  assert.deepEqual(
    second.records.map(record => record.seq ?? record.type),
    [10, 11, 12],
  )
  const tail = decodeLogFrames(artifact, scan.frames[2].start)
  assert.deepEqual(
    tail.records.map(record => record.seq),
    [11, 12],
  )
  assert.equal(tail.offset, artifact.length)

  // A torn tail — an append that never finished — is reported, not folded.
  const torn = Buffer.concat([artifact, frameOf([assistantMessage({ seq: 13, time, usage: usageSample() })]).subarray(0, 12)])
  const tornScan = splitZstdFrames(torn)
  assert.equal(tornScan.frames.length, 3)
  assert.equal(tornScan.tornStart, artifact.length)
  const tornRead = decodeLogFrames(torn, 0)
  assert.equal(tornRead.torn, true)
  assert.equal(tornRead.offset, artifact.length, 'the offset stays on a frame boundary')
  assert.equal(tornRead.records.length, 4)

  // A frame whose plaintext was never newline-terminated is left for next time.
  const unfinished = Buffer.concat([artifact, zstdCompressSync(Buffer.from('{"type":"assistant/message","seq":99}'))])
  const unfinishedRead = decodeLogFrames(unfinished, 0)
  assert.equal(unfinishedRead.offset, artifact.length)
  assert.equal(unfinishedRead.records.some(record => record.seq === 99), false)

  // A file that is not a Zstandard container is an error, not a silent zero.
  assert.throws(() => splitZstdFrames(Buffer.from('not a zstd frame')), /invalid frame magic/u)
}

// ---------------------------------------------------------------------------
// 4 — reading an artifact from a byte offset, on disk
// ---------------------------------------------------------------------------
{
  const directory = mkdtempSync(join(tmpdir(), 'edh-usage-log-'))
  const path = join(directory, 'session.v4.jsonl.zstd')
  const time = noon(2026, 10, 26)
  const artifact = artifactOf('session-tail', time, [
    [assistantMessage({ seq: 10, time, usage: usageSample() })],
    [assistantMessage({ seq: 11, time, usage: usageSample() })],
  ])
  writeFileSync(path, artifact)
  const frames = splitZstdFrames(artifact).frames

  const cold = readLogTail(path)
  assert.equal(cold.from, 0)
  assert.equal(cold.size, artifact.length)
  assert.ok(cold.buffer.equals(artifact))

  const warm = readLogTail(path, frames[1].end)
  assert.equal(warm.from, frames[1].end)
  assert.ok(warm.buffer.equals(artifact.subarray(frames[1].end)), 'only the appended bytes are read')
  assert.equal(decodeLogFrames(warm.buffer, 0).records.length, 1)

  // A stored offset past the end of a file that shrank reads from the start,
  // and says so, so the caller recounts rather than reading a wrong slice.
  const shrunk = readLogTail(path, artifact.length + 500)
  assert.equal(shrunk.from, 0)
  assert.ok(shrunk.buffer.equals(artifact))
  rmSync(directory, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 5 — the cache: round trip through a file, written atomically
// ---------------------------------------------------------------------------
{
  const directory = mkdtempSync(join(tmpdir(), 'edh-usage-store-'))
  const path = join(directory, '.edh', 'usage.json')
  const store = createFileStore(path)
  assert.equal(store.path, path)
  assert.deepEqual(store.read(), { state: undefined }, 'a missing store is an empty cache, not an error')

  const cache = emptyCache(ZONE)
  cache.perSession['session-1'] = emptySessionEntry({ header: { id: 'session-1', createdAt: noon(2026, 10, 26) } })
  cache.perSession['session-1'].days['2026-10-26'] = {
    'model-a': { input: 10, output: 2, cacheRead: 3, cacheWrite: 4, count: 1 },
  }
  cache.perSession['session-1'].providers['model-a'] = 'provider-a'
  cache.perSession['session-1'].ios = undefined
  cache.updatedAt = noon(2026, 10, 28)
  assert.deepEqual(store.write(cache), { ok: true })

  const written = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(written.version, CACHE_VERSION)
  assert.equal(written.timeZone, ZONE)
  assert.deepEqual(Object.keys(written.perSession), ['session-1'])
  assert.ok(Array.isArray([]) && written.updatedAt === noon(2026, 10, 28))
  assert.ok('totals' in written, 'the file carries the totals block')
  assert.deepEqual(readdirSync(join(directory, '.edh')), [STORE_FILE], 'the temporary file is renamed away')

  const restored = normalizeCache(store.read().state, ZONE)
  assert.equal(restored.rebuilt, false)
  assert.equal(restored.dropped, 0)
  assert.deepEqual(restored.cache.perSession['session-1'].days, cache.perSession['session-1'].days)
  assert.equal(restored.cache.perSession['session-1'].caughtUp, false)
  rmSync(directory, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 6 — a corrupt or foreign cache is discarded, never thrown
// ---------------------------------------------------------------------------
{
  const directory = mkdtempSync(join(tmpdir(), 'edh-usage-corrupt-'))
  const path = join(directory, '.edh', 'usage.json')
  const store = createFileStore(path)
  writeFileSync(join(directory, 'placeholder'), '')
  store.write(emptyCache(ZONE))
  writeFileSync(path, '{ this is not json')
  const broken = store.read()
  assert.equal(broken.state, undefined)
  assert.match(broken.error, /not valid JSON/u)
  assert.equal(normalizeCache(broken.state, ZONE).rebuilt, true)
  assert.deepEqual(normalizeCache(broken.state, ZONE).cache.perSession, {})

  // A version bump, or a different clock zone, cannot reuse day keys.
  assert.equal(normalizeCache({ version: 0, perSession: {} }, ZONE).rebuilt, true)
  const foreign = normalizeCache({ version: CACHE_VERSION, timeZone: 'UTC', perSession: {} }, ZONE)
  assert.equal(foreign.rebuilt, true)
  assert.equal(foreign.cache.timeZone, ZONE)

  // One unreadable entry inside an otherwise good file is dropped on its own.
  const mixed = normalizeCache(
    {
      version: CACHE_VERSION,
      timeZone: ZONE,
      perSession: {
        good: { offset: 10, lastSeq: 3, days: { '2026-10-26': { 'model-a': { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, count: 1 } } } },
        bad: 'not an entry',
      },
    },
    ZONE,
  )
  assert.equal(mixed.dropped, 1)
  assert.deepEqual(Object.keys(mixed.cache.perSession), ['good'])
  assert.equal(mixed.cache.perSession.good.offset, 10)
  assert.equal(cacheTotals(mixed.cache).total, 2)
  rmSync(directory, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 7 — a Session's live event is folded once, and a later pass does not add it
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)
  const path = 'session-live'
  const harness = createHarness({ logs: [[path, artifactOf(path, time, [[assistantMessage({ seq: 10, time, usage: usageSample() })]])]] })
  const header = { id: path, createdAt: time }

  // Before any pass has folded this log, a live event schedules a pass instead
  // of folding out of order: the log's lower seqs are not in the cache yet.
  assert.equal(harness.usage.fold({ id: path, header }, assistantMessage({ seq: 20, time, usage: usageSample({ input: 7 }) })), false)
  await harness.scheduler.drain()

  const first = await harness.usage.view()
  assert.equal(first.totals.messages, 1, 'the log holds one settlement so far')
  assert.equal(first.totals.input, 100)
  assert.equal(first.backfill.state, 'done')
  assert.equal(first.backfill.sessionsTotal, 1)
  assert.equal(first.backfill.sessionsDone, 1)

  // Now the Session is caught up, so its next event folds live, at once.
  assert.equal(harness.usage.fold({ id: path, header }, assistantMessage({ seq: 21, time, turn: 1, step: 2, usage: usageSample({ input: 9 }) })), true)
  const live = await harness.usage.view()
  assert.equal(live.totals.messages, 2)
  assert.equal(live.totals.input, 109)

  // The writer appends that same event to the artifact; the next pass decodes
  // the new bytes and must not add it a second time.
  harness.logs.set(path, Buffer.concat([harness.logs.get(path), frameOf([assistantMessage({ seq: 21, time, turn: 1, step: 2, usage: usageSample({ input: 9 }) })])]))
  harness.usage.refresh()
  await harness.scheduler.drain()
  const after = await harness.usage.view()
  assert.equal(after.totals.messages, 2, 'the live event is counted once')
  assert.equal(after.totals.input, 109)
  assert.equal(harness.warnings.length, 0)

  // A second process over the same cache file makes the same claim.
  const second = createHarness({ store: createMemoryStore(harness.store.box.state), logs: [[path, harness.logs.get(path)]] })
  await second.usage.view()
  second.usage.start()
  await second.scheduler.drain()
  const reloaded = await second.usage.view()
  assert.equal(reloaded.totals.messages, 2)
  assert.equal(reloaded.totals.input, 109)
  harness.usage.dispose()
  second.usage.dispose()
}

// ---------------------------------------------------------------------------
// 8 — the pass enumerates, folds in order, and reports its own progress
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)
  const paths = ['session-a', 'session-b', 'session-c']
  const logs = new Map(
    paths.map((path, index) => [
      path,
      artifactOf(path, time, [
        [assistantMessage({ seq: 10, time, usage: usageSample({ input: 10 * (index + 1) }) })],
        [assistantMessage({ seq: 11, time, turn: 1, step: 2, usage: usageSample({ input: 1 }) })],
      ]),
    ]),
  )
  const harness = createHarness({ logs: [...logs.entries()], sessionsPerTick: 1 })
  assert.equal(harness.usage.progress().state, 'idle')
  harness.usage.start()
  assert.equal(harness.usage.progress().state, 'running', 'starting schedules a pass, it does not fold')
  await harness.scheduler.drain()
  const progress = harness.usage.progress()
  assert.equal(progress.state, 'done')
  assert.equal(progress.sessionsTotal, 3)
  assert.equal(progress.sessionsDone, 3)
  assert.equal(progress.errors, 0)
  assert.ok(progress.elapsedMs >= 0)
  const view = await harness.usage.view()
  assert.equal(view.totals.messages, 6)
  assert.equal(view.totals.sessions, 3)
  assert.equal(view.totals.input, 11 + 21 + 31)
  assert.equal(view.updatedAt, noon(2026, 10, 28))

  // A Session whose artifact cannot be read is a report, not an exception.
  const broken = createHarness({ logs: [], persistence: { list: async () => [{ header: { id: 'ghost' } }], locate: () => undefined } })
  broken.usage.start()
  await broken.scheduler.drain()
  assert.equal(broken.usage.progress().state, 'partial')
  assert.equal(broken.usage.progress().errors, 1)
  assert.match(broken.warnings.join('\n'), /could not be counted/u)
  assert.equal((await broken.usage.view()).totals.messages, 0)

  // A deployment with no persistence service still answers.
  const bare = createHarness({ noPersistence: true })
  bare.usage.start()
  await bare.scheduler.drain()
  const empty = await bare.usage.view()
  assert.equal(empty.ok, true)
  assert.equal(empty.totals.total, 0)
  assert.deepEqual(empty.days, [])
  assert.equal(empty.stats.longestSession, null)
}

// ---------------------------------------------------------------------------
// 9 — per-day, per-model aggregation and the share maths
// ---------------------------------------------------------------------------
{
  const cache = emptyCache(ZONE)
  const entry = emptySessionEntry({ header: { id: 'session-agg', createdAt: noon(2026, 10, 26) } })
  entry.providers = { 'model-a': 'provider-a', 'model-b': 'provider-b', 'model-c': 'provider-c' }
  entry.days = {
    '2026-10-26': {
      'model-a': { input: 300, output: 30, cacheRead: 70, cacheWrite: 0, count: 3 },
      'model-b': { input: 100, output: 10, cacheRead: 0, cacheWrite: 0, count: 1 },
    },
    '2026-10-27': {
      'model-a': { input: 400, output: 40, cacheRead: 60, cacheWrite: 0, count: 4 },
      'model-c': { input: 100, output: 0, cacheRead: 0, cacheWrite: 0, count: 1 },
    },
  }
  cache.perSession['session-agg'] = entry
  cache.perSession['session-empty'] = emptySessionEntry({ header: { id: 'session-empty', createdAt: noon(2026, 10, 26) } })

  const summary = summarizeCache(cache)
  assert.deepEqual(summary.days, ['2026-10-26', '2026-10-27'])
  assert.equal(summary.totals.sessions, 1, 'a Session with no usage is not counted as a Session')
  assert.equal(summary.totals.messages, 9)
  assert.equal(summary.totals.total, 300 + 30 + 70 + 100 + 10 + 400 + 40 + 60 + 100)

  const [first, second, third] = summary.byModel
  assert.equal(first.model, 'model-a')
  assert.equal(first.provider, 'provider-a')
  assert.equal(first.total, 900)
  assert.equal(first.messages, 7)
  assert.equal(second.model, 'model-b')
  assert.equal(second.total, 110)
  assert.equal(third.model, 'model-c')
  assert.equal(third.total, 100)
  assert.equal(summary.byModel.reduce((sum, row) => sum + row.total, 0), summary.totals.total)

  const shares = summary.byModel.reduce((sum, row) => sum + row.share, 0)
  assert.ok(Math.abs(shares - 100) <= 0.05, `shares sum to 100 within rounding (got ${shares})`)
  assert.equal(first.share, 81.08)
  assert.equal(second.share, 9.91)
  assert.equal(third.share, 9.01)

  // The per-day series carries the chart's shape: a model map plus the buckets.
  assert.deepEqual(summary.byDay[0], {
    date: '2026-10-26',
    byModel: { 'model-a': 400, 'model-b': 110 },
    total: 510,
    input: 400,
    output: 40,
    cacheRead: 70,
    cacheWrite: 0,
  })
  assert.equal(summary.byDay[1].total, 600)
  for (const day of summary.byDay) {
    assert.equal(day.total, day.input + day.output + day.cacheRead + day.cacheWrite)
    assert.equal(day.total, Object.values(day.byModel).reduce((sum, value) => sum + value, 0))
  }

  // The file's own totals block is never trusted over the buckets.
  cache.totals = { ...zeroBuckets(), messages: 0, sessions: 0 }
  assert.equal(summarizeCache(cache).totals.total, summary.totals.total)
}

// ---------------------------------------------------------------------------
// 10 — the session split: main + subagent must reconcile with the headline
// ---------------------------------------------------------------------------
{
  const cache = emptyCache(ZONE)
  // A main Session: the header records no origin at all, which is what the
  // Harness writes for every conversation a person started.
  const main = emptySessionEntry({ header: { id: 'session-main', createdAt: noon(2026, 10, 26) } })
  main.days = {
    '2026-10-26': {
      'model-a': { input: 100, output: 10, cacheRead: 5, cacheWrite: 1, count: 2 },
      'model-b': { input: 40, output: 4, cacheRead: 0, cacheWrite: 0, count: 1 },
    },
  }
  main.providers = { 'model-a': 'provider-a', 'model-b': 'provider-b' }
  main.lastTime = noon(2026, 10, 26) + 60000
  main.title = 'Main one'
  // A delegated child: the header says `origin: 'subagent'`.
  const child = emptySessionEntry({ header: { id: 'session-child', createdAt: noon(2026, 10, 27), origin: 'subagent' } })
  child.days = {
    '2026-10-27': { 'model-a': { input: 300, output: 30, cacheRead: 0, cacheWrite: 0, count: 5 } },
  }
  child.providers = { 'model-a': 'provider-a' }
  child.lastTime = noon(2026, 10, 27) + 7200000
  child.title = 'Child one'
  cache.perSession = { 'session-main': main, 'session-child': child }

  assert.equal(scopeOfSession(main), 'main')
  assert.equal(scopeOfSession(child), 'subagent')
  assert.equal(scopeOfSession({ origin: 'anything else' }), 'main', 'an unreadable origin is main')
  assert.equal(scopeOfSession(undefined), 'main')

  const view = usageView({ cache, timeZone: ZONE, now: noon(2026, 10, 28) })
  const { main: mainScope, subagent: subagentScope } = view.scopes
  assert.deepEqual(Object.keys(view.scopes), ['main', 'subagent'])
  for (const scope of [mainScope, subagentScope]) {
    assert.deepEqual(Object.keys(scope), ['totals', 'byModel', 'byDay', 'stats'])
    assert.deepEqual(Object.keys(scope.stats), ['peakDay', 'longestSession', 'currentStreakDays', 'longestStreakDays'])
  }
  assert.deepEqual(Object.keys(mainScope.totals), Object.keys(view.totals))
  assert.deepEqual(Object.keys(mainScope.byModel[0]), Object.keys(view.byModel[0]))
  assert.deepEqual(Object.keys(mainScope.byDay[0]), Object.keys(view.byDay[0]))

  // The headline is exactly the two halves summed, bucket by bucket.
  for (const field of ['input', 'output', 'cacheRead', 'cacheWrite', 'total', 'messages', 'sessions']) {
    assert.equal(
      mainScope.totals[field] + subagentScope.totals[field],
      view.totals[field],
      `totals.${field} reconciles`,
    )
  }
  // …and model by model.
  const models = new Set([...mainScope.byModel, ...subagentScope.byModel].map(row => row.model))
  assert.deepEqual([...models].sort(), view.byModel.map(row => row.model).sort())
  for (const model of models) {
    const headline = view.byModel.find(row => row.model === model)
    const sum = n => (mainScope.byModel.find(row => row.model === model)?.[n] ?? 0) + (subagentScope.byModel.find(row => row.model === model)?.[n] ?? 0)
    for (const field of ['input', 'output', 'cacheRead', 'cacheWrite', 'total', 'messages']) {
      assert.equal(sum(field), headline[field], `byModel ${model}.${field} reconciles`)
    }
  }
  // …and day by day, including each day's model series.
  const dates = new Set([...mainScope.byDay, ...subagentScope.byDay].map(day => day.date))
  assert.deepEqual([...dates].sort(), view.byDay.map(day => day.date))
  for (const date of dates) {
    const headline = view.byDay.find(day => day.date === date)
    const from = scope => scope.byDay.find(day => day.date === date)
    for (const field of ['total', 'input', 'output', 'cacheRead', 'cacheWrite']) {
      assert.equal((from(mainScope)?.[field] ?? 0) + (from(subagentScope)?.[field] ?? 0), headline[field], `byDay ${date}.${field} reconciles`)
    }
    for (const [model, value] of Object.entries(headline.byModel)) {
      assert.equal((from(mainScope)?.byModel[model] ?? 0) + (from(subagentScope)?.byModel[model] ?? 0), value, `byDay ${date}.byModel.${model} reconciles`)
    }
  }
  // The headline's own sums still hold, so nothing was lost between them.
  assert.equal(view.totals.total, view.byModel.reduce((sum, row) => sum + row.total, 0))
  assert.equal(view.totals.total, view.byDay.reduce((sum, day) => sum + day.total, 0))

  // Each scope keeps its own figures.
  assert.equal(mainScope.totals.sessions, 1)
  assert.equal(subagentScope.totals.sessions, 1)
  assert.equal(mainScope.stats.longestSession.id, 'session-main')
  assert.equal(subagentScope.stats.longestSession.id, 'session-child')
  assert.equal(mainScope.stats.peakDay.date, '2026-10-26')
  assert.equal(subagentScope.stats.peakDay.date, '2026-10-27')
  assert.equal(mainScope.stats.longestStreakDays, 1)
  assert.equal(subagentScope.stats.currentStreakDays, 1, 'the child ran yesterday, and today is still empty')

  // The page no longer needs telling to filter, so no note says so.
  for (const note of view.notes) assert.equal(/appl(y|ies) any filter/u.test(note), false)
  // A Session that records no origin is counted as main, and the view says so
  // rather than filing it somewhere silently.
  assert.ok(view.notes.some(note => /counted under main sessions/u.test(note)))
  assert.equal(countStray(cache), 1, 'only the main Session records no origin')
  function countStray(value) {
    let stray = 0
    for (const entry of Object.values(value.perSession)) if (entry.originRecorded !== true) stray += 1
    return stray
  }

  // The aggregates themselves filter, so a scope can be asked for directly.
  assert.equal(summarizeCache(cache, { scope: 'main' }).totals.total, mainScope.totals.total)
  assert.equal(cacheTotals(cache, { scope: 'subagent' }).messages, 5)
  assert.equal(longestSessionOf(cache, { scope: 'main' }).id, 'session-main')

  // An empty cache still carries both halves, so the page never has to guess.
  const blank = usageView({ cache: emptyCache(ZONE), timeZone: ZONE, now: noon(2026, 10, 28) })
  assert.equal(blank.scopes.main.totals.total, 0)
  assert.equal(blank.scopes.subagent.totals.total, 0)
  assert.deepEqual(blank.scopes.main.byDay, [])
  assert.equal(blank.scopes.main.stats.longestSession, null)
}

// ---------------------------------------------------------------------------
// 10 — streak rules
// ---------------------------------------------------------------------------
{
  const today = '2026-10-28'
  assert.deepEqual(streaksOf([], today), { current: 0, longest: 0, fromYesterday: false })

  // One day, today.
  assert.deepEqual(streaksOf([today], today), { current: 1, longest: 1, fromYesterday: false })

  // Today is still empty, so the streak counts back from yesterday — and says so.
  assert.deepEqual(streaksOf(['2026-10-26', '2026-10-27'], today), { current: 2, longest: 2, fromYesterday: true })

  // A gap breaks the run.
  assert.deepEqual(streaksOf(['2026-10-26', today], today), { current: 1, longest: 1, fromYesterday: false })

  // A long run ending today.
  const run = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', today]
  assert.deepEqual(streaksOf(run, today), { current: 5, longest: 5, fromYesterday: false })

  // The longest run can be somewhere else entirely.
  const older = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', today]
  assert.deepEqual(streaksOf(older, today), { current: 1, longest: 6, fromYesterday: false })

  // Neither today nor yesterday: no current streak, even with history.
  assert.deepEqual(streaksOf(['2026-10-01'], today), { current: 0, longest: 1, fromYesterday: false })

  // Across a month boundary, and tolerating junk keys.
  assert.deepEqual(streaksOf(['2026-09-30', '2026-10-01', 'nonsense'], '2026-10-01'), {
    current: 2,
    longest: 2,
    fromYesterday: false,
  })
}

// ---------------------------------------------------------------------------
// 11 — the longest Session: its duration, its title, and no fabrication
// ---------------------------------------------------------------------------
{
  const cache = emptyCache(ZONE)
  const long = emptySessionEntry({ header: { id: 'session-long', createdAt: noon(2026, 10, 26) } })
  long.lastTime = noon(2026, 10, 26) + 3 * 60 * 60 * 1000
  long.title = 'The long one'
  const short = emptySessionEntry({ header: { id: 'session-short', createdAt: noon(2026, 10, 26) } })
  short.lastTime = noon(2026, 10, 26) + 60 * 1000
  short.title = 'The short one'
  const unread = emptySessionEntry({ header: { id: 'session-unreadable', createdAt: noon(2026, 10, 26) } })
  cache.perSession = { 'session-long': long, 'session-short': short, 'session-unreadable': unread }
  assert.deepEqual(longestSessionOf(cache), {
    id: 'session-long',
    title: 'The long one',
    durationMs: 3 * 60 * 60 * 1000,
    startedAt: noon(2026, 10, 26),
  })
  assert.equal(longestSessionOf(emptyCache(ZONE)), null)

  // A Session with no title in its log is named by id, and asked for a title
  // through the query service exactly when it is the longest one.
  long.title = ''
  const asked = []
  const harness = createHarness({
    store: createMemoryStore(),
    getSessionQuery: {
      readTitleSnapshots: async ids => {
        asked.push(ids)
        return [{ status: 'fulfilled', value: { session: { id: ids[0] }, title: 'Recovered title' } }]
      },
    },
  })
  harness.store.write(cache)
  const reloaded = createHarness({ store: createMemoryStore(harness.store.box.state), getSessionQuery: undefined })
  assert.deepEqual(asked, [])
  const view = await reloaded.usage.view()
  assert.equal(view.stats.longestSession.id, 'session-long')
  assert.equal(view.stats.longestSession.title, '', 'no title is invented')
  assert.ok(view.notes.some(note => /named by its id/u.test(note)))
  reloaded.usage.dispose()

  // A query service that has no title either is asked once, not on every read.
  const askedAgain = []
  const stopper = createHarness({
    store: createMemoryStore(harness.store.box.state),
    getSessionQuery: {
      readTitleSnapshots: async ids => {
        askedAgain.push(...ids)
        return [{ status: 'fulfilled', value: { session: { id: ids[0] } } }]
      },
    },
  })
  await stopper.usage.view()
  await stopper.usage.view()
  await stopper.usage.view()
  assert.deepEqual(askedAgain, ['session-long'], 'one attempt per Session, ever')
  assert.equal((await stopper.usage.view()).stats.longestSession.title, '')
  stopper.usage.dispose()
  harness.usage.dispose()
}

// ---------------------------------------------------------------------------
// 12 — the title fallback through sessionQuery
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)
  const later = time + 90 * 60 * 1000
  const logs = [['session-titled', artifactOf('session-titled', time, [[assistantMessage({ seq: 10, time: later, usage: usageSample() })]])]]
  const asked = []
  const harness = createHarness({
    logs,
    getSessionQuery: {
      readTitleSnapshots: async ids => {
        asked.push(...ids)
        return [{ status: 'fulfilled', value: { session: { id: ids[0] }, title: 'A read title' } }]
      },
    },
  })
  harness.usage.start()
  await harness.scheduler.drain()
  const view = await harness.usage.view()
  assert.deepEqual(asked, ['session-titled'], 'only the longest Session is asked, once')
  assert.equal(view.stats.longestSession.title, 'A read title')
  const again = await harness.usage.view()
  assert.deepEqual(asked, ['session-titled'], 'the recovered title is kept, not re-read')
  assert.equal(again.stats.longestSession.title, 'A read title')
  harness.usage.dispose()
}

// ---------------------------------------------------------------------------
// 12b — a log that cannot be read still answers through the projection cache
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)
  const later = time + 45 * 60 * 1000
  const harness = createHarness({
    persistence: {
      list: async () => [{ header: { id: 'session-blind', createdAt: time }, sizeBytes: 512 }],
      // Neither a byte read nor a handle read is possible.
      locate: () => undefined,
    },
    getProjectionCache: () => ({
      cachedSnapshot: (meta, keys) => ({ asOfSeq: 9, values: { timeContext: { lastMessageTime: later } } }),
    }),
  })
  harness.usage.start()
  await harness.scheduler.drain()
  const view = await harness.usage.view()
  assert.equal(view.backfill.state, 'partial', 'an unreadable log is reported, not hidden')
  assert.equal(view.backfill.errors, 1)
  assert.equal(view.totals.total, 0)
  assert.equal(view.stats.longestSession.id, 'session-blind')
  assert.equal(view.stats.longestSession.durationMs, 45 * 60 * 1000, 'the duration comes from the cached last message time')
  assert.equal(view.stats.longestSession.title, '', 'and no title is invented for it')
  assert.ok(view.notes.some(note => /could not be read/u.test(note)))
  assert.match(harness.warnings.join('\n'), /could not be counted/u)
  harness.usage.dispose()
}

// ---------------------------------------------------------------------------
// 13 — the view: exactly the documented shape
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)
  const logs = [['session-shape', artifactOf('session-shape', time, [[assistantMessage({ seq: 10, time, usage: usageSample({ input: 10, output: 5 }) })]])]]
  const harness = createHarness({ logs, now: () => noon(2026, 10, 26) })
  harness.usage.start()
  await harness.scheduler.drain()
  const view = await harness.usage.view()
  assert.deepEqual(Object.keys(view), [
    'ok',
    'timeZone',
    'totals',
    'byModel',
    'byDay',
    'days',
    'stats',
    'scopes',
    'backfill',
    'updatedAt',
    'notes',
  ])
  assert.equal(view.ok, true)
  assert.equal(view.timeZone, ZONE)
  assert.deepEqual(Object.keys(view.totals), ['input', 'output', 'cacheRead', 'cacheWrite', 'total', 'messages', 'sessions'])
  assert.deepEqual(Object.keys(view.stats), [
    'peakDay',
    'longestSession',
    'currentStreakDays',
    'longestStreakDays',
    'firstDay',
    'lastDay',
  ])
  assert.deepEqual(Object.keys(view.backfill).sort(), ['elapsedMs', 'errors', 'sessions', 'sessionsDone', 'sessionsTotal', 'state'])
  assert.deepEqual(Object.keys(view.byModel[0]), ['model', 'provider', 'input', 'output', 'cacheRead', 'cacheWrite', 'total', 'messages', 'share'])
  assert.deepEqual(Object.keys(view.byDay[0]), ['date', 'byModel', 'total', 'input', 'output', 'cacheRead', 'cacheWrite'])

  // Every note is a plain sentence, and none of them is an empty string.
  for (const note of view.notes) {
    assert.equal(typeof note, 'string')
    assert.ok(note.length > 20)
    assert.match(note, /[.]$/u)
  }
  // The coverage limits are stated, not papered over.
  assert.ok(view.notes.some(note => /subagents included/u.test(note)))
  assert.ok(view.notes.some(note => /not the provider total/u.test(note)))
  assert.ok(view.notes.some(note => /Title generation, compaction summaries and web search/u.test(note)))
  assert.ok(view.notes.some(note => note.includes(ZONE)))
  assert.equal(view.stats.peakDay.date, '2026-10-26')
  assert.equal(view.stats.firstDay, '2026-10-26')
  assert.equal(view.stats.lastDay, '2026-10-26')
  assert.equal(view.stats.currentStreakDays, 1)
  assert.equal(view.stats.longestStreakDays, 1)

  // An empty cache answers the same shape instead of a hole.
  const blank = usageView({ cache: emptyCache(ZONE), timeZone: ZONE, now: noon(2026, 10, 26) })
  assert.deepEqual(blank.days, [])
  assert.equal(blank.totals.total, 0)
  assert.equal(blank.stats.peakDay, null)
  assert.equal(blank.stats.firstDay, null)
  assert.equal(blank.stats.currentStreakDays, 0)
  assert.equal(blank.updatedAt, null)
  assert.match(machineTimeZone(), /^[A-Za-z]+\/[A-Za-z_]+$|^UTC$/u)
  assert.ok(usageNotes({ timeZone: ZONE }).length >= 4)
  harness.usage.dispose()
}

// ---------------------------------------------------------------------------
// 14 — the route: GET is the view, POST runs one action
// ---------------------------------------------------------------------------
{
  const time = noon(2026, 10, 26)
  const harness = createHarness({ logs: [['session-route', artifactOf('session-route', time, [[assistantMessage({ seq: 10, time, usage: usageSample() })]])]] })
  harness.usage.start()
  await harness.scheduler.drain()

  const read = await usageResponse(get(), { usage: harness.usage })
  assert.equal(read.status, 200)
  const body = await read.json()
  assert.equal(body.ok, true)
  assert.equal(body.totals.messages, 1)
  assert.equal(body.byModel[0].model, 'model-a')

  const refreshed = await usageResponse(post({ action: 'refresh' }), { usage: harness.usage })
  assert.equal(refreshed.status, 200)
  const refreshedBody = await refreshed.json()
  assert.equal(refreshedBody.ok, true)
  assert.equal(refreshedBody.report.action, 'refresh')
  assert.equal(refreshedBody.report.ok, true)
  assert.equal(harness.usage.progress().state, 'running', 'refresh kicks a pass and answers at once')
  await harness.scheduler.drain()
  assert.equal((await harness.usage.view()).totals.messages, 1, 'a refresh does not double count')

  const rebuilt = await usageResponse(post({ action: 'rebuild' }), { usage: harness.usage })
  assert.equal(rebuilt.status, 200)
  assert.equal((await rebuilt.json()).report.action, 'rebuild')
  await harness.scheduler.drain()
  const afterRebuild = await harness.usage.view()
  assert.equal(afterRebuild.totals.messages, 1, 'a rebuild recounts the log from the start')
  assert.equal(harness.warnings.length, 0)
  harness.usage.dispose()
}

// ---------------------------------------------------------------------------
// 15 — the route never answers 500, and never leaks a path
// ---------------------------------------------------------------------------
{
  const usage = { view: async () => usageView({ timeZone: ZONE }), refresh: () => ({}), rebuild: () => ({}), progress: () => ({}) }

  const noAction = await usageResponse(post({}), { usage })
  assert.equal(noAction.status, 400)
  const noActionBody = await noAction.json()
  assert.equal(noActionBody.ok, false)
  assert.equal(noActionBody.reason, 'bad-input')
  assert.match(noActionBody.message, /refresh or rebuild/u)

  const unknown = await usageResponse(post({ action: 'launch' }), { usage })
  assert.equal(unknown.status, 400)
  assert.equal((await unknown.json()).reason, 'unknown-action')

  const wrongMethod = await usageResponse(new Request(`http://host${USAGE_PATH}`, { method: 'PUT' }), { usage })
  assert.equal(wrongMethod.status, 405)
  assert.equal((await wrongMethod.json()).ok, false)

  const malformed = await usageResponse(new Request(`http://host${USAGE_PATH}`, { method: 'POST', body: 'not json' }), { usage })
  assert.equal(malformed.status, 400)

  const unavailable = await usageResponse(get(), {})
  assert.equal(unavailable.status, 200)
  assert.equal((await unavailable.json()).reason, 'unavailable')

  // A thrown error is a report with a message, never a 500 and never a stack.
  const failing = {
    view: async () => {
      throw new Error('the cache is on fire')
    },
    refresh: () => ({}),
    rebuild: () => ({}),
    progress: () => ({}),
  }
  const failed = await usageResponse(get(), { usage: failing })
  assert.equal(failed.status, 200)
  const failedBody = await failed.json()
  assert.equal(failedBody.ok, false)
  assert.equal(failedBody.reason, 'failed')
  assert.match(failedBody.message, /the cache is on fire/u)
  assert.deepEqual(Object.keys(failedBody).sort(), ['message', 'ok', 'reason'])

  const failingPost = await usageResponse(post({ action: 'refresh' }), { usage: failing })
  assert.equal(failingPost.status, 200)
  assert.equal((await failingPost.json()).ok, false)

  // The answer names no filesystem path, and no stored secret.
  const clean = await (await usageResponse(get(), { usage })).text()
  assert.equal(/[A-Za-z]:\\/u.test(clean), false)
  assert.equal(clean.includes('.edh'), false)
  assert.equal(clean.includes(USAGE_PATH), false)
  assert.equal(/"path"/u.test(clean), false)
}

// ---------------------------------------------------------------------------
// 16 — registration: one route, a global listener, optional persistence
// ---------------------------------------------------------------------------
{
  const { ctx, routes, disposers, warnings, listeners } = createContext()
  const previous = process.env.DSH_PROFILE_DIR
  process.env.DSH_PROFILE_DIR = mkdtempSync(join(tmpdir(), 'edh-usage-row-'))
  try {
    assert.equal(resolveStorePath(process.env, 'C:\\home'), join(process.env.DSH_PROFILE_DIR, '.edh', 'usage.json'))
    apply(ctx)
    assert.equal(routes.length, 1)
    assert.equal(routes[0].path, '/api/edh.usage')
    assert.deepEqual(routes[0].methods, ['GET', 'POST'])
    assert.equal(routes[0].requestBody, 'buffered')
    assert.equal(typeof routes[0].fetch, 'function')
    assert.deepEqual(ctx.injected, ['sessionPersistence'], 'persistence is taken as an optional contract')
    assert.equal(listeners.length, 1)
    assert.equal(listeners[0].name, 'session/event')
    assert.deepEqual(listeners[0].options, { global: true }, 'every Session is visible, not just this scope')
    assert.equal(typeof listeners[0].listener, 'function')

    // Nothing is written until there is something to write: no persistence
    // service, no events, so the view is empty and the profile stays untouched.
    const storePath = join(process.env.DSH_PROFILE_DIR, '.edh', 'usage.json')
    const answered = await routes[0].fetch(get())
    assert.equal(answered.status, 200)
    const idle = await answered.json()
    assert.equal(idle.ok, true)
    assert.equal(idle.totals.total, 0)
    assert.equal(existsSync(storePath), false, 'an idle row writes nothing')

    // A live event folds into the cache, and the cache lands in the profile.
    listeners[0].listener({ id: 'session-unseen' }, assistantMessage({ seq: 1, time: noon(2026, 10, 26), usage: usageSample() }))
    for (const dispose of disposers) dispose()
    assert.equal(routes.length, 0, 'turning the row off removes the route')
    assert.deepEqual(warnings, [])
    const written = JSON.parse(readFileSync(storePath, 'utf8'))
    assert.equal(written.version, CACHE_VERSION)
    assert.equal(written.timeZone, machineTimeZone())
    assert.deepEqual(Object.keys(written.perSession), ['session-unseen'])
  } finally {
    if (previous === undefined) delete process.env.DSH_PROFILE_DIR
    else process.env.DSH_PROFILE_DIR = previous
  }
}

// ---------------------------------------------------------------------------
// 17 — a refused route registration leaves the rest of EDH running
// ---------------------------------------------------------------------------
{
  const { ctx, warnings } = createContext()
  ctx.connection.fetch = {
    register() {
      throw new Error('this deployment refuses the path')
    },
  }
  apply(ctx)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /route registration failed/u)
}

console.log('edh usage: all checks passed')

