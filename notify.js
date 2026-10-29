/**
 * EDH feature: `notify` — the Host half of notifications.
 *
 * This row exists for exactly one reason: **a browser page cannot read
 * `C:\Windows\Media`.** The user asked for "the default Windows sound", and that
 * sound is a WAV file on this disk that no web page may open. So the Host serves
 * the real system WAVs and the browser half does everything else — the settings
 * page, the Web Audio tones it synthesises itself, and the watcher that decides
 * when to fire.
 *
 * Two routes, both read-only:
 *
 *     GET /api/edh.notify/sounds          → the catalog: what this machine has
 *     GET /api/edh.notify/sound?id=<id>    → one WAV, streamed
 *
 * Three rules make it safe and small.
 *
 * - **The catalog is a curated allowlist, not a directory listing.**
 *   `C:\Windows\Media` holds 70-odd WAVs (system events, hardware dings, setup
 *   chimes); exposing them all would be the opposite of a feature. This offers
 *   the eleven a person actually recognises for a notification, in a deliberate
 *   order with the Windows default first.
 * - **An id is a key into that catalog, never a path fragment.** No user input is
 *   ever joined onto a path: the request's `id` must equal one of our own
 *   constants, and the file name comes from the catalog entry, not from the
 *   request. On top of that, anything containing `/`, `\`, `..`, a colon (drive
 *   letter or an alternate data stream) or a control character is refused before
 *   the lookup — defence in depth, so a future refactor cannot quietly turn this
 *   into a path join. The resolved file is then re-checked to still sit inside
 *   the media directory.
 * - **The WAV is streamed, never read into memory.** These files are ~200 KB
 *   each; opening one and handing the bridge a web stream keeps a phone on a
 *   slow wifi from pinning 200 KB of Host memory per tap.
 *
 * Nothing here may take EDH down. A missing directory (not Windows, or a locked
 * down machine) is a `200` with `available: false` and a sentence, a missing or
 * unreadable WAV is a `404`, a refused registration is a warning, and an
 * unexpected throw is a JSON answer — never a crash into the fetch bridge.
 *
 * Browser *popups* are a different matter and belong to the browser half: the
 * Notification API needs a secure context, so the Remote page served over plain
 * http on a LAN address gets sound (through Web Audio) but not system
 * notifications. That is a browser rule this side cannot work around.
 */

import { execFile } from 'node:child_process'
import { closeSync, createReadStream, existsSync, fstatSync, openSync, readSync, statSync } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'
import { zstdDecompressSync } from 'node:zlib'
import { splitZstdFrames } from './usage.js'

export const name = 'edh-notify'

/** Absolute pathnames the Host registers; the browser addresses them document-relative. */
export const NOTIFY_SOUNDS_PATH = '/api/edh.notify/sounds'
export const NOTIFY_SOUND_PATH = '/api/edh.notify/sound'

/**
 * The fourth route: bring the app's own window forward.
 *
 * This exists because a *renderer cannot raise its own OS window*. Chromium's
 * focus rules and Windows' foreground lock are both in the way, and
 * `window.focus()` will not restore a minimised window — so a notification click
 * has to ask the Host, which is the process that actually owns a window on this
 * desktop. The Host does it the only honest way available without a native
 * dependency: a short PowerShell `Add-Type` P/Invoke of `user32`, aimed at **this
 * process's own top-level window found by pid**, never at a title or a guess.
 */
export const NOTIFY_RAISE_PATH = '/api/edh.notify/raise'

/** Never let a stuck PowerShell hold the request: a click must answer quickly. */
export const RAISE_TIMEOUT_MS = 3000

/** The largest request body the raise route will read; it takes none. */
export const RAISE_BODY_LIMIT = 4096

/** What a WAV is served as. Deliberately absent from the proxy's compressible list. */
export const NOTIFY_SOUND_TYPE = 'audio/wav'

/** A private, day-long cache: these files never change under us. */
export const NOTIFY_SOUND_CACHE = 'private, max-age=86400'

/** Where Windows keeps its sounds when `WINDIR` says nothing. */
export const SOUND_FALLBACK_DIR = 'C:\\Windows'

/** The folder inside that directory. */
export const SOUND_FOLDER = 'Media'

/** Longest id this route will even look at. */
export const MAX_SOUND_ID = 64

/** The third route: what a session last said, for a notification body. */
export const NOTIFY_LAST_PATH = '/api/edh.notify/last'

/**
 * How much of the end of a Session log is read for one notification body.
 *
 * 256 KB of *compressed* log is tens of append frames — minutes of conversation —
 * and is all it takes to find the last assistant message. The log for a long
 * Session is tens of megabytes; the whole point is never to touch them.
 */
export const LAST_WINDOW_BYTES = 256 * 1024

/** Longest notification body returned; a notification that needs scrolling is a bug. */
export const LAST_TEXT_LIMIT = 600

/** Longest session id accepted (real ones are far shorter). */
export const MAX_SESSION_ID = 128

/** How many Zstandard frame-magic candidates the window scan will try before giving up. */
export const LAST_FRAME_CANDIDATES = 16

/** The answer must arrive inside the client's own 1200 ms cap, with room to spare. */
export const LAST_BUDGET_MS = 800

/** The Zstandard frame magic, little-endian as it appears in the artifact. */
const ZSTD_FRAME_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd])

/**
 * The curated catalog, in the order a settings page should show it.
 *
 * Ids are the file name without `.wav`; labels are what a person reads. The first
 * entry is the Windows default on purpose — "System notification" is the sound
 * most people mean by "the Windows sound". `notify`, `chimes`, `ding` and `tada`
 * are the older Windows sounds that still ship, and they follow the modern set.
 */
export const NOTIFY_CATALOG = Object.freeze([
  { id: 'Windows Notify System Generic', label: 'System notification' },
  { id: 'Windows Notify Calendar', label: 'Calendar' },
  { id: 'Windows Notify Email', label: 'Email' },
  { id: 'Windows Notify Messaging', label: 'Messaging' },
  { id: 'Windows Notify', label: 'Notification' },
  { id: 'Windows Ding', label: 'Ding' },
  { id: 'Windows Exclamation', label: 'Exclamation' },
  { id: 'notify', label: 'Notify (classic)' },
  { id: 'chimes', label: 'Chimes' },
  { id: 'ding', label: 'Ding (classic)' },
  { id: 'tada', label: 'Tada' },
])

