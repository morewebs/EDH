/**
 * EDH feature: `remote` — the same Web GUI on a phone over the LAN, Host half.
 *
 * A listener of our own on `0.0.0.0:<port>` (8787 unless the user edits it) asks
 * for a username and a password on a small login page, and then proxies the full
 * GUI. Nothing here touches the Harness: the module only reads two documented
 * services and speaks HTTP to the loopback listener the desktop already runs.
 *
 * Verified against the installed asar rather than guessed:
 *
 * - **The harness listener cannot bind a wildcard.** `WebServer.Config.host` is a
 *   concrete IP literal and a wildcard value throws at config time ("binding
 *   every interface would expose remote code execution to the network"). The
 *   desktop pins `--host 127.0.0.1 --port 0`, and `webServer.port` reports the
 *   OS-assigned port. So the LAN listener is ours, `node:http`, in `apply`.
 * - **There is no pre-auth seam to hook.** `WebServer`'s surface is register,
 *   registerUpgrade, registerFallback, tapIndex, applyIndexTaps,
 *   collectIndexInjections, renderIndex — nothing in front of the auth chain, so
 *   the gate is ours and the proxy carries a credential to theirs.
 * - **Auth is a launch token and an authority-bound cookie.** Each process mints
 *   32 random bytes; `GET /?token=…` answers `303` with
 *   `dsh-auth-<b64u(sha256(authority))>`, whose value is
 *   `v1.<b64u(json)>.b64u(HMAC-SHA256)` and whose payload names the exact
 *   authority it was minted for. `HttpOnly; SameSite=Strict; Path=/`, 30 days by
 *   default.
 * - **Both are reachable through documented service methods.**
 *   `ctx.connection.authenticatedUrl(baseUrl)` appends the process token, and
 *   `ctx.connection.authorizeIndex(request, response)` takes any object carrying
 *   `method`, `url` and `headers.host` and answers through `writeHead`/`end` — so
 *   a synthetic pair captures the `set-cookie` without a socket. Neither is an
 *   instance-only internal: both are on the `connection` service contract.
 * - **The browser-trust fence is Host + Origin + Fetch-Metadata.** Every `/api`
 *   request must carry a loopback Host (any port), must not be
 *   `sec-fetch-site: cross-site`, and must name the same authority in `Origin`
 *   when one is attached. A LAN authority is refused with 403 even when the
 *   Origin matches. So every forwarded request has Host **and** Origin rewritten
 *   to the loopback authority, and the authority-bound harness cookie injected —
 *   the phone's own cookies are dropped, never forwarded.
 * - **The phone is the owner principal.** The cookie admits
 *   `ctx.connection.browserPeer`, whose principal is `owner`: full shell, file
 *   and terminal access. `dsh-api-remote-access` cannot narrow that (`decide()`
 *   allows owner before any policy). The login is the entire barrier, which is
 *   why it is rate-limited, why the password is scrypt-hashed, and why this
 *   module's own cookie is signed and expiry-checked.
 * - **Two long-lived connections, neither may be timed out.** One WebSocket at
 *   `/api/remote.mux` (2s server pings) and a public SSE stream at
 *   `/plugins/events`. Both are piped; nothing sets an idle timeout. The raw
 *   WebSocket proxy mirrors the shipped `dsh-experimental-inspector` `cdp`
 *   upgrade: `net.connect`, a hand-written `GET … Upgrade: websocket` request,
 *   the client's `sec-websocket-*` headers, then `socket.pipe(upstream).pipe(socket)`.
 * - **Bodies are piped, never buffered.** The GUI uploads through
 *   `POST /api/session/uploadFileBinary`, which is a streaming route; a buffered
 *   proxy would cap it at the bridge's aggregate limit and hold it in memory.
 * - **The harness webserver does not compress.** Its `compression` config
 *   defaults to `none`, so every asset and every RPC JSON answer would cross the
 *   wifi as-is. Compression therefore belongs to this proxy — the one place that
 *   owns both the response bytes and the client's own `accept-encoding` — and it
 *   is a transport concern only: it cannot change what the GUI renders.
 *   Everything *visual* about mobile lives in EDH's browser half, which already
 *   runs inside the document (see `mobile.js`).
 *
 * The store is EDH-owned JSON beside `.edh/mcp.json`:
 * `<profile>/.edh/remote.json`, holding
 * `{ version, enabled, port, username, passwordHash, salt, secret, sessionDays, sessions }`.
 * No route answer ever carries the hash, the salt or the secret — the view is
 * built from an explicit whitelist.
 *
 * The transport is plain HTTP because the desktop listener is plain HTTP and
 * minting a certificate for a LAN address is out of scope; the settings page and
 * every answer carry the warning that follows from it.
 */

import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { createServer as createHttpServer, request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { connect as netConnect } from 'node:net'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir, networkInterfaces } from 'node:os'
import { dirname, join } from 'node:path'
import { constants as zlibConstants, createBrotliCompress, createGzip } from 'node:zlib'

export const name = 'edh-remote'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const REMOTE_PATH = '/api/edh.remote'

/** Directory EDH owns inside the active profile directory. */
export const STORE_DIRECTORY = '.edh'

/** The remote store's filename inside {@link STORE_DIRECTORY}. */
export const STORE_FILE = 'remote.json'

/** The port a fresh install listens on; editable, and the only default. */
export const DEFAULT_PORT = 8787

/** The address our listener binds. The harness refuses a wildcard, so we own this one. */
export const BIND_ADDRESS = '0.0.0.0'

/** Our sign-in page and its two form posts. */
export const LOGIN_PATH = '/__edh/login'
export const LOGOUT_PATH = '/__edh/logout'

/** Our session cookie: ours, not the harness's authority-bound one. */
export const COOKIE_NAME = 'edh-remote'

/** The one WebSocket the GUI opens; the only upgrade this proxy carries. */
export const MUX_PATH = '/api/remote.mux'

/** How long our session cookie lives when the user has not chosen. */
export const DEFAULT_SESSION_DAYS = 7

/** Longest session lifetime the store accepts. */
export const MAX_SESSION_DAYS = 30

/** How many issued-session records the store keeps before pruning the oldest. */
export const MAX_SESSIONS = 64

/** The largest sign-in POST this listener reads. Anything bigger is refused unread. */
export const LOGIN_BODY_LIMIT = 4096

/** Shortest password the settings route accepts. */
export const MIN_PASSWORD = 8

/** Longest password the settings route accepts. */
export const MAX_PASSWORD = 1024

/** Longest username the settings route accepts. */
export const MAX_USERNAME = 64

/** Sign-in attempts one client address may fail inside the window. */
export const RATE_LIMIT = Object.freeze({
  limit: 10,
  windowMs: 60_000,
  baseDelayMs: 250,
  maxDelayMs: 4000,
  maxKeys: 1024,
})

/** scrypt parameters for the stored password. */
export const SCRYPT = Object.freeze({ N: 16384, r: 8, p: 1, keylen: 32, saltBytes: 16, maxmem: 64 * 1024 * 1024 })

/**
 * The sentence every answer and the settings page carry about plain HTTP.
 *
 * It is not decoration: the transport cannot mark the cookie `Secure`, so
 * anyone who can watch the network can replay it.
 */
export const LAN_WARNING =
  'This page is served over plain HTTP, so anyone who can watch this network can read the sign-in cookie. Use Remote only on a network you trust.'

/** Reasons a settings answer is a rejection rather than a report, so the route can answer 400. */
const REJECTED_REASONS = new Set([
  'bad-input',
  'bad-port',
  'bad-username',
  'bad-password',
  'bad-state',
  'unknown-action',
])

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

/** True for a plain JSON object, never an array or null. */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** One error's text, whatever was thrown. */
function messageOf(error) {
  return String(error?.message ?? error)
}

/** base64url without padding, the spelling the harness cookie uses. */
function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

/** Decode base64url, or `undefined` when the text is not canonical base64url. */
function fromBase64Url(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/u.test(text) || text.length % 4 === 1) return undefined
  const padding = '='.repeat((4 - (text.length % 4)) % 4)
  const decoded = Buffer.from(text.replaceAll('-', '+').replaceAll('_', '/') + padding, 'base64')
  return base64Url(decoded) === text ? decoded : undefined
}

