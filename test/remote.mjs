import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { brotliDecompressSync, createBrotliCompress, createGzip, gunzipSync } from 'node:zlib'
import {
  apply,
  BIND_ADDRESS,
  captureIndexCookie,
  chooseEncoding,
  CLEAR_COOKIE,
  clientAddress,
  COMPRESSIBLE_TYPES,
  configView,
  COOKIE_NAME,
  createCompressor,
  createFileStore,
  createLimiter,
  createRemoteControl,
  createRemoteProxy,
  createRemoteServer,
  DEFAULT_PORT,
  defaultConfig,
  ENCODINGS,
  encodedHeaders,
  filterResponseHeaders,
  hashPassword,
  isCompressibleType,
  isNavigation,
  LAN_WARNING,
  launchTokenOf,
  localAddresses,
  LOGIN_PATH,
  LOGOUT_PATH,
  loginPageHtml,
  MAX_SESSIONS,
  MUX_PATH,
  newSecret,
  normalizeConfig,
  readLoginBody,
  REMOTE_PATH,
  remoteMethod,
  remoteResponse,
  resolveTarget,
  rewriteRequestHeaders,
  safeEqualText,
  sessionCookieHeader,
  shouldCompress,
  signSession,
  streamBody,
  upgradeRequestText,
  verifyLogin,
  verifyPassword,
  verifySession,
} from '../remote.js'

/** scrypt costs nothing at these parameters; the shape of the code is what is under test. */
const CHEAP = { N: 1024, r: 8, p: 1 }

/** Throwaway directories, removed however this suite ends. */
const fixtures = []

function makeStorePath() {
  const dir = mkdtempSync(join(tmpdir(), 'edh-remote-'))
  fixtures.push(dir)
  return join(dir, 'remote.json')
}

process.on('exit', () => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
})

// ---------------------------------------------------------------------------
// Fakes: no socket, no listener, no network anywhere in this suite
// ---------------------------------------------------------------------------

/** The `end`/`data` emitter node:http hands a handler, with a scripted body. */
function fakeRequest({ method = 'GET', url = '/', headers = {}, body = [], address = '192.168.1.9' } = {}) {
  const listeners = new Map()
  const request = {
    method,
    url,
    headers,
    socket: { remoteAddress: address },
    dataListeners: 0,
    pipedTo: [],
    destroyed: false,
    on(event, fn) {
      if (event === 'data') request.dataListeners += 1
      const list = listeners.get(event) ?? []
      list.push(fn)
      listeners.set(event, list)
      return request
    },
    once(event, fn) {
      return request.on(event, fn)
    },
    emit(event, ...args) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn(...args)
    },
    /** Emit the scripted body on the next turn, as a socket would. */
    pump() {
      setImmediate(() => {
        for (const chunk of body) request.emit('data', chunk)
        request.emit('end')
      })
    },
    pipe(destination) {
      request.pipedTo.push(destination)
      for (const chunk of body) destination.write(chunk)
      destination.end()
      return destination
    },
    destroy() {
      request.destroyed = true
    },
  }
  return request
}

/** The `writeHead`/`end` response node:http hands a handler. */
function fakeResponse() {
  const chunks = []
  const listeners = new Map()
  const response = {
    status: undefined,
    headers: undefined,
    headersSent: false,
    writableEnded: false,
    destroyed: false,
    writeHead(status, headers) {
      response.status = status
      response.headers = headers ?? {}
      response.headersSent = true
      return response
    },
    write(chunk) {
      chunks.push(Buffer.from(chunk))
    },
    end(chunk) {
      if (chunk !== undefined && chunk !== null) chunks.push(Buffer.from(chunk))
      response.writableEnded = true
    },
    on(event, fn) {
      const list = listeners.get(event) ?? []
      list.push(fn)
      listeners.set(event, list)
      return response
    },
    destroy() {
      response.destroyed = true
    },
    text() {
      return Buffer.concat(chunks).toString('utf8')
    },
    /** The bytes written so far, for an encoded body that must be decoded first. */
    raw() {
      return Buffer.concat(chunks)
    },
    /** How many separate `write` calls landed, so a test can see it streaming. */
    chunkCount() {
      return chunks.length
    },
  }
  return response
}

/**
 * A stand-in for one `http.request` call: it records what the proxy asked for and
 * the bytes it wrote, and answers when the test says the upstream responded.
 */
function fakeUpstream() {
  const listeners = new Map()
  const upstream = {
    options: undefined,
    writes: [],
    ended: false,
    destroyed: false,
    timeout: undefined,
    on(event, fn) {
      const list = listeners.get(event) ?? []
      list.push(fn)
      listeners.set(event, list)
      return upstream
    },
    once(event, fn) {
      return upstream.on(event, fn)
    },
    emit(event, ...args) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn(...args)
    },
    setTimeout(ms) {
      upstream.timeout = ms
    },
    write(chunk) {
      upstream.writes.push(Buffer.from(chunk))
    },
    end() {
      upstream.ended = true
    },
    destroy() {
      upstream.destroyed = true
    },
    bytes() {
      return Buffer.concat(upstream.writes)
    },
    /** Answer with a streamed response, as the SSE route does. */
    respond({ statusCode = 200, headers = {}, chunks = [] } = {}) {
      const responseChunks = []
      const responseListeners = new Map()
      const upstreamRes = {
        statusCode,
        headers,
        paused: 0,
        resumed: 0,
        pipedTo: [],
        on(event, fn) {
          const list = responseListeners.get(event) ?? []
          list.push(fn)
          responseListeners.set(event, list)
          return upstreamRes
        },
        once(event, fn) {
          return upstreamRes.on(event, fn)
        },
        emit(event, ...args) {
          for (const fn of [...(responseListeners.get(event) ?? [])]) fn(...args)
        },
        pause() {
          upstreamRes.paused += 1
        },
        resume() {
          upstreamRes.resumed += 1
        },
        pipe(destination) {
          upstreamRes.pipedTo.push(destination)
          for (const chunk of chunks) destination.write?.(chunk)
          destination.end?.()
          responseChunks.push(...chunks)
          return destination
        },
      }
      upstream.emit('response', upstreamRes)
      // The proxy consumes a response one of two ways — piping it when it passes
      // the body through, or listening for `data`/`end` when it encodes it — so a
      // scripted answer has to deliver the body both ways. Only one is ever read.
      for (const chunk of chunks) upstreamRes.emit('data', chunk)
      upstreamRes.emit('end')
      return upstreamRes
    },
    /**
     * Answer with a response the test drives chunk by chunk.
     *
     * The proxy may consume a response either by piping it (the plain path) or by
     * subscribing to `data`/`end` (the compression path), so a scripted answer has
     * to support both. `push`/`finish` are what the streaming tests use.
     */
    stream({ statusCode = 200, headers = {} } = {}) {
      const responseListeners = new Map()
      const upstreamRes = {
        statusCode,
        headers,
        paused: 0,
        resumed: 0,
        pipedTo: [],
        on(event, fn) {
          const list = responseListeners.get(event) ?? []
          list.push(fn)
          responseListeners.set(event, list)
          return upstreamRes
        },
        once(event, fn) {
          return upstreamRes.on(event, fn)
        },
        emit(event, ...args) {
          for (const fn of [...(responseListeners.get(event) ?? [])]) fn(...args)
        },
        pause() {
          upstreamRes.paused += 1
        },
        resume() {
          upstreamRes.resumed += 1
        },
        pipe(destination) {
          upstreamRes.pipedTo.push(destination)
          upstreamRes.destination = destination
          return destination
        },
        /** Feed one chunk: to the pipe if the proxy made one, and as an event either way. */
        push(chunk) {
          upstreamRes.destination?.write?.(chunk)
          upstreamRes.emit('data', chunk)
        },
        finish() {
          upstreamRes.destination?.end?.()
          upstreamRes.emit('end')
        },
      }
      upstream.emit('response', upstreamRes)
      return upstreamRes
    },
  }
  return upstream
}

/** The loopback GUI, as the harness webserver would describe itself. */
function fakeWebServer({ origin = 'http://127.0.0.1:51234', host = '127.0.0.1', port = 51234, bound = true } = {}) {
  return {
    getOrigin() {
      if (bound !== true) throw new Error('webserver: origin read before the listener bound a port')
      return origin
    },
    host,
    port,
  }
}

/** A node:http server stand-in: it records the bind and answers `close`. */
function createFakeServer(handler) {
  const listeners = new Map()
  const server = {
    handler,
    bound: undefined,
    closed: false,
    allClosed: false,
    requestTimeout: 300_000,
    headersTimeout: 60_000,
    on(event, fn) {
      const list = listeners.get(event) ?? []
      list.push(fn)
      listeners.set(event, list)
      return server
    },
    emit(event, ...args) {
      for (const fn of [...(listeners.get(event) ?? [])]) fn(...args)
      return server
    },
    listen(port, host, callback) {
      server.bound = { port, host }
      callback?.()
      return server
    },
    close(callback) {
      server.closed = true
      callback?.()
      return server
    },
    closeAllConnections() {
      server.allClosed = true
    },
    address() {
      return { address: BIND_ADDRESS, family: 'IPv4', port: server.bound?.port ?? 0 }
    },
  }
  return server
}

/** A Cordis-shaped scope: services by name, `effect`, and nested `inject`. */
function createScope(services, collected) {
  const scope = { ...services }
  scope.effect = callback => {
    const dispose = callback()
    if (typeof dispose === 'function') collected.push(dispose)
    return dispose
  }
  scope.inject = (deps, callback) => {
    if (!deps.every(name => services[name] !== undefined)) return undefined
    return callback(createScope(services, collected))
  }
  return scope
}

/** Wait for the microtask/timer turns an un-awaited `bind()` needs. */
function settle() {
  return new Promise(resolve => setTimeout(resolve, 5))
}

