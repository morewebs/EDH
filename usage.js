/**
 * EDH feature: `usage` — token accounting across every Session on this machine.
 *
 * The question this answers is "where did my tokens go?", across every stored
 * Session, with no per-Session digging. Nothing in the shipped Harness answers
 * it: `tokenUsage` is a *per-Session* projection (`deriveTurnTokenUsage` folds
 * one Turn's attempts for one conversation), and there is no cross-Session
 * total, no per-model breakdown and no per-day series anywhere in the runtime.
 * So this row folds the Session logs itself.
 *
 * Verified against the installed asar and against this machine's own logs
 * rather than guessed:
 *
 * - **A usage sample is `{inputTokens, outputTokens, totalTokens?,
 *   cacheReadTokens?, cacheWriteTokens?, reasoningTokens?}`**, carried on an
 *   `assistant/message` event as `data.usage`, with the model route at
 *   `data.message.source = {kind: 'model', provider, model}`. `turn/end`
 *   carries no rollup. In a real decoded event:
 *   `{"type":"assistant/message","seq":17,"time":1793214741969,…,
 *   "usage":{"inputTokens":13882,"outputTokens":215,"totalTokens":17041,
 *   "cacheReadTokens":2944}}`.
 * - **The four buckets are counted, not `totalTokens`.** Σ(input+output+
 *   cacheRead+cacheWrite) disagrees with ΣtotalTokens on 928 events in this
 *   profile, because `totalTokens` is the provider's own arithmetic. The cache
 *   fields are optional and count as zero when absent.
 * - **One sample per `(turn, step)`.** The shipped `tokenUsage` projection
 *   keeps a single "last" slot and *replaces* it: a replayed
 *   `assistant/message`/`assistant/attempt` for the same `(turn, step)`
 *   subtracts the previous sample before adding the new one, and
 *   `llm/retry-started` clears the slot so the retried attempt adds instead.
 *   This fold mirrors that rule exactly (including the slot, which is persisted
 *   so an incremental pass cannot break it), otherwise a retry would double
 *   count.
 * - **Coverage.** The main loop is complete: the only assistant messages
 *   without usage are `interrupted: true` ones. Title generation, compaction
 *   summaries and web search record no usage at all, so these totals are the
 *   conversation's own tokens and the view says so.
 * - **Enumerate with `ctx.sessionPersistence.list()`** — one header frame per
 *   stored Session, 153 ms for 200 of them — and read a log with a byte
 *   offset: see the Zstandard note below.
 * - **`time` is epoch milliseconds, UTC, with no zone stored.** Usage is
 *   bucketed by *this machine's* local date, and the view reports the zone.
 * - **Live updates come from `session/event`** with `{ global: true }`: a
 *   post-commit feed for every Session including subagents, so totals move
 *   without polling.
 * - **The main/subagent split is the header's `origin`.** A delegated child
 *   records `origin: 'subagent'`; a main Session records no `origin` at all,
 *   and a fork keeps `parentSession` with no origin, so the parent link must
 *   never be read as "subagent". The view answers `scopes: { main, subagent }`
 *   beside the headline and the two halves add up to it exactly — the page can
 *   narrow without another read, and a filter that disagreed with the number
 *   above it would be worse than none.
 *
 * A full fold of this profile is 200 logs, 189 MB compressed / 761 MB of
 * plaintext, 247,805 events and 14.7 s single-threaded, so it may never run in
 * one blocking pass. Instead:
 *
 * - a **persistent cache** at `<profile>/.edh/usage.json` (beside the MCP
 *   store) holds per-Session day/model buckets *and the byte offset already
 *   decoded*, written atomically through a temporary file and a rename;
 * - **backfill** runs in the background, a couple of Sessions per tick, and
 *   only decodes the bytes appended since the last pass — the warm delta is
 *   about 0.25 s for everything new;
 * - **live events** fold immediately into the same cache and raise the
 *   Session's `lastSeq`, so the next backfill pass drops what is already
 *   counted instead of adding it twice.
 *
 * The live/backfill boundary is the one place where an incremental fold can go
 * quietly wrong, so it has an invariant: a Session's events are folded live
 * only once a pass has folded its log through the end (`caughtUp`). Until then
 * the live event still schedules a pass, and that pass reads the whole log in
 * order. The reason is ordering, not bookkeeping: dropping `seq <= lastSeq`
 * is exact only when every lower `seq` was already folded, and a Session that
 * started before EDH loaded has hundreds of lower `seq`s that were not.
 *
 * ## The log container (why byte offsets are valid)
 *
 * A Session log is Zstandard with **one frame per append**, magic
 * `28 B5 2F FD`. `zlib.zstdDecompressSync` on the whole file returns only the
 * FIRST frame, so the file has to be split first — and splitting by searching
 * for magic bytes would be wrong, because those four bytes can appear inside a
 * compressed block. `splitZstdFrames` therefore walks each frame header and
 * block header structurally, exactly as the shipped JSONL backend's
 * `scanZstdFrames` does, and reports a torn tail instead of guessing.
 *
 * Frames are independent and the file is append-only, so a byte offset that
 * lands on a frame boundary stays valid forever: that is what makes the warm
 * delta read possible. Every frame's plaintext ends with a newline (the writer
 * appends `lines.join('\n') + '\n'`), so a frame whose plaintext does not end
 * with one was never completed and its bytes are left for the next pass.
 *
 * Nothing here may take EDH down: a missing store, a corrupt cache, a log this
 * build cannot decode, a Session that disappears between the listing and the
 * read — each is a recorded error and a warning, and every other Session keeps
 * counting. The route never answers 500.
 */