/** Constant-time comparison of two byte buffers. */
function safeEqualBytes(left, right) {
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

/**
 * Constant-time comparison of two texts of any length.
 *
 * Both sides are hashed first: `timingSafeEqual` needs equal lengths, and
 * padding would leak the length of the stored value.
 */
export function safeEqualText(left, right) {
  const a = createHash('sha256').update(String(left ?? ''), 'utf8').digest()
  const b = createHash('sha256').update(String(right ?? ''), 'utf8').digest()
  return timingSafeEqual(a, b)
}

/** Escape text for an HTML attribute or body. */
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/**
 * The active profile's directory: the harness's own profile-scoped data area.
 *
 * An explicit `DSH_PROFILE_DIR` wins, because that is the variable the launcher
 * exports for the running profile. Otherwise the documented layout applies —
 * `$DSH_HOME/profiles/<name>` — and a deployment without a profile name falls
 * back to the home itself. Same resolution as `.edh/mcp.json`.
 * @param env - the environment to read.
 * @param home - the operating-system home, injectable for tests.
 * @returns the absolute profile directory.
 */
export function resolveProfileDir(env = process.env, home = homedir()) {
  const explicit = typeof env?.DSH_PROFILE_DIR === 'string' ? env.DSH_PROFILE_DIR.trim() : ''
  if (explicit !== '') return explicit
  const configured = typeof env?.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  const dshHome = configured !== '' ? configured : join(home, '.dsh')
  const profile = typeof env?.DSH_PROFILE === 'string' ? env.DSH_PROFILE.trim() : ''
  return profile !== '' ? join(dshHome, 'profiles', profile) : dshHome
}

/**
 * The absolute path of EDH's remote store.
 * @param env - the environment to read.
 * @param home - the operating-system home, injectable for tests.
 */
export function resolveStorePath(env = process.env, home = homedir()) {
  return join(resolveProfileDir(env, home), STORE_DIRECTORY, STORE_FILE)
}

/** The stored shape of a fresh install: off, one default port, no credentials. */
export function defaultConfig() {
  return {
    version: 1,
    enabled: false,
    port: DEFAULT_PORT,
    username: '',
    passwordHash: '',
    salt: '',
    secret: '',
    sessionDays: DEFAULT_SESSION_DAYS,
    sessions: [],
  }
}

/**
 * Normalise one untrusted store document.
 *
 * A store is EDH-owned JSON on disk, but it is still untrusted input: an older
 * build, a hand edit, or a half-migrated file must load into something the
 * listener can safely start from. Every field is defaulted rather than refused,
 * because a broken store should not silently turn the feature off — the caller
 * reports the shape it read.
 * @param input - the parsed document.
 * @returns the config, or the reason it is not usable at all.
 */
export function normalizeConfig(input) {
  if (!isRecord(input)) return { ok: false, reason: 'bad-store', message: 'The remote store must be a JSON object' }
  const base = defaultConfig()
  const port = Number.isInteger(input.port) && input.port >= 1 && input.port <= 65535 ? input.port : base.port
  const sessionDays =
    Number.isInteger(input.sessionDays) && input.sessionDays >= 1 && input.sessionDays <= MAX_SESSION_DAYS
      ? input.sessionDays
      : base.sessionDays
  const sessions = (Array.isArray(input.sessions) ? input.sessions : [])
    .filter(isRecord)
    .map(entry => ({
      id: typeof entry.id === 'string' ? entry.id.slice(0, 64) : '',
      issuedAt: Number.isFinite(entry.issuedAt) ? Math.trunc(entry.issuedAt) : 0,
      expiresAt: Number.isFinite(entry.expiresAt) ? Math.trunc(entry.expiresAt) : 0,
    }))
    .filter(entry => entry.id !== '')
    .slice(-MAX_SESSIONS)
  return {
    ok: true,
    config: {
      version: 1,
      enabled: input.enabled === true,
      port,
      username: typeof input.username === 'string' ? input.username.trim().slice(0, MAX_USERNAME) : '',
      passwordHash: typeof input.passwordHash === 'string' ? input.passwordHash : '',
      salt: typeof input.salt === 'string' ? input.salt : '',
      secret: typeof input.secret === 'string' ? input.secret : '',
      sessionDays,
      sessions,
    },
  }
}

/**
 * One random signing secret, 32 bytes, base64url.
 * @returns the secret text.
 */
export function newSecret() {
  return base64Url(randomBytes(32))
}

/**
 * The file-backed remote store.
 *
 * A read is tolerant by design: a missing file is the default config, and a file
 * that cannot be parsed is reported through `error` while the defaults still
 * load. A write goes through a temporary file and a rename, so a half-written
 * store can never be observed.
 * @param path - the absolute path of the store file.
 * @returns the store: `path`, `read()`, `write(config)`.
 */
export function createFileStore(path) {
  return {
    path,
    read() {
      let text
      try {
        text = readFileSync(path, 'utf8')
      } catch (error) {
        if (error?.code === 'ENOENT') return { config: defaultConfig() }
        return { config: defaultConfig(), error: `The remote store could not be read: ${messageOf(error)}` }
      }
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        return { config: defaultConfig(), error: `The remote store is not valid JSON: ${messageOf(error)}` }
      }
      const normalized = normalizeConfig(parsed)
      if (normalized.ok !== true) return { config: defaultConfig(), error: normalized.message }
      return { config: normalized.config }
    },
    write(config) {
      try {
        mkdirSync(dirname(path), { recursive: true })
        const temporary = `${path}.${process.pid}.tmp`
        writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
        renameSync(temporary, path)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: `The remote store could not be written: ${messageOf(error)}` }
      }
    },
  }
}

/**
 * Every URL a phone on this network could open.
 *
 * Only non-internal IPv4 addresses are offered: a phone cannot route to a
 * loopback address, and an IPv6 link-local address needs a zone id no URL can
 * carry. The list is a suggestion for the settings page, never a claim that the
 * firewall or the router allows it.
 * @param interfaces - `os.networkInterfaces()` output, injectable for tests.
 * @param port - the configured port.
 * @returns the URLs, sorted.
 */
export function localAddresses(interfaces, port) {
  const urls = []
  for (const list of Object.values(interfaces ?? {})) {
    for (const entry of Array.isArray(list) ? list : []) {
      if (!isRecord(entry) || entry.internal === true) continue
      const family = entry.family === 4 ? 'IPv4' : entry.family === 6 ? 'IPv6' : entry.family
      if (family !== 'IPv4' || typeof entry.address !== 'string' || entry.address === '') continue
      urls.push(`http://${entry.address}:${port}`)
    }
  }
  return urls.sort()
}

/**
 * The secret-free view of one config.
 *
 * Built from a whitelist, never by spreading the stored record: the hash, the
 * salt and the signing secret must not be able to reach a route answer by
 * accident, and a field added to the store tomorrow must be opted in here.
 * @param config - the stored config.
 * @param runtime - the listener's state: `available`, `listening`, `addresses`, `lastError`.
 * @returns the view.
 */
export function configView(config, runtime = {}) {
  const state = isRecord(runtime) ? runtime : {}
  const stored = isRecord(config) ? config : defaultConfig()
  return {
    version: 1,
    enabled: stored.enabled === true,
    port: stored.port,
    username: typeof stored.username === 'string' ? stored.username : '',
    hasPassword: typeof stored.passwordHash === 'string' && stored.passwordHash !== '',
    sessionDays: stored.sessionDays,
    sessions: Array.isArray(stored.sessions) ? stored.sessions.length : 0,
    available: state.available === true,
    listening: state.listening === true,
    bind: `${BIND_ADDRESS}:${stored.port}`,
    addresses: Array.isArray(state.addresses) ? [...state.addresses] : [],
    warning: LAN_WARNING,
    lastError: typeof state.lastError === 'string' ? state.lastError : '',
  }
}

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------

/** Promisified scrypt, so a sign-in never blocks the listener. */
function deriveKey(password, salt, settings) {
  return new Promise((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      settings.keylen,
      { N: settings.N, r: settings.r, p: settings.p, maxmem: settings.maxmem },
      (error, derived) => (error === null || error === undefined ? resolve(derived) : reject(error)),
    )
  })
}

/**
 * Hash one password with scrypt and a per-user salt.
 * @param password - the plaintext, never stored.
 * @param options - scrypt overrides (tests use cheap parameters).
 * @returns base64 `salt` and `hash` for the store.
 */
export async function hashPassword(password, options = {}) {
  const settings = { ...SCRYPT, ...options }
  const salt = randomBytes(settings.saltBytes)
  const derived = await deriveKey(String(password ?? ''), salt, settings)
  return { salt: salt.toString('base64'), hash: derived.toString('base64') }
}

/**
 * Verify one password against a stored salt and hash, in constant time.
 *
 * The derivation always runs, even with nothing stored, so a wrong username and
 * a wrong password cost the same wall-clock time. An empty password, a missing
 * record or a malformed base64 value is a plain `false`, never a throw.
 * @param password - the submitted plaintext.
 * @param record - the stored `{ salt, hash }`.
 * @param options - scrypt overrides.
 * @returns whether the password matches.
 */
export async function verifyPassword(password, record, options = {}) {
  const settings = { ...SCRYPT, ...options }
  const text = typeof password === 'string' ? password : ''
  const saltText = typeof record?.salt === 'string' ? record.salt : ''
  const hashText = typeof record?.hash === 'string' ? record.hash : ''
  const salt = saltText === '' ? Buffer.alloc(settings.saltBytes) : Buffer.from(saltText, 'base64')
  const derived = await deriveKey(text, salt, settings)
  if (text === '' || saltText === '' || hashText === '') return false
  const expected = Buffer.from(hashText, 'base64')
  if (expected.length !== derived.length) return false
  return timingSafeEqual(derived, expected)
}

/**
 * The whole sign-in verdict for one submitted pair.
 *
 * Both halves are compared in constant time and the password derivation runs
 * even when the username is wrong, so the answer cannot be used to learn which
 * field was close.
 * @param username - the submitted username.
 * @param password - the submitted password.
 * @param config - the stored config.
 * @param options - scrypt overrides.
 * @returns `{ ok: true }` or the reason and its plain sentence.
 */
export async function verifyLogin(username, password, config, options = {}) {
  const stored = isRecord(config) ? config : defaultConfig()
  if (typeof stored.passwordHash !== 'string' || stored.passwordHash === '') {
    return { ok: false, reason: 'no-password', message: 'No password has been set for Remote access' }
  }
  const nameOk = safeEqualText(stored.username, String(username ?? '').trim())
  const passOk = await verifyPassword(password, { salt: stored.salt, hash: stored.passwordHash }, options)
  return nameOk && passOk ? { ok: true } : { ok: false, reason: 'denied', message: 'Wrong username or password' }
}

// ---------------------------------------------------------------------------
// Our own session cookie
// ---------------------------------------------------------------------------

/**
 * Sign one session payload into our cookie value: `v1.<b64u(json)>.<b64u(HMAC)>`.
 *
 * The harness's own cookie is shaped this way; ours is deliberately a separate
 * name so the two can never be confused, and so a phone's cookie is never
 * mistaken for one that authenticates to the loopback authority.
 * @param secret - our signing secret from the store.
 * @param payload - `{ issuedAt, expiresAt, username }`.
 * @returns the cookie value.
 */