/** The file one catalog id names. Always ours, never the request's. */
function fileNameOf(id) {
  return `${id}.wav`
}

/**
 * The media directory: `%WINDIR%\Media`, or `C:\Windows\Media` when the
 * environment says nothing.
 * @param env - the environment to read.
 * @returns the absolute directory (not checked for existence here).
 */
export function resolveMediaDir(env = process.env) {
  const windir = typeof env?.WINDIR === 'string' && env.WINDIR.trim() !== '' ? env.WINDIR.trim() : SOUND_FALLBACK_DIR
  return join(windir, SOUND_FOLDER)
}

/**
 * Whether one value is shaped like a key at all.
 *
 * This is never the authorisation — the sound catalog entry or the persistence
 * lookup is — but it stops a hostile value early and keeps the rule in one
 * place: no separators, no parent directory, no colon (drive letter or alternate
 * data stream), no control characters, nothing absurdly long. Both routes that
 * take a key from the request use it.
 * @param value - the untrusted query value.
 * @param limit - the longest value accepted.
 * @returns true when it is a plausible key.
 */
export function isSafeKey(value, limit = MAX_SOUND_ID) {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > limit) return false
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point
  if (/[\u0000-\u001f\u007f]/u.test(value)) return false
  if (value.includes('/') || value.includes('\\')) return false
  if (value.includes('..')) return false
  if (value.includes(':')) return false
  return true
}

/**
 * Whether one value is shaped like a catalog id.
 * @param value - the untrusted `id` query value.
 * @returns true when it is a plausible catalog id.
 */
export function isSoundIdSafe(value) {
  return isSafeKey(value, MAX_SOUND_ID)
}

/**
 * The catalog entry one id names, by exact match.
 *
 * The only way an id can influence a file name, and it can only ever return one
 * of our own constants.
 * @param id - the untrusted id.
 * @returns the entry, or `undefined` when it is not in the catalog.
 */
export function catalogEntry(id) {
  if (typeof id !== 'string') return undefined
  return NOTIFY_CATALOG.find(entry => entry.id === id)
}

/**
 * The absolute path of one allowlisted sound.
 *
 * `id` is validated, then turned into a catalog entry, then the entry's own file
 * name is joined onto the media directory — and the result must still resolve
 * inside it. Every one of those steps is a separate refusal, which is why a
 * traversal cannot survive a refactor of any single one of them.
 * @param id - the untrusted id.
 * @param options - the environment and path helpers, injectable for tests.
 * @returns the absolute path, or `undefined` when the id is not servable.
 */
export function soundFilePath(id, options = {}) {
  const { env = process.env, resolvePath = resolve, mediaDir } = options
  if (isSoundIdSafe(id) !== true) return undefined
  const entry = catalogEntry(id)
  if (entry === undefined) return undefined
  const root = resolvePath(mediaDir ?? resolveMediaDir(env))
  const candidate = resolvePath(join(root, fileNameOf(entry.id)))
  if (candidate !== join(root, fileNameOf(entry.id))) return undefined
  if (candidate !== root && candidate.startsWith(`${root}${sep}`) !== true) return undefined
  return candidate
}

/**
 * What this machine actually has, from the curated catalog.
 *
 * A missing directory is not an error: it is a machine without Windows sounds
 * (or one where the folder is unreadable), and the caller says so plainly. A
 * single missing or zero-byte WAV is skipped rather than zeroed, so the list only
 * ever offers files that a request can really serve.
 * @param options - `env`, `stat`, `exists`, injectable for tests.
 * @returns `{ available, sounds, note? }`.
 */
export function soundCatalog(options = {}) {
  const { env = process.env, stat = statSync, exists = existsSync, mediaDir } = options
  const dir = mediaDir ?? resolveMediaDir(env)
  let present = false
  try {
    present = exists(dir) === true
  } catch {
    present = false
  }
  if (present !== true) {
    return {
      available: false,
      sounds: [],
      note: `This machine has no Windows sound folder (${dir}), so only the built-in tones are available.`,
    }
  }
  const sounds = []
  for (const entry of NOTIFY_CATALOG) {
    try {
      const info = stat(join(dir, fileNameOf(entry.id)))
      if (typeof info?.isFile === 'function' && info.isFile() !== true) continue
      const bytes = Number(info?.size)
      if (!Number.isFinite(bytes) || bytes <= 0) continue
      sounds.push({ id: entry.id, label: entry.label, file: fileNameOf(entry.id), bytes, kind: 'system' })
    } catch {
      // A sound this machine does not have is simply not offered.
    }
  }
  const catalog = { available: true, sounds }
  if (sounds.length === 0) {
    catalog.note = `The Windows sound folder (${dir}) holds none of the sounds EDH offers, so only the built-in tones are available.`
  }
  return catalog
}

/** One JSON answer; the catalog is never an HTTP error status. */
function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  })
}

/** Every method these routes claim, so a wrong one gets our 405 rather than a 404. */
const CLAIMED_METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']

/** The method of one request, upper-cased, or the empty string. */
function methodOf(request) {
  return typeof request?.method === 'string' ? request.method.toUpperCase() : ''
}

/** The one `id` query value of a request URL, or `undefined` when it is absent, repeated or unparsable. */
function soundIdOf(request) {
  let url
  try {
    url = new URL(request?.url ?? NOTIFY_SOUND_PATH, 'http://edh.invalid')
  } catch {
    return undefined
  }
  const values = url.searchParams.getAll('id')
  // One id, exactly: a repeated parameter is a caller confused about the shape,
  // never a second chance at the filesystem.
  if (values.length !== 1) return undefined
  return values[0]
}

/**
 * Answer `GET /api/edh.notify/sounds`.
 *
 * Always a `200`: the page needs to be able to say "this machine has no Windows
 * sounds" in its own words, which it cannot do from an error status it would have
 * to guess at.
 * @param options - the seams {@link soundCatalog} takes.
 * @returns the JSON answer.
 */
export function notifySoundsResponse(options = {}) {
  try {
    const catalog = soundCatalog(options)
    const body = { ok: true, available: catalog.available === true, sounds: catalog.sounds }
    if (typeof catalog.note === 'string' && catalog.note !== '') body.note = catalog.note
    return jsonResponse(body)
  } catch (error) {
    const message = `The sound catalog could not be read: ${String(error?.message ?? error)}`
    return jsonResponse({ ok: false, available: false, sounds: [], reason: 'error', message, note: message })
  }
}

