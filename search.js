/**
 * EDH feature: `search` — full-text search across every stored Session, Host half.
 *
 * A Ctrl+K palette needs to search hundreds of Sessions, and the arithmetic says
 * it cannot do that per keystroke: this profile holds ~200 logs, 189 MB
 * compressed / 761 MB plaintext, 247,805 events, and a full fold takes 7.5–15 s.
 * So the search is a **derived index** built in the background and read from
 * memory, never a scan behind a request.
 *
 * ## The index
 *
 * `<profile>/.edh/search.json`, written through a temporary file and a rename so
 * a half-written index can never be observed, tolerant of a corrupt one (a
 * rebuilt index is a few seconds of background work, not a lost asset). Per
 * Session it holds a watermark and the messages worth searching:
 *
 * ```json
 * { "version": 1, "sessions": { "<id>": {
 *     "title": "…", "offset": 123456, "size": 123456, "lastSeq": 42,
 *     "messages": [ { "seq": 17, "time": 1793051125019, "role": "assistant",
 *                     "text": "collapsed whitespace, at most 600 characters" } ] } } }
 * ```
 *
 * Three rules keep it small and honest:
 *
 * - **Derived, never authoritative.** The Session log is the only truth; this
 *   file can be deleted at any moment and a pass rebuilds it. Nothing here is
 *   ever written back into a log, and a message that is missing from the index is
 *   a missing result, never a missing message.
 * - **Truncated text only.** Each stored message is the first `MAX_TEXT`
 *   characters with whitespace collapsed to single spaces — enough for a snippet,
 *   small enough to keep the file in the low megabytes. The snippet and the
 *   `matched` substring are cut from that same text, so the client can highlight
 *   without re-deriving anything.
 * - **Incremental by byte offset and `seq`.** Frames are append-only Zstandard
 *   frames, so a saved offset on a frame boundary stays valid forever: a pass
 *   reads only the bytes after it (`readLogTail`) and decodes them with
 *   `usage.js`'s own `decodeLogFrames` — the same decoder, not a second one.
 *   Messages are then filtered by `seq > lastSeq`, which is what stops a live
 *   fold and a later backfill from indexing the same text twice.
 *
 * ## What is worth indexing
 *
 * `user/message` is mostly **not the user**: the Harness logs runtime context, the
 * agent instructions, the skill catalog, a time stamp and subagent notices into
 * the same stream with `source.kind` set. In one real Session 32 of 107 user
 * messages were the human's. Searching the rest would return noise for every
 * query — so a user message is indexed **only** when `data.source.kind` is
 * `user` or `user-approval`, and an assistant message only through its text
 * blocks (tool calls, reasoning blocks and tool results are skipped). A record
 * carrying a `surfaceOp` replaced a range of the conversation, so it is skipped
 * too: a palette must not offer text the conversation no longer shows.
 */

import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { decodeLogFrames, readLogTail, resolveProfileDir } from './usage.js'

export const name = 'edh-search'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const SEARCH_PATH = '/api/edh.search'

/** Directory EDH owns inside the active profile directory. */
export const STORE_DIRECTORY = '.edh'

/** The index file's name inside {@link STORE_DIRECTORY}. */
export const STORE_FILE = 'search.json'

/** The index format this build writes and reads; anything else is rebuilt. */
export const INDEX_VERSION = 1

/** How many results a query returns when the caller does not say. */
export const DEFAULT_LIMIT = 20

/** The most results any caller can ask for. */
export const MAX_LIMIT = 100

/** The furthest a caller may page, so nobody can walk the corpus forever. */
export const MAX_OFFSET = 10000

/** Why a query stops: the scan collects this many matches and no more. */
export const MAX_CANDIDATES = 5000

/** Shorter queries are "still typing", not an error. */
export const MIN_QUERY = 2

/** Longest query accepted; the rest is dropped. */
export const MAX_QUERY = 200

/** How much of one message's text is kept: enough for a snippet, no more. */
export const MAX_TEXT = 600

/** How many messages one Session contributes; the newest win. */
export const MAX_MESSAGES_PER_SESSION = 300

/** Characters of context on each side of a match in a snippet. */
export const SNIPPET_CONTEXT = 60

/** Sessions folded per background tick. */
export const SESSIONS_PER_TICK = 2

/** How long one tick may spend before yielding. */
export const TICK_BUDGET_MS = 40

/** How long between incremental passes once the index is warm. */
export const PASS_INTERVAL_MS = 30000

/** The shortest gap between two index writes while batches land. */
export const SAVE_INTERVAL_MS = 4000

/** User-message `source.kind` values written by a person. */
const HUMAN_KINDS = new Set(['user', 'user-approval'])

/** A character that makes a term part of a word rather than standing alone. */
const WORD_CHARACTER = /[\p{L}\p{N}_]/u

/** True for a plain JSON object. */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** One error's text, whatever was thrown. */
function messageOf(error) {
  return String(error?.message ?? error)
}

/** True for a finite, non-negative integer. */
function isCount(value) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Longest Session id this route will look at. */
export const MAX_SESSION_ID = 128

/**
 * Whether one value is shaped like a Session id at all.
 *
 * Not the authorisation — the index's own `knows()` is, since an id has to name a
 * stored Session — but it stops a hostile value before anything looks at it: no
 * separators, no parent directory, no colon (drive letter or alternate data
 * stream), no control characters, nothing absurdly long.
 * @param value - the untrusted value.
 * @param limit - the longest accepted.
 * @returns true when it is a plausible id.
 */
export function isSafeKey(value, limit = MAX_SESSION_ID) {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > limit) return false
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point
  if (/[\u0000-\u001f\u007f]/u.test(value)) return false
  if (value.includes('/') || value.includes('\\')) return false
  if (value.includes('..')) return false
  if (value.includes(':')) return false
  return true
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/**
 * The absolute path of EDH's search index.
 * @param env - the environment to read.
 * @param home - the operating-system home, injectable for tests.
 */