export function signSession(secret, payload) {
  const body = base64Url(
    Buffer.from(
      JSON.stringify({
        version: 1,
        issuedAt: payload.issuedAt,
        expiresAt: payload.expiresAt,
        username: payload.username ?? '',
      }),
      'utf8',
    ),
  )
  const signature = createHmac('sha256', String(secret)).update(body).digest()
  return `v1.${body}.${base64Url(signature)}`
}

/**
 * Verify one of our cookie values.
 *
 * A tampered body, a wrong secret, an expired interval, or a lifetime longer
 * than the store allows is `undefined`; there is no other answer. The interval is
 * bounded from both ends because the payload is attacker-controlled text until
 * the signature says otherwise.
 * @param secret - our signing secret from the store.
 * @param value - the cookie value as sent.
 * @param options - `now` and `maxAgeMs`.
 * @returns the payload, or `undefined` when the value is not a live session.
 */
export function verifySession(secret, value, options = {}) {
  const now = typeof options.now === 'number' ? options.now : Date.now()
  const maxAgeMs = typeof options.maxAgeMs === 'number' ? options.maxAgeMs : DEFAULT_SESSION_DAYS * 86_400_000
  if (typeof value !== 'string' || value === '' || typeof secret !== 'string' || secret === '') return undefined
  const parts = value.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return undefined
  const [, body, encodedSignature] = parts
  const actual = fromBase64Url(encodedSignature)
  if (actual === undefined) return undefined
  const expected = createHmac('sha256', secret).update(body).digest()
  if (!safeEqualBytes(actual, expected)) return undefined
  const decoded = fromBase64Url(body)
  if (decoded === undefined) return undefined
  let payload
  try {
    payload = JSON.parse(decoded.toString('utf8'))
  } catch {
    return undefined
  }
  if (!isRecord(payload) || payload.version !== 1) return undefined
  const { issuedAt, expiresAt } = payload
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return undefined
  if (issuedAt > now || expiresAt <= now || expiresAt <= issuedAt) return undefined
  if (expiresAt - issuedAt > maxAgeMs) return undefined
  return {
    issuedAt,
    expiresAt,
    username: typeof payload.username === 'string' ? payload.username : '',
  }
}

/**
 * Read one named cookie out of a `cookie` request header.
 * @param headerValue - the verbatim header, when there is one.
 * @param name - the cookie to find.
 * @returns the value, or `undefined`.
 */
export function cookieValue(headerValue, name) {
  if (typeof headerValue !== 'string' || headerValue === '') return undefined
  for (const segment of headerValue.split(';')) {
    const at = segment.indexOf('=')
    if (at === -1 || segment.slice(0, at).trim() !== name) continue
    return segment.slice(at + 1).trim()
  }
  return undefined
}

/**
 * Serialise our `Set-Cookie` header.
 *
 * `SameSite=Lax` rather than the harness's `Strict`: the phone arrives by typing
 * or tapping a URL, and Lax keeps the cookie across that top-level navigation
 * while still never sending it from a third-party page.
 * @param value - the signed cookie value.
 * @param options - `maxAgeSeconds` and whether the listener serves TLS.
 * @returns the header value.
 */
export function sessionCookieHeader(value, options = {}) {
  const maxAge = Number.isInteger(options.maxAgeSeconds) ? options.maxAgeSeconds : DEFAULT_SESSION_DAYS * 86_400
  const attributes = [
    `${COOKIE_NAME}=${value}`,
    `Max-Age=${String(maxAge)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  return options.secure === true ? `${attributes.join('; ')}; Secure` : attributes.join('; ')
}

/** The `Set-Cookie` header that removes our cookie. */
export const CLEAR_COOKIE = `${COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`

// ---------------------------------------------------------------------------
// Sign-in rate limiting
// ---------------------------------------------------------------------------

/**
 * Per-client-address sign-in rate limiter with a growing delay.
 *
 * Failures are counted in a sliding window; past the limit every further attempt
 * is refused before the password is touched, carries a `Retry-After`, and waits a
 * doubling delay (`baseDelayMs` per refusal, capped) so a scripted guess costs
 * real time while a person's tenth typo does not. A successful sign-in clears the
 * address, and the table is bounded so an attacker cycling addresses cannot grow
 * it without limit.
 * @param options - `limit`, `windowMs`, `baseDelayMs`, `maxDelayMs`, `maxKeys`, `now`.
 * @returns `{ check(key), fail(key), succeed(key), size() }`.
 */
export function createLimiter(options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : RATE_LIMIT.limit
  const windowMs = Number.isInteger(options.windowMs) && options.windowMs > 0 ? options.windowMs : RATE_LIMIT.windowMs
  const baseDelayMs =
    Number.isInteger(options.baseDelayMs) && options.baseDelayMs >= 0 ? options.baseDelayMs : RATE_LIMIT.baseDelayMs
  const maxDelayMs =
    Number.isInteger(options.maxDelayMs) && options.maxDelayMs >= 0 ? options.maxDelayMs : RATE_LIMIT.maxDelayMs
  const maxKeys = Number.isInteger(options.maxKeys) && options.maxKeys > 0 ? options.maxKeys : RATE_LIMIT.maxKeys
  const now = typeof options.now === 'function' ? options.now : Date.now
  /** key -> { failures: number[], blocked: number } */
  const table = new Map()

  const prune = entry => {
    const cutoff = now() - windowMs
    while (entry.failures.length > 0 && entry.failures[0] <= cutoff) entry.failures.shift()
    return entry
  }

  const raise = key => {
    const existing = table.get(key)
    if (existing !== undefined) return existing
    if (table.size >= maxKeys) {
      const oldest = table.keys().next()
      if (!oldest.done) table.delete(oldest.value)
    }
    const created = { failures: [], blocked: 0 }
    table.set(key, created)
    return created
  }

  return {
    /**
     * Decide whether one attempt may proceed, without recording anything.
     * @param key - the client address.
     */
    check(key) {
      const entry = table.get(key)
      if (entry === undefined) return { allowed: true, retryAfterSeconds: 0, delayMs: 0, attempts: 0 }
      prune(entry)
      if (entry.failures.length < limit) {
        return { allowed: true, retryAfterSeconds: 0, delayMs: 0, attempts: entry.failures.length }
      }
      const oldest = entry.failures[0] ?? now()
      const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now()) / 1000))
      const overflow = entry.blocked
      entry.blocked += 1
      return {
        allowed: false,
        retryAfterSeconds,
        delayMs: Math.min(maxDelayMs, baseDelayMs * 2 ** Math.min(overflow, 8)),
        attempts: entry.failures.length,
      }
    },
    /** Record one failed attempt. */
    fail(key) {
      const entry = prune(raise(key))
      entry.failures.push(now())
      return { attempts: entry.failures.length, locked: entry.failures.length >= limit }
    },
    /** Clear one address after a successful sign-in. */
    succeed(key) {
      table.delete(key)
    },
    /** How many addresses the table currently holds; the bound is the point. */
    size() {
      return table.size
    },
  }
}

/** The address one request came from, with an IPv4-mapped IPv6 peer unwrapped. */
export function clientAddress(request) {
  const raw = request?.socket?.remoteAddress ?? request?.headers?.['x-forwarded-for']
  const text = typeof raw === 'string' ? raw.trim() : ''
  if (text.startsWith('::ffff:')) return text.slice('::ffff:'.length)
  return text === '' ? 'unknown' : text
}

// ---------------------------------------------------------------------------
// Reaching the loopback GUI
// ---------------------------------------------------------------------------

/**
 * The loopback GUI's address, from the documented webserver surface.
 *
 * `getOrigin()` is the documented method and throws before the listener binds;
 * `host`/`port` are the instance properties it is built from, and are used as the
 * fallback so a composition that predates `getOrigin` still works.
 * @param webServer - the harness webserver service.
 * @returns `{ origin, authority, hostname, port, tls }`, or `undefined` when the
 * listener has not bound yet.
 */
export function resolveTarget(webServer) {
  if (webServer === undefined || webServer === null) return undefined
  let origin
  try {
    if (typeof webServer.getOrigin === 'function') origin = webServer.getOrigin()
  } catch {
    origin = undefined
  }
  if (typeof origin !== 'string' || origin === '') {
    const port = webServer.port
    const host = typeof webServer.host === 'string' ? webServer.host : ''
    if (!Number.isInteger(port) || port < 1 || host === '') return undefined
    origin = `http://${host.includes(':') ? `[${host}]` : host}:${String(port)}`
  }
  let url
  try {
    url = new URL(origin)
  } catch {
    return undefined
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
  const hostname = url.hostname.replace(/^\[/u, '').replace(/\]$/u, '')
  const port = Number(url.port === '' ? (url.protocol === 'https:' ? 443 : 80) : url.port)
  return { origin: url.origin, authority: url.host, hostname, port, tls: url.protocol === 'https:' }
}

/**
 * The process launch token, read out of the URL the documented method mints.
 * @param authenticatedUrl - `ctx.connection.authenticatedUrl`.
 * @param baseUrl - the loopback GUI URL.
 * @returns the token, or `undefined` when the URL carries none.
 */
export function launchTokenOf(authenticatedUrl, baseUrl) {
  if (typeof authenticatedUrl !== 'function') return undefined
  let url
  try {
    url = new URL(authenticatedUrl(baseUrl))
  } catch {
    return undefined
  }
  const token = url.searchParams.get('token')
  return typeof token === 'string' && token !== '' ? token : undefined
}

/**
 * Mint the harness's authority-bound cookie through `authorizeIndex`.
 *
 * `authorizeIndex` reads only `method`, `url` and `headers.host` from the request
 * and answers through `writeHead`/`end`, so a synthetic pair captures the exact
 * `set-cookie` the harness would have sent to the loopback browser — the same
 * credential, minted without a socket. That is the whole trick: the phone holds
 * *our* cookie, and this one authenticates our proxy to the harness.
 * @param authorizeIndex - `(request, response) => boolean`.
 * @param options - the launch `token` and the loopback `authority`.
 * @returns `{ name, value, cookie, maxAgeSeconds }`, or `undefined` when the
 * harness refused to mint.
 */
export function captureIndexCookie(authorizeIndex, options = {}) {
  const { token, authority } = options
  if (typeof authorizeIndex !== 'function' || typeof token !== 'string' || token === '' || typeof authority !== 'string') {
    return undefined
  }
  const request = {
    method: 'GET',
    url: `/?token=${encodeURIComponent(token)}`,
    headers: { host: authority },
  }
  let status
  let headers
  const response = {
    writeHead(code, map) {
      status = code
      headers = isRecord(map) ? map : {}
      return response
    },
    setHeader() {},
    getHeader() {
      return undefined
    },
    end() {},
  }
  try {
    authorizeIndex(request, response)
  } catch {
    return undefined
  }
  if (status !== 303 && status !== 302) return undefined
  let raw
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (key.toLowerCase() === 'set-cookie' && typeof value === 'string') raw = value
  }
  if (raw === undefined) return undefined
  const first = raw.split(';', 1)[0] ?? ''
  const at = first.indexOf('=')
  if (at <= 0) return undefined
  const cookieName = first.slice(0, at).trim()
  const value = first.slice(at + 1).trim()
  if (cookieName === '' || value === '') return undefined
  const maxAgeMatch = /(?:^|;\s*)Max-Age=(\d+)/iu.exec(raw)
  const maxAgeSeconds = maxAgeMatch === null ? undefined : Number(maxAgeMatch[1])
  return { name: cookieName, value, cookie: `${cookieName}=${value}`, maxAgeSeconds }
}

/**
 * The header object one forwarded request carries.
 *
 * Three rules, and each one is load-bearing:
 *
 * 1. `host` and `origin` are both rewritten to the loopback authority. The
 *    browser-trust fence accepts a loopback Host on any port and requires the
 *    Origin, when attached, to name that same authority — a LAN authority is a
 *    403 no matter what the Origin says.
 * 2. The phone's `cookie` is replaced outright, never merged: our session cookie
 *    means nothing to the harness, and leaving it in the header would make the
 *    harness parse a cookie it did not mint.
 * 3. Everything else rides through untouched, apart from hop-by-hop headers,
 *    which describe a connection that no longer exists.
 * @param headers - the incoming request headers.
 * @param options - `authority`, `origin`, and the harness `cookie` to inject.
 * @returns a new plain header object.
 */
export function rewriteRequestHeaders(headers, options = {}) {
  const source = isRecord(headers) ? headers : {}
  const { authority, origin, cookie } = options
  const rewritten = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    if (HOP_BY_HOP.has(lower)) continue
    if (lower === 'host' || lower === 'origin' || lower === 'cookie') continue
    rewritten[lower] = value
  }
  if (typeof authority === 'string' && authority !== '') rewritten.host = authority
  // An Origin the caller did not rewrite is dropped rather than forwarded: the
  // fence refuses a mismatched pair with 403, and an absent Origin is accepted.
  if (typeof origin === 'string' && origin !== '') rewritten.origin = origin
  if (typeof cookie === 'string' && cookie !== '') rewritten.cookie = cookie
  return rewritten
}