/**
 * Attach a Node read stream to a response body without reading it eagerly.
 *
 * `Readable.toWeb` is the whole point: the file is opened and its bytes reach the
 * bridge as the bridge asks for them, so a 200 KB WAV never sits in Host memory.
 * A read that fails after the headers went out can only end the stream, so the
 * error is logged and swallowed rather than left to become an unhandled `error`
 * event on a `Readable` — which would take the process down.
 * @param path - the absolute file path, already resolved from the catalog.
 * @param options - `createStream` and `logger`, injectable for tests.
 * @returns the web stream, or `undefined` when the file cannot be opened.
 */
export function openSoundStream(path, options = {}) {
  const { createStream = createReadStream, logger } = options
  try {
    const node = createStream(path)
    node.once('error', error => {
      logger?.warn?.('edh-notify: reading a system sound failed: %s', String(error?.message ?? error))
    })
    return Readable.toWeb(node)
  } catch (error) {
    logger?.warn?.('edh-notify: opening a system sound failed: %s', String(error?.message ?? error))
    return undefined
  }
}

/** The one `404`: an id that is not in the catalog, said without echoing the id or naming a path. */
function soundNotFound() {
  return jsonResponse(
    { ok: false, reason: 'not-found', message: 'No sound with that id is offered here; ask /api/edh.notify/sounds for the list.' },
    404,
  )
}

/**
 * Answer `GET|HEAD /api/edh.notify/sound?id=<id>`.
 *
 * The id goes through {@link soundFilePath}, which only ever resolves a catalog
 * constant inside the media directory. `HEAD` answers the same headers with no
 * body — a browser will not ask, but a test and a curious person will.
 * @param request - the incoming request.
 * @param options - the seams {@link soundCatalog} and {@link openSoundStream} take.
 * @returns the response: the WAV, a JSON 404, or a JSON 200 for an unexpected failure.
 */
export function notifySoundResponse(request, options = {}) {
  const method = methodOf(request)
  if (method !== 'GET' && method !== 'HEAD') {
    const message = `Unsupported method ${request?.method ?? 'without a method'}; a sound is a GET`
    return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405, { allow: 'GET, HEAD' })
  }
  try {
    const id = soundIdOf(request)
    if (id === undefined) return soundNotFound()
    const path = soundFilePath(id, options)
    if (path === undefined) return soundNotFound()
    const stat = options.stat ?? statSync
    const info = stat(path)
    const bytes = Number(info?.size)
    if (!Number.isFinite(bytes) || bytes <= 0) return soundNotFound()
    const headers = {
      'content-type': NOTIFY_SOUND_TYPE,
      'content-length': String(bytes),
      'cache-control': NOTIFY_SOUND_CACHE,
    }
    if (method === 'HEAD') return new Response(null, { status: 200, headers })
    const body = openSoundStream(path, options)
    if (body === undefined) return soundNotFound()
    return new Response(body, { status: 200, headers })
  } catch (error) {
    const message = `That sound could not be served: ${String(error?.message ?? error)}`
    return jsonResponse({ ok: false, reason: 'error', message }, 404)
  }
}

/** The sounds route: the catalog on GET/HEAD, a 405 for anything else. */
export function notifySoundsRequest(request, options = {}) {
  const method = methodOf(request)
  if (method === 'GET' || method === 'HEAD') return notifySoundsResponse(options)
  const message = `Unsupported method ${request?.method ?? 'without a method'}; the catalog is a GET`
  return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405, { allow: 'GET, HEAD' })
}

// ---------------------------------------------------------------------------
// The last message: a bounded tail read, never a transcript
// ---------------------------------------------------------------------------
//
// A notification wants one sentence: what did that background session just say?
// The tempting answer — open the Session and read it — is the one thing this must
// never do. A Session log is an append-only Zstandard artifact with one frame per
// append, tens of megabytes for a long conversation, and `handle.read` is indexed
// by *event*, so any transcript read decodes the whole log to reach the end.
//
// So this reads the *last* `LAST_WINDOW_BYTES` of the artifact, splits it into
// frames structurally with the same `splitZstdFrames` the usage fold uses, decodes
// the newest frames, and walks backwards to the newest assistant message that has
// text. The window's first byte usually lands in the middle of a frame, so the
// boundary is found the only honest way: propose each Zstandard-magic occurrence
// as a candidate and let the structural parser accept or reject it.

/**
 * Read the last `window` bytes of one file.
 *
 * Bounded by construction: the buffer is the window, never the file. A file
 * shorter than the window is read whole, which is correct and cheap because it
 * *is* the whole file.
 * @param path - the absolute artifact path, resolved by the caller.
 * @param options - `window` and the fs seams, injectable for tests.
 * @returns `{ ok, buffer, wholeFile, size }` or the reason it could not be read.
 */
export function readLastWindow(path, options = {}) {
  const {
    window = LAST_WINDOW_BYTES,
    open = openSync,
    fstat = fstatSync,
    read = readSync,
    close = closeSync,
  } = options
  const handle = open(path, 'r')
  try {
    const size = Number(fstat(handle)?.size)
    if (!Number.isFinite(size) || size <= 0) return { ok: false, reason: 'empty' }
    const start = Math.max(0, size - Math.max(1, window))
    const length = size - start
    const buffer = Buffer.alloc(length)
    let filled = 0
    while (filled < length) {
      const got = read(handle, buffer, filled, length - filled, start + filled)
      if (!Number.isFinite(got) || got <= 0) break
      filled += got
    }
    return { ok: true, buffer: buffer.subarray(0, filled), wholeFile: start === 0, size }
  } finally {
    try {
      close(handle)
    } catch {
      // A handle that is already closed is the outcome we wanted.
    }
  }
}

/**
 * The first byte in `buffer` that a Zstandard parser accepts as a frame boundary.
 *
 * The frame magic alone is not evidence — it occurs inside compressed blocks too,
 * and a false candidate can even satisfy the structural walk by accident — so every
 * occurrence is only a *candidate* and three independent checks decide: the frames
 * must parse, they must end exactly where the complete part of the buffer ends (or
 * where a torn append begins), and the first frame must actually **decompress** to
 * plaintext ending in a newline, which is what the writer always produces. A magic
 * that merely looks like a boundary fails one of those and is skipped.
 * @param buffer - the bytes read from the tail of the artifact.
 * @param options - `scan`, `decompress` and `maxCandidates`, injectable for tests.
 * @returns the offset, or `-1` when nothing in the buffer is a frame boundary.
 */
