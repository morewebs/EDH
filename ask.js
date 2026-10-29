/**
 * EDH feature: `ask` — "which of my past conversations is about X?"
 *
 * A Host route that asks the model to search EDH's own index, **without creating
 * or resuming a Session**. Two model calls, not a tool loop:
 *
 * ```
 * plan      → {"queries": ["zstd frame", "decompressSync"]}   (no tools)
 * search    → our index, deduped per Session, top N
 * synthesise→ ANSWER: …  /  SESSIONS: id1 (reason), id2 (reason)
 * ```
 *
 * ## Why two calls and not a tool loop
 *
 * A tool loop is N+1 round trips and every round can spend the whole budget; with
 * a custom gateway route, `tools` support is unproven. Two calls with a hard
 * deadline can be reasoned about: one short structured round, one short prose
 * round, and the search itself is a memory scan of `search.js`'s index.
 *
 * ## The four traps of the `llm` service (all load-bearing)
 *
 * - **No `sessionId`, no `purpose`.** `GenerateOptions` accepts both, and passing a
 *   Session id is exactly how a "search" would create or resume one. This module
 *   never sets either — `test/ask.mjs` asserts the options object has neither.
 * - **`maxTokens` must be explicit.** Omitted, this profile materialises a 200 000
 *   token cap. We ask for 300/1500.
 * - **`reasoningEffort` defaults to `max` here** — a thinking round trip we do not
 *   need and cannot afford inside 28 s. It is always overridden from
 *   `resolveModelInfo`'s own effort list (the least one, `'off'` on this machine).
 * - **`prepareCall` is one-shot**, so a multi-round loop uses `stream()` per round.
 *   There is no non-streaming call and no JSON mode: we assemble text from
 *   `text-delta` chunks and parse what we asked for.
 *
 * There is no retry on this path (the `llm/stream` waterfall has no listeners), and
 * provider failures arrive as a `finish` chunk with `kind: 'error'` and a
 * `failure.code`, which becomes `llm-error` with the code in the message.
 */

import { existsSync } from 'node:fs'
import { createSearchStore, resolveSearchStorePath, searchIndex } from './search.js'

export const name = 'edh-ask'

/** The route: `POST { q, limit? }`. */
export const ASK_PATH = '/api/edh.ask'

/** Shortest question that is worth a model call. */
export const MIN_QUESTION = 2

/** Longest question accepted; the rest is dropped. */
export const MAX_QUESTION = 400

/** Results the palette asks for by default, and the most it may ask for. */
export const DEFAULT_LIMIT = 6
export const MAX_LIMIT = 10

/** The whole flow's budget. The client gives up at 25 s; we answer before it. */
export const DEADLINE_MS = 28000

/** Token caps, explicit because an omitted cap materialises 200 000 here. */
export const PLAN_MAX_TOKENS = 300
export const ANSWER_MAX_TOKENS = 1500

/** The plan may not ask for more searches than this. */
export const MAX_QUERIES = 3

/** The synthesis may not pick more Sessions than this. */
export const MAX_PICKS = 3

/** Index hits handed to the synthesis call. */
export const MAX_CANDIDATES = 10

/** One character budget for the answer sentence. */
export const MAX_ANSWER = 240

/** The largest request body; it carries a question and a number. */
export const BODY_LIMIT = 8192

/** Everything the model is told to do, in one place, so both rounds agree. */
const PLAN_SYSTEM = [
  'You turn a question about someone\'s own past work into search phrases.',
  'Reply with JSON only: {"queries": ["phrase one", "phrase two"]}.',
  `At most ${String(MAX_QUERIES)} phrases. Each must be 2-5 words that would appear literally in the text of a conversation.`,
  'No explanation, no prose, no code fences. Use the words of the question; do not invent topics.',
].join(' ')

const ANSWER_SYSTEM = [
  'You pick which of the provided past conversations best answer a question.',
  'Reply in exactly this form, nothing else:',
  'ANSWER: <one short sentence>',
  'SESSIONS: <id> (<short reason>), <id> (<short reason>)',
  `Use at most ${String(MAX_PICKS)} ids, copied exactly from the list, best first. Numbers alone are not ids.`,
  'If nothing in the list answers the question, still write the sentence and put an empty SESSIONS line.',
].join('\n')

/** True for a plain JSON object. */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** One error's text, whatever was thrown. */
function messageOf(error) {
  return String(error?.message ?? error)
}