import { closeSync, fstatSync, mkdirSync, openSync, readFileSync, readSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'

export const name = 'edh-usage'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const USAGE_PATH = '/api/edh.usage'

/** Directory EDH owns inside the active profile directory. */
export const STORE_DIRECTORY = '.edh'

/** The usage cache's filename inside {@link STORE_DIRECTORY}. */
export const STORE_FILE = 'usage.json'

/**
 * The cache layout version.
 *
 * A file written by an older shape is discarded rather than migrated: the
 * cache is a fold of logs that are still on disk, so re-deriving it costs one
 * background pass and never loses a fact.
 */
export const CACHE_VERSION = 1

/** The Zstandard frame magic, little-endian as it appears in the artifact. */
const ZSTD_MAGIC = 0xfd2fb528

/** The Session event that carries an assistant message and its usage sample. */
const ASSISTANT_MESSAGE = 'assistant/message'

/** The Session event that carries one raw model attempt, which may also report usage. */
const ASSISTANT_ATTEMPT = 'assistant/attempt'

/** The event that closes a replacement slot, so a retried attempt adds instead. */
const RETRY_STARTED = 'llm/retry-started'

/** The event whose `data.title` is the Session's newest title. */
const TITLE_EVENT = 'session/title'

/** How many Sessions one background tick folds before yielding. */
export const SESSIONS_PER_TICK = 2

/** How long one background tick may spend folding before it yields anyway. */
export const TICK_BUDGET_MS = 40

/** How often a live fold's cache write may happen, at most. */
const SAVE_INTERVAL_MS = 2000

/** The model bucket reported when a sample carries no readable route. */
const UNKNOWN_ROUTE = { provider: 'unknown', model: 'unknown' }

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** One error's text, whatever was thrown. */
function messageOf(error) {
  const message = error?.message ?? error
  return typeof message === 'string' ? message : String(message)
}

/** Whether a value is a plain JSON record: an object, not an array, not null. */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether a value is a usable token count: a non-negative safe integer. */
function isCount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** A zero bucket, in the short names the cache stores. */
export function zeroBuckets() {
  return { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
}

/** The counted total of one bucket: all four kinds, never `totalTokens`. */
export function bucketTotal(bucket) {
  if (!isRecord(bucket)) return 0
  const total =
    (isCount(bucket.input) ? bucket.input : 0) +
    (isCount(bucket.output) ? bucket.output : 0) +
    (isCount(bucket.cacheRead) ? bucket.cacheRead : 0) +
    (isCount(bucket.cacheWrite) ? bucket.cacheWrite : 0)
  return total
}

/** Whether two buckets hold the same four counts. */
export function bucketsEqual(left, right) {
  return (
    (left?.input ?? 0) === (right?.input ?? 0) &&
    (left?.output ?? 0) === (right?.output ?? 0) &&
    (left?.cacheRead ?? 0) === (right?.cacheRead ?? 0) &&
    (left?.cacheWrite ?? 0) === (right?.cacheWrite ?? 0)
  )
}

// ---------------------------------------------------------------------------
// The Zstandard container: frames, then records
// ---------------------------------------------------------------------------

/**
 * Split a Session artifact into complete Zstandard frames.
 *
 * The walk is structural, not a magic-byte search: after the magic comes the
 * frame header descriptor, the optional window/dictionary/content-size bytes,
 * then block headers until a block marks itself as the last, then the optional
 * checksum. A frame that runs out of bytes is a *torn tail* — an append that
 * never resolved — and is reported rather than dropped silently.
 * @param buffer - the bytes of the artifact, or of the delta being read.
 * @returns the complete frames as `{start, end}` ranges, and where a torn tail begins.
 * @throws when the structure is not a Zstandard frame container.
 */
export function splitZstdFrames(buffer) {
  const frames = []
  if (buffer === undefined || buffer === null) return { frames }
  let offset = 0
  while (offset < buffer.length) {
    const start = offset
    if (buffer.length - offset < 4) return { frames, tornStart: start }
    if (buffer.readUInt32LE(offset) !== ZSTD_MAGIC) {
      throw new Error(`corrupt Session log: invalid frame magic at byte ${offset}`)
    }
    offset += 4
    if (offset === buffer.length) return { frames, tornStart: start }
    const descriptor = buffer.readUInt8(offset)
    offset += 1
    if ((descriptor & 24) !== 0) {
      throw new Error(`corrupt Session log: reserved frame-header bit at byte ${offset - 1}`)
    }
    const contentSizeFlag = descriptor >>> 6
    const singleSegment = (descriptor & 32) !== 0
    const checksum = (descriptor & 4) !== 0
    const dictionaryFlag = descriptor & 3
    const dictionaryBytes = dictionaryFlag === 3 ? 4 : dictionaryFlag
    const contentSizeBytes = contentSizeFlag === 0 ? (singleSegment ? 1 : 0) : 1 << contentSizeFlag
    const remainingHeaderBytes = (singleSegment ? 0 : 1) + dictionaryBytes + contentSizeBytes
    if (buffer.length - offset < remainingHeaderBytes) return { frames, tornStart: start }
    offset += remainingHeaderBytes
    for (;;) {
      if (buffer.length - offset < 3) return { frames, tornStart: start }
      const blockHeader = buffer.readUIntLE(offset, 3)
      offset += 3
      const lastBlock = (blockHeader & 1) !== 0
      const blockType = (blockHeader >>> 1) & 3
      const blockSize = blockHeader >>> 3
      if (blockType === 3) {
        throw new Error(`corrupt Session log: reserved block type at byte ${offset - 3}`)
      }
      // A raw (uncompressed) block stores its size as one byte; a compressed or
      // run-length block stores it in the header itself.
      const payloadBytes = blockType === 1 ? 1 : blockSize
      if (buffer.length - offset < payloadBytes) return { frames, tornStart: start }
      offset += payloadBytes
      if (lastBlock) break
    }
    if (checksum) {
      if (buffer.length - offset < 4) return { frames, tornStart: start }
      offset += 4
    }
    frames.push({ start, end: offset })
  }
  return { frames }
}

/**
 * Decode the records a Session artifact holds from one byte offset on.
 *
 * `zstdDecompressSync` decodes one frame, so each complete frame is decoded on
 * its own and its plaintext appended. A frame whose plaintext does not end with
 * a newline was never completed as a batch and its bytes are left unconsumed:
 * the returned offset is always a frame boundary, which is what keeps the
 * saved offset valid across restarts.
 * @param buffer - the artifact's bytes.
 * @param from - the offset already folded, which must be a frame boundary.
 * @returns the decoded records, the new offset, and whether a torn tail was seen.
 * @throws when a frame cannot be decoded or a record is not JSON.
 */
export function decodeLogFrames(buffer, from = 0) {
  const start = isCount(from) && from <= buffer.length ? from : 0
  const view = buffer.subarray(start)
  const scan = splitZstdFrames(view)
  const records = []
  let offset = start
  for (const frame of scan.frames) {
    let text
    try {
      text = zstdDecompressSync(view.subarray(frame.start, frame.end)).toString('utf8')
    } catch (error) {
      throw new Error(`corrupt Session log: frame at byte ${start + frame.start} failed to decode: ${messageOf(error)}`)
    }
    // Every append writes complete newline-terminated records; anything else is
    // a batch that has not finished landing.
    if (!text.endsWith('\n')) break
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed === '') continue
      let record
      try {
        record = JSON.parse(trimmed)
      } catch (error) {
        throw new Error(`corrupt Session log: record at byte ${start + frame.start} is not JSON: ${messageOf(error)}`)
      }
      records.push(record)
    }
    offset = start + frame.end
  }
  return { records, offset, torn: scan.tornStart !== undefined }
}

/**
 * Read a Session artifact from one byte offset on.
 *
 * Only the bytes after the saved offset are read, which is the whole point of
 * keeping a byte offset: a warm pass over this profile touches the new tail of
 * each log instead of 189 MB of compressed history. A file shorter than the
 * offset has been rewritten underneath us; the read then starts at zero and the
 * caller counts that Session again.
 * @param path - the absolute path of the artifact.
 * @param from - the byte offset already folded.
 * @returns the bytes read, the offset they start at, and the artifact's size.
 */
export function readLogTail(path, from = 0) {
  const handle = openSync(path, 'r')
  try {
    const size = fstatSync(handle).size
    const start = isCount(from) && from <= size ? from : 0
    const length = size - start
    const buffer = Buffer.alloc(length)
    let filled = 0
    while (filled < length) {
      const read = readSync(handle, buffer, filled, length - filled, start + filled)
      if (read <= 0) break
      filled += read
    }
    return { buffer: buffer.subarray(0, filled), from: start, size }
  } finally {
    closeSync(handle)
  }
}

// ---------------------------------------------------------------------------
// Local dates
// ---------------------------------------------------------------------------
/**
 * A local-date key builder for one IANA zone.
 *
 * The log stores epoch milliseconds with no zone, so a day is whatever this
 * machine's clock called that instant. The formatter is built once per zone
 * because `Intl.DateTimeFormat` construction is the expensive part.
 * @param timeZone - the IANA zone; an unknown one falls back to the machine zone.
 * @returns `(milliseconds) => 'YYYY-MM-DD'`.
 */
export function createDayKey(timeZone) {
  let formatter
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })
  }
  return milliseconds => {
    if (!isCount(milliseconds)) return undefined
    const parts = formatter.formatToParts(new Date(milliseconds))
    const part = type => parts.find(entry => entry.type === type)?.value ?? ''
    const year = part('year')
    const month = part('month')
    const day = part('day')
    if (year === '' || month === '' || day === '') return undefined
    return `${year}-${month}-${day}`
  }
}

/** This machine's IANA zone, or `UTC` when the runtime cannot name one. */
export function machineTimeZone() {
  try {
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone
    return typeof zone === 'string' && zone !== '' ? zone : 'UTC'
  } catch {
    return 'UTC'
  }
}