export function findFrameStart(buffer, options = {}) {
  const { scan = splitZstdFrames, decompress = zstdDecompressSync, maxCandidates = LAST_FRAME_CANDIDATES } = options
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return -1
  let from = 0
  for (let attempt = 0; attempt < maxCandidates; attempt += 1) {
    const at = buffer.indexOf(ZSTD_FRAME_MAGIC, from)
    if (at === -1) return -1
    from = at + 4
    const view = buffer.subarray(at)
    let parsed
    try {
      parsed = scan(view)
    } catch {
      continue
    }
    const frames = Array.isArray(parsed?.frames) ? parsed.frames : []
    if (frames.length === 0) continue
    const completeTo = parsed.tornStart === undefined ? view.length : parsed.tornStart
    if (frames.at(-1).end !== completeTo) continue
    let text
    try {
      text = decompress(view.subarray(frames[0].start, frames[0].end)).toString('utf8')
    } catch {
      continue
    }
    // Every frame's plaintext ends with a newline (the writer appends
    // `lines.join('\n') + '\n'`), so a decoded prefix that does not is a magic
    // found inside somebody else's compressed bytes.
    if (text.endsWith('\n') !== true) continue
    return at
  }
  return -1
}

/**
 * Decode the records of one complete frame window.
 *
 * A line that does not parse is skipped rather than fatal: the newest frame may be
 * an append that never finished, and one unreadable line must not cost the answer.
 * @param buffer - the window bytes.
 * @param start - the frame boundary {@link findFrameStart} found.
 * @param options - `scan` and `decompress`, injectable for tests.
 * @returns the records in log order, and whether a torn tail was seen.
 */
export function decodeWindow(buffer, start, options = {}) {
  const { scan = splitZstdFrames, decompress = zstdDecompressSync } = options
  const view = buffer.subarray(start)
  const parsed = scan(view)
  const records = []
  for (const frame of Array.isArray(parsed?.frames) ? parsed.frames : []) {
    let text
    try {
      text = decompress(view.subarray(frame.start, frame.end)).toString('utf8')
    } catch {
      continue
    }
    for (const line of text.split('\n')) {
      if (line.trim() === '') continue
      try {
        records.push(JSON.parse(line))
      } catch {
        // A half-written line is the tail of an interrupted append.
      }
    }
  }
  return { records, torn: parsed?.tornStart !== undefined }
}

/** One text block's text, or `undefined` when a block is not text. */
function textOfBlock(block) {
  if (typeof block === 'string') return block
  if (typeof block !== 'object' || block === null) return undefined
  if (block.type !== 'text') return undefined
  return typeof block.text === 'string' ? block.text : undefined
}

/**
 * The text of one `assistant/message` record, or `undefined` when it carries none.
 *
 * The message lives on `data.message` (only `user/message` keeps it on `data`), and
 * its `content` is a block array: the text blocks are joined, and any block that is
 * not text — a tool call, a reasoning block — is ignored. A message with no text at
 * all (tool calls only) answers `undefined` so the caller keeps looking back.
 * @param record - one decoded log record.
 * @returns the joined text, or `undefined`.
 */
export function assistantTextOf(record) {
  if (typeof record !== 'object' || record === null) return undefined
  if (record.type !== 'assistant/message') return undefined
  const message = record.data?.message
  if (typeof message !== 'object' || message === null) return undefined
  const content = message.content
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return undefined
  const parts = []
  for (const block of content) {
    const text = textOfBlock(block)
    if (text !== undefined) parts.push(text)
  }
  return parts.length === 0 ? undefined : parts.join('\n')
}

/**
 * Clip one message into a notification body.
 *
 * Whitespace is collapsed to single spaces, so a multi-paragraph reply becomes the
 * one line a notification shows, and the result is capped at `limit`. `truncated`
 * says whether the cap cut something, so a caller can add its own ellipsis rather
 * than guess.
 * @param text - the joined message text.
 * @param limit - the longest body returned.
 * @returns `{ text, truncated }`.
 */