export function resolveSearchStorePath(env = process.env, home = undefined) {
  const profile = home === undefined ? resolveProfileDir(env) : resolveProfileDir(env, home)
  return join(profile, STORE_DIRECTORY, STORE_FILE)
}

/** An index with nothing in it. */
export function emptyIndex() {
  return { version: INDEX_VERSION, builtAt: 0, sessions: new Map() }
}

/**
 * One stored Session record, normalised from untrusted JSON.
 *
 * A corrupt or hand-edited file must not be able to inject a path, a huge string
 * or a negative offset: every field is defaulted, every message is re-clamped, and
 * anything unusable is dropped. The result is a record a pass will simply top up.
 * @param input - one `sessions[id]` value from disk.
 * @returns the record, or `undefined` when it is not usable at all.
 */
export function normalizeSessionRecord(input) {
  if (!isRecord(input)) return undefined
  const messages = []
  for (const raw of Array.isArray(input.messages) ? input.messages : []) {
    if (!isRecord(raw)) continue
    if (!isCount(raw.seq)) continue
    if (typeof raw.text !== 'string') continue
    const text = clampText(raw.text)
    if (text === '') continue
    const role = raw.role === 'user' ? 'user' : 'assistant'
    messages.push({ seq: raw.seq, time: isCount(raw.time) ? raw.time : 0, role, text })
  }
  messages.sort((left, right) => left.seq - right.seq)
  return {
    title: typeof input.title === 'string' ? input.title.slice(0, 200) : '',
    offset: isCount(input.offset) ? input.offset : 0,
    size: isCount(input.size) ? input.size : 0,
    lastSeq: isCount(input.lastSeq) ? input.lastSeq : 0,
    messages: messages.slice(-MAX_MESSAGES_PER_SESSION),
  }
}

/** One index document, normalised. */
export function normalizeIndex(input) {
  if (!isRecord(input)) return emptyIndex()
  if (input.version !== INDEX_VERSION) return emptyIndex()
  const sessions = new Map()
  for (const [id, value] of Object.entries(isRecord(input.sessions) ? input.sessions : {})) {
    if (typeof id !== 'string' || id === '' || id.length > 128) continue
    const record = normalizeSessionRecord(value)
    if (record !== undefined) sessions.set(id, record)
  }
  return { version: INDEX_VERSION, builtAt: isCount(input.builtAt) ? input.builtAt : 0, sessions }
}

/**
 * The file-backed index.
 *
 * A read is tolerant by design: a missing file is an empty index, and a file that
 * cannot be parsed is reported through `error` while an empty index takes its
 * place — the next pass rebuilds it. A write goes through a temporary file and a
 * rename, so a half-written index can never be observed.
 * @param path - the absolute path of the index file.
 * @returns the store: `path`, `read()`, `write(index)`.
 */
export function createSearchStore(path) {
  return {
    path,
    read() {
      let text
      try {
        text = readFileSync(path, 'utf8')
      } catch (error) {
        if (error?.code === 'ENOENT') return { index: emptyIndex() }
        return { index: emptyIndex(), error: `The search index could not be read: ${messageOf(error)}` }
      }
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        return { index: emptyIndex(), error: `The search index is not valid JSON: ${messageOf(error)}` }
      }
      const index = normalizeIndex(parsed)
      const usable = isRecord(parsed) && parsed.version === INDEX_VERSION
      return usable ? { index } : { index, error: 'The search index was written by another version and will be rebuilt.' }
    },
    write(index) {
      try {
        mkdirSync(dirname(path), { recursive: true })
        const temporary = `${path}.${process.pid}.tmp`
        const document = {
          version: INDEX_VERSION,
          builtAt: index.builtAt,
          sessions: Object.fromEntries(index.sessions),
        }
        writeFileSync(temporary, `${JSON.stringify(document)}\n`, 'utf8')
        renameSync(temporary, path)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: `The search index could not be written: ${messageOf(error)}` }
      }
    },
  }
}

// ---------------------------------------------------------------------------
// What a message is worth indexing
// ---------------------------------------------------------------------------

/**
 * One text, collapsed and capped.
 *
 * Whitespace runs become single spaces, so a message that spans paragraphs fits
 * on one line, and a query typed with a space matches a phrase that was written
 * across a newline. The snippet and `matched` are cut from this same string,
 * which is why the client can highlight `matched` inside `snippet` verbatim.
 * @param text - the raw text.
 * @param limit - the longest text kept.
 * @returns the collapsed text.
 */
