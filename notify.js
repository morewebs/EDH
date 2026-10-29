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

import { existsSync, statSync, createReadStream } from 'node:fs'
import { join, resolve, sep } from 'node:path'
import { Readable } from 'node:stream'

export const name = 'edh-notify'

/** Absolute pathnames the Host registers; the browser addresses them document-relative. */
export const NOTIFY_SOUNDS_PATH = '/api/edh.notify/sounds'
export const NOTIFY_SOUND_PATH = '/api/edh.notify/sound'

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
 * Whether one value is shaped like an id at all.
 *
 * This is not the authorisation — {@link catalogEntry} is, because only a
 * constant can pass — but it stops a hostile value early and keeps the rule in
 * one place: no separators, no parent directory, no colon (drive letter or
 * alternate data stream), no control characters, nothing absurdly long.
 * @param value - the untrusted `id` query value.
 * @returns true when it is a plausible catalog id.
 */
export function isSoundIdSafe(value) {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_SOUND_ID) return false
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point
  if (/[\u0000-\u001f\u007f]/u.test(value)) return false
  if (value.includes('/') || value.includes('\\')) return false
  if (value.includes('..')) return false
  if (value.includes(':')) return false
  return true
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

/**
 * Register both routes on the Host connection.
 *
 * Two effects, each with its own guard: one refused path must not cost the other
 * route, and neither may cost the rest of EDH. Every method is claimed so a wrong
 * one reaches these handlers (and their 405) instead of the gateway's 404.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  const routes = [
    { path: NOTIFY_SOUNDS_PATH, fetch: request => notifySoundsRequest(request) },
    { path: NOTIFY_SOUND_PATH, fetch: request => notifySoundResponse(request) },
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