/** One `YYYY-MM-DD` key as a UTC midnight stamp, for arithmetic between days. */
function dayStamp(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(String(key ?? ''))
  if (match === null) return undefined
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** The `YYYY-MM-DD` key one day before another. */
function previousDay(key) {
  const stamp = dayStamp(key)
  if (stamp === undefined) return undefined
  const date = new Date(stamp - 86400000)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

/** Whole days between two keys, or `undefined` when either is not a date. */
function daysBetween(left, right) {
  const from = dayStamp(left)
  const to = dayStamp(right)
  if (from === undefined || to === undefined) return undefined
  return Math.round((to - from) / 86400000)
}

// ---------------------------------------------------------------------------
// The fold: one Session's records into day/model buckets
// ---------------------------------------------------------------------------

/**
 * One empty per-Session cache entry.
 *
 * `days` is the accounting, `offset`/`lastSeq` are the read position, `slot` is
 * the `(turn, step)` replacement slot the shipped projection keeps, and
 * `caughtUp` says whether a pass has folded this log through its end — the
 * precondition for folding newer events live. The slot is persisted because an
 * incremental pass starts a new fold: without it, a replay landing in a later
 * append would count twice.
 * @param options - the Session's header, when there is one.
 */
export function emptySessionEntry(options = {}) {
  const header = isRecord(options.header) ? options.header : {}
  const entry = {
    offset: 0,
    lastSeq: 0,
    bytes: 0,
    days: {},
    firstTime: null,
    lastTime: null,
    createdAt: isCount(header.createdAt) ? header.createdAt : null,
    origin: header.origin === 'subagent' ? 'subagent' : 'main',
    originRecorded: header.origin === 'subagent' || header.origin === 'main',
    title: '',
    providers: {},
    slot: null,
    caughtUp: false,
  }
  return entry
}

/** The usage sample one assistant event reports, if any. */
function usageOf(record) {
  const data = record?.data
  if (!isRecord(data)) return undefined
  if (record.type === ASSISTANT_MESSAGE) {
    if (isRecord(data.usage)) return data.usage
    return streamUsage(data.stream)
  }
  if (record.type === ASSISTANT_ATTEMPT) return streamUsage(data.stream)
  return undefined
}

/**
 * The last raw `usage` chunk of one durable assistant stream — the same read
 * the shipped `lastAssistantStreamChunk(stream, 'usage')` makes, scanning
 * backwards and stopping at the first hit.
 */
function streamUsage(stream) {
  if (!Array.isArray(stream)) return undefined
  for (let index = stream.length - 1; index >= 0; index -= 1) {
    const record = stream[index]
    if (record?.type !== 'chunk') continue
    if (record.chunk?.type !== 'usage') continue
    return isRecord(record.chunk.usage) ? record.chunk.usage : undefined
  }
  return undefined
}

/** The four buckets of one usage sample, with the optional cache fields as zero. */
function bucketsOf(usage) {
  if (!isRecord(usage)) return undefined
  if (!isCount(usage.inputTokens) || !isCount(usage.outputTokens)) return undefined
  return {
    input: usage.inputTokens,
    output: usage.outputTokens,
    cacheRead: isCount(usage.cacheReadTokens) ? usage.cacheReadTokens : 0,
    cacheWrite: isCount(usage.cacheWriteTokens) ? usage.cacheWriteTokens : 0,
  }
}

/**
 * The model route one event names.
 *
 * An `assistant/message` carries it at `data.message.source`; anything else
 * falls back to a `data.route` some future build might record. A sample with no
 * readable route is still counted — it is a token fact — under `unknown`.
 */
function routeOf(record) {
  const source = record?.data?.message?.source
  if (isRecord(source)) {
    const provider = typeof source.provider === 'string' && source.provider !== '' ? source.provider : UNKNOWN_ROUTE.provider
    const model = typeof source.model === 'string' && source.model !== '' ? source.model : ''
    if (model !== '') return { provider, model }
  }
  const route = record?.data?.route
  if (isRecord(route) && typeof route.model === 'string' && route.model !== '') {
    const provider = typeof route.provider === 'string' && route.provider !== '' ? route.provider : UNKNOWN_ROUTE.provider
    return { provider, model: route.model }
  }
  return { ...UNKNOWN_ROUTE }
}

/** The model bucket for one day, created empty when it is not there yet. */
function bucketFor(entry, day, model) {
  let models = entry.days[day]
  if (!isRecord(models)) {
    models = {}
    entry.days[day] = models
  }
  let bucket = models[model]
  if (!isRecord(bucket)) {
    bucket = { ...zeroBuckets(), count: 0 }
    models[model] = bucket
  }
  return bucket
}

/** Add or subtract four counts from one bucket, in place. */
function shiftBucket(bucket, counts, sign) {
  bucket.input += sign * counts.input
  bucket.output += sign * counts.output
  bucket.cacheRead += sign * counts.cacheRead
  bucket.cacheWrite += sign * counts.cacheWrite
}

/** Drop a bucket that a replacement emptied, and the day with it. */
function pruneEmpty(entry, day, model) {
  const models = entry.days[day]
  if (!isRecord(models)) return
  const bucket = models[model]
  if (isRecord(bucket) && bucket.count <= 0 && bucketTotal(bucket) === 0) delete models[model]
  if (Object.keys(models).length === 0) delete entry.days[day]
}

/**
 * Fold one decoded Session record into one cache entry.
 *
 * A record is read once: its `seq` raises `lastSeq`, its `time` widens the
 * first/last stamps, a `session/title` names the Session, and an assistant
 * settlement contributes its usage sample. The `(turn, step)` rule is the
 * shipped projection's — replace the previous sample for the same slot, and
 * clear the slot on `llm/retry-started` so a retried attempt adds.
 * @param entry - the per-Session cache entry, mutated in place.
 * @param record - one decoded record from the Session's log.
 * @param options - the local-date key builder and the clock zone.
 * @returns whether the record changed the accounting.
 */
export function foldSessionRecord(entry, record, options = {}) {
  if (!isRecord(entry) || !isRecord(record)) return false
  const seq = record.seq
  if (!isCount(seq)) return false
  // Already folded: this event arrived live, or an earlier pass read these bytes.
  if (seq <= entry.lastSeq) return false
  entry.lastSeq = seq

  const time = isCount(record.time) ? record.time : undefined
  if (time !== undefined) {
    if (!isCount(entry.firstTime) || time < entry.firstTime) entry.firstTime = time
    if (!isCount(entry.lastTime) || time > entry.lastTime) entry.lastTime = time
  }

  if (record.type === TITLE_EVENT) {
    const title = record.data?.title
    if (typeof title === 'string' && title.trim() !== '') entry.title = title.trim()
    return false
  }

  if (record.type === RETRY_STARTED) {
    const turn = record.data?.turn
    const step = record.data?.step
    if (isRecord(entry.slot) && entry.slot.turn === turn && entry.slot.step === step) entry.slot = null
    return false
  }

  if (record.type !== ASSISTANT_MESSAGE && record.type !== ASSISTANT_ATTEMPT) return false
  const usage = usageOf(record)
  if (usage === undefined) return false
  const buckets = bucketsOf(usage)
  if (buckets === undefined) return false
  // A failed attempt reports a *placeholder* sample with every count at zero —
  // 1,094 of the 1,102 attempt samples in this profile. It carries no tokens,
  // so it is not a settlement and must not become a message or an empty row.
  if (buckets.input === 0 && buckets.output === 0 && buckets.cacheRead === 0 && buckets.cacheWrite === 0) return false
  const turn = record.data?.turn
  const step = record.data?.step
  if (!isCount(turn) || !isCount(step)) return false
  const dayKey = options.dayKey ?? createDayKey(options.timeZone ?? machineTimeZone())
  const day = time === undefined ? undefined : dayKey(time)
  if (day === undefined) return false
  const route = routeOf(record)

  if (!isRecord(entry.providers)) entry.providers = {}
  entry.providers[route.model] = route.provider

  const previous =
    isRecord(entry.slot) && entry.slot.turn === turn && entry.slot.step === step ? entry.slot : undefined
  if (previous !== undefined && previous.day === day && previous.model === route.model && bucketsEqual(previous.buckets, buckets)) {
    // The same sample replayed: the shipped fold leaves its state untouched.
    return false
  }

  if (previous !== undefined) {
    const old = bucketFor(entry, previous.day, previous.model)
    shiftBucket(old, previous.buckets, -1)
    old.count -= 1
    pruneEmpty(entry, previous.day, previous.model)
  }

  const bucket = bucketFor(entry, day, route.model)
  shiftBucket(bucket, buckets, 1)
  bucket.count += 1
  entry.slot = { turn, step, day, model: route.model, buckets: { ...buckets } }
  return true
}

/**
 * Fold a run of decoded records, in order.
 * @param entry - the per-Session cache entry, mutated in place.
 * @param records - the records, oldest first.
 * @param options - the local-date key builder and the clock zone.
 * @returns how many records changed the accounting.
 */
export function foldSessionRecords(entry, records, options = {}) {
  let counted = 0
  for (const record of Array.isArray(records) ? records : []) {
    if (foldSessionRecord(entry, record, options)) counted += 1
  }
  return counted
}

// ---------------------------------------------------------------------------
// The cache
// ---------------------------------------------------------------------------

/** One empty cache. */
export function emptyCache(timeZone) {
  return {
    version: CACHE_VERSION,
    timeZone: typeof timeZone === 'string' && timeZone !== '' ? timeZone : machineTimeZone(),
    perSession: {},
    totals: { ...zeroBuckets(), messages: 0, sessions: 0 },
    updatedAt: null,
  }
}

/**
 * Coerce a stored cache into the shape this build uses.
 *
 * Corruption is never fatal: a file from another version, another time zone or
 * another century of layout is discarded and the fold starts again. Within a
 * good file, one unreadable Session entry is dropped on its own.
 * @param raw - whatever `JSON.parse` produced.
 * @param timeZone - the zone this process buckets by.
 * @returns the cache and how many entries had to be dropped.
 */
export function normalizeCache(raw, timeZone) {
  if (!isRecord(raw) || raw.version !== CACHE_VERSION) return { cache: emptyCache(timeZone), dropped: 0, rebuilt: true }
  if (raw.timeZone !== timeZone) return { cache: emptyCache(timeZone), dropped: 0, rebuilt: true }
  const cache = emptyCache(timeZone)
  cache.updatedAt = isCount(raw.updatedAt) ? raw.updatedAt : null
  let dropped = 0
  for (const [id, value] of Object.entries(isRecord(raw.perSession) ? raw.perSession : {})) {
    const entry = normalizeSessionEntry(value, id)
    if (entry === undefined) {
      dropped += 1
      continue
    }
    cache.perSession[id] = entry
  }
  return { cache, dropped, rebuilt: false }
}

/** One stored per-Session entry, or `undefined` when it cannot be read. */
function normalizeSessionEntry(value, id) {
  if (!isRecord(value) || typeof id !== 'string' || id === '') return undefined
  const entry = emptySessionEntry()
  entry.offset = isCount(value.offset) ? value.offset : 0
  entry.lastSeq = isCount(value.lastSeq) ? value.lastSeq : 0
  entry.bytes = isCount(value.bytes) ? value.bytes : 0
  entry.firstTime = isCount(value.firstTime) ? value.firstTime : null
  entry.lastTime = isCount(value.lastTime) ? value.lastTime : null
  entry.createdAt = isCount(value.createdAt) ? value.createdAt : null
  entry.origin = value.origin === 'subagent' ? 'subagent' : 'main'
  entry.originRecorded = value.originRecorded === true
  entry.title = typeof value.title === 'string' ? value.title : ''
  entry.caughtUp = value.caughtUp === true
  const dayKey = /^\d{4}-\d{2}-\d{2}$/u
  for (const [day, models] of Object.entries(isRecord(value.days) ? value.days : {})) {
    if (!dayKey.test(day) || !isRecord(models)) continue
    const kept = {}
    for (const [model, bucket] of Object.entries(models)) {
      if (model === '' || !isRecord(bucket)) continue
      const counts = { ...zeroBuckets(), count: isCount(bucket.count) ? bucket.count : 0 }
      for (const key of ['input', 'output', 'cacheRead', 'cacheWrite']) {
        if (isCount(bucket[key])) counts[key] = bucket[key]
      }
      kept[model] = counts
    }
    if (Object.keys(kept).length > 0) entry.days[day] = kept
  }
  if (isRecord(value.providers)) {
    for (const [model, provider] of Object.entries(value.providers)) {
      if (typeof provider === 'string' && provider !== '') entry.providers[model] = provider
    }
  }
  const slot = value.slot
  if (isRecord(slot) && isCount(slot.turn) && isCount(slot.step) && typeof slot.model === 'string' && isRecord(slot.buckets)) {
    const buckets = bucketsOf({
      inputTokens: slot.buckets.input,
      outputTokens: slot.buckets.output,
      cacheReadTokens: slot.buckets.cacheRead,
      cacheWriteTokens: slot.buckets.cacheWrite,
    })
    if (buckets !== undefined && dayKey.test(String(slot.day))) {
      entry.slot = { turn: slot.turn, step: slot.step, day: slot.day, model: slot.model, buckets }
    }
  }
  return entry
}

/**
 * The accounting the cache holds, recomputed from the per-Session buckets.
 *
 * The file also carries a `totals` block, but that is a convenience for readers
 * of the file: this view derives every figure from the buckets themselves, so a
 * stale summary can never disagree with the series beside it.
 * @param cache - the cache to summarise.
 * @param options - `scope: 'main' | 'subagent'` to leave the other half out.
 */
export function cacheTotals(cache, options = {}) {
  const scope = options.scope
  const totals = { ...zeroBuckets(), total: 0, messages: 0, sessions: 0 }
  for (const entry of Object.values(isRecord(cache?.perSession) ? cache.perSession : {})) {
    if (scope !== undefined && scopeOfSession(entry) !== scope) continue
    let used = false
    for (const models of Object.values(isRecord(entry?.days) ? entry.days : {})) {
      for (const bucket of Object.values(isRecord(models) ? models : {})) {
        if (!isRecord(bucket)) continue
        const total = bucketTotal(bucket)
        if (total === 0 && !(isCount(bucket.count) && bucket.count > 0)) continue
        used = true
        totals.input += isCount(bucket.input) ? bucket.input : 0
        totals.output += isCount(bucket.output) ? bucket.output : 0
        totals.cacheRead += isCount(bucket.cacheRead) ? bucket.cacheRead : 0
        totals.cacheWrite += isCount(bucket.cacheWrite) ? bucket.cacheWrite : 0
        totals.messages += isCount(bucket.count) ? bucket.count : 0
      }
    }
    if (used) totals.sessions += 1
  }
  totals.total = totals.input + totals.output + totals.cacheRead + totals.cacheWrite
  return totals
}

/**
 * The file-backed cache.
 *
 * A read is tolerant by design: a missing file is an empty cache, and a file
 * that cannot be parsed is reported through `error` while the caller starts
 * fresh. A write goes through a temporary file and a rename, so a half-written
 * cache can never be observed.
 * @param path - the absolute path of the cache file.
 */
export function createFileStore(path) {
  return {
    path,
    read() {
      let text
      try {
        text = readFileSync(path, 'utf8')
      } catch (error) {
        if (error?.code === 'ENOENT') return { state: undefined }
        return { state: undefined, error: `The usage cache could not be read: ${messageOf(error)}` }
      }
      try {
        return { state: JSON.parse(text) }
      } catch (error) {
        return { state: undefined, error: `The usage cache is not valid JSON: ${messageOf(error)}` }
      }
    },
    write(state) {
      try {
        mkdirSync(dirname(path), { recursive: true })
        const temporary = `${path}.${process.pid}.tmp`
        writeFileSync(temporary, `${JSON.stringify(state)}\n`, 'utf8')
        renameSync(temporary, path)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: `The usage cache could not be written: ${messageOf(error)}` }
      }
    },
  }
}

/** The active profile directory, the same resolution the MCP store uses. */
export function resolveProfileDir(env = process.env, home = homedir()) {
  const explicit = typeof env?.DSH_PROFILE_DIR === 'string' ? env.DSH_PROFILE_DIR.trim() : ''
  if (explicit !== '') return explicit
  const configured = typeof env?.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  const dshHome = configured !== '' ? configured : join(home, '.dsh')
  const profile = typeof env?.DSH_PROFILE === 'string' ? env.DSH_PROFILE.trim() : ''
  return profile !== '' ? join(dshHome, 'profiles', profile) : dshHome
}

/** The absolute path of EDH's usage cache. */
export function resolveStorePath(env = process.env, home = homedir()) {
  return join(resolveProfileDir(env, home), STORE_DIRECTORY, STORE_FILE)
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

/** A share of a whole, as a percentage with two decimals. */
function shareOf(part, whole) {
  if (!isCount(whole) || whole <= 0) return 0
  return Math.round((part / whole) * 10000) / 100
}

/**
 * Fold the cache into the view's aggregates: totals, per-model rows, the
 * per-day per-model series, and the dates that carry usage.
 * @param cache - the cache to summarise.
 * @param options - `scope: 'main' | 'subagent'` to leave the other half out.
 * @returns `{totals, byModel, byDay, days}`.
 */
export function summarizeCache(cache, options = {}) {
  const scope = options.scope
  const entries = Object.values(isRecord(cache?.perSession) ? cache.perSession : {})
  const models = new Map()
  const days = new Map()
  for (const entry of entries) {
    if (!isRecord(entry) || !isRecord(entry.days)) continue
    if (scope !== undefined && scopeOfSession(entry) !== scope) continue
    for (const [day, dayModels] of Object.entries(entry.days)) {
      if (!isRecord(dayModels)) continue
      for (const [model, bucket] of Object.entries(dayModels)) {
        if (!isRecord(bucket)) continue
        const total = bucketTotal(bucket)
        if (total === 0 && !(isCount(bucket.count) && bucket.count > 0)) continue
        let row = models.get(model)
        if (row === undefined) {
          row = { ...zeroBuckets(), messages: 0, model, provider: UNKNOWN_ROUTE.provider }
          models.set(model, row)
        }
        const provider = entry.providers?.[model]
        if (typeof provider === 'string' && provider !== '' && row.provider === UNKNOWN_ROUTE.provider) {
          row.provider = provider
        }
        row.input += isCount(bucket.input) ? bucket.input : 0
        row.output += isCount(bucket.output) ? bucket.output : 0
        row.cacheRead += isCount(bucket.cacheRead) ? bucket.cacheRead : 0
        row.cacheWrite += isCount(bucket.cacheWrite) ? bucket.cacheWrite : 0
        row.messages += isCount(bucket.count) ? bucket.count : 0

        let dayRow = days.get(day)
        if (dayRow === undefined) {
          dayRow = { date: day, byModel: {}, total: 0, ...zeroBuckets() }
          days.set(day, dayRow)
        }
        dayRow.byModel[model] = (dayRow.byModel[model] ?? 0) + total
        dayRow.input += isCount(bucket.input) ? bucket.input : 0
        dayRow.output += isCount(bucket.output) ? bucket.output : 0
        dayRow.cacheRead += isCount(bucket.cacheRead) ? bucket.cacheRead : 0
        dayRow.cacheWrite += isCount(bucket.cacheWrite) ? bucket.cacheWrite : 0
        dayRow.total += total
      }
    }
  }

  const byModel = [...models.values()]
    .map(row => ({
      model: row.model,
      provider: row.provider,
      input: row.input,
      output: row.output,
      cacheRead: row.cacheRead,
      cacheWrite: row.cacheWrite,
      total: row.input + row.output + row.cacheRead + row.cacheWrite,
      messages: row.messages,
    }))
    .sort((left, right) => right.total - left.total || left.model.localeCompare(right.model))
  const grandTotal = byModel.reduce((sum, row) => sum + row.total, 0)
  for (const row of byModel) row.share = shareOf(row.total, grandTotal)
  const byDay = [...days.values()].sort((left, right) => left.date.localeCompare(right.date))
  return { totals: cacheTotals(cache, { scope }), byModel, byDay, days: byDay.map(day => day.date) }
}

/**
 * The streak figures for a set of usage dates.
 *
 * The current streak counts back from today. When today carries no usage yet —
 * which is the normal state of a morning — it counts back from yesterday
 * instead, and the view says so rather than reporting zero. The longest streak
 * is the longest run of consecutive dates anywhere in the set.
 * @param days - the `YYYY-MM-DD` keys that carry usage, in any order.
 * @param today - today's key in the same zone.
 * @returns the two lengths and which rule the current streak used.
 */
export function streaksOf(days, today) {
  const present = new Set((Array.isArray(days) ? days : []).filter(day => dayStamp(day) !== undefined))
  const ordered = [...present].sort()
  let longest = 0
  let run = 0
  let previous
  for (const day of ordered) {
    const gap = previous === undefined ? undefined : daysBetween(previous, day)
    run = gap === 1 ? run + 1 : 1
    if (run > longest) longest = run
    previous = day
  }
  const yesterday = previousDay(today)
  let current = 0
  let fromYesterday = false
  let cursor = present.has(today) ? today : present.has(yesterday) ? yesterday : undefined
  if (cursor !== undefined) {
    fromYesterday = cursor !== today
    current = 1
    for (;;) {
      const back = previousDay(cursor)
      if (back === undefined || !present.has(back)) break
      current += 1
      cursor = back
    }
  }
  return { current, longest, fromYesterday }
}

/**
 * The day with the most tokens. Ties keep the earliest date, so the figure does
 * not move when two days happen to match.
 */
export function peakDayOf(byDay) {
  let peak
  for (const day of Array.isArray(byDay) ? byDay : []) {
    if (!isCount(day?.total) || day.total <= 0) continue
    if (peak === undefined || day.total > peak.total) peak = { date: day.date, total: day.total }
  }
  return peak ?? null
}

/**
 * The Session that ran longest.
 *
 * Duration is the newest event's `time` minus the Session header's `createdAt`,
 * which is the only wall clock the log itself carries. A Session whose log
 * could not be read has no last event time and simply cannot win; a Session
 * with no title reports an empty one rather than a guess.
 * @param cache - the cache holding the per-Session stamps.
 * @param options - `scope: 'main' | 'subagent'` to look inside one half only.
 */
export function longestSessionOf(cache, options = {}) {
  let best
  for (const [id, entry] of Object.entries(isRecord(cache?.perSession) ? cache.perSession : {})) {
    if (!isRecord(entry)) continue
    if (options.scope !== undefined && scopeOfSession(entry) !== options.scope) continue
    if (!isCount(entry.createdAt) || !isCount(entry.lastTime)) continue
    const durationMs = entry.lastTime - entry.createdAt
    if (durationMs <= 0) continue
    if (best === undefined || durationMs > best.durationMs) {
      best = {
        id,
        title: typeof entry.title === 'string' ? entry.title : '',
        durationMs,
        startedAt: entry.createdAt,
      }
    }
  }
  return best ?? null
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

/**
 * The sentences the page shows beside the numbers.
 *
 * They exist because the totals are honest about their own limits: the buckets
 * are not the provider's total, three kinds of model call record nothing, the
 * days are this machine's, and a background scan that has not finished has not
 * counted everything yet.
 */
export function usageNotes(options = {}) {
  const notes = [
    'Every stored Session on this machine is counted, subagents included, and the session split follows each Session header\'s own origin.',
    'Input, output, cache read and cache write are counted as four separate buckets, not the provider total, because the two disagree on some events.',
    'Title generation, compaction summaries and web search record no usage, so they are not in these totals.',
    `Days are this machine's local dates in ${options.timeZone ?? machineTimeZone()}; a log event carries only an epoch-millisecond time, never a zone.`,
  ]
  const backfill = isRecord(options.backfill) ? options.backfill : {}
  if (backfill.state === 'running' || backfill.state === 'partial') {
    notes.push(
      `The background scan has read ${backfill.sessionsDone ?? 0} of ${backfill.sessionsTotal ?? 0} Session logs, so the totals are still growing.`,
    )
  }
  if (backfill.state === 'partial') {
    notes.push(`${backfill.errors ?? 0} Session log${backfill.errors === 1 ? '' : 's'} could not be read and ${backfill.errors === 1 ? 'is' : 'are'} not in these totals.`)
  }
  if (options.streakFromYesterday === true) {
    notes.push('The current streak counts back from today; today carries no usage yet, so it is counted from yesterday instead.')
  }
  if (options.longestWithoutTitle === true) {
    notes.push('The longest Session has no title in its log, so it is named by its id.')
  }
  if (isCount(options.straySessions) && options.straySessions > 0) {
    notes.push(
      `${options.straySessions} counted Session${options.straySessions === 1 ? '' : 's'} record no origin of ${options.straySessions === 1 ? 'its' : 'their'} own — the Harness writes none for a conversation a person started — so ${options.straySessions === 1 ? 'it is' : 'they are'} counted under main sessions.`,
    )
  }
  if (typeof options.storeError === 'string' && options.storeError !== '') notes.push(options.storeError)
  return notes
}

/** One backfill progress report, for a manager that has not started yet. */
export function emptyProgress() {
  return { state: 'idle', sessionsDone: 0, sessionsTotal: 0, sessions: 0, errors: 0, elapsedMs: 0 }
}

/**
 * Which half of the split one Session belongs to.
 *
 * The Session header's `origin` is the only fact the log records: a delegated
 * child carries `origin: 'subagent'`, and a main Session carries no `origin` at
 * all. A fork is NOT a subagent — it keeps `parentSession` and no origin — so
 * the parent link is deliberately not consulted here.
 * @param entry - one per-Session cache entry.
 * @returns `'subagent'` or `'main'`.
 */
export function scopeOfSession(entry) {
  return entry?.origin === 'subagent' ? 'subagent' : 'main'
}

/** The stats block one aggregate carries, over one scope. */
function statsOf(summary, cache, today, options = {}) {
  const streak = streaksOf(summary.days, today)
  return {
    peakDay: peakDayOf(summary.byDay),
    longestSession: longestSessionOf(cache, { scope: options.scope }),
    currentStreakDays: streak.current,
    longestStreakDays: streak.longest,
    fromYesterday: streak.fromYesterday,
    ...(options.withBounds === true
      ? { firstDay: summary.days[0] ?? null, lastDay: summary.days[summary.days.length - 1] ?? null }
      : {}),
  }
}

/** One scope's share of the numbers, in the same shape the headline uses. */
function scopeView(cache, today, scope) {
  const summary = summarizeCache(cache, { scope })
  const stats = statsOf(summary, cache, today, { scope })
  return {
    totals: summary.totals,
    byModel: summary.byModel,
    byDay: summary.byDay,
    stats: {
      peakDay: stats.peakDay,
      longestSession: stats.longestSession,
      currentStreakDays: stats.currentStreakDays,
      longestStreakDays: stats.longestStreakDays,
    },
  }
}

/**
 * The whole route body.
 *
 * Every figure is derived from the cache's per-Session buckets, so this is pure
 * and cheap: it runs on each request and does no I/O of its own.
 *
 * The headline numbers cover every Session, and `scopes` carries the same shape
 * split by the header's `origin`, so the page can narrow without another read.
 * The two halves add up to the headline exactly — same totals, same per-model
 * rows, same per-day series — because a filter that disagrees with the number
 * above it is worse than no filter at all.
 * @param options - the cache, the clock zone, the progress report and the time.
 */
export function usageView(options = {}) {
  const timeZone = typeof options.timeZone === 'string' && options.timeZone !== '' ? options.timeZone : machineTimeZone()
  const cache = isRecord(options.cache) ? options.cache : emptyCache(timeZone)
  const summary = summarizeCache(cache)
  const today = (options.dayKey ?? createDayKey(timeZone))(options.now ?? Date.now())
  const stats = statsOf(summary, cache, today, { withBounds: true })
  return {
    ok: true,
    timeZone,
    totals: summary.totals,
    byModel: summary.byModel,
    byDay: summary.byDay,
    days: summary.days,
    stats: {
      peakDay: stats.peakDay,
      longestSession: stats.longestSession,
      currentStreakDays: stats.currentStreakDays,
      longestStreakDays: stats.longestStreakDays,
      firstDay: stats.firstDay,
      lastDay: stats.lastDay,
    },
    scopes: {
      main: scopeView(cache, today, 'main'),
      subagent: scopeView(cache, today, 'subagent'),
    },
    backfill: isRecord(options.backfill) ? options.backfill : emptyProgress(),
    updatedAt: isCount(cache.updatedAt) ? cache.updatedAt : null,
    notes: usageNotes({
      timeZone,
      backfill: options.backfill,
      streakFromYesterday: stats.fromYesterday,
      longestWithoutTitle: stats.longestSession !== null && stats.longestSession.title === '',
      straySessions: countStraySessions(cache),
      storeError: options.storeError,
    }),
  }
}

/**
 * How many counted Sessions record no origin of their own.
 *
 * Only Sessions that actually carry usage are counted here, so the note cannot
 * disagree with the `sessions` figure beside it.
 */
function countStraySessions(cache) {
  let stray = 0
  for (const entry of Object.values(isRecord(cache?.perSession) ? cache.perSession : {})) {
    if (!isRecord(entry)) continue
    if (entry.originRecorded === true) continue
    if (!hasUsage(entry)) continue
    stray += 1
  }
  return stray
}

/** Whether one Session's buckets carry any usage. */
function hasUsage(entry) {
  for (const models of Object.values(isRecord(entry?.days) ? entry.days : {})) {
    for (const bucket of Object.values(isRecord(models) ? models : {})) {
      if (!isRecord(bucket)) continue
      if (bucketTotal(bucket) > 0 || (isCount(bucket.count) && bucket.count > 0)) return true
    }
  }
  return false
}

// ---------------------------------------------------------------------------
// The manager: backfill, live fold, saved cache
// ---------------------------------------------------------------------------

/**
 * The usage accounting owner.
 *
 * It owns three things the row cannot get anywhere else: the loaded cache, the
 * background backfill, and the live fold. Every seam it needs is injectable, so
 * the suite can drive it with synthetic logs and no real profile.
 *
 * Seams: `store` (read/write the cache), `getPersistence` (the persistence
 * service), `getProjectionCache` / `getSessionQuery` (optional, for a title or a
 * last-message time when a log cannot be read), `readLog` (bytes of one
 * artifact from a byte offset, as `{buffer, from, size}`), `now`, `schedule`
 * (the tick scheduler), `timeZone`, `dayKey`, `logger`, `sessionsPerTick`,
 * `budgetMs`.
 */
export function createUsage(options = {}) {
  const store = options.store ?? createFileStore(options.storePath ?? resolveStorePath())
  const timeZone = typeof options.timeZone === 'string' && options.timeZone !== '' ? options.timeZone : machineTimeZone()
  const dayKey = options.dayKey ?? createDayKey(timeZone)
  const now = typeof options.now === 'function' ? options.now : () => Date.now()
  const schedule = typeof options.schedule === 'function' ? options.schedule : run => setTimeout(run, 0)
  const readLog = typeof options.readLog === 'function' ? options.readLog : readLogTail
  const perTick = isCount(options.sessionsPerTick) && options.sessionsPerTick > 0 ? options.sessionsPerTick : SESSIONS_PER_TICK
  const budgetMs = isCount(options.budgetMs) && options.budgetMs > 0 ? options.budgetMs : TICK_BUDGET_MS
  const logger = options.logger
  /**
   * One optional service, as a getter.
   *
   * The Host services mount after this row — a feature row is not ordered
   * against the agent's own — so each is asked for lazily; a test may hand the
   * service itself, which is the constant getter.
   */
  const serviceGetter = value => (typeof value === 'function' ? value : () => value)
  const getPersistence = serviceGetter(options.getPersistence)
  const getSessionQuery = serviceGetter(options.getSessionQuery)
  const getProjectionCache = serviceGetter(options.getProjectionCache)
  const warn = message => {
    try {
      logger?.warn?.(message)
    } catch {
      // A logger that throws must not stop the fold.
    }
  }

  const loaded = store.read()
  const normalized = normalizeCache(loaded.state, timeZone)
  const cache = normalized.cache
  const storeError = loaded.error ?? (normalized.dropped > 0 ? `${normalized.dropped} stored Session entr${normalized.dropped === 1 ? 'y' : 'ies'} could not be read and will be counted again.` : undefined)

  let progress = { ...emptyProgress(), sessions: Object.keys(cache.perSession).length }
  let queue
  let running = false
  let disposed = false
  let scheduled
  let startedAt
  let rescanQueued = false
  let dirty = false

  /**
   * Persist the cache, with its totals block refreshed beside the buckets.
   *
   * A pass that folded nothing new does not write: the row would otherwise
   * rewrite a fixed-size JSON file every few seconds for no change at all.
   */
  function save(force = false) {
    if (!dirty && force !== true) return cache.updatedAt
    const totals = cacheTotals(cache)
    cache.totals = { ...zeroBuckets(), messages: totals.messages, sessions: totals.sessions }
    cache.version = CACHE_VERSION
    cache.timeZone = timeZone
    cache.updatedAt = now()
    const written = store.write(cache)
    if (written?.ok !== true) warn(`edh-usage: the cache could not be written: ${written?.error ?? 'unknown error'}`)
    else dirty = false
    progress.sessions = Object.keys(cache.perSession).length
    return cache.updatedAt
  }

  /** Schedule one tick, at most one at a time. */
  function scheduleTick() {
    if (disposed || scheduled !== undefined) return
    scheduled = schedule(() => {
      scheduled = undefined
      void tick()
    })
    // A pending tick must never hold the Host process open.
    if (typeof scheduled === 'object' && scheduled !== null && typeof scheduled.unref === 'function') scheduled.unref()
  }

  /** The per-Session entry, created when it is missing. */
  function entryFor(id, header) {
    const existing = cache.perSession[id]
    if (isRecord(existing)) {
      if (isCount(header?.createdAt) && !isCount(existing.createdAt)) existing.createdAt = header.createdAt
      if (header?.origin === 'subagent') existing.origin = 'subagent'
      if (header?.origin === 'subagent' || header?.origin === 'main') existing.originRecorded = true
      return existing
    }
    const entry = emptySessionEntry({ header })
    cache.perSession[id] = entry
    progress.sessions = Object.keys(cache.perSession).length
    dirty = true
    return entry
  }

  /** The artifact path of one Session, through the backend's own locate hook. */
  function locatePath(header) {
    const persistence = getPersistence()
    if (persistence === undefined || typeof persistence.locate !== 'function') return undefined
    try {
      const located = persistence.locate({ id: header?.id, cwd: header?.cwd })
      return typeof located?.path === 'string' && located.path !== '' ? located.path : undefined
    } catch (error) {
      warn(`edh-usage: locating the log for ${header?.id ?? 'a Session'} failed: ${messageOf(error)}`)
      return undefined
    }
  }

  /**
   * Read one Session through its read handle — the documented seam — and fold
   * the whole log. Used when this build cannot locate or decode the artifact
   * itself, and it costs a full decode, so it also advances the byte offset
   * when the listing reported a size.
   */
  async function foldThroughHandle(id, entry, snapshot) {
    const persistence = getPersistence()
    if (persistence === undefined || typeof persistence.open !== 'function') return false
    let handle
    try {
      handle = await persistence.open(id, 'read')
    } catch (error) {
      throw new Error(`the log could not be opened: ${messageOf(error)}`)
    }
    try {
      const read = await handle.read(0, undefined)
      foldSessionRecords(entry, read?.events, { dayKey, timeZone })
    } catch (error) {
      throw new Error(`the log could not be read: ${messageOf(error)}`)
    } finally {
      try {
        await handle.close()
      } catch (error) {
        warn(`edh-usage: closing ${id} failed: ${messageOf(error)}`)
      }
    }
    if (isCount(snapshot?.sizeBytes)) {
      entry.bytes = snapshot.sizeBytes
      entry.offset = snapshot.sizeBytes
    }
    entry.caughtUp = true
    dirty = true
    return true
  }

  /** Fold whatever one Session has appended since the last pass. */
  async function foldOne(snapshot) {
    const header = isRecord(snapshot?.header) ? snapshot.header : {}
    const id = typeof header.id === 'string' ? header.id : undefined
    if (id === undefined || id === '') return
    const entry = entryFor(id, header)
    let failure
    const path = locatePath(header)
    if (path !== undefined) {
      let read
      try {
        read = readLog(path, entry.offset)
      } catch (error) {
        failure = `the log could not be read: ${messageOf(error)}`
      }
      if (read !== undefined) {
        if (read.from !== entry.offset) {
          // The artifact shrank, so the saved offset names bytes that no longer
          // exist. Start this Session over rather than folding a wrong slice.
          warn(`edh-usage: ${id} shrank since the last pass; recounting it from the start`)
          entry.offset = 0
        }
        try {
          const delta = decodeLogFrames(read.buffer, 0)
          foldSessionRecords(entry, delta.records, { dayKey, timeZone })
          entry.offset = read.from + delta.offset
          entry.bytes = isCount(read.size) ? read.size : entry.offset
          // Every committed event through the end of the artifact has been
          // folded, so newer events may now be folded live.
          entry.caughtUp = true
          delete entry.unreadable
          dirty = true
          return
        } catch (error) {
          failure = messageOf(error)
        }
      }
    }
    try {
      if (!(await foldThroughHandle(id, entry, snapshot))) {
        failure ??= 'this build cannot read the Session log'
      }
    } catch (error) {
      failure ??= messageOf(error)
    }
    if (failure !== undefined) {
      progress.errors += 1
      entry.unreadable = true
      warn(`edh-usage: ${id} could not be counted: ${failure}`)
      // A log this build cannot read still leaves one wall-clock fact in the
      // projection cache, which is zero I/O: the newest message's time.
      rememberProjectedLastTime(entry, header)
      dirty = true
    }
  }

  /**
   * Take one Session's last message time from the projection cache.
   *
   * `cachedSnapshot` is a whole-value read off the stored projection rows, so it
   * costs nothing and needs no log. It is the only fallback for a Session whose
   * log cannot be read: without a last time it cannot be the longest Session.
   */
  function rememberProjectedLastTime(entry, header) {
    if (isCount(entry.lastTime)) return
    const projections = getProjectionCache()
    if (projections === undefined || typeof projections.cachedSnapshot !== 'function') return
    try {
      const snapshot = projections.cachedSnapshot(header, ['timeContext'])
      const lastMessageTime = snapshot?.values?.timeContext?.lastMessageTime
      if (isCount(lastMessageTime) && lastMessageTime > 0) entry.lastTime = lastMessageTime
    } catch (error) {
      warn(`edh-usage: the cached projection for ${header?.id ?? 'a Session'} could not be read: ${messageOf(error)}`)
    }
  }

  /** List every stored Session and queue the ones that may have changed. */
  async function enumerate() {
    const persistence = getPersistence()
    progress.sessionsTotal = 0
    progress.sessionsDone = 0
    if (persistence === undefined || typeof persistence.list !== 'function') {
      queue = []
      return
    }
    let snapshots
    try {
      snapshots = await persistence.list()
    } catch (error) {
      warn(`edh-usage: listing the stored Sessions failed: ${messageOf(error)}`)
      queue = []
      return
    }
    queue = (Array.isArray(snapshots) ? snapshots : []).filter(snapshot => typeof snapshot?.header?.id === 'string')
    progress.sessionsTotal = queue.length
  }

  /** One background tick: a couple of Sessions, then yield. */
  async function tick() {
    if (disposed) return
    running = true
    progress.state = 'running'
    if (!isCount(startedAt)) startedAt = now()
    const began = now()
    let more = false
    try {
      if (rescanQueued) {
        rescanQueued = false
        queue = undefined
      }
      if (queue === undefined) {
        progress.errors = 0
        await enumerate()
      }
      let folded = 0
      while (Array.isArray(queue) && queue.length > 0 && folded < perTick && now() - began < budgetMs) {
        const snapshot = queue.shift()
        await foldOne(snapshot)
        progress.sessionsDone += 1
        folded += 1
      }
      more = Array.isArray(queue) && queue.length > 0
      progress.elapsedMs = now() - (isCount(startedAt) ? startedAt : began)
      save()
      if (!more) {
        progress.state = progress.errors > 0 ? 'partial' : 'done'
        startedAt = undefined
      }
    } catch (error) {
      more = false
      progress.state = 'partial'
      warn(`edh-usage: a background pass failed: ${messageOf(error)}`)
    }
    running = false
    if (more) scheduleTick()
  }

  /** Start counting, once. Safe to call from more than one place. */
  function start() {
    if (disposed) return progress
    if (progress.state === 'idle') {
      // The pass is scheduled, not run: the caller must not wait for it.
      progress.state = 'running'
      scheduleTick()
    }
    return progress
  }

  /** Ask for a fresh pass over every Session, keeping what is already counted. */
  function refresh() {
    if (disposed) return progress
    if (running) {
      rescanQueued = true
    } else {
      queue = undefined
      progress.state = 'running'
    }
    scheduleTick()
    return progress
  }

  /** Drop the cache and count everything again. */
  function rebuild() {
    if (disposed) return progress
    cache.perSession = {}
    cache.updatedAt = null
    cache.totals = { ...zeroBuckets(), messages: 0, sessions: 0 }
    progress = { ...emptyProgress(), state: 'running' }
    queue = undefined
    startedAt = undefined
    rescanQueued = false
    dirty = true
    save()
    scheduleTick()
    return progress
  }

  /**
   * Fold one live event into the cache.
   *
   * `session/event` fires post-commit for every Session, subagents included, so
   * the totals move without polling. The event's `seq` also raises the entry's
   * `lastSeq`, which is what stops a later backfill from adding it a second
   * time.
   *
   * A Session whose log no pass has folded yet cannot be folded live: its lower
   * `seq`s are neither in the cache nor in order here, and dropping them later
   * would lose them. Such a Session schedules a pass instead, which reads the
   * whole log in order and makes it live-countable from then on.
   * @param session - the Session the event belongs to.
   * @param event - the committed Session event.
   * @returns whether the event changed the accounting.
   */
  function foldLive(session, event) {
    if (disposed) return false
    const id = typeof session?.id === 'string' ? session.id : typeof session?.header?.id === 'string' ? session.header.id : undefined
    if (id === undefined || id === '') return false
    const entry = entryFor(id, session?.header)
    entry.live = true
    // A log no pass could read will not become readable by scheduling another
    // pass on every event: wait for the next explicit refresh instead.
    if (entry.caughtUp !== true) {
      if (entry.unreadable !== true) refresh()
      return false
    }
    const counted = foldSessionRecord(entry, event, { dayKey, timeZone })
    if (counted) {
      dirty = true
      saveSoon()
    }
    return counted
  }

  let saveTimer
  let lastSave = 0
  /** Write the cache at most every couple of seconds while events stream in. */
  function saveSoon() {
    if (disposed) return
    const wait = Math.max(0, SAVE_INTERVAL_MS - (now() - lastSave))
    if (wait === 0) {
      lastSave = now()
      save()
      return
    }
    if (saveTimer !== undefined) return
    saveTimer = setTimeout(() => {
      saveTimer = undefined
      lastSave = now()
      save()
    }, wait)
    if (typeof saveTimer?.unref === 'function') saveTimer.unref()
  }

  /**
   * The route body.
   *
   * A Session that never recorded a title is asked for one only when it is the
   * longest Session — one log read, once — because the fold already captured
   * every title the logs hold and a page that refreshes must not turn into a
   * full scan.
   */
  async function view() {
    const built = usageView({ cache, timeZone, backfill: progress, now: now(), storeError, dayKey })
    const longest = built.stats.longestSession
    if (longest !== null && longest.title === '') {
      const entry = cache.perSession[longest.id]
      // One attempt per Session, ever: a Session whose log holds no title must
      // not turn every page refresh into another read of its log.
      if (isRecord(entry) && entry.titleTried !== true) {
        entry.titleTried = true
        const title = await titleOf(longest.id)
        if (title !== undefined) {
          built.stats.longestSession = { ...longest, title }
          entry.title = title
          dirty = true
          saveSoon()
        }
      }
    }
    return built
  }

  /** One Session's title through `sessionQuery`, or the projection cache's hint. */
  async function titleOf(id) {
    const sessionQuery = getSessionQuery()
    if (sessionQuery !== undefined && typeof sessionQuery.readTitleSnapshots === 'function') {
      try {
        const [result] = await sessionQuery.readTitleSnapshots([id])
        const title = result?.status === 'fulfilled' ? result.value?.title : undefined
        if (typeof title === 'string' && title.trim() !== '') return title.trim()
      } catch (error) {
        warn(`edh-usage: the title of ${id} could not be read: ${messageOf(error)}`)
      }
    }
    return undefined
  }

  /** Stop counting; the cache keeps whatever was folded. */
  function dispose() {
    if (disposed) return
    disposed = true
    if (scheduled !== undefined && typeof scheduled === 'object' && typeof scheduled.cancel === 'function') scheduled.cancel()
    if (saveTimer !== undefined) clearTimeout(saveTimer)
    saveTimer = undefined
    try {
      save()
    } catch (error) {
      warn(`edh-usage: the final cache write failed: ${messageOf(error)}`)
    }
  }

  return {
    start,
    refresh,
    rebuild,
    fold: foldLive,
    view,
    dispose,
    progress: () => ({ ...progress }),
    cache: () => cache,
    path: store.path,
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** One JSON answer. A report the user asked for is never an HTTP error status. */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** The report one failed request answers. */
export function usageFailure(reason, message) {
  return { ok: false, reason, message }
}

/**
 * Which route one incoming request addresses.
 * @returns `view` for `GET`, `action` for `POST`, `undefined` for anything else.
 */
export function usageMethod(request) {
  if (request?.method === 'GET') return 'view'
  if (request?.method === 'POST') return 'action'
  return undefined
}

/** The request body as a record; anything that is not one is the empty record. */
async function readJsonBody(request) {
  try {
    const body = await request.json()
    return isRecord(body) ? body : {}
  } catch {
    return {}
  }
}

/**
 * Answer one request on `/api/edh.usage`.
 *
 * `GET` is the view. `POST` performs one action — `refresh` to start a pass over
 * every Session, `rebuild` to drop the cache and count everything again — and
 * answers the same view with a `report` beside it, so the page refreshes from
 * either. Bad input is 400, an unsupported method is 405, and a thrown error is
 * still a JSON report rather than a 500: a page that asked a question always
 * gets an answer it can render.
 * @param request - the incoming request.
 * @param options - the manager that owns the cache.
 */
export async function usageResponse(request, options = {}) {
  const usage = options.usage
  if (usage === undefined || typeof usage.view !== 'function') {
    return jsonResponse(usageFailure('unavailable', 'Token usage is not available in this deployment'))
  }
  const method = usageMethod(request)
  if (method === undefined) {
    return jsonResponse(usageFailure('unsupported-method', `Unsupported method ${request?.method ?? 'without a method'}`), 405)
  }
  try {
    if (method === 'view') return jsonResponse(await usage.view())
    const body = await readJsonBody(request)
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    if (action === 'refresh' || action === 'rebuild') {
      const before = usage.progress()
      if (action === 'rebuild') usage.rebuild()
      else usage.refresh()
      return jsonResponse({
        ...(await usage.view()),
        ok: true,
        report: { ok: true, action, sessionsTotal: before.sessionsTotal, sessionsDone: before.sessionsDone },
      })
    }
    const reason = action === '' ? 'bad-input' : 'unknown-action'
    const message =
      action === ''
        ? 'A POST needs an "action": refresh or rebuild'
        : `Unknown action ${JSON.stringify(action)}; expected refresh or rebuild`
    return jsonResponse({ ...(await usage.view()), ...usageFailure(reason, message), report: usageFailure(reason, message) }, 400)
  } catch (error) {
    const message = messageOf(error)
    reportRouteFailure(options, message)
    return jsonResponse(usageFailure('failed', message))
  }
}

/** Report a route failure through the manager's logger, if it has one. */
function reportRouteFailure(options, message) {
  try {
    options.logger?.warn?.(`edh-usage: the route failed: ${message}`)
  } catch {
    // Nothing to do: the answer is already built.
  }
}

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

/**
 * Register token accounting on the Host.
 *
 * The route lives in `ctx.effect` so turning the row off unregisters it, and so
 * does the live fold. The persistence service is taken as an *optional*
 * contract: a deployment without it still answers the route, with empty totals
 * and a report that says the scan has not run.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  const usage = createUsage({
    logger: ctx.logger,
    getPersistence: () => ctx.get?.('sessionPersistence'),
    getProjectionCache: () => ctx.get?.('sessionProjectionCache'),
    getSessionQuery: () => ctx.get?.('sessionQuery'),
  })

  ctx.effect(
    () => () => {
      try {
        usage.dispose()
      } catch (error) {
        ctx.logger?.warn?.('edh-usage: unloading the cache failed: %o', error)
      }
    },
    'edh-usage: cache disposal',
  )

  ctx.effect(() => {
    try {
      const dispose = ctx.connection.fetch.register({
        path: USAGE_PATH,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: request => usageResponse(request, { usage, logger: ctx.logger }),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-usage: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-usage: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-usage: usage route')

  ctx.effect(() => {
    try {
      const off = ctx.on?.('session/event', (session, event) => {
        usage.fold(session, event)
      }, { global: true })
      return () => {
        try {
          off?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-usage: listener disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-usage: the live fold could not subscribe: %o', error)
      return () => {}
    }
  }, 'edh-usage: live fold')

  try {
    ctx.inject?.(['sessionPersistence'], () => {
      usage.start()
    })
  } catch (error) {
    ctx.logger?.warn?.('edh-usage: session persistence is not injectable: %o', error)
  }
}

/** The route needs the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