/** Headers that describe one hop and must not be forwarded. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authorization',
  'proxy-authenticate',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

/**
 * The headers one proxied response carries back to the phone.
 *
 * `set-cookie` is dropped unconditionally: the harness answers the *proxy*, and
 * a harness cookie bound to a loopback authority must never reach the phone. The
 * only cookie the phone ever receives is the one this module sets on its own
 * login POST.
 * @param headers - the upstream response headers.
 */
export function filterResponseHeaders(headers) {
  const source = isRecord(headers) ? headers : {}
  const filtered = {}
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    if (lower === 'set-cookie' || HOP_BY_HOP.has(lower)) continue
    filtered[lower] = value
  }
  return filtered
}

/**
 * The exact HTTP request text one proxied WebSocket upgrade sends upstream.
 *
 * Written by hand because there is no seam to hand a socket to: the harness's
 * upgrade route reads the request it is given, so this one carries the rewritten
 * `Host`/`Origin`, our captured harness cookie, and the client's
 * `sec-websocket-*` headers. It mirrors the shipped inspector's `cdp` proxy.
 * @param options - `path`, `search`, `authority`, `origin`, `cookie`, client `headers`.
 * @returns the request text, terminated by the blank line.
 */
export function upgradeRequestText(options = {}) {
  const { authority, origin, cookie } = options
  const path = typeof options.path === 'string' && options.path !== '' ? options.path : MUX_PATH
  const search = typeof options.search === 'string' ? options.search : ''
  const headers = isRecord(options.headers) ? options.headers : {}
  const lines = [`GET ${path}${search} HTTP/1.1`]
  if (typeof authority === 'string' && authority !== '') lines.push(`Host: ${authority}`)
  if (typeof origin === 'string' && origin !== '') lines.push(`Origin: ${origin}`)
  lines.push('Connection: Upgrade', 'Upgrade: websocket')
  if (typeof cookie === 'string' && cookie !== '') lines.push(`Cookie: ${cookie}`)
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value !== 'string') continue
    if (!key.toLowerCase().startsWith('sec-websocket-')) continue
    lines.push(`${key}: ${value}`)
  }
  return `${lines.join('\r\n')}\r\n\r\n`
}

// ---------------------------------------------------------------------------
// The login page
// ---------------------------------------------------------------------------

/**
 * The self-contained sign-in page.
 *
 * One card, inline CSS only, no JavaScript and no external asset — the GUI's
 * stylesheet is behind the login, so anything fetched would arrive after the thing
 * that needs it. `<meta name="viewport">` with `viewport-fit=cover` and
 * `env(safe-area-inset-*)` padding keep it usable on a notched phone; the inputs
 * are 16px so iOS does not zoom on focus; the button is a 46px touch target; and
 * the single error line is server-rendered, so a failed attempt is one plain
 * sentence with no script involved.
 * @param options - `error` (plain sentence) and `username` (echoed back).
 * @returns the HTML document.
 */