export function clipBody(text, limit = LAST_TEXT_LIMIT) {
  const flat = String(text ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
  if (flat.length <= limit) return { text: flat, truncated: false }
  return { text: flat.slice(0, Math.max(0, limit)).trimEnd(), truncated: true }
}

/**
 * The newest assistant text and the newest title in one decoded window.
 *
 * Both are found by walking the records **backwards**, because the newest frame is
 * the interesting one: the first assistant message that has text wins (a message
 * with only tool calls is skipped, so the body is never uselessly empty), and the
 * first `session/title` wins for the title. The empty string is returned only when
 * the whole window carries no assistant text at all.
 * @param records - the decoded records, in log order.
 * @param options - `limit`, the longest body.
 * @returns `{ text, truncated, title }`.
 */
export function lastActivityOf(records, options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : LAST_TEXT_LIMIT
  let title
  let body
  for (let index = (Array.isArray(records) ? records.length : 0) - 1; index >= 0; index -= 1) {
    const record = records[index]
    if (typeof record !== 'object' || record === null) continue
    if (title === undefined && record.type === 'session/title') {
      const candidate = record.data?.title
      if (typeof candidate === 'string' && candidate.trim() !== '') title = candidate.trim().slice(0, 200)
    }
    if (body === undefined) {
      const text = assistantTextOf(record)
      if (text !== undefined) {
        const clipped = clipBody(text, limit)
        if (clipped.text !== '') body = clipped
      }
    }
    if (title !== undefined && body !== undefined) break
  }
  const result = body ?? { text: '', truncated: false }
  if (title !== undefined) result.title = title
  return result
}

/**
 * The artifact path of one Session, through the backend's own diagnostics hook.
 *
 * The session key is **never** joined onto a path: it is validated, looked up among
 * the persistence headers (which carry the `cwd` the backend needs), and handed to
 * `locate({ id, cwd })`, which the backend turns into its own path. An id this Host
 * does not know is `not-found`; a deployment without the service is `unavailable`.
 * @param persistence - `ctx.sessionPersistence`, or whatever stands in for it.
 * @param sessionId - the validated request key.
 * @returns `{ ok: true, path }` or the reason it cannot be resolved.
 */
export async function locateSessionPath(persistence, sessionId) {
  if (persistence === undefined || persistence === null) return { ok: false, reason: 'unavailable' }
  if (typeof persistence.locate !== 'function') return { ok: false, reason: 'unavailable' }
  let meta = { id: sessionId }
  if (typeof persistence.list === 'function') {
    const headers = await persistence.list()
    const header = Array.isArray(headers)
      ? headers.find(entry => typeof entry === 'object' && entry !== null && entry.id === sessionId)
      : undefined
    if (header === undefined) return { ok: false, reason: 'not-found' }
    meta = { id: sessionId, cwd: header.cwd }
  }
  const located = persistence.locate(meta)
  const path = typeof located === 'object' && located !== null && typeof located.path === 'string' ? located.path : ''
  if (path === '') return { ok: false, reason: 'not-found' }
  return { ok: true, path }
}

/** The `sessionId` query value of one request, or `undefined` when it is absent, repeated or unparsable. */
function sessionIdOf(request) {
  let url
  try {
    url = new URL(request?.url ?? NOTIFY_LAST_PATH, 'http://edh.invalid')
  } catch {
    return undefined
  }
  const values = url.searchParams.getAll('sessionId')
  if (values.length !== 1) return undefined
  return values[0]
}

/**
 * Answer `GET /api/edh.notify/last?sessionId=<id>`.
 *
 * Bounded end to end: a validated key, one persistence lookup, one 256 KB read, and
 * a decode of the frames inside it — with an elapsed-time guard before the decode,
 * so a slow Host answers `error` instead of making the caller wait. Every failure
 * is a JSON report (`bad-input` 400, `not-found` 404, `error`/`unavailable` 200),
 * never a 500.
 * @param request - the incoming request.
 * @param options - `persistence`, the fs seams, and `now`/`budgetMs` for the guard.
 * @returns the JSON answer.
 */
export async function notifyLastResponse(request, options = {}) {
  const method = methodOf(request)
  if (method !== 'GET' && method !== 'HEAD') {
    const message = `Unsupported method ${request?.method ?? 'without a method'}; the last message is a GET`
    return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405, { allow: 'GET, HEAD' })
  }
  const now = typeof options.now === 'function' ? options.now : Date.now
  const started = now()
  const budgetMs = Number.isInteger(options.budgetMs) && options.budgetMs > 0 ? options.budgetMs : LAST_BUDGET_MS
  const failure = (reason, message, status) => jsonResponse({ ok: false, reason, message }, status)

  const sessionId = sessionIdOf(request)
  if (sessionId === undefined || isSafeKey(sessionId, MAX_SESSION_ID) !== true) {
    return failure('bad-input', 'A "sessionId" query value is required, once, and must look like a session id.', 400)
  }
  try {
    const located = await locateSessionPath(options.persistence, sessionId)
    if (located.ok !== true) {
      if (located.reason === 'unavailable') {
        return failure('unavailable', 'This Host cannot read Session logs, so there is no message to show.', 200)
      }
      return failure('not-found', 'No stored Session has that id.', 404)
    }
    if (now() - started > budgetMs) return failure('error', 'That Session took too long to find.', 200)
    let read
    try {
      read = readLastWindow(located.path, options)
    } catch (error) {
      return failure('not-found', `That Session's log could not be opened: ${String(error?.message ?? error)}`, 404)
    }
    if (read.ok !== true) {
      return read.reason === 'empty'
        ? failure('error', 'That Session has no stored activity yet.', 200)
        : failure('not-found', "That Session's log could not be read.", 404)
    }
    if (now() - started > budgetMs) return failure('error', 'That Session took too long to read.', 200)
    let activity = { text: '', truncated: false }
    if (read.wholeFile === true) {
      // A log short enough to be the whole window is decoded from its first frame;
      // there is no boundary to find.
      if (read.buffer.length >= 4) activity = lastActivityOf(decodeWindow(read.buffer, 0, options).records, options)
    } else {
      const start = findFrameStart(read.buffer, options)
      if (start !== -1) activity = lastActivityOf(decodeWindow(read.buffer, start, options).records, options)
    }
    const body = { ok: true, sessionId, text: activity.text, truncated: activity.truncated === true }
    if (typeof activity.title === 'string' && activity.title !== '') body.title = activity.title
    return jsonResponse(body)
  } catch (error) {
    return failure('error', `The last message could not be read: ${String(error?.message ?? error)}`, 200)
  }
}

// ---------------------------------------------------------------------------
// Raising the app's own window
// ---------------------------------------------------------------------------
//
// A renderer cannot raise its own OS window: Chromium's focus rules and Windows'
// foreground lock both refuse it, and `window.focus()` does not un-minimise
// anything. So a notification click asks this Host — the process that actually
// owns a window on this desktop.
//
// The work is a short PowerShell `Add-Type` P/Invoke of `user32`, because EDH
// ships no npm dependency and a native addon is not an option. Five rules make it
// honest rather than hopeful:
//
// - **The window is found by pid** — this process's, then its parent's, since on a
//   desktop build the visible window may belong to the parent — and never by title
//   text or a guessed name, which could raise the wrong window.
// - **It asks the window what it is before touching it** (`IsIconic`, `IsZoomed`),
//   because the two cases want opposite treatment and the wrong one is destructive:
//   `SW_RESTORE` on a *maximised* window un-maximises it. That was a real bug — a
//   notification click resized the app — so restoring happens **only** when the
//   window is minimised, and there is no minimise/restore nudge at all.
// - **A raise may change focus, never geometry.** The script captures `IsIconic`,
//   `IsZoomed` and `GetWindowRect` before and after, and a raise that moved the
//   window is reported as a failure (`reason=changed`), not a success.
// - **The result is verified, not assumed**: `raised=1` only when
//   `GetForegroundWindow()` is the handle it asked for *and* the state check holds.
//   Otherwise it reports `raised: false` (`denied`, `changed`) rather than pretending.
// - **It is bounded and serialised**: a 3 s timeout, and one raise in flight at a
//   time — a second click joins the running one instead of spawning another.