export function clampText(text, limit = MAX_TEXT) {
  const flat = String(text ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
  return flat.length <= limit ? flat : flat.slice(0, limit).trimEnd()
}

/** The text blocks of one content value, joined; `undefined` when there are none. */
export function textOfBlocks(content) {
  if (typeof content === 'string') return clampText(content) || undefined
  if (!Array.isArray(content)) return undefined
  const parts = []
  for (const block of content) {
    if (typeof block === 'string') {
      parts.push(block)
      continue
    }
    if (!isRecord(block) || block.type !== 'text') continue
    if (typeof block.text === 'string') parts.push(block.text)
  }
  if (parts.length === 0) return undefined
  const joined = parts.join('\n').trim()
  return joined === '' ? undefined : clampText(joined)
}

/**
 * The one message record worth indexing, or `undefined`.
 *
 * A `user/message` counts only when `data.source.kind` says a person wrote it —
 * the same stream carries the agent instructions, the runtime context, the skill
 * catalog and subagent notices, and indexing those would drown every query in
 * noise. An `assistant/message` contributes its text blocks only: tool calls,
 * reasoning and tool results are not prose. A record carrying a `surfaceOp`
 * replaced a range of the conversation and is skipped, because a palette must not
 * offer text the conversation no longer shows.
 * @param record - one decoded Session event.
 * @returns `{ seq, time, role, text }`, or `undefined` when it is not indexable.
 */
export function indexableMessage(record) {
  if (!isRecord(record)) return undefined
  if (!isCount(record.seq)) return undefined
  if (isRecord(record.surfaceOp)) return undefined
  const data = isRecord(record.data) ? record.data : undefined
  if (data === undefined) return undefined
  const time = isCount(record.time) ? record.time : 0
  if (record.type === 'user/message') {
    const kind = typeof data.source?.kind === 'string' ? data.source.kind : ''
    if (HUMAN_KINDS.has(kind) !== true) return undefined
    const text = textOfBlocks(data.content)
    return text === undefined ? undefined : { seq: record.seq, time, role: 'user', text }
  }
  if (record.type === 'assistant/message') {
    const message = isRecord(data.message) ? data.message : undefined
    const text = message === undefined ? undefined : textOfBlocks(message.content)
    return text === undefined ? undefined : { seq: record.seq, time, role: 'assistant', text }
  }
  return undefined
}

/** The newest title one record carries, or `undefined`. */
export function titleOf(record) {
  if (!isRecord(record) || record.type !== 'session/title') return undefined
  const title = isRecord(record.data) ? record.data.title : undefined
  if (typeof title !== 'string') return undefined
  const trimmed = title.trim()
  return trimmed === '' ? undefined : trimmed.slice(0, 200)
}

/** How many messages one query may keep scanning once it has this many hits. */
function tooMany(hits) {
  return hits.length >= MAX_CANDIDATES
}

// ---------------------------------------------------------------------------
// The query engine
// ---------------------------------------------------------------------------

/**
 * One query, normalised: collapsed, trimmed and capped.
 * @param raw - the `q` query value.
 * @returns the query text, or `undefined` when it is too short to be meaningful.
 */
export function normalizeQuery(raw) {
  if (typeof raw !== 'string') return undefined
  const flat = raw.replace(/\s+/gu, ' ').trim()
  if (flat.length < MIN_QUERY) return undefined
  return flat.length <= MAX_QUERY ? flat : flat.slice(0, MAX_QUERY).trimEnd()
}

/**
 * The first index where `term` stands as a word rather than inside one.
 *
 * This is what keeps `test` from finding `latest` and `contest` at the same rank:
 * the match must not be glued to a letter, a digit or an underscore on either
 * side. A plain substring search is still run afterwards, at a lower rank, so a
 * genuine mid-word match is not lost.
 * @param text - the text, already lower-cased.
 * @param term - the term, already lower-cased.
 * @returns the index, or `-1`.
 */
export function boundaryIndex(text, term) {
  if (typeof text !== 'string' || typeof term !== 'string' || term === '') return -1
  let from = 0
  for (;;) {
    const at = text.indexOf(term, from)
    if (at === -1) return -1
    const before = at === 0 ? '' : text[at - 1]
    const after = at + term.length >= text.length ? '' : text[at + term.length]
    const beforeWord = before !== '' && WORD_CHARACTER.test(before)
    const afterWord = after !== '' && WORD_CHARACTER.test(after)
    if (!beforeWord && !afterWord) return at
    from = at + 1
  }
}

/**
 * How well one message answers one query.
 *
 * Lower is better, and the order is the ranking the palette relies on: the phrase
 * itself (as words) beats every word present somewhere, which beats a single word
 * as words, which beats a single word inside another word.
 * @param text - the message text.
 * @param query - the normalised query.
 * @param terms - the query's words.
 * @returns the rank, or `-1` when the message does not match at all.
 */
export function rankOf(text, query, terms) {
  const lower = String(text ?? '').toLowerCase()
  if (lower === '') return -1
  const phrase = query.toLowerCase()
  const onWord = term => boundaryIndex(lower, term) !== -1
  const anywhere = term => lower.includes(term)
  if (terms.length === 1) {
    if (onWord(phrase)) return 0
    return anywhere(phrase) ? 1 : -1
  }
  if (onWord(phrase)) return 0
  if (terms.every(onWord)) return 1
  if (terms.every(anywhere)) return 1
  if (terms.some(onWord)) return 2
  if (terms.some(anywhere)) return 3
  return -1
}

/**
 * Where the best match sits in one text, and what it was.
 *
 * The phrase as words first, then the phrase anywhere, then the first word as
 * words, then the first word anywhere — the same order the ranking uses, so the
 * highlighted substring is the one the rank was based on.
 * @param text - the message text.
 * @param query - the normalised query.
 * @param terms - the query's words.
 * @returns `{ index, length }`, or `undefined` when nothing matches.
 */
export function locateMatch(text, query, terms) {
  const lower = String(text ?? '').toLowerCase()
  const phrase = query.toLowerCase()
  const candidates = []
  const onWord = boundaryIndex(lower, phrase)
  if (onWord !== -1) candidates.push({ index: onWord, length: phrase.length })
  const anywhere = lower.indexOf(phrase)
  if (anywhere !== -1) candidates.push({ index: anywhere, length: phrase.length })
  for (const term of terms) {
    const at = boundaryIndex(lower, term)
    if (at !== -1) candidates.push({ index: at, length: term.length })
  }
  for (const term of terms) {
    const at = lower.indexOf(term)
    if (at !== -1) candidates.push({ index: at, length: term.length })
  }
  return candidates.length === 0 ? undefined : candidates[0]
}

/**
 * One snippet around a match, and the exact matched text.
 *
 * The stored text is already single-spaced, so the snippet is one line and
 * `matched` appears in it verbatim — the client emphasises it without re-deriving
 * anything. Ellipses mark where the snippet was cut.
 * @param text - the message text.
 * @param match - `{ index, length }` from {@link locateMatch}.
 * @param context - characters of context on each side.
 * @returns `{ snippet, matched }`.
 */
export function snippetOf(text, match, context = SNIPPET_CONTEXT) {
  const source = String(text ?? '')
  const index = Math.max(0, Math.min(source.length, isCount(match?.index) ? match.index : 0))
  const length = Math.max(0, Math.min(source.length - index, isCount(match?.length) ? match.length : 0))
  const start = Math.max(0, index - Math.max(0, context))
  const end = Math.min(source.length, index + length + Math.max(0, context))
  const body = source.slice(start, end).replace(/\s+/gu, ' ').trim()
  return {
    snippet: `${start > 0 ? '…' : ''}${body}${end < source.length ? '…' : ''}`,
    matched: source.slice(index, index + length),
  }
}

/**
 * The ranking order, extended to a **total** order so paging is stable.
 *
 * Two rows can share a rank and a millisecond, so the sort must keep going:
 * session id, then `seq`. Neither can tie — `seq` is the index's watermark for a
 * Session, so no two messages in it share one — which means every row has exactly
 * one place in the order and a page boundary always falls between the same two
 * rows, whatever the corpus does around them.
 * @param sort - `relevance` or `recent`.
 * @returns a comparator.
 */
export function compareHits(sort) {
  return (left, right) => {
    if (sort === 'recent') {
      if (right.message.time !== left.message.time) return right.message.time - left.message.time
    } else {
      if (left.rank !== right.rank) return left.rank - right.rank
      if (right.message.time !== left.message.time) return right.message.time - left.message.time
    }
    if (left.sessionId !== right.sessionId) return left.sessionId < right.sessionId ? -1 : 1
    return left.message.seq - right.message.seq
  }
}

/**
 * The matches for one query and one set of filters, over one index.
 *
 * A plain in-memory scan: 200 Sessions of truncated text is small, and a request
 * never touches a log. Filters are applied *before* the candidate cap, so the cap
 * counts the rows the caller actually asked about. `total` is the number of
 * matches the scan found — exact unless `truncated` says the cap stopped it — and
 * the page is `offset … offset + limit` of the totally-ordered matches.
 * @param index - the index: `sessions` is a Map of id → record.
 * @param query - the normalised query.
 * @param options - `limit`, `offset`, `sessionId`, `role`, `from`, `to`, `sort`.
 * @returns `{ results, total, truncated }`.
 */
export function searchIndex(index, query, options = {}) {
  const limit = isCount(options.limit) && options.limit > 0 ? Math.min(options.limit, MAX_LIMIT) : DEFAULT_LIMIT
  const offset = isCount(options.offset) && options.offset <= MAX_OFFSET ? options.offset : 0
  const sort = options.sort === 'recent' ? 'recent' : 'relevance'
  const onlySession = typeof options.sessionId === 'string' && options.sessionId !== '' ? options.sessionId : undefined
  const onlyRole = options.role === 'user' || options.role === 'assistant' ? options.role : undefined
  const from = isCount(options.from) ? options.from : undefined
  const to = isCount(options.to) ? options.to : undefined
  const sessions = index?.sessions instanceof Map ? index.sessions : new Map()
  const terms = query.split(' ').filter(term => term !== '')
  const hits = []
  let capped = false
  for (const [sessionId, session] of sessions) {
    if (onlySession !== undefined && sessionId !== onlySession) continue
    for (const message of session.messages) {
      if (onlyRole !== undefined && message.role !== onlyRole) continue
      if (from !== undefined && message.time < from) continue
      if (to !== undefined && message.time > to) continue
      if (tooMany(hits)) {
        capped = true
        break
      }
      const rank = rankOf(message.text, query, terms)
      if (rank < 0) continue
      hits.push({ sessionId, message, rank, session })
    }
    if (capped) break
  }
  const total = hits.length
  hits.sort(compareHits(sort))
  const results = []
  for (const hit of hits.slice(offset, offset + limit)) {
    const match = locateMatch(hit.message.text, query, terms)
    if (match === undefined) continue
    const { snippet, matched } = snippetOf(hit.message.text, match)
    results.push({
      sessionId: hit.sessionId,
      sessionTitle: hit.session.title,
      seq: hit.message.seq,
      time: hit.message.time,
      role: hit.message.role,
      snippet,
      matched,
    })
  }
  return { results, total, truncated: capped }
}

// ---------------------------------------------------------------------------
// The indexer
// ---------------------------------------------------------------------------

/**
 * The background indexer: one pass at a time, a couple of Sessions per tick.
 *
 * The shape mirrors `usage.js`'s fold: enumerate with `persistence.list()`, then
 * fold a few Sessions per tick behind a timer so the Host is never blocked, and
 * persist on the same debounce. Two things are different, and they are the point
 * of this feature:
 *
 * - **A Session is folded from its saved byte offset**, so a warm pass reads only
 *   what was appended since — the whole 761 MB is touched once, ever.
 * - **A live event is folded when its Session is caught up** (`session/event`,
 *   `{ global: true }`), which is what makes a message searchable seconds after
 *   it lands instead of at the next pass. A Session that is not caught up — no
 *   offset yet, or an append the pass has not reached — schedules a pass instead,
 *   because its lower `seq`s are not in the index and dropping them would lose
 *   them. The periodic pass is the safety net either way.
 *
 * @param options - `store`, `storePath`, `persistence`/`getPersistence`,
 *   `readLog`, `decode`, `schedule`, `now`, and the tuning knobs.
 * @returns the indexer: `start`, `refresh`, `search`, `indexed`, `nudge`, `dispose`.
 */
export function createSearch(options = {}) {
  const store = options.store ?? createSearchStore(options.storePath ?? resolveSearchStorePath())
  const getPersistence =
    typeof options.getPersistence === 'function'
      ? options.getPersistence
      : () => options.persistence
  const readLog = typeof options.readLog === 'function' ? options.readLog : readLogTail
  const decode = typeof options.decode === 'function' ? options.decode : decodeLogFrames
  const now = typeof options.now === 'function' ? options.now : Date.now
  const schedule =
    typeof options.schedule === 'function'
      ? options.schedule
      : (run, delay = 0) => {
          const timer = setTimeout(run, delay)
          if (typeof timer?.unref === 'function') timer.unref()
          return timer
        }
  const logger = options.logger
  const perTick = isCount(options.sessionsPerTick) && options.sessionsPerTick > 0 ? options.sessionsPerTick : SESSIONS_PER_TICK
  const budgetMs = isCount(options.budgetMs) && options.budgetMs > 0 ? options.budgetMs : TICK_BUDGET_MS
  const passIntervalMs =
    isCount(options.passIntervalMs) && options.passIntervalMs >= 0 ? options.passIntervalMs : PASS_INTERVAL_MS
  const saveIntervalMs = isCount(options.saveIntervalMs) && options.saveIntervalMs >= 0 ? options.saveIntervalMs : SAVE_INTERVAL_MS

  /** Load what the last run persisted. A corrupt file is an empty index, not a failure. */
  let loaded
  try {
    loaded = store.read()
  } catch (error) {
    loaded = { index: emptyIndex(), error: `The search index could not be read: ${messageOf(error)}` }
  }
  const index = loaded?.index ?? emptyIndex()
  let storeError = typeof loaded?.error === 'string' ? loaded.error : ''
  if (storeError !== '') {
    // A store that cannot be read is a rebuild, not a failure — but it is worth a
    // line, because every pass after it is doing work that will not be kept.
    logger?.warn?.('edh-search: %s', storeError)
  }

  const state = { total: 0, passDone: false, state: 'idle', errors: 0, passStartedAt: 0, passMs: 0 }
  let queue
  let seenThisPass = new Set()
  /** Every id a pass has enumerated, so `sessionId` can be validated honestly. */
  const enumerated = new Set()
  let running = false
  let disposed = false
  let timer
  let saveTimer
  let lastSave = 0
  let dirty = false

  /** Write the index, unconditionally; the caller decides whether it is due. */
  function writeNow() {
    if (dirty !== true) return
    lastSave = now()
    dirty = false
    index.builtAt = now()
    const written = store.write(index)
    if (written?.ok !== true) {
      logger?.warn?.('edh-search: the index could not be written: %s', written?.error ?? 'unknown error')
      storeError = typeof written?.error === 'string' ? written.error : storeError
    } else {
      storeError = ''
    }
  }

  /** Write the index now, at most every `saveIntervalMs` while batches land. */
  function save(force = false) {
    if (dirty !== true) return
    const wait = force ? 0 : Math.max(0, saveIntervalMs - (now() - lastSave))
    if (wait > 0) {
      if (saveTimer !== undefined) return
      saveTimer = schedule(() => {
        saveTimer = undefined
        writeNow()
      }, wait)
      return
    }
    writeNow()
  }

  /** Drop one scheduled callback, whatever the injected scheduler returned. */
  function cancelTimer(handle) {
    if (handle === undefined || handle === null) return
    try {
      if (typeof handle.clear === 'function') handle.clear()
      else if (typeof clearTimeout === 'function') clearTimeout(handle)
    } catch {
      // A handle that is already gone is the outcome we wanted.
    }
  }

  /** Schedule the next tick after `delay`, replacing any pending one. */
  function scheduleTick(delay = 0) {
    if (disposed) return
    cancelTimer(timer)
    // The runner returns the tick's promise: a real timer ignores it, and a test
    // scheduler can await one step deterministically.
    timer = schedule(() => {
      timer = undefined
      return tick()
    }, delay)
  }

  /** Ask for a pass over every Session now, keeping what is already indexed. */
  function refreshNow() {
    if (disposed) return
    queue = undefined
    state.passDone = false
    state.state = 'running'
    scheduleTick(0)
  }

  /** The artifact path of one Session, through the backend's own hook. */
  function locatePath(header) {
    const persistence = getPersistence()
    if (persistence === undefined || persistence === null || typeof persistence.locate !== 'function') return undefined
    let located
    try {
      located = persistence.locate({ id: header?.id, cwd: header?.cwd })
    } catch (error) {
      logger?.warn?.('edh-search: locating a Session log failed: %s', messageOf(error))
      return undefined
    }
    const path = isRecord(located) && typeof located.path === 'string' ? located.path : ''
    return path === '' ? undefined : path
  }

  /** The record for one Session, created empty when this is the first sight of it. */
  function recordFor(id) {
    let record = index.sessions.get(id)
    if (record === undefined) {
      record = { title: '', offset: 0, size: 0, lastSeq: 0, messages: [] }
      index.sessions.set(id, record)
    }
    return record
  }

  /**
   * Fold whatever one Session has appended since the saved offset.
   *
   * The read starts on a frame boundary, so a torn tail (an append that has not
   * finished landing) simply leaves the offset where it was and the next pass
   * picks the completed frame up. A log that is shorter than the saved offset was
   * rewritten underneath us: that Session starts again from zero.
   */
  function foldSession(header) {
    const id = typeof header?.id === 'string' ? header.id : undefined
    if (id === undefined || id === '') return
    const record = recordFor(id)
    const path = locatePath(header)
    if (path === undefined) return
    let read
    try {
      read = readLog(path, record.offset)
    } catch (error) {
      state.errors += 1
      logger?.warn?.('edh-search: a Session log could not be read: %s', messageOf(error))
      return
    }
    if (isCount(read?.size) && read.size < record.offset) {
      // The artifact is shorter than the watermark: the bytes it names are gone,
      // so this Session starts again rather than folding a wrong slice.
      record.offset = 0
      record.messages = []
      record.lastSeq = 0
    } else if (isCount(read?.from) && read.from !== record.offset) {
      // The reader itself clamped the start (its own shrink rule); same answer.
      record.offset = 0
      record.messages = []
      record.lastSeq = 0
    }
    if (Buffer.isBuffer(read?.buffer) !== true || read.buffer.length === 0) {
      record.size = isCount(read?.size) ? read.size : record.size
      return
    }
    let delta
    try {
      delta = decode(read.buffer, 0)
    } catch (error) {
      state.errors += 1
      logger?.warn?.('edh-search: a Session log could not be decoded: %s', messageOf(error))
      record.size = isCount(read?.size) ? read.size : record.size
      return
    }
    for (const event of Array.isArray(delta.records) ? delta.records : []) {
      addRecord(record, event)
    }
    record.offset = (isCount(read.from) ? read.from : 0) + (isCount(delta.offset) ? delta.offset : 0)
    record.size = isCount(read.size) ? read.size : record.offset
    dirty = true
  }

  /** One decoded event into one Session record: a title, or a message past the watermark. */
  function addRecord(record, event) {
    const title = titleOf(event)
    if (title !== undefined) {
      record.title = title
      dirty = true
    }
    const message = indexableMessage(event)
    if (message === undefined) return
    if (message.seq <= record.lastSeq) return
    record.lastSeq = Math.max(record.lastSeq, message.seq)
    record.messages.push(message)
    if (record.messages.length > MAX_MESSAGES_PER_SESSION) {
      record.messages.splice(0, record.messages.length - MAX_MESSAGES_PER_SESSION)
    }
    dirty = true
  }

  /** List every stored Session and queue the pass. */
  async function enumerate() {
    state.total = 0
    state.passDone = false
    const persistence = getPersistence()
    if (persistence === undefined || persistence === null || typeof persistence.list !== 'function') {
      queue = []
      state.passDone = true
      return
    }
    let snapshots
    try {
      snapshots = await persistence.list()
    } catch (error) {
      logger?.warn?.('edh-search: listing the stored Sessions failed: %s', messageOf(error))
      state.errors += 1
      queue = []
      state.passDone = true
      return
    }
    queue = (Array.isArray(snapshots) ? snapshots : []).filter(
      snapshot => typeof snapshot?.header?.id === 'string' && snapshot.header.id !== '',
    )
    state.total = queue.length
    seenThisPass = new Set()
    // Every id this Host has a stored Session for, indexed or not yet — the
    // `sessionId` filter is validated against this, so a Session still waiting in
    // the queue is "known but empty" rather than "not found".
    for (const snapshot of queue) {
      if (typeof snapshot?.header?.id === 'string') enumerated.add(snapshot.header.id)
    }
  }

  /** One background tick: a couple of Sessions, then yield. */
  async function tick() {
    if (disposed || running) return
    running = true
    state.state = 'running'
    if (state.passStartedAt === 0) state.passStartedAt = now()
    const began = now()
    let more = false
    try {
      if (queue === undefined) await enumerate()
      let folded = 0
      while (Array.isArray(queue) && queue.length > 0 && folded < perTick && now() - began < budgetMs) {
        const snapshot = queue.shift()
        foldSession(snapshot?.header)
        seenThisPass.add(snapshot?.header?.id)
        folded += 1
      }
      more = Array.isArray(queue) && queue.length > 0
      if (!more) {
        state.passDone = true
        state.state = state.errors > 0 ? 'partial' : 'done'
        state.passMs = now() - (state.passStartedAt === 0 ? began : state.passStartedAt)
        state.passStartedAt = 0
      }
      save(!more)
    } catch (error) {
      more = false
      state.state = 'partial'
      state.passDone = true
      state.errors += 1
      logger?.warn?.('edh-search: a background pass failed: %s', messageOf(error))
    }
    running = false
    if (disposed) return
    scheduleTick(more ? 0 : passIntervalMs)
  }

  /**
   * True when every Session enumerated by the last pass is indexed through the end
   * of its log. A pass that has not finished, or a log with bytes no frame covers
   * (a torn append), is honestly not ready.
   */
  function isReady() {
    if (state.passDone !== true) return false
    if (state.total === 0) return true
    for (const id of seenThisPass) {
      const record = index.sessions.get(id)
      if (record === undefined || record.offset !== record.size) return false
    }
    return seenThisPass.size >= state.total
  }

  return {
    storePath: store.path,
    /** Begin indexing, once. Safe to call from more than one place. */
    start() {
      if (disposed) return
      if (state.state === 'idle') {
        state.state = 'running'
        scheduleTick(0)
      }
      return state
    },
    /** Ask for a pass over every Session now, keeping what is already indexed. */
    refresh() {
      refreshNow()
      return state
    },
    /**
     * Fold one live event.
     *
     * Only a Session whose log a pass has already caught up on can be folded from
     * the event itself — otherwise its earlier `seq`s are missing and dropping them
     * would lose them, so a pass is scheduled instead. This is what makes a
     * message searchable a second after it lands.
     * @param session - the Session the event belongs to.
     * @param event - the committed Session event.
     * @returns whether the index changed.
     */
    nudge(session, event) {
      if (disposed) return false
      const id =
        typeof session?.id === 'string' ? session.id : typeof session?.header?.id === 'string' ? session.header.id : undefined
      if (id === undefined || id === '') return false
      const record = index.sessions.get(id)
      const caughtUp = record !== undefined && record.offset === record.size && state.passDone === true
      if (caughtUp !== true) {
        // Not folded yet: a pass reads the whole log in order, which is the only
        // way the missing `seq`s can be indexed at all.
        refreshNow()
        return false
      }
      const before = record.lastSeq
      const beforeTitle = record.title
      addRecord(record, event)
      if (record.lastSeq === before && record.title === beforeTitle) return false
      save(false)
      return true
    },
    /** What the palette shows as `Indexing… n of m`. */
    indexed() {
      return { sessions: index.sessions.size, total: state.total, ready: isReady() }
    },
    /** Whether this Host can index at all: the persistence service is the whole cost. */
    available() {
      const persistence = getPersistence()
      return persistence !== undefined && persistence !== null && typeof persistence.list === 'function'
    },
    /**
     * Whether this Host has a stored Session with that id.
     *
     * True for an indexed Session and for one a pass has enumerated but not
     * folded yet — a filter on it answers an empty page, not "not found", because
     * the Session really exists and the build simply has not reached it.
     * @param id - the id to look for.
     */
    knows(id) {
      if (typeof id !== 'string' || id === '') return false
      return index.sessions.has(id) || enumerated.has(id)
    },
    /** The last store failure, if any; the route reports it rather than failing. */
    error() {
      return storeError
    },
    /**
     * Run one query over the index. Never touches a log.
     * @param query - the raw query text.
     * @param options - `limit`, `offset`, `sessionId`, `role`, `from`, `to`, `sort`.
     * @returns `{ results, total, truncated }`, or `undefined` for a query too short to run.
     */
    search(query, options = {}) {
      const normalized = normalizeQuery(query)
      if (normalized === undefined) return undefined
      return searchIndex(index, normalized, isRecord(options) ? options : {})
    },
    /** Stop indexing and forget the timers; safe to call twice. */
    dispose() {
      if (disposed) return
      disposed = true
      cancelTimer(timer)
      cancelTimer(saveTimer)
      timer = undefined
      saveTimer = undefined
      try {
        writeNow()
      } catch {
        // Persisting on the way out must not throw.
      }
    },
  }
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

/** One JSON answer; a search report is never an HTTP error status except for a bad request. */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** The method of one request, upper-cased, or the empty string. */
function methodOf(request) {
  return typeof request?.method === 'string' ? request.method.toUpperCase() : ''
}

/**
 * The `limit` query value, or the reason it is not usable.
 *
 * Kept as its own tiny helper because a caller that only pages wants it without
 * the rest of the contract; it shares {@link parseSearchQuery}'s rules.
 * @param request - the incoming request.
 * @returns `{ ok: true, limit }` or `{ ok: false }`.
 */
export function limitOf(request) {
  let url
  try {
    url = new URL(request?.url ?? SEARCH_PATH, 'http://edh.invalid')
  } catch {
    return { ok: false }
  }
  const limit = countParameter(parameterOf(url, 'limit'), { fallback: DEFAULT_LIMIT, min: 1, max: MAX_LIMIT, clamp: true })
  return limit.ok === true ? { ok: true, limit: limit.value } : { ok: false }
}

/** The `q` query value of one request, or `undefined` when it is absent or repeated. */
export function queryOf(request) {
  let url
  try {
    url = new URL(request?.url ?? SEARCH_PATH, 'http://edh.invalid')
  } catch {
    return undefined
  }
  const values = url.searchParams.getAll('q')
  if (values.length !== 1) return undefined
  return values[0]
}

/** One query parameter: absent, present once with a value, or repeated (which is a mistake). */
function parameterOf(url, name) {
  const values = url.searchParams.getAll(name)
  if (values.length === 0) return { present: false }
  if (values.length > 1) return { repeated: true }
  return { present: true, value: values[0] }
}

/** One whole-number parameter, clamped or refused. */
function countParameter(parameter, { fallback, min, max, clamp }) {
  if (parameter.present !== true) return { ok: true, value: fallback }
  if (parameter.repeated === true) return { ok: false }
  const raw = String(parameter.value).trim()
  if (!/^\d+$/u.test(raw)) return { ok: false }
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < min) return { ok: false }
  if (value > max) return clamp === true ? { ok: true, value: max } : { ok: false }
  return { ok: true, value }
}

/** One parameter that must be one of a small set of words, case-insensitively. */
function wordParameter(parameter, words, fallback) {
  if (parameter.present !== true) return { ok: true, value: fallback }
  if (parameter.repeated === true) return { ok: false }
  const raw = String(parameter.value).trim().toLowerCase()
  if (raw === '') return { ok: true, value: fallback }
  return words.includes(raw) ? { ok: true, value: raw } : { ok: false }
}

/**
 * The whole query-string contract of the search route, in one place.
 *
 * Every parameter is validated here so the handler stays a switch, and the
 * answers are the ones the palette and the Advanced page render:
 *
 * - `q` — required, exactly once, at least two characters (a repeat or a missing
 *   value is `bad-input` 400; a query still being typed is `too-short`, 200).
 * - `limit` — 1…100, default 20, clamped (a bigger number is not a mistake).
 * - `offset` — 0…{@link MAX_OFFSET}, default 0, refused past the cap rather than
 *   silently clamped: a page that was asked for is either delivered or refused.
 * - `sessionId` — one id, `any` or empty meaning every Session.
 * - `role` — `any`/`user`/`assistant`.
 * - `from`/`to` — inclusive epoch-millisecond bounds; a reversed range is
 *   `bad-input`, never a silent swap.
 * - `sort` — `relevance` (default) or `recent`.
 *
 * @param request - the incoming request.
 * @returns `{ ok: true, query, limit, offset, sessionId, role, from, to, sort }`,
 *   or `{ ok: false, reason, message, status }`.
 */
export function parseSearchQuery(request) {
  const failure = (reason, message, status = 400) => ({ ok: false, reason, message, status })
  let url
  try {
    url = new URL(request?.url ?? SEARCH_PATH, 'http://edh.invalid')
  } catch {
    return failure('bad-input', 'That search could not be read.')
  }
  const q = parameterOf(url, 'q')
  if (q.present !== true || q.repeated === true) return failure('bad-input', 'A search needs one "q" query value.')
  const query = normalizeQuery(q.value)
  if (query === undefined) return { ok: false, reason: 'too-short', message: `Type at least ${String(MIN_QUERY)} characters to search.`, status: 200 }

  const limit = countParameter(parameterOf(url, 'limit'), { fallback: DEFAULT_LIMIT, min: 1, max: MAX_LIMIT, clamp: true })
  if (limit.ok !== true) return failure('bad-input', `"limit" must be a whole number from 1 to ${String(MAX_LIMIT)}.`)

  const offset = countParameter(parameterOf(url, 'offset'), { fallback: 0, min: 0, max: MAX_OFFSET, clamp: false })
  if (offset.ok !== true) return failure('bad-input', `"offset" must be a whole number from 0 to ${String(MAX_OFFSET)}.`)

  const role = wordParameter(parameterOf(url, 'role'), ['any', 'user', 'assistant'], 'any')
  if (role.ok !== true) return failure('bad-input', '"role" must be "any", "user" or "assistant".')

  const sort = wordParameter(parameterOf(url, 'sort'), ['relevance', 'recent'], 'relevance')
  if (sort.ok !== true) return failure('bad-input', '"sort" must be "relevance" or "recent".')

  const sessionParameter = parameterOf(url, 'sessionId')
  if (sessionParameter.repeated === true) return failure('bad-input', '"sessionId" must be given at most once.')
  let sessionId
  if (sessionParameter.present === true) {
    const raw = String(sessionParameter.value).trim()
    const lowered = raw.toLowerCase()
    if (raw !== '' && lowered !== 'any') {
      if (isSafeKey(raw, MAX_SESSION_ID) !== true) return failure('bad-input', 'That "sessionId" is not a Session id.')
      sessionId = raw
    }
  }

  const bounds = {}
  for (const [name, parameter] of [['from', parameterOf(url, 'from')], ['to', parameterOf(url, 'to')]]) {
    if (parameter.present !== true) continue
    if (parameter.repeated === true) return failure('bad-input', `"${name}" must be given at most once.`)
    const raw = String(parameter.value).trim()
    if (raw === '') continue
    if (!/^\d+$/u.test(raw)) return failure('bad-input', `"${name}" must be an epoch-millisecond integer.`)
    const value = Number(raw)
    if (!Number.isSafeInteger(value)) return failure('bad-input', `"${name}" must be an epoch-millisecond integer.`)
    bounds[name] = value
  }
  if (bounds.from !== undefined && bounds.to !== undefined && bounds.from > bounds.to) {
    return failure('bad-input', '"from" cannot be later than "to".')
  }

  return {
    ok: true,
    query,
    limit: limit.value,
    offset: offset.value,
    sessionId,
    role: role.value === 'any' ? undefined : role.value,
    from: bounds.from,
    to: bounds.to,
    sort: sort.value,
  }
}

/**
 * Answer `GET /api/edh.search?q=…&limit=…&offset=…&sessionId=…&role=…&from=…&to=…&sort=…`.
 *
 * A missing or repeated `q` is `bad-input` (400), a query still being typed is
 * `too-short` (200 — the palette shows nothing, it did not make a mistake), a
 * `sessionId` the Host does not know is `not-found` (404) rather than an empty
 * result set that reads as "no matches", and a Host with no persistence is
 * `unavailable` (200). Nothing here names a path, a store location or the query
 * that failed.
 * @param request - the incoming request.
 * @param options - `search`, the indexer to read.
 * @returns the JSON answer.
 */
export function searchResponse(request, options = {}) {
  const method = methodOf(request)
  if (method !== 'GET' && method !== 'HEAD') {
    const message = `Unsupported method ${request?.method ?? 'without a method'}; a search is a GET`
    return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405)
  }
  const search = options.search
  if (search === undefined || search === null || typeof search.search !== 'function') {
    return jsonResponse({
      ok: false,
      reason: 'unavailable',
      message: 'Search is not available on this Host.',
    })
  }
  if (typeof search.available === 'function' && search.available() !== true) {
    // No `sessionPersistence`: there is nothing to index and nothing to search.
    return jsonResponse({
      ok: false,
      reason: 'unavailable',
      message: 'This Host cannot read Session logs, so there is nothing to search.',
    })
  }
  const parsed = parseSearchQuery(request)
  if (parsed.ok !== true) {
    return jsonResponse({ ok: false, reason: parsed.reason, message: parsed.message }, parsed.status ?? 200)
  }
  if (parsed.sessionId !== undefined && typeof search.knows === 'function' && search.knows(parsed.sessionId) !== true) {
    // A filter on a Session this Host does not have is not "no matches" — the
    // caller asked about something that does not exist, and must be told so.
    return jsonResponse({ ok: false, reason: 'not-found', message: 'No stored Session has that id.' }, 404)
  }
  try {
    const found = search.search(parsed.query, {
      limit: parsed.limit,
      offset: parsed.offset,
      sessionId: parsed.sessionId,
      role: parsed.role,
      from: parsed.from,
      to: parsed.to,
      sort: parsed.sort,
    })
    if (found === undefined) {
      return jsonResponse({ ok: false, reason: 'too-short', message: `Type at least ${String(MIN_QUERY)} characters to search.` })
    }
    return jsonResponse({
      ok: true,
      q: parsed.query,
      total: found.total,
      truncated: found.truncated === true,
      results: found.results,
      indexed: typeof search.indexed === 'function' ? search.indexed() : { sessions: 0, total: 0, ready: false },
    })
  } catch {
    // Never a 500: an index that cannot be read is a report the palette renders.
    return jsonResponse({ ok: false, reason: 'error', message: 'The search index could not be queried.' })
  }
}