export function loginPageHtml(options = {}) {
  const error = typeof options.error === 'string' ? options.error : ''
  const username = escapeHtml(options.username ?? '')
  const errorLine = error === '' ? '' : `      <p class="error" role="alert">${escapeHtml(error)}</p>\n`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<title>EDH Remote</title>
<style>
  :root { color-scheme: dark light; --bg:#0b0c0e; --panel:#15171a; --line:#272b31; --text:#f2f4f7; --muted:#9aa3ad; --accent:#4f8cff; --error:#ff9b9b; }
  @media (prefers-color-scheme: light) { :root { --bg:#f4f5f7; --panel:#ffffff; --line:#dee2e7; --text:#14161a; --muted:#5d6672; --error:#b3261e; } }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; }
  body { background: var(--bg); color: var(--text); font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; display: flex; align-items: center; justify-content: center; padding: max(16px, env(safe-area-inset-top)) 16px max(16px, env(safe-area-inset-bottom)); }
  main { width: 100%; max-width: 360px; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 24px 20px; }
  h1 { margin: 0 0 4px; font-size: 1.15rem; letter-spacing: -0.01em; }
  p.sub { margin: 0 0 20px; color: var(--muted); font-size: 0.85rem; }
  label { display: block; margin: 0 0 6px; font-size: 0.8rem; color: var(--muted); }
  input { width: 100%; margin: 0 0 14px; padding: 12px; font-size: 16px; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 9px; }
  input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  button { width: 100%; min-height: 46px; font: inherit; font-weight: 600; color: #ffffff; background: var(--accent); border: 0; border-radius: 9px; }
  button:active { opacity: 0.85; }
  .error { margin: 0 0 14px; color: var(--error); font-size: 0.85rem; }
</style>
</head>
<body>
<main>
  <h1>EDH Remote</h1>
  <p class="sub">Sign in to this machine&rsquo;s DeepSeek Harness.</p>
${errorLine}      <form method="post" action="${LOGIN_PATH}">
        <label for="username">Username</label>
        <input id="username" name="username" value="${username}" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required>
        <label for="password">Password</label>
        <input id="password" name="password" type="password" autocomplete="current-password" required>
        <button type="submit">Sign in</button>
      </form>
</main>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Transport compression
// ---------------------------------------------------------------------------
//
// The one thing this proxy does to the bytes besides forwarding them, and it is
// the biggest win on a phone: `@deepseek-ai/dsh-host-webserver`'s `compression`
// config defaults to `none`, so every asset and every RPC JSON answer leaves the
// loopback listener uncompressed and would cross the wifi as-is.
//
// Compression is done here, in the proxy, because it is the only place in the
// system that owns both the response bytes and the client's own
// `accept-encoding` — and because it is a pure transport concern that cannot
// change what the GUI renders. (Everything *visual* about mobile belongs to
// EDH's browser half, which already runs inside the document.)
//
// The skip list is deliberately long. Corrupting the plugin event stream, a
// WebSocket handshake or a redirect would be a far worse bug than slow assets,
// so anything not plainly a compressible document goes out exactly as it came.

/** Codecs this proxy will emit, best first. */
export const ENCODINGS = Object.freeze(['br', 'gzip'])

/**
 * Media types worth encoding.
 *
 * An allowlist, never a denylist: `text/event-stream`, `image/png`, `font/woff2`
 * and anything unknown therefore fall through untouched by construction. Fonts
 * and images are already compressed; `wasm` is left alone because the GUI does
 * not ship any and a wrong guess there is expensive.
 */
export const COMPRESSIBLE_TYPES = Object.freeze([
  'text/html',
  'text/css',
  'text/plain',
  'text/javascript',
  'text/xml',
  'application/javascript',
  'application/json',
  'application/ld+json',
  'application/manifest+json',
  'application/xhtml+xml',
  'application/xml',
  'image/svg+xml',
])

/** Statuses that carry no body and therefore must not be encoded. */
const BODYLESS_STATUS = new Set([204, 205, 304])

/**
 * The best encoding one `accept-encoding` header permits.
 *
 * Quality values are honoured so `br;q=0, gzip` really means gzip: prefer Brotli,
 * fall back to gzip, and treat `*` as gzip rather than Brotli — a wildcard asks
 * for *some* encoding, and gzip is the one every client that sends a wildcard
 * can actually decode. `identity` and a missing header mean no encoding at all.
 * @param acceptEncoding - the verbatim request header.
 * @returns `'br'`, `'gzip'`, or `undefined` when nothing is acceptable.
 */
export function chooseEncoding(acceptEncoding) {
  if (typeof acceptEncoding !== 'string' || acceptEncoding.trim() === '') return undefined
  const quality = new Map()
  for (const part of acceptEncoding.split(',')) {
    const [rawName, ...params] = part.split(';')
    const name = rawName.trim().toLowerCase()
    if (name === '') continue
    let q = 1
    for (const param of params) {
      const match = /^\s*q\s*=\s*([0-9.]+)\s*$/iu.exec(param)
      if (match !== null) q = Number(match[1])
    }
    if (!Number.isFinite(q) || q <= 0) q = 0
    // A codec listed twice keeps its most permissive value.
    quality.set(name, Math.max(quality.get(name) ?? 0, q))
  }
  if ((quality.get('br') ?? 0) > 0) return 'br'
  if ((quality.get('gzip') ?? 0) > 0 || (quality.get('x-gzip') ?? 0) > 0) return 'gzip'
  if ((quality.get('*') ?? 0) > 0) return 'gzip'
  return undefined
}

/**
 * Whether one response media type is worth encoding.
 * @param contentType - the verbatim `content-type` header, when there is one.
 * @returns true for the allowlist only.
 */
export function isCompressibleType(contentType) {
  if (typeof contentType !== 'string') return false
  const base = contentType.split(';', 1)[0]?.trim().toLowerCase() ?? ''
  if (base === '') return false
  if (base.startsWith('text/event-stream')) return false
  return COMPRESSIBLE_TYPES.includes(base)
}

/**
 * The encoding one response should use, or `undefined` to pass it through.
 *
 * Every refusal here is a correctness rule rather than a preference:
 * a `HEAD` has no body to encode; a `204`/`304` must arrive byte-empty; an
 * already-encoded body must never be encoded twice; `no-transform` is the
 * origin saying so; a range request must keep its byte offsets; an empty body is
 * not worth a header it cannot justify; and an event stream, a redirect or an
 * unlisted type is not something this proxy has any business rewriting.
 * @param options - the request method, the status, and both header sets as raw.
 * @returns `'br'`, `'gzip'`, or `undefined`.
 */
export function shouldCompress(options = {}) {
  const { method, status, requestHeaders, responseHeaders } = options
  if (typeof method !== 'string' || method.toUpperCase() === 'HEAD') return undefined
  if (!Number.isInteger(status) || status < 200 || status > 299) return undefined
  if (BODYLESS_STATUS.has(status)) return undefined
  const response = isRecord(responseHeaders) ? responseHeaders : {}
  const request = isRecord(requestHeaders) ? requestHeaders : {}
  if (headerValue(response, 'content-encoding') !== undefined) return undefined
  if (headerValue(request, 'range') !== undefined) return undefined
  const cacheControl = headerValue(response, 'cache-control')
  if (typeof cacheControl === 'string' && /no-transform/iu.test(cacheControl)) return undefined
  const length = headerValue(response, 'content-length')
  if (typeof length === 'string' && Number(length) === 0) return undefined
  if (!isCompressibleType(headerValue(response, 'content-type'))) return undefined
  return chooseEncoding(headerValue(request, 'accept-encoding'))
}

/** One response header, case-insensitively, as text. */
function headerValue(headers, name) {
  if (!isRecord(headers)) return undefined
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== name) continue
    return typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : undefined
  }
  return undefined
}

/**
 * The headers one encoded response carries.
 *
 * `content-length` is dropped because the body changed size; `content-md5` and
 * `digest` are dropped for the same reason (they describe the bytes the origin
 * computed, not the ones the phone receives); and `vary: accept-encoding` is
 * merged in because the answer now genuinely depends on that request header.
 * @param headers - the response headers about to be written.
 * @param encoding - the codec being applied.
 * @returns a new header object.
 */
export function encodedHeaders(headers, encoding) {
  const encoded = {}
  for (const [key, value] of Object.entries(isRecord(headers) ? headers : {})) {
    if (value === undefined) continue
    const lower = key.toLowerCase()
    if (lower === 'content-length' || lower === 'content-md5' || lower === 'digest') continue
    if (lower === 'content-encoding') continue
    if (lower === 'vary') continue
    encoded[lower] = value
  }
  encoded['content-encoding'] = encoding
  encoded.vary = appendVary(headers, 'accept-encoding')
  return encoded
}

/** One `vary` value with `field` merged in, without duplicating what is already there. */
function appendVary(headers, field) {
  const existing = headerValue(headers, 'vary')
  if (typeof existing !== 'string' || existing.trim() === '') return field
  const fields = existing
    .split(',')
    .map(entry => entry.trim())
    .filter(entry => entry !== '')
  if (fields.some(entry => entry.toLowerCase() === field)) return fields.join(', ')
  return [...fields, field].join(', ')
}

/**
 * One zlib stream for a codec.
 *
 * Brotli is asked for quality 5 rather than the default 11: this is a live proxy
 * on a desktop, the payload is a LAN hop, and the difference between 5 and 11 is
 * a hundredfold in CPU for a few percent of bytes. gzip runs at level 6, the
 * usual compromise.
 * @param encoding - `'br'` or `'gzip'`.
 * @returns the transform, or `undefined` for an unknown codec.
 */
export function createCompressor(encoding) {
  if (encoding === 'br') {
    return createBrotliCompress({ params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 5 } })
  }
  if (encoding === 'gzip') return createGzip({ level: 6 })
  return undefined
}

/**
 * Stream one upstream response into the client response, encoding if asked.
 *
 * Nothing is buffered: the transform is fed chunk by chunk and every compressed
 * chunk is written as it appears, with backpressure honoured in both directions
 * (the codec pauses when the socket is full, and the source pauses when the codec
 * is). The headers are deliberately written on the *first* output chunk rather
 * than up front, so an empty body — a bare `200` with no bytes — goes out without
 * `content-encoding` and without a compressed frame that decodes to the same
 * nothing. With no encoding the response is the plain pipe the proxy always had.
 * @param options - `source`, `sink`, `status`, `headers`, `encoding`, `logger`.
 */
export function streamBody(options = {}) {
  const { source, sink, status = 200, headers = {}, encoding, logger } = options
  if (sink === undefined || source === undefined) return
  const codec = encoding === undefined ? undefined : createCompressor(encoding)
  if (codec === undefined) {
    sink.writeHead(status, headers)
    source.pipe(sink)
    return
  }
  let started = false
  let sawInput = false
  const begin = () => {
    if (started) return
    started = true
    sink.writeHead(status, sawInput ? encodedHeaders(headers, encoding) : headers)
  }
  codec.on('data', chunk => {
    // A codec always emits its own frame header, even for zero input. An empty
    // body therefore has to be dropped here: writing it while the headers say
    // "no content-encoding" would hand the client a few bytes of zlib.
    if (sawInput !== true) return
    begin()
    if (sink.write(chunk) === false) {
      codec.pause()
      sink.on?.('drain', () => codec.resume())
    }
  })
  codec.on('end', () => {
    begin()
    sink.end()
  })
  codec.on('error', error => {
    logger?.warn?.('edh-remote: encoding a response failed: %s', messageOf(error))
    if (started !== true) sink.writeHead(status, headers)
    sink.destroy?.()
  })
  source.on('data', chunk => {
    sawInput = true
    if (codec.write(chunk) === false) {
      source.pause?.()
      codec.once('drain', () => source.resume?.())
    }
  })
  source.on('end', () => codec.end())
  source.on('error', () => {
    codec.destroy()
    sink.destroy?.()
  })
}

// ---------------------------------------------------------------------------
// The proxy
// ---------------------------------------------------------------------------

/** One plain-text answer. */
function textResponse(text, status = 200, headers = {}) {
  return { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...headers }, text }
}

/**
 * The reverse proxy from our listener to the loopback GUI.
 *
 * Bodies are piped in both directions and nothing is read into memory: the GUI
 * streams file uploads, answers with a long-lived SSE stream, and keeps one
 * WebSocket open, so a buffered proxy would either cap an upload or drop a live
 * connection. No idle timeout is installed on either side. Responses may pass
 * through a compression transform on the way out ({@link streamBody}), which is
 * still a stream: chunk in, chunk out, no whole body held.
 *
 * Every live upstream request and socket is tracked, so disposing the row kills
 * exactly the connections this listener created and never touches the desktop's
 * own page.
 * @param options - `target()` returning the resolved loopback address,
 *   `mintCookie()` returning the harness cookie header, and injectable
 *   `createRequest`/`createUpstream` for tests.
 * @returns `{ handle, upgrade, dispose, stats }`.
 */
export function createRemoteProxy(options = {}) {
  const {
    target,
    mintCookie,
    createRequest = httpRequest,
    createRequestSecure = httpsRequest,
    createUpstream = netConnect,
    logger,
  } = options
  const stats = { requests: 0, upgrades: 0, killed: 0, errors: 0, encoded: 0 }
  const pending = new Set()
  const sockets = new Set()

  const track = socket => {
    sockets.add(socket)
    socket.once?.('close', () => sockets.delete(socket))
  }

  const cookieHeader = async () => {
    try {
      const value = await mintCookie?.()
      return typeof value === 'string' && value !== '' ? value : undefined
    } catch (error) {
      logger?.warn?.('edh-remote: the loopback sign-in cookie could not be minted: %s', messageOf(error))
      return undefined
    }
  }

  return {
    stats,
    /** Forward one ordinary request, streaming both bodies. */
    async handle(req, res) {
      const sink = target?.()
      if (sink === undefined) {
        const answer = textResponse('edh remote: the local GUI is not listening\n', 503)
        res.writeHead(answer.status, answer.headers)
        res.end(answer.text)
        return
      }
      stats.requests += 1
      const cookie = await cookieHeader()
      const headers = rewriteRequestHeaders(req.headers, { authority: sink.authority, origin: sink.origin, cookie })
      const create = sink.tls === true ? createRequestSecure : createRequest
      let upstream
      try {
        upstream = create({ host: sink.hostname, port: sink.port, method: req.method, path: req.url, headers })
      } catch (error) {
        stats.errors += 1
        const answer = textResponse(`edh remote: the local GUI could not be reached: ${messageOf(error)}\n`, 502)
        res.writeHead(answer.status, answer.headers)
        res.end(answer.text)
        return
      }
      pending.add(upstream)
      // No idle timeout in either direction: the SSE stream and a slow upload
      // are both legitimate reasons for a socket to be quiet for minutes.
      upstream.setTimeout?.(0)
      const done = () => pending.delete(upstream)
      upstream.on('error', error => {
        stats.errors += 1
        done()
        if (res.headersSent !== true && res.writableEnded !== true) {
          const answer = textResponse(`edh remote: the local GUI did not answer: ${messageOf(error)}\n`, 502)
          res.writeHead(answer.status, answer.headers)
          res.end(answer.text)
        } else if (typeof res.destroy === 'function') res.destroy()
      })
      upstream.on('close', done)
      upstream.on('response', upstreamRes => {
        // The harness answers the proxy. Its session cookie is bound to the
        // loopback authority and must never travel back out over the LAN.
        const status = upstreamRes.statusCode ?? 502
        const headers = filterResponseHeaders(upstreamRes.headers)
        const encoding = shouldCompress({
          method: req.method,
          status,
          requestHeaders: req.headers,
          responseHeaders: upstreamRes.headers,
        })
        if (encoding !== undefined) stats.encoded += 1
        streamBody({ source: upstreamRes, sink: res, status, headers, encoding, logger })
        upstreamRes.on('error', () => res.destroy?.())
      })
      // The phone hanging up must free the upstream request, or a long poll
      // would stay alive after the tab was closed.
      res.on?.('close', () => {
        if (upstream.destroy !== undefined && upstream.destroyed !== true) upstream.destroy()
        done()
      })
      req.pipe(upstream)
      req.on?.('error', () => upstream.destroy?.())
    },
    /** Carry one authenticated WebSocket upgrade to the loopback mux. */
    async upgrade(req, socket, head) {
      const sink = target?.()
      if (sink === undefined) {
        socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
        return
      }
      stats.upgrades += 1
      const cookie = await cookieHeader()
      let parsed
      try {
        parsed = new URL(req.url ?? MUX_PATH, 'http://remote.invalid')
      } catch {
        socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
        return
      }
      const text = upgradeRequestText({
        path: parsed.pathname,
        search: parsed.search,
        authority: sink.authority,
        origin: sink.origin,
        cookie,
        headers: req.headers,
      })
      const upstream = createUpstream(sink.port, sink.hostname)
      track(socket)
      track(upstream)
      upstream.once('connect', () => {
        upstream.write(text)
        if (head !== undefined && head.length > 0) upstream.write(head)
        socket.pipe(upstream).pipe(socket)
      })
      upstream.once('error', () => {
        stats.errors += 1
        socket.destroy()
      })
      socket.once('error', () => upstream.destroy())
      upstream.once('close', () => socket.destroy())
      socket.once('close', () => upstream.destroy())
    },
    /** Kill every connection this proxy opened; the store and the row stay usable. */
    dispose() {
      for (const request of pending) {
        try {
          request.destroy()
        } catch {
          /* an already-dead request is the goal, not a failure */
        }
      }
      stats.killed += pending.size
      pending.clear()
      for (const socket of sockets) {
        try {
          socket.destroy()
        } catch {
          /* same */
        }
      }
      sockets.clear()
    },
  }
}

// ---------------------------------------------------------------------------
// The LAN listener
// ---------------------------------------------------------------------------

/**
 * Read one sign-in POST, bounded.
 *
 * This is the only place this module buffers a body, and it is bounded twice: a
 * declared length over the cap is refused before a byte is read, and the running
 * total is checked as chunks arrive. The GUI's own traffic never passes through
 * here — it is piped.
 * @param request - the incoming request.
 * @param limit - the largest accepted body.
 * @returns `{ ok: true, text }` or `{ ok: false, reason }`.
 */
export function readLoginBody(request, limit = LOGIN_BODY_LIMIT) {
  return new Promise(resolve => {
    const declared = Number(request?.headers?.['content-length'])
    if (Number.isFinite(declared) && declared > limit) {
      resolve({ ok: false, reason: 'too-large' })
      return
    }
    const chunks = []
    let size = 0
    let settled = false
    const finish = value => {
      if (settled) return
      settled = true
      resolve(value)
    }
    request.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      size += buffer.length
      if (size > limit) {
        finish({ ok: false, reason: 'too-large' })
        request.destroy?.()
        return
      }
      chunks.push(buffer)
    })
    request.on('end', () => finish({ ok: true, text: Buffer.concat(chunks).toString('utf8') }))
    request.on('error', () => finish({ ok: false, reason: 'unreadable' }))
    request.on('aborted', () => finish({ ok: false, reason: 'unreadable' }))
  })
}