/**
 * The C# the script compiles: find by pid, then climb three documented rungs.
 *
 * **A raise may change focus. It may not change geometry or maximise state.** That
 * is the rule the whole ladder is built around, and it is why the rungs ask the
 * window what it is before touching it:
 *
 * - `IsIconic(target)` — minimised. This is the *only* case where restoring is the
 *   action rather than a side effect, because a minimised window cannot hold the
 *   foreground at all. `ShowWindowAsync(SW_RESTORE)` is therefore called here and
 *   **nowhere else**: on a *maximised* window it un-maximises (Windows restores to
 *   the pre-maximise size), which is a resize the user never asked for.
 * - `IsZoomed(target)` — maximised. Recorded, verified, and never acted on.
 *
 * The rungs, in order, each verified with `GetForegroundWindow()`:
 *
 * 1. `ShowWindowAsync(SW_RESTORE)` — **only when `IsIconic` is true**.
 * 2. `AttachThreadInput` — join the foreground window's input queue, ask while
 *    attached, detach. The documented way around the foreground lock for a helper
 *    process, and the rung that works on this machine.
 * 3. `SetWindowPos(… SWP_NOMOVE | SWP_NOSIZE | SWP_SHOWWINDOW)` then
 *    `BringWindowToTop` — Z order only, geometrically inert. It never runs on a
 *    minimised window (rung 1 handled that), so `SWP_SHOWWINDOW` cannot restore
 *    anything either.
 *
 * **There is no minimise/restore nudge.** It was a visible flash that changed the
 * window's state twice by design — the other thing that could resize the app — and
 * it is gone.
 *
 * The verdict is a success only when *both* hold: the window is foreground, **and**
 * its state is what it was (or, for the iconic case, merely un-minimised with its
 * maximised flag untouched). `changed=1` is reported as a failure, because a raise
 * that steals focus and un-maximises is precisely the bug this script exists to
 * prevent.
 */
const RAISE_TYPE_SOURCE = `using System;
using System.Runtime.InteropServices;

public class EdhRaise
{
    private delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);

    private const int SwRestore = 9;
    private const uint HwndTop = 0;
    private const uint SwpNoSize = 0x0001;
    private const uint SwpNoMove = 0x0002;
    private const uint SwpShowWindow = 0x0040;

    [StructLayout(LayoutKind.Sequential)]
    private struct Rect
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool EnumWindows(EnumProc callback, IntPtr lParam);
    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern bool IsZoomed(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out Rect rect);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetWindowTextLength(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern IntPtr GetWindow(IntPtr hWnd, uint command);
    [DllImport("user32.dll")]
    private static extern bool ShowWindowAsync(IntPtr hWnd, int command);
    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(IntPtr hWnd, uint insertAfter, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    private static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool attach);
    [DllImport("kernel32.dll")]
    private static extern uint GetCurrentThreadId();

    public static string Run(int[] pids)
    {
        IntPtr target = IntPtr.Zero;
        for (int index = 0; index < pids.Length && target == IntPtr.Zero; index++)
        {
            target = Find(pids[index]);
        }
        if (target == IntPtr.Zero) return "EDH window=none";

        // What the window is, before anything touches it.
        bool iconicBefore = IsIconic(target);
        bool zoomedBefore = IsZoomed(target);
        Rect before;
        GetWindowRect(target, out before);

        string step = "";

        // Rung 1: restoring is the action only for a minimised window.
        if (iconicBefore)
        {
            ShowWindowAsync(target, SwRestore);
            Settle(60);
            if (IsForeground(target)) step = "restore";
        }

        // Rung 2: join the foreground thread's input queue and ask.
        if (step.Length == 0)
        {
            SetForegroundAttached(target);
            Settle(60);
            if (IsForeground(target)) step = "attach";
        }

        // Rung 3: Z order only — no move, no size, and never on a minimised window.
        if (step.Length == 0)
        {
            SetWindowPos(target, HwndTop, 0, 0, 0, 0, SwpNoMove | SwpNoSize | SwpShowWindow);
            BringWindowToTop(target);
            Settle(60);
            if (IsForeground(target)) step = "top";
        }

        // What the window is, after. Focus is the only thing we were allowed to
        // change; the maximised flag and the rect must be exactly as they were, and
        // a minimised window may only have lost its minimised state.
        bool iconicAfter = IsIconic(target);
        bool zoomedAfter = IsZoomed(target);
        Rect after;
        GetWindowRect(target, out after);
        bool geometry = SameRect(before, after);
        bool state =
            zoomedAfter == zoomedBefore &&
            (iconicBefore ? iconicAfter == false : iconicAfter == false && geometry);
        string facts = "iconic=" + (iconicAfter ? "1" : "0") +
            " zoomed=" + (zoomedAfter ? "1" : "0") +
            " changed=" + (state ? "0" : "1");

        if (step.Length > 0 && state)
        {
            return "EDH raised=1 step=" + step + " " + facts;
        }
        if (step.Length > 0)
        {
            // It took the foreground and moved the window: a failure, named as one.
            return "EDH raised=0 reason=changed tries=" + step + " " + facts;
        }
        return "EDH raised=0 reason=denied tries=iconic,attach,top " + facts;
    }

    private static bool SameRect(Rect left, Rect right)
    {
        return left.Left == right.Left && left.Top == right.Top &&
            left.Right == right.Right && left.Bottom == right.Bottom;
    }

    private static bool IsForeground(IntPtr target)
    {
        return GetForegroundWindow() == target;
    }

    private static void Settle(int milliseconds)
    {
        System.Threading.Thread.Sleep(milliseconds);
    }

    private static void SetForegroundAttached(IntPtr target)
    {
        uint foregroundThread = 0;
        IntPtr foreground = GetForegroundWindow();
        if (foreground != IntPtr.Zero)
        {
            uint owner;
            foregroundThread = GetWindowThreadProcessId(foreground, out owner);
        }
        uint self = GetCurrentThreadId();
        bool attached = false;
        if (foregroundThread != 0 && foregroundThread != self)
        {
            attached = AttachThreadInput(foregroundThread, self, true);
        }
        SetForegroundWindow(target);
        if (attached) AttachThreadInput(foregroundThread, self, false);
    }

    private static IntPtr Find(int pid)
    {
        IntPtr strict = IntPtr.Zero;
        IntPtr loose = IntPtr.Zero;
        EnumProc visit = delegate(IntPtr hWnd, IntPtr lParam)
        {
            uint owner;
            GetWindowThreadProcessId(hWnd, out owner);
            if (owner != (uint)pid) return true;
            if (!IsWindowVisible(hWnd)) return true;
            if (loose == IntPtr.Zero) loose = hWnd;
            if (GetWindowTextLength(hWnd) > 0 && GetWindow(hWnd, 4u) == IntPtr.Zero)
            {
                strict = hWnd;
                return false;
            }
            return true;
        };
        EnumWindows(visit, IntPtr.Zero);
        return strict != IntPtr.Zero ? strict : loose;
    }
}`