/**
 * Wait until `predicate` holds, with a wall-clock deadline.
 *
 * zlib's output lands on the libuv threadpool, so "the next microtask" is not a
 * promise that it has arrived: a suite that only spun `setImmediate` a fixed
 * number of times passed alone and failed when eight suites ran back to back.
 * The deadline is the real bound; the yields just keep the loop cheap.
 * @param predicate - what to wait for.
 * @param label - the step name a failure names.
 */
async function until(predicate, label) {
  const deadline = Date.now() + 5000
  for (let turn = 0; ; turn += 1) {
    if (predicate() === true) return
    assert.equal(Date.now() < deadline, true, `timed out waiting for ${label}`)
    await new Promise(resolve => (turn % 8 === 0 ? setTimeout(resolve, 1) : setImmediate(resolve)))
  }
}

// ---------------------------------------------------------------------------
// 1 â€” the store round-trips, and the view cannot carry a secret
// ---------------------------------------------------------------------------
{
  const path = makeStorePath()
  const store = createFileStore(path)

  assert.deepEqual(store.read(), { config: defaultConfig() }, 'a missing store is the default config')
  assert.equal(defaultConfig().port, DEFAULT_PORT)
  assert.equal(defaultConfig().enabled, false)
  assert.equal(defaultConfig().sessionDays, 7)

  const config = {
    ...defaultConfig(),
    enabled: true,
    port: 9000,
    username: 'mira',
    passwordHash: 'aGFzaA==',
    salt: 'c2FsdA==',
    secret: newSecret(),
    sessions: [{ id: 'abc', issuedAt: 1, expiresAt: 2 }],
  }
  assert.deepEqual(store.write(config), { ok: true })
  assert.deepEqual(store.read().config, config, 'the store round-trips every field')
  assert.equal(JSON.parse(readFileSync(path, 'utf8')).version, 1)

  // Unknown and out-of-range fields are normalised, never trusted.
  const normalized = normalizeConfig({ enabled: 'yes', port: 70000, sessionDays: 999, junk: true })
  assert.equal(normalized.ok, true)
  assert.equal(normalized.config.enabled, false, 'only a real boolean enables the listener')
  assert.equal(normalized.config.port, DEFAULT_PORT, 'an out-of-range port falls back')
  assert.equal(normalized.config.sessionDays, 7)
  assert.equal('junk' in normalized.config, false)

  // A corrupt store still loads, and says what it found.
  const corrupt = makeStorePath()
  const corruptStore = createFileStore(corrupt)
  corruptStore.write({})
  writeFileSync(corrupt, '{ not json', 'utf8')
  const read = corruptStore.read()
  assert.deepEqual(read.config, defaultConfig())
  assert.match(read.error, /not valid JSON/u)

  // The view is a whitelist: no hash, no salt, no secret, whatever the store holds.
  const view = configView(config, { available: true, listening: true, addresses: ['http://10.0.0.5:9000'] })
  const text = JSON.stringify(view)
  assert.equal(view.username, 'mira')
  assert.equal(view.hasPassword, true)
  assert.equal(view.port, 9000)
  assert.equal(view.enabled, true)
  assert.equal(view.listening, true)
  assert.deepEqual(view.addresses, ['http://10.0.0.5:9000'])
  assert.equal(view.warning, LAN_WARNING)
  assert.equal(view.bind, `${BIND_ADDRESS}:9000`)
  assert.equal(text.includes(config.passwordHash), false, 'the hash never reaches a view')
  assert.equal(text.includes(config.salt), false, 'the salt never reaches a view')
  assert.equal(text.includes(config.secret), false, 'the secret never reaches a view')
  assert.deepEqual(Object.keys(view).sort(), [
    'addresses',
    'available',
    'bind',
    'enabled',
    'hasPassword',
    'lastError',
    'listening',
    'port',
    'sessionDays',
    'sessions',
    'username',
    'version',
    'warning',
  ])

  // A session record is capped, and an expired one is never resurrected.
  const many = normalizeConfig({ sessions: Array.from({ length: MAX_SESSIONS + 10 }, (_, index) => ({ id: `s${String(index)}` })) })
  assert.equal(many.config.sessions.length, MAX_SESSIONS)

  // The addresses a phone could try: non-internal IPv4 only, sorted.
  assert.deepEqual(
    localAddresses(
      {
        lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
        eth0: [
          { address: '192.168.1.23', family: 'IPv4', internal: false },
          { address: 'fe80::1', family: 'IPv6', internal: false },
        ],
        wifi: [{ address: '10.0.0.5', family: 'IPv4', internal: false }],
      },
      8787,
    ),
    ['http://10.0.0.5:8787', 'http://192.168.1.23:8787'],
  )
  assert.deepEqual(localAddresses(undefined, 8787), [])
}

// ---------------------------------------------------------------------------
// 2 â€” the password is scrypt-hashed, salted per store, and compared in constant time
// ---------------------------------------------------------------------------
{
  const first = await hashPassword('correct horse battery', CHEAP)
  const second = await hashPassword('correct horse battery', CHEAP)
  assert.notEqual(first.salt, second.salt, 'every hash carries its own salt')
  assert.notEqual(first.hash, second.hash, 'the same password hashes differently')
  assert.equal(await verifyPassword('correct horse battery', first, CHEAP), true)
  assert.equal(await verifyPassword('correct horse batterY', first, CHEAP), false)
  assert.equal(await verifyPassword('', first, CHEAP), false, 'an empty password never matches')
  assert.equal(await verifyPassword('correct horse battery', { salt: '', hash: '' }, CHEAP), false)
  assert.equal(await verifyPassword('correct horse battery', undefined, CHEAP), false)
  assert.equal(await verifyPassword('x', { salt: first.salt, hash: 'not base64!' }, CHEAP), false)

  const config = { ...defaultConfig(), username: 'mira', salt: first.salt, passwordHash: first.hash }
  assert.deepEqual(await verifyLogin('mira', 'correct horse battery', config, CHEAP), { ok: true })
  assert.equal((await verifyLogin('MIRA', 'correct horse battery', config, CHEAP)).reason, 'denied')
  assert.equal((await verifyLogin('mira', 'nope', config, CHEAP)).reason, 'denied')
  assert.equal((await verifyLogin('', '', config, CHEAP)).reason, 'denied')
  assert.equal((await verifyLogin('mira', 'correct horse battery', defaultConfig(), CHEAP)).reason, 'no-password')

  assert.equal(safeEqualText('mira', 'mira'), true)
  assert.equal(safeEqualText('mira', 'miraa'), false)
  assert.equal(safeEqualText('', ''), true)
}