/** Text collapsed to single spaces. */
function collapse(text) {
  return String(text ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
}

// ---------------------------------------------------------------------------
// The plan round
// ---------------------------------------------------------------------------

/**
 * The JSON body of a model answer, however it wrapped it.
 *
 * Models fence JSON, prefix it with "Here you go:", or put it on one long line.
 * The strategy is to try the whole text, then every fenced block, then the
 * outermost `{…}` — and to give up quietly, because a rambling plan is not a
 * reason to fail the search.
 * @param text - the model's text.
 * @returns the first object that parses, or `undefined`.
 */
export function firstJsonObject(text) {
  const source = String(text ?? '').trim()
  if (source === '') return undefined
  const candidates = [source]
  for (const match of source.matchAll(/```(?:json)?\s*([\s\S]*?)```/giu)) candidates.push(match[1])
  const open = source.indexOf('{')
  const close = source.lastIndexOf('}')
  if (open !== -1 && close > open) candidates.push(source.slice(open, close + 1))
  for (const candidate of candidates) {
    const trimmed = candidate.trim()
    if (trimmed === '') continue
    try {
      const parsed = JSON.parse(trimmed)
      if (isRecord(parsed)) return parsed
    } catch {
      // Try the next shape.
    }
  }
  return undefined
}

/**
 * The search phrases one plan answer yields.
 *
 * Every entry is collapsed, trimmed, deduped case-insensitively, and must be at
 * least {@link MIN_QUESTION} characters; at most {@link MAX_QUERIES} survive. A
 * `{"ideas": […]}` array, which some models volunteer instead, is accepted as a
 * second choice because it is the same thing under another name.
 * @param text - the model's plan text.
 * @returns `{ queries }` — possibly empty, which the caller turns into a fallback.
 */
export function parsePlan(text) {
  const object = firstJsonObject(text)
  const raw = Array.isArray(object?.queries) ? object.queries : Array.isArray(object?.ideas) ? object.ideas : []
  const queries = []
  const seen = new Set()
  for (const entry of raw) {
    if (typeof entry !== 'string') continue
    const query = collapse(entry)
    if (query.length < MIN_QUESTION) continue
    // A phrase of pure punctuation cannot appear literally in a conversation.
    if (/[\p{L}\p{N}]/u.test(query) !== true) continue
    const key = query.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    queries.push(query)
    if (queries.length >= MAX_QUERIES) break
  }
  return { queries }
}

/**
 * The phrases to search with: the model's, or the question's own words.
 *
 * The fallback is the whole point of the guard — a plan that rambled, came back
 * empty, or was cut off at `max-tokens` still searches. Quoted and trailing
 * question marks are stripped so a phrase like `"zstd frame"?` behaves.
 * @param text - the model's plan text.
 * @param question - the user's question.
 * @returns `{ queries, source }`, `source` being `model` or `question`.
 */
export function planQueries(text, question) {
  const { queries } = parsePlan(text)
  if (queries.length > 0) return { queries, source: 'model' }
  const fallback = collapse(question)
    .replace(/[?\uFF1F]+$/u, '')
    .replace(/["\u201C\u201D]/gu, '')
    .trim()
  // The same rule the model's phrases face: punctuation alone cannot be searched.
  const usable = fallback.length >= MIN_QUESTION && /[\p{L}\p{N}]/u.test(fallback)
  return { queries: usable ? [fallback] : [], source: 'question' }
}

// ---------------------------------------------------------------------------
// The search step
// ---------------------------------------------------------------------------

/**
 * Index hits for several queries, one row per Session.
 *
 * A Session that matches two queries is one candidate, not two: the row keeps its
 * best rank and counts how many queries touched it, so "six hits across three
 * phrases" beats "one hit" when both rank the same. Order: rank, then hit count,
 * then time — the same total order `search.js` pages by.
 * @param index - the search index.
 * @param queries - the phrases to search for.
 * @param limit - how many candidates to keep.
 * @returns the candidate rows: `sessionId`, `sessionTitle`, `snippet`, `time`, `rank`, `hits`, `query`.
 */
export function collectCandidates(index, queries, limit = MAX_CANDIDATES) {
  const bySession = new Map()
  const phrases = Array.isArray(queries) ? queries : []
  for (const query of phrases) {
    // A big limit per phrase, because the dedupe happens below.
    const found = searchIndex(index, query, { limit: 100, sort: 'relevance' })
    for (const row of found.results) {
      const existing = bySession.get(row.sessionId)
      const rank = existing === undefined ? 0 : existing.rank
      // `searchIndex` does not expose rank; the first phrase that hits a Session
      // owns its snippet, and a later phrase only counts.
      if (existing === undefined) {
        bySession.set(row.sessionId, {
          sessionId: row.sessionId,
          sessionTitle: row.sessionTitle,
          snippet: row.snippet,
          time: row.time,
          seq: row.seq,
          query,
          hits: 1,
          rank,
          order: bySession.size,
        })
      } else {
        existing.hits += 1
      }
    }
  }
  return [...bySession.values()]
    .sort((left, right) => {
      if (left.hits !== right.hits) return right.hits - left.hits
      if (right.time !== left.time) return right.time - left.time
      if (left.sessionId !== right.sessionId) return left.sessionId < right.sessionId ? -1 : 1
      return left.seq - right.seq
    })
    .slice(0, Math.max(1, limit))
}

/** One candidate as a line the model can read: `id | title | snippet`. */
export function candidateLine(candidate, index) {
  const title = collapse(candidate.sessionTitle) || '(untitled)'
  const snippet = collapse(candidate.snippet).slice(0, 160)
  return `${String(index + 1)}. ${candidate.sessionId} | ${title} | ${snippet}`
}

// ---------------------------------------------------------------------------
// The synthesis round
// ---------------------------------------------------------------------------

/**
 * The answer sentence and the Sessions the model chose, from one reply.
 *
 * Parsed leniently on purpose, because every part of this is text a model wrote:
 *
 * - the `SESSIONS:` line is found case-insensitively, with or without markdown
 *   emphasis, and everything after it is not part of the sentence;
 * - `ANSWER:` is stripped when present, and a reply with no marker at all uses
 *   its first non-empty line as the sentence;
 * - picks are `id`, `id (reason)`, `id — reason` or `id: reason`; an id not in the
 *   candidate list is dropped, the model's order is kept, and at most
 *   {@link MAX_PICKS} survive;
 * - a reply with no `SESSIONS:` line yields no picks, which the caller turns into
 *   "the top hits, generically explained" rather than prose with nothing under it.
 * @param text - the model's synthesis text.
 * @param candidates - what the model was shown.
 * @returns `{ answer, picks: [{ sessionId, reason }] }`.
 */
export function parseSynthesis(text, candidates) {
  const source = String(text ?? '')
  const lines = source.split(/\r?\n/u)
  const sessionsAt = lines.findIndex(line => /^\s*(?:[*_`\s]*SESSIONS[*_`\s]*)\s*[:：]/iu.test(line))
  const answerLines = sessionsAt === -1 ? lines : lines.slice(0, sessionsAt)
  const sessionsLines = sessionsAt === -1 ? [] : lines.slice(sessionsAt)

  const answer = collapse(
    answerLines
      .join(' ')
      // `ANSWER:`, `**ANSWER:**`, `` `ANSWER`: `` — the marker and any emphasis
      // around it are presentation, not part of the sentence.
      .replace(/^[\s*_`]*ANSWER[\s*_`]*[:：][\s*_`]*/iu, '')
      .trim(),
  ).slice(0, MAX_ANSWER)

  const known = new Set((Array.isArray(candidates) ? candidates : []).map(candidate => candidate.sessionId))
  const picks = []
  const seen = new Set()
  const segment = sessionsLines.join(' ').replace(/^\s*(?:[*_`\s]*SESSIONS[*_`\s]*)\s*[:：]/iu, '')
  // Split on commas that separate picks, keeping `id (reason)` and `id — reason`
  // attached: a bracket or dash segment belongs to the id before it.
  for (const chunk of segment.split(/\s*,\s*/u)) {
    const piece = chunk.trim()
    if (piece === '') continue
    const match = /^([\w.:-]+)(?:\s*(?:[(（]|—|–|-|:)\s*([^)）]*)[)）]?)?$/u.exec(piece)
    const sessionId = match?.[1]?.replace(/[.:]+$/u, '')
    if (sessionId === undefined || known.has(sessionId) !== true) continue
    if (seen.has(sessionId)) continue
    seen.add(sessionId)
    const reason = collapse(match?.[2] ?? '').replace(/[)）]\s*$/u, '').trim()
    picks.push({ sessionId, ...(reason === '' ? {} : { reason }) })
    if (picks.length >= MAX_PICKS) break
  }
  return { answer, picks }
}

/** The sentence to show when the model left none we can trust. */
export function genericAnswer(count) {
  if (count === 0) return 'No conversation in this profile looks like it is about that.'
  if (count === 1) return 'One past conversation looks like it is about that.'
  return `${String(count)} past conversations look like they are about that.`
}

// ---------------------------------------------------------------------------
// One model round
// ---------------------------------------------------------------------------

/**
 * Drain one chunk stream into text and an outcome.
 *
 * `text-delta` is the only content we keep (reasoning deltas are not the answer,
 * and tool-call deltas are impossible without `tools`). The `finish` chunk is the
 * switch: `stop`/`max-tokens`/`tool-calls`/`aborted`/`error`, with the provider's
 * failure code alongside an error. A stream that ends without `finish` is
 * `incomplete` — the model stopped talking, which is a truncation, not a success.
 * @param stream - the async iterable of chunks.
 * @returns `{ text, kind, code }`.
 */
export async function drainStream(stream) {
  let text = ''
  let kind = 'incomplete'
  let code = ''
  if (stream === undefined || stream === null || typeof stream[Symbol.asyncIterator] !== 'function') {
    return { text, kind: 'error', code: 'NO-STREAM' }
  }
  for await (const chunk of stream) {
    if (!isRecord(chunk)) continue
    if (chunk.type === 'text-delta' && typeof chunk.text === 'string') {
      text += chunk.text
      continue
    }
    if (chunk.type === 'finish') {
      const reason = isRecord(chunk.reason) ? chunk.reason : {}
      kind = typeof reason.kind === 'string' ? reason.kind : 'incomplete'
      const failure = isRecord(reason.failure) ? reason.failure : undefined
      code = typeof failure?.code === 'string' ? failure.code : ''
      break
    }
  }
  return { text, kind, code }
}

/**
 * The least reasoning effort a model offers.
 *
 * This profile's default is `max`, which is a long thinking round we neither want
 * nor can afford; the first effort in the model's own list is its least (here
 * `'off'`). A model with no reasoning list gets no override at all.
 * @param info - `resolveModelInfo`'s answer.
 * @returns the effort id, or `undefined`.
 */
export function leastEffortOf(info) {
  const efforts = isRecord(info?.reasoning) && Array.isArray(info.reasoning.efforts) ? info.reasoning.efforts : []
  const usable = efforts.filter(effort => isRecord(effort) && typeof effort.id === 'string' && effort.id !== '')
  if (usable.length === 0) return undefined
  const byId = id => usable.find(effort => effort.id === id)
  const pick = byId('off') ?? byId('minimal') ?? byId('low') ?? usable[0]
  return pick.id
}

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------

/**
 * One ask in flight at a time.
 *
 * Two answers are running the same two model calls against the same index, and the
 * second would push both past the deadline. A `busy` refusal is honest and cheap;
 * queueing would make the palette wait for a result it will throw away. If the
 * client ever retries, the refusal carries a `retry-after` of 1 second.
 * @param options - `get` (service reader), `logger`, `deadlineMs`, `storePath`.
 * @returns `{ available, busy, run({ question, limit }) }`.
 */
export function createAsk(options = {}) {
  const get = typeof options.get === 'function' ? options.get : () => undefined
  const logger = options.logger
  const deadlineMs = Number.isSafeInteger(options.deadlineMs) && options.deadlineMs > 0 ? options.deadlineMs : DEADLINE_MS
  const storePath = typeof options.storePath === 'string' ? options.storePath : undefined
  let inFlight = false

  const now = typeof options.now === 'function' ? options.now : () => Date.now()

  /** The model route, or the reason there is none. */
  const selectionOf = async () => {
    const llm = get('llm')
    if (llm === undefined || llm === null || typeof llm.stream !== 'function') {
      return { ok: false, reason: 'unavailable', message: 'This Host has no model service.' }
    }
    const defaultModel = get('agentDefaultModel')
    if (defaultModel === undefined || defaultModel === null || typeof defaultModel.currentSelection !== 'function') {
      return { ok: false, reason: 'no-model', message: 'No model is selected on this Host.' }
    }
    let selection
    try {
      selection = defaultModel.currentSelection()
    } catch (error) {
      logger?.warn?.('edh-ask: reading the default model failed: %s', messageOf(error))
      return { ok: false, reason: 'no-model', message: 'No model is selected on this Host.' }
    }
    const provider = typeof selection?.provider === 'string' ? selection.provider : ''
    const model = typeof selection?.model === 'string' ? selection.model : ''
    if (provider === '' || model === '') {
      return { ok: false, reason: 'no-model', message: 'No model is selected on this Host.' }
    }
    let info
    if (typeof llm.resolveModelInfo === 'function') {
      try {
        info = await llm.resolveModelInfo(provider, model)
      } catch (error) {
        const code = typeof error?.code === 'string' ? error.code : ''
        if (code === 'NO_ADAPTER') {
          return { ok: false, reason: 'no-model', message: 'The selected model has no adapter on this Host.' }
        }
        return { ok: false, reason: 'llm-error', message: `The model could not be resolved${code === '' ? '' : ` (${code})`}.` }
      }
    }
    return { ok: true, llm, provider, model, effort: leastEffortOf(info) }
  }

  /**
   * The index, read from disk.
   *
   * `missing` distinguishes "the index has never been built" from "the index is
   * built and empty": the first must not read as *nothing matched your question*,
   * because the user would believe their history does not contain it.
   */
  const indexOf = () => {
    const path = storePath ?? resolveSearchStorePath()
    try {
      // The store's own `read()` treats a missing file as an empty index; for this
      // route that is the difference between "not built" and "built, nothing in it".
      const neverBuilt = existsSync(path) !== true
      const read = createSearchStore(path).read()
      const index = read?.index
      const errored = typeof read?.error === 'string' && read.error !== ''
      if (errored === true) logger?.warn?.('edh-ask: %s', read.error)
      return { index, missing: neverBuilt || (errored === true && (index?.sessions?.size ?? 0) === 0) }
    } catch (error) {
      logger?.warn?.('edh-ask: reading the search index failed: %s', messageOf(error))
      return { index: undefined, missing: true }
    }
  }

  return {
    /** Whether this Host could answer at all. */
    available() {
      return get('llm') !== undefined
    },
    /** Whether an ask is running right now. */
    busy() {
      return inFlight
    },
    /**
     * Run the flow: plan, search, synthesise.
     * @param request - `{ question, limit }`.
     * @returns the answer shape the palette is coded to.
     */
    async run(request = {}) {
      const question = collapse(request.question)
      const limit = Number.isSafeInteger(request.limit) && request.limit > 0 ? Math.min(request.limit, MAX_LIMIT) : DEFAULT_LIMIT
      if (question.length < MIN_QUESTION) {
        return { ok: false, reason: 'too-short', message: `Type at least ${String(MIN_QUESTION)} characters.` }
      }
      if (inFlight === true) {
        return { ok: false, reason: 'busy', message: 'A search is already running; try again in a moment.' }
      }
      inFlight = true
      const started = now()
      const controller = new AbortController()
      let timedOut = false
      let timer
      const deadline = new Promise(resolve => {
        timer = setTimeout(() => {
          timedOut = true
          controller.abort()
          resolve('deadline')
        }, deadlineMs)
      })
      const truncated = { plan: false, answer: false }
      let turns = 0
      try {
        const selection = await Promise.race([selectionOf(), deadline])
        if (selection === 'deadline') return timeoutAnswer()
        if (selection.ok !== true) return selection

        const callRound = async (system, user, maxTokens) => {
          turns += 1
          const roundOptions = {
            provider: selection.provider,
            model: selection.model,
            system,
            messages: [{ role: 'user', content: [{ type: 'text', text: user }] }],
            temperature: 0,
            maxTokens,
            signal: controller.signal,
            ...(selection.effort === undefined ? {} : { reasoningEffort: selection.effort }),
          }
          const stream = selection.llm.stream(roundOptions)
          return Promise.race([drainStream(stream), deadline])
        }

        // 1. Plan.
        const planned = await callRound(PLAN_SYSTEM, `Question: ${question}`, PLAN_MAX_TOKENS)
        if (planned === 'deadline') return timeoutAnswer()
        if (planned.kind === 'error' || planned.kind === 'aborted') {
          return finishFailure(planned, timedOut)
        }
        if (planned.kind === 'max-tokens') truncated.plan = true
        const plan = planQueries(planned.text, question)
        if (plan.queries.length === 0) return timeoutAnswer('empty-plan')

        // 2. Search our own index — no model, no Session, no filesystem walk.
        const searched = indexOf()
        if (searched.missing === true) {
          return {
            ok: false,
            reason: 'unavailable',
            message: 'The conversation index has not been built yet, so there is nothing to search.',
          }
        }
        const candidates = collectCandidates(searched.index, plan.queries, MAX_CANDIDATES)
        if (candidates.length === 0) {
          return {
            ok: true,
            answer: genericAnswer(0),
            candidates: [],
            turns,
            elapsedMs: now() - started,
            usedTool: false,
          }
        }

        // 3. Synthesise over the candidates.
        const list = candidates.map((candidate, at) => candidateLine(candidate, at)).join('\n')
        const prompt = [`Question: ${question}`, '', 'Conversations:', list].join('\n')
        const synthesised = await callRound(ANSWER_SYSTEM, prompt, ANSWER_MAX_TOKENS)
        if (synthesised === 'deadline') return timeoutAnswer()
        if (synthesised.kind === 'error' || synthesised.kind === 'aborted') {
          return finishFailure(synthesised, timedOut)
        }
        if (synthesised.kind === 'max-tokens') truncated.answer = true

        const { answer, picks } = parseSynthesis(synthesised.text, candidates)
        const byId = new Map(candidates.map(candidate => [candidate.sessionId, candidate]))
        const chosen = picks
          .map(pick => ({ candidate: byId.get(pick.sessionId), reason: pick.reason }))
          .filter(entry => entry.candidate !== undefined)
        const rows = chosen.length > 0
          ? chosen.map(entry => rowOf(entry.candidate, entry.reason))
          : candidates.slice(0, Math.min(MAX_PICKS, limit)).map(candidate => rowOf(candidate, undefined))

        return {
          ok: true,
          answer: answer === '' ? genericAnswer(rows.length) : answer,
          candidates: rows,
          turns,
          elapsedMs: now() - started,
          usedTool: false,
        }
      } catch (error) {
        logger?.warn?.('edh-ask: the flow failed: %s', messageOf(error))
        return { ok: false, reason: timedOut === true ? 'timeout' : 'error', message: 'The search could not be completed.' }
      } finally {
        clearTimeout(timer)
        inFlight = false
      }

      /** One candidate as the palette's row. */
      function rowOf(candidate, reason) {
        const phrase = collapse(reason) === '' ? `Matches "${candidate.query}"` : collapse(reason)
        return {
          sessionId: candidate.sessionId,
          sessionTitle: candidate.sessionTitle,
          reason: phrase.slice(0, MAX_ANSWER),
          snippet: candidate.snippet,
          time: candidate.time,
        }
      }

      /** The deadline passed: say so rather than pretending. */
      function timeoutAnswer(reason) {
        if (reason === 'empty-plan') {
          return {
            ok: false,
            reason: 'truncated',
            message: 'The model could not turn that into search phrases. Try naming the topic.',
          }
        }
        return { ok: false, reason: 'timeout', message: 'The search took too long. Try a narrower question.' }
      }

      /** A provider failure, as `llm-error` with its own code. */
      function finishFailure(outcome, wasTimedOut) {
        if (wasTimedOut === true) return timeoutAnswer()
        const code = typeof outcome.code === 'string' && outcome.code !== '' ? outcome.code : 'UNKNOWN'
        return { ok: false, reason: 'llm-error', message: `The model could not answer (${code}).` }
      }
    },
  }
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

/** One JSON answer. */
function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

/** The method of one request, upper-cased, or the empty string. */
function methodOf(request) {
  return typeof request?.method === 'string' ? request.method.toUpperCase() : ''
}

/** Read one small JSON body, or the reason it is unusable. */
async function readBody(request) {
  let text = ''
  try {
    text = typeof request?.text === 'function' ? await request.text() : ''
  } catch {
    return { ok: false }
  }
  if (typeof text !== 'string' || text.length > BODY_LIMIT) return { ok: false }
  if (text.trim() === '') return { ok: false }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false }
  }
  if (!isRecord(parsed)) return { ok: false }
  return { ok: true, body: parsed }
}

/**
 * Answer `POST /api/edh.ask`.
 *
 * The whole flow is one call deep and answers with the shape the palette is coded
 * to. A wrong method is a `405`; an unusable body or a question under two
 * characters is `bad-input` (`400`) — except "still typing", which is `too-short`
 * (`200`), because the palette sends what is in the box. Everything else is a
 * `200` with a reason the page renders: `no-model`, `unavailable`, `timeout`,
 * `truncated`, `llm-error`, `error`. A second concurrent ask is `busy` (`429`)
 * with a `retry-after`, because queueing would push both past the deadline.
 *
 * The question and the answer are never logged: this route has no breadcrumb of
 * its own and writes nothing about the conversation to the console.
 * @param request - the incoming request.
 * @param options - `ask`, the flow to run.
 * @returns the JSON answer.
 */
export async function askResponse(request, options = {}) {
  const method = methodOf(request)
  if (method !== 'POST') {
    const allow = 'POST'
    return jsonResponse(
      { ok: false, reason: 'unsupported-method', message: `Unsupported method ${request?.method ?? 'without a method'}; an ask is a POST` },
      405,
      { allow },
    )
  }
  const ask = options.ask
  if (ask === undefined || ask === null || typeof ask.run !== 'function') {
    return jsonResponse({ ok: false, reason: 'unavailable', message: 'Asking is not available on this Host.' })
  }
  if (typeof ask.available === 'function' && ask.available() !== true) {
    return jsonResponse({ ok: false, reason: 'unavailable', message: 'This Host has no model service.' })
  }
  const body = await readBody(request)
  if (body.ok !== true) {
    return jsonResponse({ ok: false, reason: 'bad-input', message: 'That request body is not a JSON object.' }, 400)
  }
  if (typeof body.body.q !== 'string') {
    return jsonResponse({ ok: false, reason: 'bad-input', message: 'An ask needs a "q" string.' }, 400)
  }
  const question = collapse(body.body.q)
  if (question.length > MAX_QUESTION) {
    return jsonResponse({ ok: false, reason: 'bad-input', message: `That question is longer than ${String(MAX_QUESTION)} characters.` }, 400)
  }
  if (question.length < MIN_QUESTION) {
    return jsonResponse({ ok: false, reason: 'too-short', message: `Type at least ${String(MIN_QUESTION)} characters.` })
  }
  const rawLimit = body.body.limit
  if (rawLimit !== undefined && rawLimit !== null && (typeof rawLimit !== 'number' || Number.isInteger(rawLimit) !== true || rawLimit < 1 || rawLimit > MAX_LIMIT)) {
    return jsonResponse({ ok: false, reason: 'bad-input', message: `"limit" must be a whole number from 1 to ${String(MAX_LIMIT)}.` }, 400)
  }
  if (typeof ask.busy === 'function' && ask.busy() === true) {
    return jsonResponse({ ok: false, reason: 'busy', message: 'A search is already running; try again in a moment.' }, 429, { 'retry-after': '1' })
  }
  try {
    const answer = await ask.run({ question, limit: typeof rawLimit === 'number' ? rawLimit : DEFAULT_LIMIT })
    const reason = typeof answer?.reason === 'string' ? answer.reason : 'error'
    return jsonResponse(answer, reason === 'busy' ? 429 : reason === 'bad-input' ? 400 : 200)
  } catch {
    // Never a 500: the palette renders every outcome as a sentence.
    return jsonResponse({ ok: false, reason: 'error', message: 'The search could not be completed.' })
  }
}

/**
 * Register the route on the Host connection.
 *
 * The `llm` service is read lazily per request, so a Host that gains a model later
 * starts answering without a reload; the declaration below is how the Loader knows
 * the row wants it. There is nothing to start and nothing to dispose but the route.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  const ask = createAsk({ logger: ctx.logger, get: serviceName => ctx.get?.(serviceName) })

  ctx.effect(() => {
    try {
      const dispose = ctx.connection.fetch.register({
        path: ASK_PATH,
        methods: ['POST', 'GET', 'HEAD', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        requestBody: 'buffered',
        fetch: request => askResponse(request, { ask }),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-ask: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-ask: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-ask: route')

  try {
    ctx.inject?.(['llm'], () => {
      // A declaration, not a starter: the flow reads `llm` per request.
      return undefined
    })
  } catch (error) {
    ctx.logger?.warn?.('edh-ask: the model service is not injectable: %o', error)
  }
}

/** The route needs the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