/**
 * The pids one raise may target: this process's, then its parent's.
 *
 * A pid is a number and only ever comes from `process`, never from a request, so
 * it cannot be interpolated into the script as anything but digits.
 * @param pidList - candidate pids, in order.
 * @returns the valid, unique, positive integers, at most four.
 */
export function raisePids(pidList) {
  const pids = []
  for (const value of Array.isArray(pidList) ? pidList : []) {
    if (typeof value !== 'number') continue
    if (!Number.isSafeInteger(value) || value <= 0) continue
    if (pids.includes(value)) continue
    pids.push(value)
    if (pids.length === 4) break
  }
  return pids
}

/**
 * The exact command one raise runs.
 *
 * Kept as a pure function so the test can assert the argv byte for byte: the pids
 * appear only as integer literals inside the script (never through a shell, never
 * from a request), and the process is spawned hidden, with a hard timeout.
 * @param pidList - candidate pids for the window.
 * @param options - `executable`, `timeoutMs`.
 * @returns `{ executable, args, options }` for `child_process.execFile`.
 */
export function raiseCommand(pidList, options = {}) {
  const pids = raisePids(pidList)
  const script = [
    "$ErrorActionPreference = 'Stop'",
    "Add-Type -TypeDefinition @'",
    RAISE_TYPE_SOURCE,
    "'@",
    pids.length === 0 ? "[EdhRaise]::Run(@())" : `[EdhRaise]::Run([int[]]@(${pids.join(', ')}))`,
    '',
  ].join('\n')
  return {
    executable: typeof options.executable === 'string' && options.executable !== '' ? options.executable : 'powershell.exe',
    args: [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-WindowStyle',
      'Hidden',
      '-Command',
      script,
    ],
    options: {
      windowsHide: true,
      timeout: Number.isInteger(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : RAISE_TIMEOUT_MS,
      maxBuffer: 64 * 1024,
      killSignal: 'SIGKILL',
    },
  }
}

/**
 * The verdict the script printed.
 *
 * One line starting `EDH `, and the last one wins. The three shapes are:
 *
 * ```
 * EDH raised=1 step=attach iconic=0 zoomed=1 changed=0
 * EDH raised=0 reason=changed tries=attach iconic=0 zoomed=0 changed=1
 * EDH raised=0 reason=denied tries=iconic,attach,top iconic=0 zoomed=1 changed=0
 * ```
 *
 * A success names the rung that actually brought the window forward
 * (`step=restore|attach|top`) **and** states that the window's geometry and
 * maximise state were unchanged. That second half is not decoration: a raise that
 * steals focus and un-maximises the app is the bug this script was rewritten for,
 * so a `raised=1` line whose `changed` is not `0` is parsed as a **failure**
 * (`changed`), not as a success — the parser refuses to be lied to by its own
 * script. Anything else — a wall of text, a PowerShell error, no output — is
 * `undefined`, which the caller reports as `failed` rather than guessing.
 * @param text - the process's stdout.
 * @returns `{ raised, reason?, step?, tried?, iconic?, zoomed?, changed? }`, or `undefined`.
 */
export function parseRaiseOutput(text) {
  if (typeof text !== 'string') return undefined
  let verdict
  for (const line of text.split(/\r?\n/u)) {
    const match = /^EDH[ \t]+(.*)$/u.exec(line.trim())
    if (match === null) continue
    const payload = match[1].trim()
    if (payload === 'window=none') {
      verdict = { raised: false, reason: 'no-window' }
      continue
    }
    // Strict on purpose: the script prints a handful of exact shapes, so a line
    // with anything unexpected on it is not evidence of anything.
    const success = /^raised=1[ \t]+step=([a-z]+)((?:[ \t]+[a-z]+=[01])*)$/u.exec(payload)
    const refusal = /^raised=0[ \t]+reason=(denied|changed)(?:[ \t]+tries=([a-z,]+))?((?:[ \t]+[a-z]+=[01])*)$/u.exec(payload)
    if (success !== null) {
      const facts = stateFactsOf(success[2])
      if (facts.changed === undefined) {
        // A success that did not check the geometry is not evidence of a raise.
        verdict = undefined
      } else if (facts.changed === 1) {
        // The whole point: focus was taken and the window moved. A failure.
        verdict = { raised: false, reason: 'changed', step: success[1], ...facts }
      } else {
        verdict = { raised: true, step: success[1], ...facts }
      }
    } else if (refusal !== null) {
      verdict = {
        raised: false,
        reason: refusal[1],
        ...(refusal[2] === undefined ? {} : { tried: refusal[2].split(',') }),
        ...stateFactsOf(refusal[3]),
      }
    } else if (/^raised=0(?:[ \t]|$)/u.test(payload)) {
      verdict = { raised: false, reason: 'failed' }
    } else {
      verdict = undefined
    }
  }
  return verdict
}

/** The `iconic=`/`zoomed=`/`changed=` facts of a verdict line. */
function stateFactsOf(fragment) {
  const facts = {}
  for (const match of String(fragment ?? '').matchAll(/([a-z]+)=([01])/gu)) {
    facts[match[1]] = Number(match[2])
  }
  return facts
}

/** Run one command with `execFile`, resolving rather than throwing. */
function runCommand(command) {
  return new Promise(resolve => {
    execFile(command.executable, command.args, command.options, (error, stdout) => {
      resolve({
        ok: error === null || error === undefined,
        code: typeof error?.code === 'string' ? error.code : undefined,
        killed: error?.killed === true,
        stdout: String(stdout ?? ''),
      })
    })
  })
}

/**
 * The raiser: one attempt at a time, bounded, and never a throw.
 *
 * A second call while a raise is running returns the *same* promise, so a double
 * click cannot spawn a second PowerShell. Every outcome is a report — `raised`
 * true or false with a short reason — and nothing identifies a window title, a
 * path, or this machine's layout.
 * @param options - `platform`, `pid`, `parentPid`, `run`, `executable`, `timeoutMs`, `logger`.
 * @returns `{ raise(), dispose(), attempts() }`.
 */
export function createRaiser(options = {}) {
  const {
    platform = process.platform,
    pid = process.pid,
    parentPid = process.ppid,
    run = runCommand,
    executable,
    timeoutMs = RAISE_TIMEOUT_MS,
    logger,
  } = options
  let inflight
  let disposed = false
  let attempts = 0

  const attempt = async () => {
    if (platform !== 'win32') return { ok: true, raised: false, reason: 'not-windows' }
    attempts += 1
    const command = raiseCommand([pid, parentPid], { executable, timeoutMs })
    let outcome
    try {
      outcome = await run(command)
    } catch {
      // A runner that throws is a failure to run, not a window that refused.
      return { ok: true, raised: false, reason: 'failed' }
    }
    if (outcome === undefined || outcome.ok !== true) {
      const reason = outcome?.killed === true ? 'timeout' : 'failed'
      logger?.warn?.('edh-notify: the window could not be raised (%s)', reason)
      return { ok: true, raised: false, reason }
    }
    const verdict = parseRaiseOutput(outcome.stdout)
    if (verdict === undefined) {
      logger?.warn?.('edh-notify: the window could not be raised (unreadable answer)')
      return { ok: true, raised: false, reason: 'failed' }
    }
    if (verdict.raised !== true) {
      logger?.warn?.('edh-notify: the window was not raised (%s)', verdict.reason)
    } else if (typeof verdict.step === 'string') {
      // Which rung actually worked is the only way to know what to keep on this
      // machine — a step name is not sensitive.
      logger?.info?.('edh-notify: the window came forward (step=%s)', verdict.step)
    }
    return { ok: true, ...verdict }
  }

  return {
    raise() {
      if (disposed === true) return Promise.resolve({ ok: true, raised: false, reason: 'disposed' })
      if (inflight !== undefined) return inflight
      inflight = attempt().finally(() => {
        inflight = undefined
      })
      return inflight
    },
    /** Forget the raiser: a late answer is ignored and no further attempt runs. */
    dispose() {
      disposed = true
    },
    /** How many PowerShell processes this raiser actually started (a test seam). */
    attempts() {
      return attempts
    },
  }
}

/** The raiser a direct call uses when none was injected; `apply` always passes its own. */
let fallbackRaiser

/** One short JSON answer for the raise route. */
function raiseAnswer(body, status = 200) {
  return jsonResponse(body, status)
}

/**
 * Answer `POST /api/edh.notify/raise`.
 *
 * The click's one question: did the window come forward? `ok` says whether the
 * *request* was acceptable; `raised` says whether the OS actually brought this
 * app's window to the front — a `false` is a real answer with a short reason
 * (`not-windows`, `no-window`, `denied`, `timeout`, `failed`, `disposed`), never
 * an error status and never a 500.
 * @param request - the incoming request.
 * @param options - `raiser`, or the seams {@link createRaiser} takes.
 * @returns the JSON answer.
 */
export async function notifyRaiseResponse(request, options = {}) {
  const method = methodOf(request)
  if (method !== 'POST') {
    const message = `Unsupported method ${request?.method ?? 'without a method'}; raising the window is a POST`
    return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405, { allow: 'POST' })
  }
  // The route takes no arguments. A body is allowed (a client may send `{}`), but
  // it must be a small JSON object: anything else is the caller's mistake.
  let text = ''
  try {
    text = typeof request?.text === 'function' ? await request.text() : ''
  } catch {
    return raiseAnswer({ ok: false, reason: 'bad-input', message: 'That request body could not be read.' }, 400)
  }
  if (typeof text === 'string' && text.length > RAISE_BODY_LIMIT) {
    return raiseAnswer({ ok: false, reason: 'bad-input', message: 'That request body is too large; this route takes none.' }, 400)
  }
  if (typeof text === 'string' && text.trim() !== '') {
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return raiseAnswer({ ok: false, reason: 'bad-input', message: 'That request body is not JSON.' }, 400)
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return raiseAnswer({ ok: false, reason: 'bad-input', message: 'That request body must be a JSON object.' }, 400)
    }
  }
  const raiser = options.raiser ?? (fallbackRaiser ??= createRaiser({ logger: options.logger }))
  try {
    const result = await raiser.raise()
    const body = { ok: true, raised: result?.raised === true }
    // On success the rung that worked is worth reporting: it is the only way to
    // know which workaround this Windows build honoured.
    if (body.raised === true && typeof result?.step === 'string') body.step = result.step
    if (body.raised !== true && typeof result?.reason === 'string') body.reason = result.reason
    return raiseAnswer(body)
  } catch {
    // Never a 500: an unexpected failure is "the window did not come up".
    return raiseAnswer({ ok: true, raised: false, reason: 'failed' })
  }
}