/**
 * The LAN listener: our login gate, then the proxy.
 *
 * The whole security model lives in `handleRequest`. Only two paths are answered
 * locally — the sign-in page and its two posts. Every other path needs our signed
 * cookie; a browser navigation is redirected to `/` so the phone lands on the
 * login page rather than a bare 401, while `/api` and asset requests get a plain
 * `401` so a fetch fails cleanly instead of receiving HTML.
 * @param options - the port, the config reader, the proxy, our limiter, and the
 * injectable clock/sleep/server factory used by the tests.
 * @returns `{ listen, close, handleRequest, handleUpgrade, state, limiter }`.
 */
export function createRemoteServer(options = {}) {
  const {
    port,
    config,
    recordSession,
    target,
    mintCookie,
    now = Date.now,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    logger,
    createServer = createHttpServer,
    createRequest,
    createRequestSecure,
    createUpstream,
    scryptOptions,
  } = options
  const limiter = options.limiter ?? createLimiter({ now })
  const proxy =
    options.proxy ??
    createRemoteProxy({ target, mintCookie, createRequest, createRequestSecure, createUpstream, logger })
  const state = { listening: false, lastError: '', port: undefined }
  let server

  const currentConfig = () => {
    const read = config?.()
    return isRecord(read?.config) ? read.config : defaultConfig()
  }

  const send = (res, answer) => {
    res.writeHead(answer.status, answer.headers)
    res.end(answer.text)
  }

  const sessionOf = request => {
    const stored = currentConfig()
    if (typeof stored.secret !== 'string' || stored.secret === '') return undefined
    const value = cookieValue(request?.headers?.cookie, COOKIE_NAME)
    return verifySession(stored.secret, value, {
      now: now(),
      maxAgeMs: Math.max(1, stored.sessionDays) * 86_400_000,
    })
  }

  const rejectUnauthenticated = (req, res) => {
    if (isNavigation(req.headers)) {
      res.writeHead(303, { location: '/', 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' })
      res.end()
      return
    }
    send(res, textResponse('edh remote: sign in first\n', 401))
  }

  const loginFailure = (res, reason, message, extras = {}) => {
    const status = reason === 'too-large' ? 413 : reason === 'locked' ? 429 : 401
    send(
      res,
      textResponse(loginPageHtml({ error: message }), status, {
        'content-type': 'text/html; charset=utf-8',
        'x-frame-options': 'DENY',
        ...extras,
      }),
    )
  }

  const handleLogin = async (req, res) => {
    const address = clientAddress(req)
    const gate = limiter.check(address)
    if (gate.allowed !== true) {
      // A growing delay before the refusal: cheap for a person, expensive for a
      // loop. The line is the same plain sentence the page shows.
      await sleep(gate.delayMs)
      const message = `Too many sign-in attempts. Try again in ${String(gate.retryAfterSeconds)} second${gate.retryAfterSeconds === 1 ? '' : 's'}.`
      logger?.warn?.('edh-remote: sign-in refused after %d failures', gate.attempts)
      return loginFailure(res, 'locked', message, { 'retry-after': String(gate.retryAfterSeconds) })
    }
    const body = await readLoginBody(req)
    if (body.ok !== true) {
      const message = body.reason === 'too-large' ? 'That sign-in request was too large.' : 'That sign-in request could not be read.'
      return loginFailure(res, body.reason, message)
    }
    let submitted
    try {
      submitted = new URLSearchParams(body.text)
    } catch {
      return loginFailure(res, 'unreadable', 'That sign-in request could not be read.')
    }
    const username = submitted.get('username') ?? ''
    const password = submitted.get('password') ?? ''
    const stored = currentConfig()
    if (typeof stored.secret !== 'string' || stored.secret === '') {
      // A store without a signing secret cannot issue a session that would ever
      // verify. Say so plainly instead of accepting a sign-in and dropping it.
      return loginFailure(res, 'denied', 'Remote access is not set up yet. Set a username and a password in EDH settings.')
    }
    const verdict = await verifyLogin(username, password, stored, scryptOptions)
    if (verdict.ok !== true) {
      const recorded = limiter.fail(address)
      // Never the attempted value, never the stored one — only the count.
      logger?.warn?.('edh-remote: sign-in rejected (%d in this window)', recorded.attempts)
      return loginFailure(
        res,
        verdict.reason === 'no-password' ? 'denied' : verdict.reason,
        verdict.message,
        verdict.reason === 'no-password' ? { 'cache-control': 'no-store' } : {},
      )
    }
    limiter.succeed(address)
    const issuedAt = now()
    const sessionDays = Number.isInteger(stored.sessionDays) ? stored.sessionDays : DEFAULT_SESSION_DAYS
    const expiresAt = issuedAt + sessionDays * 86_400_000
    const value = signSession(stored.secret, { issuedAt, expiresAt, username: stored.username })
    try {
      recordSession?.({ id: createHash('sha256').update(value).digest('hex').slice(0, 32), issuedAt, expiresAt })
    } catch (error) {
      logger?.warn?.('edh-remote: recording the issued session failed: %s', messageOf(error))
    }
    res.writeHead(303, {
      location: '/',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'set-cookie': sessionCookieHeader(value, { maxAgeSeconds: sessionDays * 86_400 }),
    })
    res.end()
  }

  const handleLogout = (req, res) => {
    res.writeHead(303, {
      location: '/',
      'cache-control': 'no-store',
      'set-cookie': CLEAR_COOKIE,
    })
    res.end()
  }

  const handleRequest = async (req, res) => {
    let parsed
    try {
      parsed = new URL(req.url ?? '/', 'http://remote.invalid')
    } catch {
      return send(res, textResponse('edh remote: bad request\n', 400))
    }
    if (parsed.pathname === LOGIN_PATH) {
      if (req.method === 'POST') return void (await handleLogin(req, res))
      if (req.method === 'GET' || req.method === 'HEAD') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' })
        res.end(req.method === 'HEAD' ? undefined : loginPageHtml({}))
        return
      }
      return send(res, textResponse('edh remote: method not allowed\n', 405, { allow: 'GET, POST' }))
    }
    if (parsed.pathname === LOGOUT_PATH) {
      if (req.method === 'POST' || req.method === 'GET') return handleLogout(req, res)
      return send(res, textResponse('edh remote: method not allowed\n', 405, { allow: 'POST' }))
    }
    if (sessionOf(req) === undefined) {
      if (parsed.pathname === '/') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'DENY' })
        res.end(loginPageHtml({}))
        return
      }
      return rejectUnauthenticated(req, res)
    }
    return void (await proxy.handle(req, res))
  }

  const handleUpgrade = async (req, socket, head) => {
    let parsed
    try {
      parsed = new URL(req.url ?? '/', 'http://remote.invalid')
    } catch {
      socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
      return
    }
    if (parsed.pathname !== MUX_PATH) {
      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
      return
    }
    if (sessionOf(req) === undefined) {
      socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n')
      return
    }
    await proxy.upgrade(req, socket, head)
  }

  return {
    state,
    limiter,
    proxy,
    handleRequest,
    handleUpgrade,
    /**
     * Bind the listener and report the outcome in `state`.
     * @param requestedPort - the port to bind; defaults to the one given at construction.
     */
    listen(requestedPort = port) {
      return new Promise(resolve => {
        if (server !== undefined) {
          resolve({ ok: true, port: state.port })
          return
        }
        let bound = false
        const instance = createServer((req, res) => {
          handleRequest(req, res).catch(error => {
            logger?.warn?.('edh-remote: request handling failed: %s', messageOf(error))
            try {
              if (res.headersSent !== true) res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
              res.end('edh remote: internal error\n')
            } catch {
              /* the socket is already gone */
            }
          })
        })
        instance.on('upgrade', (req, socket, head) => {
          handleUpgrade(req, socket, head).catch(error => {
            logger?.warn?.('edh-remote: upgrade handling failed: %s', messageOf(error))
            try {
              socket.destroy()
            } catch {
              /* already gone */
            }
          })
        })
        instance.on('error', error => {
          state.listening = false
          state.lastError = `the listener could not start: ${messageOf(error)}`
          logger?.warn?.('edh-remote: %s', state.lastError)
          if (bound !== true) {
            server = undefined
            resolve({ ok: false, message: state.lastError })
          }
        })
        // Requests may legitimately take as long as an upload or an SSE stream,
        // so the receipt timeout is off; the header timeout still bounds a
        // connection that never sends a request line.
        if ('requestTimeout' in instance) instance.requestTimeout = 0
        if ('headersTimeout' in instance) instance.headersTimeout = 60_000
        server = instance
        instance.listen(requestedPort, BIND_ADDRESS, () => {
          bound = true
          state.listening = true
          state.lastError = ''
          const address = typeof instance.address === 'function' ? instance.address() : undefined
          state.port = isRecord(address) && Number.isInteger(address.port) ? address.port : requestedPort
          resolve({ ok: true, port: state.port })
        })
      })
    },
    /** Stop the listener and every connection it owned. */
    close() {
      const instance = server
      server = undefined
      state.listening = false
      proxy.dispose()
      if (instance === undefined) return Promise.resolve()
      return new Promise(resolve => {
        try {
          instance.close(() => resolve())
          // `close()` only stops new connections; the live SSE stream and the
          // mux socket are ours and must not outlive the row.
          instance.closeAllConnections?.()
        } catch {
          resolve()
        }
      })
    },
  }
}