/**
 * Register the route and start the indexer on the Host.
 *
 * The route is registered inside `ctx.effect`, and the indexer's disposal with it,
 * so turning the row off stops the background passes. The persistence service is
 * read lazily by every pass, so a Host that mounts it late still indexes; the
 * `ctx.inject` below just makes the first pass happen sooner.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  const search = createSearch({
    logger: ctx.logger,
    getPersistence: () => ctx.get?.('sessionPersistence'),
  })

  ctx.effect(
    () => () => {
      search.dispose()
    },
    'edh-search: indexer',
  )

  ctx.effect(() => {
    try {
      const dispose = ctx.connection.fetch.register({
        path: SEARCH_PATH,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        requestBody: 'buffered',
        fetch: request => searchResponse(request, { search }),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-search: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-search: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-search: route')

  try {
    const off = ctx.on?.(
      'session/event',
      (session, event) => {
        search.nudge(session, event)
      },
      { global: true },
    )
    if (typeof off === 'function') {
      ctx.effect(() => off, 'edh-search: live events')
    }
  } catch (error) {
    ctx.logger?.warn?.('edh-search: live events are not available: %o', error)
  }

  try {
    ctx.inject?.(['sessionPersistence'], () => {
      search.refresh()
    })
  } catch (error) {
    ctx.logger?.warn?.('edh-search: session persistence is not injectable: %o', error)
  }

  search.start()
}

/** The route needs the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