/**
 * Register the routes on the Host connection.
 *
 * One effect per route, each with its own guard: one refused path must not cost the
 * others, and none may cost the rest of EDH. Every method is claimed so a wrong one
 * reaches these handlers (and their 405) instead of the gateway's 404.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  // One raiser for the row: two clicks share an attempt instead of spawning two
  // PowerShell processes, and turning the row off stops the raiser.
  const raiser = createRaiser({ logger: ctx.logger })
  ctx.effect(
    () => () => {
      raiser.dispose()
    },
    'edh-notify: window raiser',
  )
  const routes = [
    { path: NOTIFY_SOUNDS_PATH, fetch: request => notifySoundsRequest(request) },
    { path: NOTIFY_SOUND_PATH, fetch: request => notifySoundResponse(request) },
    {
      path: NOTIFY_LAST_PATH,
      fetch: request => notifyLastResponse(request, { persistence: ctx.get?.('sessionPersistence') }),
    },
    { path: NOTIFY_RAISE_PATH, fetch: request => notifyRaiseResponse(request, { raiser }) },
  ]
  for (const route of routes) {
    ctx.effect(() => {
      try {
        const dispose = ctx.connection.fetch.register({
          path: route.path,
          methods: CLAIMED_METHODS,
          requestBody: 'buffered',
          fetch: route.fetch,
        })
        return () => {
          try {
            dispose?.()
          } catch (error) {
            ctx.logger?.warn?.('edh-notify: route disposal failed: %o', error)
          }
        }
      } catch (error) {
        ctx.logger?.warn?.('edh-notify: route registration failed for %s: %o', route.path, error)
        return () => {}
      }
    }, `edh-notify: ${route.path}`)
  }
}

/** The routes need the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