/** True when a request is a browser navigation, which gets a redirect rather than a 401. */
export function isNavigation(headers) {
  const accept = headers?.accept
  if (typeof accept !== 'string') return false
  return accept.includes('text/html') || accept.includes('application/xhtml+xml')
}

// ---------------------------------------------------------------------------
// The feature's own control: store, listener and view
// ---------------------------------------------------------------------------

/**
 * Everything the feature owns that outlives one request: the store, the listener,
 * the minted harness cookie, and the view the settings route reports.
 *
 * The listener is only ever started from `sync()`, and only when the stored
 * config is enabled and both services are present. Every method that can fail
 * answers with a report instead of throwing, because this object is wired
 * straight into a route.
 * @param options - the store path and the injectable seams the tests use.
 * @returns the control: `view`, `set`, `logoutAll`, `regenerateSecret`, `bind`,
 * `dispose`.
 */
export function createRemoteControl(options = {}) {
  const {
    storePath = resolveStorePath(),
    store = createFileStore(storePath),
    logger,
    now = Date.now,
    sleep,
    interfaces = networkInterfaces,
    createServer,
    createRequest,
    createRequestSecure,
    createUpstream,
    scryptOptions,
  } = options
  let sinks = {}
  let server
  let minted
  let mintedAt = 0
  let credentialError = ''
  const state = { listening: false, lastError: '', port: undefined }

  const readConfig = () => store.read()

  const failure = (reason, message) => ({ ok: false, reason, message })

  /** The current listener state, with the addresses a phone could try. */
  const runtime = config => ({
    available: sinks.webServer !== undefined,
    listening: state.listening,
    addresses: localAddresses(interfaces(), config.port),
    lastError: state.lastError === '' ? credentialError : state.lastError,
  })

  const mintCookie = () => {
    const { webServer, connection } = sinks
    if (webServer === undefined || connection === undefined) return undefined
    if (typeof minted === 'string' && now() < mintedAt) return minted
    const fail = reason => {
      credentialError = `Remote access cannot sign in to the local GUI: ${reason}`
      return typeof minted === 'string' ? minted : undefined
    }
    const sink = resolveTarget(webServer)
    if (sink === undefined) return typeof minted === 'string' ? minted : undefined
    const token = launchTokenOf(base => connection.authenticatedUrl(base), `${sink.origin}/`)
    if (token === undefined) return fail('the launch token is unavailable')
    const captured = captureIndexCookie((req, res) => connection.authorizeIndex(req, res), {
      token,
      authority: sink.authority,
    })
    if (captured === undefined) return fail('the Harness refused to mint a sign-in cookie for the loopback GUI')
    minted = captured.cookie
    // Refresh well inside the harness cookie's own lifetime, so a stale cookie
    // is replaced before the GUI could answer 401 with it.
    const ttl = Number.isFinite(captured.maxAgeSeconds) ? captured.maxAgeSeconds * 1000 : 60_000
    mintedAt = now() + Math.max(60_000, ttl * 0.5)
    credentialError = ''
    return minted
  }

  const recordSession = entry => {
    const { config } = readConfig()
    const next = {
      ...config,
      sessions: [...config.sessions, entry]
        .filter(session => session.expiresAt > now())
        .slice(-MAX_SESSIONS),
    }
    const written = store.write(next)
    if (written.ok !== true) logger?.warn?.('edh-remote: %s', written.error)
  }

  const sync = async () => {
    const { config } = readConfig()
    const wanted = config.enabled === true && sinks.webServer !== undefined && sinks.connection !== undefined
    if (wanted !== true) {
      if (server !== undefined) {
        const closing = server
        server = undefined
        await closing.close()
        state.listening = false
      }
      return
    }
    if (server !== undefined && state.port === config.port) return
    if (server !== undefined) {
      const closing = server
      server = undefined
      await closing.close()
    }
    minted = undefined
    mintedAt = 0
    const started = createRemoteServer({
      port: config.port,
      config: readConfig,
      recordSession,
      target: () => resolveTarget(sinks.webServer),
      mintCookie,
      now,
      sleep,
      logger,
      createServer,
      createRequest,
      createRequestSecure,
      createUpstream,
      scryptOptions,
    })
    const outcome = await started.listen(config.port)
    if (outcome.ok === true) {
      server = started
      state.listening = true
      state.port = outcome.port
      state.lastError = ''
      // Mint once now, not at the first phone request: a credential chain that
      // cannot work has to show up in the settings view, not as a 401 the user
      // has to guess the meaning of.
      mintCookie()
    } else {
      state.listening = false
      state.lastError = outcome.message
      await started.close()
    }
  }

  return {
    storePath,
    /** The secret-free status answer. Never throws: the route depends on it. */
    view() {
      const { config, error } = readConfig()
      const view = configView(config, runtime(config))
      if (error !== undefined) view.lastError = view.lastError === '' ? error : `${view.lastError}; ${error}`
      return view
    },
    /** Persist one settings change and bring the listener in line with it. */
    async set(patch) {
      if (!isRecord(patch)) return failure('bad-input', 'A "set" action needs a JSON object')
      const { config } = readConfig()
      const next = { ...config }
      if (patch.enabled !== undefined) {
        if (typeof patch.enabled !== 'boolean') return failure('bad-input', '"enabled" must be true or false')
        next.enabled = patch.enabled
      }
      if (patch.port !== undefined) {
        const port = Number(patch.port)
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
          return failure('bad-port', 'A port must be a whole number between 1 and 65535')
        }
        next.port = port
      }
      if (patch.username !== undefined) {
        const username = String(patch.username).trim()
        if (username === '' || username.length > MAX_USERNAME) {
          return failure('bad-username', `A username must be 1-${String(MAX_USERNAME)} characters`)
        }
        next.username = username
      }
      if (patch.password !== undefined) {
        const password = String(patch.password)
        if (password.length < MIN_PASSWORD) {
          return failure('bad-password', `A password must be at least ${String(MIN_PASSWORD)} characters`)
        }
        if (password.length > MAX_PASSWORD) {
          return failure('bad-password', `A password must be at most ${String(MAX_PASSWORD)} characters`)
        }
        let hashed
        try {
          hashed = await hashPassword(password, scryptOptions)
        } catch (error) {
          return failure('error', `The password could not be hashed: ${messageOf(error)}`)
        }
        next.salt = hashed.salt
        next.passwordHash = hashed.hash
        // A new password invalidates every session this secret signed.
        next.sessions = []
        next.secret = newSecret()
      }
      if (patch.sessionDays !== undefined) {
        const days = Number(patch.sessionDays)
        if (!Number.isInteger(days) || days < 1 || days > MAX_SESSION_DAYS) {
          return failure('bad-input', `A session lifetime must be 1-${String(MAX_SESSION_DAYS)} days`)
        }
        next.sessionDays = days
      }
      if (next.enabled === true && (next.passwordHash === '' || next.username === '')) {
        return failure('bad-state', 'Remote access needs a username and a password before it can be turned on')
      }
      if (next.secret === '') next.secret = newSecret()
      const written = store.write(next)
      if (written.ok !== true) return failure('error', written.error)
      minted = undefined
      mintedAt = 0
      if (next.port !== config.port || next.enabled !== config.enabled) await sync()
      return { ok: true, changed: Object.keys(patch).filter(key => key !== 'action') }
    },
    /** Rotate the signing secret and close every proxied connection: every phone is out. */
    async logoutAll() {
      const { config } = readConfig()
      const written = store.write({ ...config, secret: newSecret(), sessions: [] })
      if (written.ok !== true) return failure('error', written.error)
      minted = undefined
      mintedAt = 0
      server?.proxy.dispose()
      return { ok: true, sessions: 0 }
    },
    /** Rotate the signing secret only: every session cookie stops verifying. */
    async regenerateSecret() {
      const { config } = readConfig()
      const written = store.write({ ...config, secret: newSecret() })
      if (written.ok !== true) return failure('error', written.error)
      minted = undefined
      mintedAt = 0
      return { ok: true }
    },
    /** Attach the services and start (or keep down) the listener. */
    async bind(options = {}) {
      sinks = { connection: options.connection, webServer: options.webServer }
      await sync()
    },
    /** Re-read the store and apply it; used after an external edit. */
    async refresh() {
      await sync()
    },
    /** Stop the listener and forget the minted credential; safe to call twice. */
    async dispose() {
      const closing = server
      server = undefined
      state.listening = false
      minted = undefined
      mintedAt = 0
      sinks = {}
      if (closing !== undefined) await closing.close()
    },
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

/**
 * Which route one incoming request addresses.
 * @returns `status` for `GET`, `action` for `POST`, `undefined` for anything else.
 */
export function remoteMethod(request) {
  if (request?.method === 'GET') return 'status'
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

/** The answers a caller can be told about, in one place so the route and the page agree. */
export const REMOTE_ACTIONS = Object.freeze(['set', 'logout-all', 'regenerate-secret'])

/**
 * Answer one request on `/api/edh.remote`.
 *
 * `GET` is the status view. `POST` performs one action and answers the same view
 * with a `report` beside it, so the settings page refreshes itself from either.
 * A rejected input is a JSON report with a 400 and an unsupported method is 405;
 * an internal failure is still a JSON report and never a 500, because a page that
 * asked a question always gets an answer it can render. No answer ever carries a
 * hash, a salt or a secret.
 * @param request - the incoming request.
 * @param options - the control that owns the store and the listener.
 * @returns the JSON response.
 */
export async function remoteResponse(request, options = {}) {
  const remote = options.remote
  if (remote === undefined || typeof remote.view !== 'function') {
    return jsonResponse(
      {
        ok: false,
        available: false,
        reason: 'unavailable',
        message: 'Remote access is not available on this Host',
        report: { ok: false, reason: 'unavailable', message: 'Remote access is not available on this Host' },
      },
      200,
    )
  }
  const method = remoteMethod(request)
  if (method === undefined) {
    const message = `Unsupported method ${request?.method ?? 'without a method'}`
    return jsonResponse({ ok: false, reason: 'unsupported-method', message, report: { ok: false, reason: 'unsupported-method', message } }, 405)
  }
  try {
    if (method === 'status') return jsonResponse({ ok: true, ...remote.view() })
    const body = await readJsonBody(request)
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    let report
    switch (action) {
      case 'set':
        report = await remote.set(body)
        break
      case 'logout-all':
        report = await remote.logoutAll()
        break
      case 'regenerate-secret':
        report = await remote.regenerateSecret()
        break
      default: {
        const reason = action === '' ? 'bad-input' : 'unknown-action'
        const message =
          action === ''
            ? `A POST needs an "action": ${REMOTE_ACTIONS.join(', ')}`
            : `Unknown action ${JSON.stringify(action)}; expected ${REMOTE_ACTIONS.join(', ')}`
        return jsonResponse({ ...remote.view(), ok: false, reason, message, report: { ok: false, reason, message } }, 400)
      }
    }
    const view = remote.view()
    const rejected = report?.ok !== true && REJECTED_REASONS.has(report?.reason)
    const status = report?.ok === true || !rejected ? 200 : 400
    // The rejection sentence is lifted to the top level as well as kept in
    // `report`, so a page that only reads the answer's own `reason` still sees
    // it — the same rule `update.js` follows for its refusals.
    const answer = rejected ? { ...view, ok: false, reason: report.reason, message: report.message } : { ...view, ok: report?.ok === true }
    return jsonResponse({ ...answer, report }, status)
  } catch (error) {
    const message = messageOf(error)
    let view
    try {
      view = remote.view()
    } catch {
      view = { available: false, listening: false }
    }
    return jsonResponse(
      { ...view, ok: false, reason: 'error', message, report: { ok: false, reason: 'error', message } },
      200,
    )
  }
}

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

/**
 * Register the feature on the Host.
 *
 * Two effects, both disposed with the row: the status route (it only needs
 * `connection`) and the LAN listener (it needs `webServer` as well). The listener
 * lives inside `ctx.inject(['webServer'])` so a composition without a browser
 * carrier still answers the route with `available: false` instead of unloading
 * the feature — and the module itself imports cleanly with neither service, since
 * nothing is read from them until a callback fires.
 *
 * Everything the listener created is ours: stopping the row stops the socket,
 * kills the proxied connections and drops the minted credential. The desktop's
 * own loopback page is never touched.
 * @param ctx - the Host context.
 * @param config - the row config; it may carry the injectable seams the tests
 *   use (`storePath`, `now`, `sleep`, `interfaces`, `createServer`,
 *   `createRequest`, `createUpstream`, `scryptOptions`). EDH ships it empty.
 */
export function apply(ctx, config = {}) {
  const remote = createRemoteControl({ logger: ctx.logger, ...config })

  ctx.effect(
    () => () => {
      void remote.dispose().catch(error => {
        ctx.logger?.warn?.('edh-remote: disposing the listener failed: %s', messageOf(error))
      })
    },
    'edh-remote: listener disposal',
  )

  const attach = scope => {
    scope.effect(() => {
      try {
        const dispose = scope.connection.fetch.register({
          path: REMOTE_PATH,
          methods: ['GET', 'POST'],
          requestBody: 'buffered',
          fetch: request => remoteResponse(request, { remote }),
        })
        return () => {
          try {
            dispose?.()
          } catch (error) {
            ctx.logger?.warn?.('edh-remote: route disposal failed: %o', error)
          }
        }
      } catch (error) {
        ctx.logger?.warn?.('edh-remote: route registration failed: %o', error)
        return () => {}
      }
    }, 'edh-remote: status route')
  }

  ctx.inject?.(['connection'], scope => {
    attach(scope)
    scope.inject?.(['webServer'], inner => {
      inner.effect(() => {
        void remote
          .bind({ connection: inner.connection, webServer: inner.webServer })
          .catch(error => {
            ctx.logger?.warn?.('edh-remote: starting the listener failed: %s', messageOf(error))
          })
        return () => {
          void remote.dispose().catch(() => {})
        }
      }, 'edh-remote: LAN listener')
    })
  })
}