// ---------------------------------------------------------------------------
// 3 â€” our session cookie: signed, bounded, and unforgeable without the secret
// ---------------------------------------------------------------------------
{
  const secret = newSecret()
  const now = 1_700_000_000_000
  const payload = { issuedAt: now, expiresAt: now + 60_000, username: 'mira' }
  const value = signSession(secret, payload)
  assert.match(value, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u)
  assert.deepEqual(verifySession(secret, value, { now, maxAgeMs: 60_000 }), payload)

  // A different secret, a tampered body, and a tampered signature are all refusals.
  assert.equal(verifySession(newSecret(), value, { now, maxAgeMs: 60_000 }), undefined)
  const [, body, signature] = value.split('.')
  const forgedBody = `v1.${body.slice(0, -2)}AA.${signature}`
  assert.equal(verifySession(secret, forgedBody, { now, maxAgeMs: 60_000 }), undefined, 'a changed body fails the signature')
  assert.equal(verifySession(secret, `v1.${body}.${signature.slice(0, -2)}AA`, { now, maxAgeMs: 60_000 }), undefined)
  assert.equal(verifySession(secret, `v2.${body}.${signature}`, { now, maxAgeMs: 60_000 }), undefined)

  // Expiry is checked from both ends, and the lifetime is bounded.
  assert.equal(verifySession(secret, value, { now: now + 60_000, maxAgeMs: 60_000 }), undefined, 'expiry is exclusive')
  assert.equal(verifySession(secret, value, { now: now - 1, maxAgeMs: 60_000 }), undefined, 'an unissued session is refused')
  assert.equal(verifySession(secret, value, { now, maxAgeMs: 1000 }), undefined, 'a lifetime beyond the store is refused')
  assert.equal(verifySession(secret, '', { now }), undefined)
  assert.equal(verifySession('', value, { now }), undefined)
  assert.equal(verifySession(secret, 'v1', { now }), undefined)
  assert.equal(verifySession(secret, 'v1..', { now }), undefined)

  const header = sessionCookieHeader(value, { maxAgeSeconds: 604_800 })
  assert.match(header, new RegExp(`^${COOKIE_NAME}=`, 'u'))
  assert.match(header, /HttpOnly/u)
  assert.match(header, /SameSite=Lax/u)
  assert.match(header, /Path=\//u)
  assert.match(header, /Max-Age=604800/u)
  assert.equal(header.includes('Secure'), false, 'a plain-HTTP listener cannot mark it Secure')
  assert.match(sessionCookieHeader(value, { maxAgeSeconds: 60, secure: true }), /; Secure$/u)
  assert.match(CLEAR_COOKIE, new RegExp(`^${COOKIE_NAME}=; Max-Age=0`, 'u'))
}

// ---------------------------------------------------------------------------
// 4 â€” the sign-in rate limit: a window, a growing delay, and a plain lockout line
// ---------------------------------------------------------------------------
{
  let clock = 1_700_000_000_000
  const limiter = createLimiter({ limit: 3, windowMs: 60_000, baseDelayMs: 100, maxDelayMs: 400, now: () => clock })

  assert.deepEqual(limiter.check('10.0.0.9'), { allowed: true, retryAfterSeconds: 0, delayMs: 0, attempts: 0 })
  limiter.fail('10.0.0.9')
  limiter.fail('10.0.0.9')
  assert.equal(limiter.check('10.0.0.9').allowed, true, 'the limit is not reached yet')
  const third = limiter.fail('10.0.0.9')
  assert.deepEqual(third, { attempts: 3, locked: true })

  const first = limiter.check('10.0.0.9')
  assert.equal(first.allowed, false)
  assert.equal(first.retryAfterSeconds, 60)
  assert.equal(first.delayMs, 100)
  const second = limiter.check('10.0.0.9')
  assert.equal(second.delayMs, 200, 'the delay grows with every refusal')
  const thirdRefusal = limiter.check('10.0.0.9')
  assert.equal(thirdRefusal.delayMs, 400, 'and stops at the cap')

  assert.equal(limiter.check('10.0.0.10').allowed, true, 'one address cannot lock another out')

  // The window slides: once the oldest failure ages out, the address may try again.
  clock += 60_001
  assert.equal(limiter.check('10.0.0.9').allowed, true)

  // A successful sign-in clears the address.
  limiter.fail('10.0.0.11')
  limiter.fail('10.0.0.11')
  limiter.succeed('10.0.0.11')
  assert.equal(limiter.check('10.0.0.11').attempts, 0)

  // The table is bounded, so cycling addresses cannot grow it without limit.
  const bounded = createLimiter({ limit: 2, maxKeys: 4, now: () => clock })
  for (let index = 0; index < 20; index += 1) bounded.fail(`10.0.0.${String(index)}`)
  assert.equal(bounded.size(), 4)

  // Whole sign-ins through the listener: ten refusals, then a plain 429 with Retry-After.
  const { salt, hash } = await hashPassword('correct horse battery', CHEAP)
  const config = { ...defaultConfig(), enabled: true, username: 'mira', salt, passwordHash: hash, secret: newSecret() }
  const delays = []
  const refused = []
  const server = createRemoteServer({
    port: 8787,
    config: () => ({ config }),
    now: () => clock,
    sleep: async ms => {
      delays.push(ms)
    },
    scryptOptions: CHEAP,
    proxy: { handle: async () => {}, upgrade: async () => {}, dispose() {} },
    logger: { warn: message => refused.push(String(message)) },
    limiter: createLimiter({ now: () => clock }),
  })

  const attempt = async (password, address) => {
    const request = fakeRequest({
      method: 'POST',
      url: LOGIN_PATH,
      address,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: [Buffer.from(`username=mira&password=${encodeURIComponent(password)}`)],
    })
    const response = fakeResponse()
    const done = server.handleRequest(request, response)
    request.pump()
    await done
    return response
  }

  for (let index = 0; index < 10; index += 1) {
    const response = await attempt('wrong', '192.168.1.9')
    assert.equal(response.status, 401, 'a wrong password is a 401 that shows the page again')
    assert.match(response.text(), /Wrong username or password/u)
  }
  assert.equal(delays.length, 0, 'the allowed attempts are never delayed')

  const locked = await attempt('wrong', '192.168.1.9')
  assert.equal(locked.status, 429)
  assert.equal(locked.headers['retry-after'], '60')
  assert.match(locked.text(), /Too many sign-in attempts\. Try again in 60 seconds\./u)
  assert.equal(delays.at(-1), 250, 'the first refusal waits the base delay')

  const lockedRight = await attempt('correct horse battery', '192.168.1.9')
  assert.equal(lockedRight.status, 429, 'even the right password is refused while locked out')

  const other = await attempt('correct horse battery', '192.168.1.10')
  assert.equal(other.status, 303, 'another address signs in normally')
  assert.equal(other.headers.location, '/')
  const cookie = other.headers['set-cookie']
  assert.match(cookie, new RegExp(`^${COOKIE_NAME}=v1\\.`, 'u'))
  const issued = verifySession(config.secret, cookie.split(';', 1)[0].slice(COOKIE_NAME.length + 1), { now: clock })
  assert.equal(issued.username, 'mira')
  assert.equal(issued.expiresAt - issued.issuedAt, 7 * 86_400_000, 'the cookie lives the configured seven days')

  // Nothing sensitive is logged: no password, no hash, no cookie.
  const logged = refused.join('\n')
  assert.equal(logged.includes('correct horse battery'), false)
  assert.equal(logged.includes('wrong'), false)
  assert.equal(logged.includes(hash), false)

  // The body cap is enforced before a byte is buffered.
  const oversized = fakeRequest({
    method: 'POST',
    url: LOGIN_PATH,
    address: '192.168.1.20',
    headers: { 'content-length': '999999' },
    body: [Buffer.alloc(10)],
  })
  const oversizedResponse = fakeResponse()
  const oversizedDone = server.handleRequest(oversized, oversizedResponse)
  oversized.pump()
  await oversizedDone
  assert.equal(oversizedResponse.status, 413)
  assert.match(oversizedResponse.text(), /too large/u)

  const body = await (async () => {
    const request = fakeRequest({ headers: { 'content-length': '4' }, body: [Buffer.from('abcd')] })
    const pending = readLoginBody(request)
    request.pump()
    return pending
  })()
  assert.equal(body.ok, true)
  assert.equal(body.text, 'abcd')
  const halfAborted = fakeRequest({ headers: {}, body: [] })
  const halfDone = readLoginBody(halfAborted)
  halfAborted.emit('aborted')
  assert.deepEqual(await halfDone, { ok: false, reason: 'unreadable' })
}

// ---------------------------------------------------------------------------
// 5 â€” a login page with no external asset and a session that survives the trip
// ---------------------------------------------------------------------------
{
  const page = loginPageHtml({ error: 'Wrong username or password', username: 'mi<ra>' })
  assert.match(page, /^<!doctype html>/u)
  assert.match(page, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/u)
  assert.match(page, /<style>/u)
  assert.match(page, new RegExp(`<form method="post" action="${LOGIN_PATH}">`, 'u'))
  assert.equal((page.match(/<input /gu) ?? []).length, 2, 'one username field and one password field')
  assert.match(page, /<input id="username" name="username" value="mi&lt;ra&gt;"/u)
  assert.match(page, /<input id="password" name="password" type="password"/u)
  assert.match(page, /<button type="submit">Sign in<\/button>/u)
  assert.equal((page.match(/role="alert"/gu) ?? []).length, 1, 'exactly one plain error line')
  assert.equal(page.includes('<script'), false, 'no script on the sign-in page')
  assert.equal(/(?:href|src)="(?!#)/u.test(page), false, 'no external asset is referenced')
  assert.equal(loginPageHtml({}).includes('role="alert"'), false, 'no error line when nothing failed')

  const config = { ...defaultConfig(), enabled: true, username: 'mira', secret: newSecret() }
  const proxied = []
  const server = createRemoteServer({
    port: 8787,
    config: () => ({ config }),
    proxy: {
      handle: async req => {
        proxied.push(req.url)
      },
      upgrade: async () => {},
      dispose() {},
    },
    sleep: async () => {},
  })

  const unauthenticated = fakeRequest({ url: '/' })
  const loginPage = fakeResponse()
  await server.handleRequest(unauthenticated, loginPage)
  assert.equal(loginPage.status, 200)
  assert.match(loginPage.headers['content-type'], /text\/html/u)
  assert.equal(loginPage.headers['cache-control'], 'no-store')
  assert.match(loginPage.text(), /EDH Remote/u)

  const apiCall = fakeRequest({ url: '/api/edh.remote', headers: { accept: 'application/json' } })
  const apiAnswer = fakeResponse()
  await server.handleRequest(apiCall, apiAnswer)
  assert.equal(apiAnswer.status, 401, 'an /api request without a session is a plain 401')
  assert.equal(apiAnswer.headers.location, undefined)

  const deepLink = fakeRequest({ url: '/chat/abc', headers: { accept: 'text/html,application/xhtml+xml' } })
  const redirected = fakeResponse()
  await server.handleRequest(deepLink, redirected)
  assert.equal(redirected.status, 303, 'a navigation without a session lands on the login page')
  assert.equal(redirected.headers.location, '/')
  assert.equal(isNavigation({ accept: 'image/png' }), false)
  assert.equal(isNavigation({}), false)

  // With a valid session the request reaches the proxy, ahead of a hop-by-hop
  // rewrite that the proxy owns.
  const value = signSession(config.secret, { issuedAt: Date.now(), expiresAt: Date.now() + 60_000, username: 'mira' })
  const authenticated = fakeRequest({
    url: '/plugins/events?session=abc',
    headers: { accept: 'text/event-stream', cookie: `${COOKIE_NAME}=${value}` },
  })
  await server.handleRequest(authenticated, fakeResponse())
  assert.deepEqual(proxied, ['/plugins/events?session=abc'])

  const forged = fakeRequest({ url: '/api/edh.remote', headers: { cookie: `${COOKIE_NAME}=v1.abc.def` } })
  const forgedAnswer = fakeResponse()
  await server.handleRequest(forged, forgedAnswer)
  assert.equal(forgedAnswer.status, 401, 'a forged cookie is not a session')

  // Logout clears our cookie and sends the phone back to the login page.
  const logout = fakeRequest({ method: 'POST', url: LOGOUT_PATH, headers: { cookie: `${COOKIE_NAME}=${value}` } })
  const logoutAnswer = fakeResponse()
  await server.handleRequest(logout, logoutAnswer)
  assert.equal(logoutAnswer.status, 303)
  assert.equal(logoutAnswer.headers.location, '/')
  assert.equal(logoutAnswer.headers['set-cookie'], CLEAR_COOKIE)

  // A store with no signing secret refuses politely, rather than accepting a
  // sign-in whose cookie could never verify.
  const unset = createRemoteServer({
    port: 8787,
    config: () => ({ config: { ...defaultConfig(), enabled: true, username: 'mira' } }),
    proxy: { handle: async () => {}, upgrade: async () => {}, dispose() {} },
    sleep: async () => {},
  })
  const unsetRequest = fakeRequest({
    method: 'POST',
    url: LOGIN_PATH,
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: [Buffer.from('username=mira&password=whatever-it-is')],
  })
  const unsetAnswer = fakeResponse()
  const unsetDone = unset.handleRequest(unsetRequest, unsetAnswer)
  unsetRequest.pump()
  await unsetDone
  assert.equal(unsetAnswer.status, 401)
  assert.match(unsetAnswer.text(), /not set up yet/u)

  // A GET on the login path serves the page; a PUT is refused.
  const getLogin = fakeRequest({ url: LOGIN_PATH })
  const getLoginAnswer = fakeResponse()
  await server.handleRequest(getLogin, getLoginAnswer)
  assert.equal(getLoginAnswer.status, 200)
  const putLogin = fakeRequest({ method: 'PUT', url: LOGIN_PATH })
  const putAnswer = fakeResponse()
  await server.handleRequest(putLogin, putAnswer)
  assert.equal(putAnswer.status, 405)
  assert.equal(putAnswer.headers.allow, 'GET, POST')

  assert.deepEqual(clientAddress({ socket: { remoteAddress: '::ffff:10.1.2.3' } }), '10.1.2.3')
  assert.equal(clientAddress({}), 'unknown')
}

// ---------------------------------------------------------------------------
// 6 â€” the header contract: loopback Host and Origin, our credential, no phone cookie
// ---------------------------------------------------------------------------
{
  const phone = {
    host: '192.168.1.23:8787',
    origin: 'http://192.168.1.23:8787',
    cookie: 'edh-remote=v1.mine.sinature; other=1',
    connection: 'keep-alive',
    'transfer-encoding': 'chunked',
    'content-type': 'application/json',
    'content-length': '42',
    accept: 'application/json',
    'user-agent': 'Safari/605.1.15',
    'sec-fetch-site': 'same-origin',
    'x-custom': 'kept',
  }
  const rewritten = rewriteRequestHeaders(phone, {
    authority: '127.0.0.1:51234',
    origin: 'http://127.0.0.1:51234',
    cookie: 'dsh-auth-abc=v1.body.signature',
  })

  assert.equal(rewritten.host, '127.0.0.1:51234', 'Host names the loopback authority')
  assert.equal(rewritten.origin, 'http://127.0.0.1:51234', 'Origin names the same authority')
  assert.equal(rewritten.cookie, 'dsh-auth-abc=v1.body.signature', 'only the harness cookie is forwarded')
  assert.equal(rewritten.cookie.includes('v1.mine'), false, 'the phone cookie never travels')
  for (const key of ['content-type', 'content-length', 'accept', 'user-agent', 'sec-fetch-site', 'x-custom']) {
    assert.equal(rewritten[key], phone[key], `${key} rides through untouched`)
  }
  assert.equal('connection' in rewritten, false, 'hop-by-hop headers are dropped')
  assert.equal('transfer-encoding' in rewritten, false)

  // No Origin attached: none is invented, because the fence accepts an absent one.
  const anonymous = rewriteRequestHeaders({ host: '192.168.1.23:8787', accept: '*/*' }, { authority: '127.0.0.1:1' })
  assert.deepEqual(Object.keys(anonymous).sort(), ['accept', 'host'])
  assert.equal(anonymous.host, '127.0.0.1:1')
  assert.equal(anonymous.cookie, undefined, 'no credential is invented when the mint failed')

  const filtered = filterResponseHeaders({
    'content-type': 'application/json',
    'cache-control': 'no-store',
    'set-cookie': 'dsh-auth-abc=v1.body.signature; Path=/',
    connection: 'keep-alive',
    'transfer-encoding': 'chunked',
    'content-length': '12',
  })
  assert.deepEqual(Object.keys(filtered).sort(), ['cache-control', 'content-length', 'content-type'])
  assert.equal('set-cookie' in filtered, false, 'a harness cookie is never written back to the phone')
}

// ---------------------------------------------------------------------------
// 7 â€” path and query pass through, and an upload is piped rather than buffered
// ---------------------------------------------------------------------------
{
  const sink = { origin: 'http://127.0.0.1:51234', authority: '127.0.0.1:51234', hostname: '127.0.0.1', port: 51234, tls: false }
  const upstreams = []
  const proxy = createRemoteProxy({
    target: () => sink,
    mintCookie: () => 'dsh-auth-abc=v1.body.signature',
    createRequest: options => {
      const created = fakeUpstream()
      created.options = options
      upstreams.push(created)
      return created
    },
  })

  // A streaming upload: many chunks, never read into one buffer.
  const chunks = Array.from({ length: 64 }, (_, index) => Buffer.alloc(64 * 1024, index))
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const upload = fakeRequest({
    method: 'POST',
    url: '/api/session/uploadFileBinary?session=abc&path=a%2Fb.png',
    headers: { host: '192.168.1.23:8787', origin: 'http://192.168.1.23:8787', 'content-type': 'application/octet-stream', cookie: 'edh-remote=v1.mine.signature' },
    body: chunks,
  })
  const uploadResponse = fakeResponse()
  await proxy.handle(upload, uploadResponse)

  const uploadUpstream = upstreams[0]
  assert.equal(uploadUpstream.options.path, '/api/session/uploadFileBinary?session=abc&path=a%2Fb.png', 'the path and query pass through byte for byte')
  assert.equal(uploadUpstream.options.method, 'POST')
  assert.equal(uploadUpstream.options.host, '127.0.0.1')
  assert.equal(uploadUpstream.options.port, 51234)
  assert.equal(uploadUpstream.options.headers.host, sink.authority)
  assert.equal(uploadUpstream.options.headers.origin, sink.origin)
  assert.equal(uploadUpstream.options.headers.cookie, 'dsh-auth-abc=v1.body.signature')
  assert.equal(uploadUpstream.options.headers['content-type'], 'application/octet-stream')
  assert.equal(upload.dataListeners, 0, 'the proxy never subscribes to the body, so it cannot buffer it')
  assert.equal(upload.pipedTo.length, 1, 'the body is piped straight to the upstream request')
  assert.equal(uploadUpstream.writes.length, chunks.length, 'every chunk is forwarded as it arrives')
  assert.equal(uploadUpstream.bytes().length, total, 'not one byte is dropped or held back')
  assert.equal(uploadUpstream.bytes().equals(Buffer.concat(chunks)), true)
  assert.equal(uploadUpstream.timeout, 0, 'no idle timeout is installed on the upstream')

  // The response is streamed back, and its set-cookie is dropped on the way.
  const upstreamRes = uploadUpstream.respond({
    statusCode: 200,
    headers: { 'content-type': 'application/json', 'set-cookie': 'dsh-auth-abc=again' },
    chunks: [Buffer.from('{"ok":true}')],
  })
  assert.equal(uploadResponse.status, 200)
  assert.equal(uploadResponse.text(), '{"ok":true}')
  assert.equal('set-cookie' in uploadResponse.headers, false)
  upstreamRes.emit('error')

  // A long-lived SSE GET is forwarded with the same contract and no timeout.
  const events = fakeRequest({ url: '/plugins/events', headers: { accept: 'text/event-stream', host: '192.168.1.23:8787' } })
  const eventsResponse = fakeResponse()
  await proxy.handle(events, eventsResponse)
  assert.equal(upstreams[1].options.path, '/plugins/events')
  assert.equal(upstreams[1].timeout, 0)
  upstreams[1].respond({ statusCode: 200, headers: { 'content-type': 'text/event-stream' }, chunks: [Buffer.from('data: hi\n\n')] })
  assert.equal(eventsResponse.text(), 'data: hi\n\n')

  // An unreachable GUI is a 502 with a sentence, never a throw.
  const broken = createRemoteProxy({
    target: () => sink,
    mintCookie: () => undefined,
    createRequest: () => {
      throw new Error('connect ECONNREFUSED')
    },
  })
  const brokenResponse = fakeResponse()
  await broken.handle(fakeRequest({ url: '/' }), brokenResponse)
  assert.equal(brokenResponse.status, 502)
  assert.match(brokenResponse.text(), /ECONNREFUSED/u)

  // No loopback listener at all is a 503; a mint failure only costs the cookie.
  const down = createRemoteProxy({ target: () => undefined, mintCookie: () => undefined })
  const downResponse = fakeResponse()
  await down.handle(fakeRequest({ url: '/' }), downResponse)
  assert.equal(downResponse.status, 503)

  // Disposal kills the connections this proxy opened, and nothing else.
  proxy.dispose()
  assert.equal(upstreams.every(upstream => upstream.destroyed), true)
  assert.equal(proxy.stats.killed >= 2, true)
}

// ---------------------------------------------------------------------------
// 8 â€” the WebSocket handshake this proxy writes, then pipes
// ---------------------------------------------------------------------------
{
  const text = upgradeRequestText({
    path: MUX_PATH,
    search: '?client=abc',
    authority: '127.0.0.1:51234',
    origin: 'http://127.0.0.1:51234',
    cookie: 'dsh-auth-abc=v1.body.signature',
    headers: {
      host: '192.168.1.23:8787',
      origin: 'http://192.168.1.23:8787',
      cookie: 'edh-remote=v1.mine.signature',
      connection: 'Upgrade',
      upgrade: 'websocket',
      'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'sec-websocket-version': '13',
      'sec-websocket-protocol': 'chat',
      'sec-websocket-extensions': 'permessage-deflate',
      'user-agent': 'Safari/605.1.15',
    },
  })
  const lines = text.split('\r\n')
  assert.equal(lines[0], `GET ${MUX_PATH}?client=abc HTTP/1.1`, 'one GET on the mux path with its query')
  assert.equal(lines.at(-1), '', 'the request ends with the blank line')
  assert.equal(lines.at(-2), '', 'exactly one blank line')
  assert.equal(text.endsWith('\r\n\r\n'), true)
  assert.equal(lines.includes('Host: 127.0.0.1:51234'), true, 'Host is rewritten to the loopback authority')
  assert.equal(lines.includes('Origin: http://127.0.0.1:51234'), true, 'Origin is rewritten with it')
  assert.equal(lines.includes('Connection: Upgrade'), true)
  assert.equal(lines.includes('Upgrade: websocket'), true)
  assert.equal(lines.includes('Cookie: dsh-auth-abc=v1.body.signature'), true, 'the harness cookie rides the handshake')
  assert.equal(lines.includes('sec-websocket-key: dGhlIHNhbXBsZSBub25jZQ=='), true)
  assert.equal(lines.includes('sec-websocket-version: 13'), true)
  assert.equal(lines.includes('sec-websocket-protocol: chat'), true)
  assert.equal(lines.includes('sec-websocket-extensions: permessage-deflate'), true)
  assert.equal(text.includes('edh-remote=v1.mine'), false, 'the phone cookie is not forwarded')
  assert.equal(text.includes('192.168.1.23'), false, 'no LAN authority reaches the harness')
  assert.equal(text.includes('user-agent'), false, 'only the handshake headers are carried')
  assert.equal((text.match(/HTTP\/1\.1/gu) ?? []).length, 1, 'one request line only')

  // The proxy writes exactly that text, after connecting, and pipes both ways.
  const sink = { origin: 'http://127.0.0.1:51234', authority: '127.0.0.1:51234', hostname: '127.0.0.1', port: 51234, tls: false }
  const sockets = []
  const proxy = createRemoteProxy({
    target: () => sink,
    mintCookie: () => 'dsh-auth-abc=v1.body.signature',
    createUpstream: (port, host) => {
      const listeners = new Map()
      const socket = {
        port,
        host,
        writes: [],
        destroyed: false,
        pipedTo: [],
        once(event, fn) {
          listeners.set(event, fn)
          return socket
        },
        on() {
          return socket
        },
        emit(event, ...args) {
          listeners.get(event)?.(...args)
        },
        write(chunk) {
          socket.writes.push(String(chunk))
        },
        pipe(destination) {
          socket.pipedTo.push(destination)
          return destination
        },
        destroy() {
          socket.destroyed = true
        },
      }
      sockets.push(socket)
      return socket
    },
  })

  const head = Buffer.from('early bytes')
  const clientSocket = {
    ended: undefined,
    writes: [],
    pipedTo: [],
    once(event, fn) {
      listenersOf(clientSocket).set(event, fn)
      return clientSocket
    },
    on() {
      return clientSocket
    },
    end(text) {
      clientSocket.ended = text
    },
    write(chunk) {
      clientSocket.writes.push(String(chunk))
    },
    pipe(destination) {
      clientSocket.pipedTo.push(destination)
      return destination
    },
    destroy() {
      clientSocket.destroyed = true
    },
  }

  const upgrade = proxy.upgrade(
    fakeRequest({ url: `${MUX_PATH}?client=abc`, headers: { host: '192.168.1.23:8787', 'sec-websocket-key': 'abc', 'sec-websocket-version': '13' } }),
    clientSocket,
    head,
  )
  await upgrade
  assert.equal(clientSocket.ended, undefined, 'the socket is not closed while the upstream is pending')
  assert.equal(sockets[0].port, 51234)
  assert.equal(sockets[0].host, '127.0.0.1')

  sockets[0].emit('connect')
  const handshake = sockets[0].writes.join('')
  assert.match(handshake, new RegExp(`^GET ${MUX_PATH}\\?client=abc HTTP/1\\.1\\r\\n`, 'u'))
  assert.match(handshake, /\r\nHost: 127\.0\.0\.1:51234\r\n/u)
  assert.match(handshake, /\r\nCookie: dsh-auth-abc=v1\.body\.signature\r\n/u)
  assert.match(handshake, /\r\nsec-websocket-key: abc\r\n/u)
  assert.equal(sockets[0].writes[0].endsWith('\r\n\r\n'), true, 'the handshake ends with the blank line')
  assert.equal(sockets[0].writes[1], 'early bytes', 'the head bytes the client already sent are forwarded first')
  assert.deepEqual(sockets[0].pipedTo, [clientSocket], 'upstream is piped back to the client socket')
  assert.deepEqual(clientSocket.pipedTo, [sockets[0]], 'and the client socket into the upstream')

  proxy.dispose()
  assert.equal(clientSocket.destroyed, true)
  assert.equal(sockets[0].destroyed, true)
}

/** One lazily-created listener map per fake socket. */
function listenersOf(target) {
  target.__listeners ??= new Map()
  return target.__listeners
}

// ---------------------------------------------------------------------------
// 9 â€” the seam calls: token, captured cookie, and the loopback target
// ---------------------------------------------------------------------------
{
  assert.deepEqual(resolveTarget(fakeWebServer()), {
    origin: 'http://127.0.0.1:51234',
    authority: '127.0.0.1:51234',
    hostname: '127.0.0.1',
    port: 51234,
    tls: false,
  })
  assert.deepEqual(resolveTarget(fakeWebServer({ bound: false, host: '127.0.0.1', port: 6000 })), {
    origin: 'http://127.0.0.1:6000',
    authority: '127.0.0.1:6000',
    hostname: '127.0.0.1',
    port: 6000,
    tls: false,
  }, 'a composition without getOrigin falls back to host and port')
  assert.equal(resolveTarget(fakeWebServer({ bound: false, port: null })), undefined, 'an unbound listener has no target')
  assert.equal(resolveTarget(undefined), undefined)

  assert.equal(launchTokenOf(base => `${base}?token=abc123`, 'http://127.0.0.1:51234/'), 'abc123')
  assert.equal(launchTokenOf(base => base, 'http://127.0.0.1:51234/'), undefined)
  assert.equal(launchTokenOf(undefined, 'http://127.0.0.1:51234/'), undefined)

  // A minimal stand-in for the harness: it reads only method, url and host, and
  // answers through writeHead/end, which is exactly why the capture works.
  const seen = []
  const authorizeIndex = (request, response) => {
    seen.push({ method: request.method, url: request.url, host: request.headers.host, cookies: request.headers.cookie })
    const token = new URL(request.url, 'http://dsh.invalid').searchParams.get('token')
    if (request.method !== 'GET' || token !== 'launch-token' || typeof request.headers.host !== 'string') {
      response.writeHead(401, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('unauthorized')
      return false
    }
    const name = `dsh-auth-${Buffer.from(request.headers.host).toString('base64url')}`
    response.writeHead(303, {
      'cache-control': 'no-store',
      location: './',
      'set-cookie': `${name}=v1.body.signature; Max-Age=2592000; Path=/; Expires=Thu, 01 Jan 2099 00:00:00 GMT; HttpOnly; SameSite=Strict`,
    })
    response.end()
    return false
  }

  const captured = captureIndexCookie(authorizeIndex, { token: 'launch-token', authority: '127.0.0.1:51234' })
  assert.deepEqual(seen[0], { method: 'GET', url: '/?token=launch-token', host: '127.0.0.1:51234', cookies: undefined })
  assert.equal(captured.name.startsWith('dsh-auth-'), true)
  assert.equal(captured.value, 'v1.body.signature')
  assert.equal(captured.cookie, `${captured.name}=v1.body.signature`)
  assert.equal(captured.maxAgeSeconds, 2_592_000, 'the lifetime is read off the header, so the cache can refresh in time')

  assert.equal(captureIndexCookie(authorizeIndex, { token: 'wrong', authority: '127.0.0.1:51234' }), undefined, 'a refused mint captures nothing')
  assert.equal(captureIndexCookie(undefined, { token: 'launch-token', authority: '127.0.0.1:51234' }), undefined)
  const throwing = () => {
    throw new Error('no')
  }
  assert.equal(captureIndexCookie(throwing, { token: 'launch-token', authority: '127.0.0.1:51234' }), undefined)
}

// ---------------------------------------------------------------------------
// 10 â€” the control: settings, secrets and the listener's life
// ---------------------------------------------------------------------------
{
  const storePath = makeStorePath()
  const opened = []
  let clock = 1_700_000_000_000
  const control = createRemoteControl({
    storePath,
    now: () => clock,
    sleep: async () => {},
    interfaces: () => ({ eth0: [{ address: '192.168.1.23', family: 'IPv4', internal: false }] }),
    scryptOptions: CHEAP,
    connection: undefined,
    webServer: undefined,
    createServer: handler => {
      const server = createFakeServer(handler)
      opened.push(server)
      return server
    },
  })

  const initial = control.view()
  assert.equal(initial.available, false, 'without a webserver the feature reports itself unavailable')
  assert.equal(initial.listening, false)
  assert.equal(initial.enabled, false)
  assert.deepEqual(initial.addresses, ['http://192.168.1.23:8787'])
  assert.equal(initial.hasPassword, false)
  assert.equal(initial.warning, LAN_WARNING)

  assert.equal((await control.set({ action: 'set', enabled: true })).reason, 'bad-state', 'it cannot be switched on without credentials')
  assert.equal((await control.set({ action: 'set', port: 0 })).reason, 'bad-port')
  assert.equal((await control.set({ action: 'set', port: 'nope' })).reason, 'bad-port')
  assert.equal((await control.set({ action: 'set', username: '   ' })).reason, 'bad-username')
  assert.equal((await control.set({ action: 'set', password: 'short' })).reason, 'bad-password')
  assert.equal((await control.set({ action: 'set', enabled: 'yes' })).reason, 'bad-input')
  assert.equal((await control.set({ action: 'set', sessionDays: 400 })).reason, 'bad-input')
  assert.equal((await control.set(null)).reason, 'bad-input')

  const credentials = await control.set({ action: 'set', username: ' mira ', password: 'correct horse battery' })
  assert.equal(credentials.ok, true)
  const stored = createFileStore(storePath).read().config
  assert.equal(stored.username, 'mira', 'the username is trimmed')
  assert.notEqual(stored.passwordHash, '')
  assert.notEqual(stored.salt, '')
  assert.notEqual(stored.secret, '')
  assert.equal(stored.enabled, false, 'a password alone does not open the port')

  // The view still cannot see any of it.
  const afterSet = control.view()
  assert.equal(afterSet.hasPassword, true)
  assert.equal(afterSet.username, 'mira')
  assert.equal(JSON.stringify(afterSet).includes(stored.passwordHash), false)
  assert.equal(JSON.stringify(afterSet).includes(stored.secret), false)

  // Rotating the secret invalidates issued cookies; logout-all also clears the list.
  const before = stored.secret
  const rotated = await control.regenerateSecret()
  assert.equal(rotated.ok, true)
  const afterRotate = createFileStore(storePath).read().config.secret
  assert.notEqual(afterRotate, before)
  const loggedOut = await control.logoutAll()
  assert.equal(loggedOut.ok, true)
  assert.deepEqual(loggedOut.sessions, 0)
  assert.deepEqual(createFileStore(storePath).read().config.sessions, [])

  // The listener starts only when enabled and both services are there.
  const webServer = fakeWebServer({ origin: 'http://127.0.0.1:51234' })
  const connection = { authenticatedUrl: base => `${base}?token=tok`, authorizeIndex: () => false }
  await control.set({ action: 'set', enabled: true })
  await control.bind({ connection, webServer })
  assert.equal(opened.length, 1, 'one listener is created once enabled')
  assert.deepEqual(opened[0].bound, { port: 8787, host: BIND_ADDRESS })
  assert.equal(control.view().listening, true)
  assert.equal(control.view().available, true)

  // A port change re-binds; a second bind at the same port does not churn.
  await control.set({ action: 'set', port: 9001 })
  assert.equal(opened.length, 2)
  assert.equal(opened[0].closed, true)
  assert.deepEqual(opened[1].bound, { port: 9001, host: BIND_ADDRESS })
  await control.bind({ connection, webServer })
  assert.equal(opened.length, 2, 'an unchanged configuration does not restart the listener')

  // Switching it off stops the listener without losing the settings.
  await control.set({ action: 'set', enabled: false })
  assert.equal(opened[1].closed, true)
  assert.equal(control.view().listening, false)
  assert.equal(control.view().hasPassword, true)

  await control.set({ action: 'set', enabled: true })
  assert.equal(opened.length, 3)
  await control.dispose()
  assert.equal(opened[2].closed, true, 'disposal stops the listener')
  assert.equal(opened[2].allClosed, true, 'and kills the connections it owned')
  assert.equal(control.view().listening, false)
  await control.dispose()

  // A mint failure is reported, never thrown.
  const brokenStore = makeStorePath()
  const broken = createRemoteControl({
    storePath: brokenStore,
    interfaces: () => ({}),
    scryptOptions: CHEAP,
    createServer: handler => createFakeServer(handler),
  })
  await broken.set({ action: 'set', username: 'mira', password: 'correct horse battery' })
  await broken.set({ action: 'set', enabled: true })
  await broken.bind({
    connection: { authenticatedUrl: () => 'http://127.0.0.1:51234/no-token', authorizeIndex: () => false },
    webServer: fakeWebServer(),
  })
  assert.match(broken.view().lastError, /cannot sign in to the local GUI/u)
  await broken.dispose()
}

// ---------------------------------------------------------------------------
// 11 â€” the route contract: every action, every rejection, never a 500
// ---------------------------------------------------------------------------
{
  const storePath = makeStorePath()
  const control = createRemoteControl({ storePath, interfaces: () => ({}), scryptOptions: CHEAP, sleep: async () => {} })
  const get = async () => {
    const response = await remoteResponse(new Request('http://127.0.0.1/api/edh.remote'), { remote: control })
    return { status: response.status, body: await response.json() }
  }
  const post = async body => {
    const response = await remoteResponse(
      new Request('http://127.0.0.1/api/edh.remote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { remote: control },
    )
    return { status: response.status, body: await response.json() }
  }

  assert.equal(remoteMethod({ method: 'GET' }), 'status')
  assert.equal(remoteMethod({ method: 'POST' }), 'action')
  assert.equal(remoteMethod({ method: 'PUT' }), undefined)

  const status = await get()
  assert.equal(status.status, 200)
  assert.equal(status.body.ok, true)
  assert.equal(status.body.port, DEFAULT_PORT)
  assert.equal(status.body.hasPassword, false)
  assert.equal('secret' in status.body, false)

  const unavailable = await remoteResponse(new Request('http://127.0.0.1/api/edh.remote'), {})
  assert.equal(unavailable.status, 200)
  const unavailableBody = await unavailable.json()
  assert.equal(unavailableBody.available, false)
  assert.equal(unavailableBody.reason, 'unavailable')
  assert.match(unavailableBody.message, /not available/u)

  const noAction = await post({})
  assert.equal(noAction.status, 400)
  assert.equal(noAction.body.reason, 'bad-input')
  assert.match(noAction.body.message, /"action"/u)

  const unknown = await post({ action: 'wat' })
  assert.equal(unknown.status, 400)
  assert.equal(unknown.body.reason, 'unknown-action')
  assert.match(unknown.body.message, /wat/u)

  const badPort = await post({ action: 'set', port: 70000 })
  assert.equal(badPort.status, 400)
  assert.equal(badPort.body.reason, 'bad-port')
  assert.equal(badPort.body.report.reason, 'bad-port', 'the report carries the same sentence as the answer')

  const badPassword = await post({ action: 'set', password: 'short' })
  assert.equal(badPassword.status, 400)
  assert.equal(badPassword.body.reason, 'bad-password')

  const set = await post({ action: 'set', username: 'mira', password: 'correct horse battery', port: 9002 })
  assert.equal(set.status, 200)
  assert.equal(set.body.ok, true)
  assert.equal(set.body.username, 'mira')
  assert.equal(set.body.port, 9002)
  assert.equal(set.body.hasPassword, true)
  assert.equal(JSON.stringify(set.body).includes('correct horse battery'), false)
  assert.equal(JSON.stringify(set.body).includes(createFileStore(storePath).read().config.passwordHash), false)

  const enabled = await post({ action: 'set', enabled: true })
  assert.equal(enabled.status, 200)
  assert.equal(enabled.body.enabled, true)

  const logout = await post({ action: 'logout-all' })
  assert.equal(logout.status, 200)
  assert.equal(logout.body.ok, true)
  assert.equal(logout.body.sessions, 0)

  const rotated = await post({ action: 'regenerate-secret' })
  assert.equal(rotated.status, 200)
  assert.equal(rotated.body.ok, true)

  const wrongMethod = await remoteResponse(new Request('http://127.0.0.1/api/edh.remote', { method: 'PUT' }), { remote: control })
  assert.equal(wrongMethod.status, 405)
  const wrongMethodBody = await wrongMethod.json()
  assert.equal(wrongMethodBody.reason, 'unsupported-method')

  // A control whose action throws is still a JSON answer with a 200, never a 500.
  const exploding = {
    view: () => ({ ok: true, enabled: false, port: DEFAULT_PORT }),
    set: async () => {
      throw new Error('boom')
    },
    logoutAll: async () => ({ ok: true }),
    regenerateSecret: async () => ({ ok: true }),
  }
  const exploded = await remoteResponse(
    new Request('http://127.0.0.1/api/edh.remote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'set', enabled: true }),
    }),
    { remote: exploding },
  )
  assert.equal(exploded.status, 200, 'an internal failure is a report, not a 500')
  const explodedBody = await exploded.json()
  assert.equal(explodedBody.ok, false)
  assert.equal(explodedBody.reason, 'error')
  assert.match(explodedBody.message, /boom/u)

  // A body that is not JSON is the empty action, which is a 400 with a sentence.
  const notJson = await remoteResponse(
    new Request('http://127.0.0.1/api/edh.remote', { method: 'POST', headers: { 'content-type': 'application/json' }, body: 'not json' }),
    { remote: control },
  )
  assert.equal(notJson.status, 400)

  await control.dispose()
}

// ---------------------------------------------------------------------------
// 12 â€” the row: route and listener inside effects, and disposal unloads both
// ---------------------------------------------------------------------------
{
  const storePath = makeStorePath()
  const { salt, hash } = await hashPassword('correct horse battery', CHEAP)
  const seeded = { ...defaultConfig(), enabled: true, username: 'mira', salt, passwordHash: hash, secret: newSecret() }
  assert.deepEqual(createFileStore(storePath).write(seeded), { ok: true })

  const routes = []
  const disposers = []
  const warnings = []
  const servers = []
  const connection = {
    fetch: {
      register(route) {
        routes.push(route)
        return () => {
          const at = routes.indexOf(route)
          if (at !== -1) routes.splice(at, 1)
        }
      },
    },
  }
  const webServer = fakeWebServer()
  const ctx = createScope({ connection, webServer }, disposers)
  ctx.logger = { warn: (...args) => warnings.push(args.map(String).join(' ')) }

  apply(ctx, {
    storePath,
    interfaces: () => ({ eth0: [{ address: '192.168.1.23', family: 'IPv4', internal: false }] }),
    scryptOptions: CHEAP,
    sleep: async () => {},
    createServer: handler => {
      const server = createFakeServer(handler)
      servers.push(server)
      return server
    },
  })
  await settle()

  assert.equal(routes.length, 1, 'the status route is registered')
  assert.equal(routes[0].path, REMOTE_PATH)
  assert.deepEqual(routes[0].methods, ['GET', 'POST'])
  assert.equal(routes[0].requestBody, 'buffered')
  assert.equal(servers.length, 1, 'the LAN listener is created once the webserver mounts')
  assert.deepEqual(servers[0].bound, { port: DEFAULT_PORT, host: BIND_ADDRESS })
  assert.equal(typeof servers[0].on === 'function', true)
  assert.equal(warnings.length, 0, `nothing warned: ${warnings.join(' | ')}`)

  const answer = await routes[0].fetch(new Request('http://127.0.0.1/api/edh.remote'))
  assert.equal(answer.status, 200)
  const view = await answer.json()
  assert.equal(view.ok, true)
  assert.equal(view.available, true)
  assert.equal(view.listening, true)
  assert.equal(view.enabled, true)
  assert.equal(view.hasPassword, true)
  assert.deepEqual(view.addresses, ['http://192.168.1.23:8787'])

  // Disposal unloads both: the route goes and the listener stops with its connections.
  for (const dispose of [...disposers].reverse()) await dispose()
  await settle()
  assert.equal(routes.length, 0, 'disposal unregisters the route')
  assert.equal(servers[0].closed, true, 'disposal stops the listener')
  assert.equal(servers[0].allClosed, true)

  // A composition without a webServer still answers the route, reporting itself unavailable.
  const onlyConnection = createScope({ connection }, disposers)
  onlyConnection.logger = { warn: () => {} }
  const bare = []
  apply(onlyConnection, { storePath, interfaces: () => ({}), scryptOptions: CHEAP, sleep: async () => {} })
  await settle()
  assert.equal(routes.length, 1, 'the route exists with no listener at all')
  const bareView = await (await routes[0].fetch(new Request('http://127.0.0.1/api/edh.remote'))).json()
  assert.equal(bareView.available, false)
  assert.equal(bareView.listening, false)
  assert.equal(bare.length, 0)
  for (const dispose of [...disposers].reverse()) await dispose()

  // Neither service present: `apply` must not throw, and must not invent a route.
  const empty = createScope({}, [])
  empty.logger = { warn: () => {} }
  apply(empty, { storePath })
  await settle()
  assert.equal(routes.length, 0)
}

// ---------------------------------------------------------------------------
// 13 — transport compression: what is negotiated, and what is refused outright
// ---------------------------------------------------------------------------
{
  assert.deepEqual([...ENCODINGS], ['br', 'gzip'], 'brotli is offered first')

  // Negotiation, including q-values, because `br;q=0, gzip` really means gzip.
  assert.equal(chooseEncoding('gzip, deflate, br'), 'br', 'br wins when both are offered')
  assert.equal(chooseEncoding('br, gzip'), 'br')
  assert.equal(chooseEncoding('gzip, deflate'), 'gzip', 'gzip when br is absent')
  assert.equal(chooseEncoding('gzip'), 'gzip')
  assert.equal(chooseEncoding('x-gzip'), 'gzip', 'the legacy spelling counts')
  assert.equal(chooseEncoding('br;q=0, gzip'), 'gzip', 'a refused br falls back to gzip')
  assert.equal(chooseEncoding('br;q=0.5, gzip;q=1'), 'br', 'a small q still means accepted')
  assert.equal(chooseEncoding('identity'), undefined, 'a client that refuses every codec gets none')
  assert.equal(chooseEncoding('identity;q=1, gzip;q=0'), undefined)
  assert.equal(chooseEncoding(''), undefined)
  assert.equal(chooseEncoding(undefined), undefined, 'no header, no compression')
  assert.equal(chooseEncoding('*'), 'gzip', 'a wildcard asks for anything; gzip is the safe anything')
  assert.equal(chooseEncoding('GZIP , Br'), 'br', 'case and spacing do not matter')
  assert.equal(chooseEncoding('deflate'), undefined, 'deflate is not a codec this proxy emits')
  assert.equal(chooseEncoding('br;q=zero'), 'br', 'an unreadable q is ignored — the codec was still offered')

  // Media types: an allowlist, so the event stream cannot slip through.
  for (const type of [
    'text/html',
    'text/html; charset=utf-8',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json; charset=utf-8',
    'application/manifest+json',
    'image/svg+xml',
    'text/plain',
    'application/xml',
  ]) {
    assert.equal(isCompressibleType(type), true, `${type} is worth encoding`)
  }
  for (const type of [
    'text/event-stream',
    'text/event-stream; charset=utf-8',
    'image/png',
    'image/jpeg',
    'font/woff2',
    'application/octet-stream',
    'application/wasm',
    'multipart/form-data',
    '',
    undefined,
  ]) {
    assert.equal(isCompressibleType(type), false, `${JSON.stringify(type)} goes out exactly as it came`)
  }
  assert.equal(COMPRESSIBLE_TYPES.includes('text/event-stream'), false, 'the event stream is not on the allowlist at all')

  // The skip list, one rule at a time.
  const ok = {
    method: 'GET',
    status: 200,
    requestHeaders: { 'accept-encoding': 'br' },
    responseHeaders: { 'content-type': 'application/json', 'content-length': '2048' },
  }
  assert.equal(shouldCompress(ok), 'br', 'a JSON answer over br')
  assert.equal(shouldCompress({ ...ok, method: 'HEAD' }), undefined, 'HEAD has no body to encode')
  assert.equal(shouldCompress({ ...ok, status: 204 }), undefined, '204 must arrive byte-empty')
  assert.equal(shouldCompress({ ...ok, status: 205 }), undefined)
  assert.equal(shouldCompress({ ...ok, status: 304 }), undefined, '304 must not be re-encoded')
  assert.equal(shouldCompress({ ...ok, status: 302 }), undefined, 'a redirect is not a document')
  assert.equal(shouldCompress({ ...ok, status: 500 }), undefined, 'only 2xx')
  assert.equal(
    shouldCompress({ ...ok, responseHeaders: { ...ok.responseHeaders, 'content-encoding': 'gzip' } }),
    undefined,
    'an already-encoded body is never encoded twice',
  )
  assert.equal(
    shouldCompress({ ...ok, responseHeaders: { ...ok.responseHeaders, 'cache-control': 'public, no-transform' } }),
    undefined,
    'no-transform is the origin saying so',
  )
  assert.equal(
    shouldCompress({ ...ok, responseHeaders: { ...ok.responseHeaders, 'content-length': '0' } }),
    undefined,
    'an empty body is not given a header it cannot justify',
  )
  assert.equal(
    shouldCompress({ ...ok, requestHeaders: { 'accept-encoding': 'br', range: 'bytes=0-99' } }),
    undefined,
    'a range request keeps its byte offsets',
  )
  assert.equal(shouldCompress({ ...ok, requestHeaders: {} }), undefined, 'no accept-encoding, no compression')
  assert.equal(
    shouldCompress({ ...ok, responseHeaders: { 'content-type': 'text/event-stream' } }),
    undefined,
    'never the plugin event stream',
  )
  assert.equal(
    shouldCompress({ ...ok, status: 200, responseHeaders: { 'Content-Type': 'text/CSS', 'Accept-Encoding': 'gzip' } }),
    'br',
    'headers are read case-insensitively',
  )
  assert.equal(shouldCompress({ ...ok, status: undefined }), undefined, 'a status it cannot read is not compressed')

  // The headers an encoded body carries.
  const encoded = encodedHeaders(
    {
      'content-type': 'application/json',
      'content-length': '2048',
      'content-md5': 'abc',
      digest: 'sha-256=xyz',
      'cache-control': 'no-store',
    },
    'br',
  )
  assert.equal(encoded['content-encoding'], 'br')
  assert.equal('content-length' in encoded, false, 'content-length is dropped when the body changed')
  assert.equal('content-md5' in encoded, false, 'an integrity header for the old bytes is dropped too')
  assert.equal('digest' in encoded, false)
  assert.equal(encoded['content-type'], 'application/json')
  assert.equal(encoded['cache-control'], 'no-store')
  assert.equal(encoded.vary, 'accept-encoding', 'vary is honest about what the answer now depends on')
  assert.equal(encodedHeaders({ vary: 'origin' }, 'gzip').vary, 'origin, accept-encoding', 'an existing vary is extended')
  assert.equal(
    encodedHeaders({ vary: 'origin, Accept-Encoding' }, 'gzip').vary,
    'origin, Accept-Encoding',
    'and never duplicated',
  )
  assert.equal(encodedHeaders({}, 'gzip').vary, 'accept-encoding')

  // Both codecs exist; an unknown one degrades to "no transform".
  const brotli = createCompressor('br')
  const gzip = createCompressor('gzip')
  assert.equal(typeof brotli.write, 'function')
  assert.equal(typeof gzip.write, 'function')
  assert.notEqual(brotli, gzip)
  assert.equal(createCompressor('deflate'), undefined)
  assert.equal(createCompressor(undefined), undefined)
  brotli.destroy()
  gzip.destroy()
}

// ---------------------------------------------------------------------------
// 14 — the transform streams: headers with the first byte, never a whole body held
// ---------------------------------------------------------------------------
{
  /** One upstream response body the test pushes into, with the plumbing zlib needs. */
  const fakeBodySource = () => {
    const listeners = new Map()
    const source = {
      pauses: 0,
      resumes: 0,
      pipeCalls: 0,
      on(event, fn) {
        const list = listeners.get(event) ?? []
        list.push(fn)
        listeners.set(event, list)
        return source
      },
      once(event, fn) {
        return source.on(event, fn)
      },
      emit(event, ...args) {
        for (const fn of [...(listeners.get(event) ?? [])]) fn(...args)
      },
      pause() {
        source.pauses += 1
      },
      resume() {
        source.resumes += 1
      },
      pipe(destination) {
        source.pipeCalls += 1
        return destination
      },
    }
    return source
  }

  // gzip: the header waits for the first byte, and the body streams.
  const text = `${'abcdefgh'.repeat(4096)}tail`
  const source = fakeBodySource()
  const sink = fakeResponse()
  streamBody({
    source,
    sink,
    status: 200,
    headers: { 'content-type': 'application/json', 'content-length': String(text.length) },
    encoding: 'gzip',
  })
  assert.equal(sink.headersSent, false, 'no header before the first byte of body exists')
  assert.equal(sink.chunkCount(), 0)
  assert.equal(source.pipeCalls, 0, 'the compression path drives the source itself, never pipe')

  source.emit('data', Buffer.from(text.slice(0, 32_768)))
  await until(() => sink.chunkCount() > 0, 'the first compressed chunk')
  assert.equal(sink.headersSent, true, 'the header goes out with the first chunk, not with the last')
  assert.equal(sink.headers['content-encoding'], 'gzip')
  assert.equal('content-length' in sink.headers, false)
  assert.equal(sink.headers.vary, 'accept-encoding')
  assert.equal(sink.writableEnded, false, 'and the response is still open: nothing waits for the end')

  source.emit('data', Buffer.from(text.slice(32_768)))
  source.emit('end')
  await until(() => sink.writableEnded === true, 'the end of the encoded response')
  assert.equal(gunzipSync(sink.raw()).toString('utf8'), text, 'the body decodes to exactly what the origin sent')

  // brotli: the same contract, the other codec.
  {
    const brSource = fakeBodySource()
    const brSink = fakeResponse()
    streamBody({
      source: brSource,
      sink: brSink,
      status: 200,
      headers: { 'content-type': 'text/html', 'content-length': '40000' },
      encoding: 'br',
    })
    brSource.emit('data', Buffer.alloc(40_000, 0x41))
    brSource.emit('end')
    await until(() => brSink.writableEnded === true, 'the end of the brotli response')
    assert.equal(brSink.headers['content-encoding'], 'br')
    assert.equal(brotliDecompressSync(brSink.raw()).toString('utf8'), 'A'.repeat(40_000))
    assert.equal(brSink.chunkCount() >= 1, true)
  }

  // An empty body: a codec always emits its own frame header, and that must not
  // reach the client while the headers say the body is not encoded.
  {
    const emptySource = fakeBodySource()
    const emptySink = fakeResponse()
    streamBody({
      source: emptySource,
      sink: emptySink,
      status: 200,
      headers: { 'content-type': 'application/json' },
      encoding: 'br',
    })
    emptySource.emit('end')
    await until(() => emptySink.writableEnded === true, 'the empty response to end')
    assert.equal(emptySink.status, 200)
    assert.equal('content-encoding' in emptySink.headers, false, 'an empty body is never given a compressed frame')
    assert.equal(emptySink.raw().length, 0, 'and nothing at all is written for it')
  }

  // No encoding asked for: exactly the plain pipe the proxy always had.
  {
    const plainSource = fakeBodySource()
    const plainSink = fakeResponse()
    streamBody({
      source: plainSource,
      sink: plainSink,
      status: 200,
      headers: { 'content-type': 'application/json', 'content-length': '2' },
      encoding: undefined,
    })
    assert.equal(plainSink.headersSent, true, 'the plain path writes its headers immediately')
    assert.equal(plainSink.headers['content-type'], 'application/json')
    assert.equal(plainSource.pipeCalls, 1, 'and hands the body straight to the socket')
  }

  // A codec failure is contained: the response is destroyed, never left open.
  {
    const errorSource = fakeBodySource()
    const errorSink = fakeResponse()
    const warnings = []
    streamBody({
      source: errorSource,
      sink: errorSink,
      status: 200,
      headers: { 'content-type': 'application/json' },
      encoding: 'gzip',
      logger: { warn: message => warnings.push(String(message)) },
    })
    errorSource.emit('error', new Error('socket hang up'))
    assert.equal(warnings.length, 0, 'a source failure is handled without a warning')
    assert.equal(errorSink.destroyed, true, 'a dead upstream takes the response down with it rather than hanging')
  }
}

// ---------------------------------------------------------------------------
// 15 — compression through the proxy: the event stream is never touched
// ---------------------------------------------------------------------------
{
  const sink = {
    origin: 'http://127.0.0.1:51234',
    authority: '127.0.0.1:51234',
    hostname: '127.0.0.1',
    port: 51234,
    tls: false,
  }
  const upstreams = []
  const proxy = createRemoteProxy({
    target: () => sink,
    mintCookie: () => 'dsh-auth-abc=v1.body.signature',
    createRequest: options => {
      const created = fakeUpstream()
      created.options = options
      upstreams.push(created)
      return created
    },
  })

  // A JSON answer over wifi: brotli, no content-length, honest vary.
  const payload = JSON.stringify({ messages: 'x'.repeat(8_000) })
  const call = fakeRequest({
    url: '/api/edh.remote',
    headers: { host: '192.168.1.23:8787', accept: 'application/json', 'accept-encoding': 'gzip, deflate, br' },
  })
  const answer = fakeResponse()
  await proxy.handle(call, answer)
  const jsonUpstream = upstreams[0].stream({
    statusCode: 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'content-length': String(payload.length) },
  })
  jsonUpstream.push(Buffer.from(payload.slice(0, 4000)))
  jsonUpstream.push(Buffer.from(payload.slice(4000)))
  jsonUpstream.finish()
  await until(() => answer.writableEnded === true, 'the compressed JSON answer to end')
  assert.equal(answer.status, 200)
  assert.equal(answer.headers['content-encoding'], 'br', 'br was preferred')
  assert.equal('content-length' in answer.headers, false, 'content-length is dropped')
  assert.equal(answer.headers.vary, 'accept-encoding')
  assert.equal(JSON.parse(brotliDecompressSync(answer.raw()).toString('utf8')).messages.length, 8000)
  assert.equal(proxy.stats.encoded, 1)

  // The same answer to a client that only speaks gzip.
  const gzipCall = fakeRequest({
    url: '/api/edh.remote',
    headers: { host: '192.168.1.23:8787', 'accept-encoding': 'gzip' },
  })
  const gzipAnswer = fakeResponse()
  await proxy.handle(gzipCall, gzipAnswer)
  upstreams[1].respond({
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    chunks: [Buffer.from('{"ok":true}')],
  })
  await until(() => gzipAnswer.writableEnded === true, 'the gzip answer to end')
  assert.equal(gzipAnswer.headers['content-encoding'], 'gzip')
  assert.equal(gunzipSync(gzipAnswer.raw()).toString('utf8'), '{"ok":true}')

  // The plugin event stream is never encoded and never held: each event is
  // forwarded to the phone as it arrives.
  const sseCall = fakeRequest({
    url: '/plugins/events',
    headers: { host: '192.168.1.23:8787', accept: 'text/event-stream', 'accept-encoding': 'br, gzip' },
  })
  const sseAnswer = fakeResponse()
  await proxy.handle(sseCall, sseAnswer)
  const sseUpstream = upstreams[2].stream({ statusCode: 200, headers: { 'content-type': 'text/event-stream' } })
  sseUpstream.push(Buffer.from('data: one\n\n'))
  await until(() => sseAnswer.chunkCount() === 1, 'the first event')
  assert.equal(sseAnswer.writableEnded, false, 'the stream is still open after its first event')
  assert.equal('content-encoding' in sseAnswer.headers, false, 'an event stream is never encoded')
  sseUpstream.push(Buffer.from('data: two\n\n'))
  sseUpstream.finish()
  await until(() => sseAnswer.writableEnded === true, 'the event stream to close')
  assert.equal(sseAnswer.text(), 'data: one\n\ndata: two\n\n', 'and every event arrives in order, untouched')
  assert.equal(proxy.stats.encoded, 2, 'the event stream did not count as encoded')

  // An upstream that already encoded its body passes straight through.
  const preCall = fakeRequest({
    url: '/assets/app.js',
    headers: { host: '192.168.1.23:8787', 'accept-encoding': 'br' },
  })
  const preAnswer = fakeResponse()
  await proxy.handle(preCall, preAnswer)
  upstreams[3].respond({
    statusCode: 200,
    headers: { 'content-type': 'application/javascript', 'content-encoding': 'gzip', 'content-length': '12' },
    chunks: [Buffer.from('x'.repeat(12))],
  })
  assert.equal(preAnswer.headers['content-encoding'], 'gzip', 'the origin’s own encoding is left alone')
  assert.equal(preAnswer.headers['content-length'], '12')

  // A HEAD is not encoded, and a 304 is not either.
  const headCall = fakeRequest({
    url: '/assets/app.js',
    method: 'HEAD',
    headers: { host: '192.168.1.23:8787', 'accept-encoding': 'br' },
  })
  const headAnswer = fakeResponse()
  await proxy.handle(headCall, headAnswer)
  const headUpstream = upstreams[4].stream({
    statusCode: 200,
    headers: { 'content-type': 'application/javascript', 'content-length': '999' },
  })
  headUpstream.finish()
  await until(() => headAnswer.headersSent === true, 'the HEAD answer')
  assert.equal('content-encoding' in headAnswer.headers, false, 'HEAD carries no body to encode')
  assert.equal(headAnswer.headers['content-length'], '999', 'and its headers are the origin’s own')

  const notModified = fakeRequest({
    url: '/assets/app.js',
    headers: { host: '192.168.1.23:8787', 'accept-encoding': 'br' },
  })
  const notModifiedAnswer = fakeResponse()
  await proxy.handle(notModified, notModifiedAnswer)
  upstreams[5].respond({ statusCode: 304, headers: { etag: '"abc"' } })
  assert.equal(notModifiedAnswer.status, 304)
  assert.equal('content-encoding' in notModifiedAnswer.headers, false)

  // A client that refuses encoding still gets the document, just as plain bytes.
  const plainCall = fakeRequest({ url: '/', headers: { host: '192.168.1.23:8787', 'accept-encoding': 'identity' } })
  const plainAnswer = fakeResponse()
  await proxy.handle(plainCall, plainAnswer)
  upstreams[6].respond({
    statusCode: 200,
    headers: { 'content-type': 'text/html' },
    chunks: [Buffer.from('<html></html>')],
  })
  assert.equal('content-encoding' in plainAnswer.headers, false)
  assert.equal(plainAnswer.text(), '<html></html>')
  assert.equal(proxy.stats.encoded, 2, 'nothing else was encoded')

  proxy.dispose()
}

console.log('edh remote: all checks passed')
