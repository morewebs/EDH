import assert from 'node:assert/strict'
import {
  apply,
  inject,
  MOBILE_BACKGROUND,
  MOBILE_DISPLAY,
  MOBILE_ICON_PATH,
  MOBILE_MANIFEST_PATH,
  MOBILE_MANIFEST_TYPE,
  MOBILE_THEME,
  mobileManifest,
  mobileResponse,
  name,
} from '../mobile.js'

/** A Cordis-shaped context: `effect`, a route registry, and a warning sink. */
function createContext({ register } = {}) {
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
    connection: {
      fetch: {
        register(route) {
          if (register !== undefined) return register(route)
          routes.push(route)
          return () => {
            const at = routes.indexOf(route)
            if (at !== -1) routes.splice(at, 1)
          }
        },
      },
    },
  }
  return { ctx, routes, disposers, warnings }
}

// ---------------------------------------------------------------------------
// 1 — the manifest: the shape a phone can install, and nothing it cannot read
// ---------------------------------------------------------------------------
{
  assert.equal(name, 'edh-mobile')
  assert.deepEqual(inject, ['connection'], 'the route needs the Host connection')

  // The path must be one the `/api` bridge can claim: an endpoint under the
  // shared channel, no trailing slash, no empty or dotted segment.
  assert.equal(MOBILE_MANIFEST_PATH, '/api/edh.mobile/manifest')
  assert.equal(MOBILE_MANIFEST_PATH.startsWith('/api/'), true)
  assert.equal(MOBILE_MANIFEST_PATH.endsWith('/'), false)
  for (const segment of MOBILE_MANIFEST_PATH.slice('/api/'.length).split('/')) {
    assert.match(segment, /^[A-Za-z0-9_$.-]+$/u, `segment ${JSON.stringify(segment)} is registrable`)
    assert.notEqual(segment, '')
  }

  const manifest = mobileManifest()
  assert.deepEqual(Object.keys(manifest).sort(), [
    'background_color',
    'display',
    'icons',
    'name',
    'scope',
    'short_name',
    'start_url',
    'theme_color',
  ], 'the manifest carries its fields and nothing else — no secret, no token, no path on this machine')
  assert.equal(manifest.name, 'DeepSeek Harness')
  assert.equal(manifest.short_name, 'Harness')
  assert.equal(manifest.display, 'standalone', 'standalone keeps a status bar and is what iOS honours')
  assert.equal(MOBILE_DISPLAY, 'standalone')

  // Relative manifest URLs resolve against the manifest's own URL, so "./" would
  // start the installed app inside /api/edh.mobile/ and put the document outside
  // its own scope. Both must be root-relative.
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  for (const field of ['start_url', 'scope']) {
    assert.equal(manifest[field].startsWith('//'), false, `${field} names no host`)
    assert.equal(/^[a-z]+:/iu.test(manifest[field]), false, `${field} is not an absolute URL`)
  }

  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/u)
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/u)
  assert.equal(manifest.theme_color, MOBILE_THEME)
  assert.equal(manifest.background_color, MOBILE_BACKGROUND)

  // The one icon is the file the shipped frontend actually serves at the origin
  // root — verified against `dsh-web-frontend/dist/favicon.svg` and a live 200.
  assert.equal(manifest.icons.length, 1)
  const [icon] = manifest.icons
  assert.equal(icon.src, MOBILE_ICON_PATH)
  assert.equal(icon.src, '/favicon.svg')
  assert.equal(icon.sizes, 'any')
  assert.equal(icon.type, 'image/svg+xml')
  assert.equal(icon.purpose, 'any')
  assert.equal(icon.src.startsWith('/'), true, 'an icon URL resolves against the manifest URL, so it is root-relative')
  assert.equal(icon.src.startsWith('//'), false)
  assert.equal(/^[a-z]+:/iu.test(icon.src), false, 'and it names no host')

  // Nothing in the document may name a host: the phone's origin is the LAN
  // address this proxy listens on, and the manifest must work on all of them.
  const text = JSON.stringify(manifest)
  assert.equal(/https?:\/\//iu.test(text), false, 'no absolute host anywhere in the manifest')
  assert.equal(text.includes('//'), false)
  assert.equal(text.toLowerCase().includes('secret'), false)
  assert.deepEqual(mobileManifest(), manifest, 'every call builds the same manifest')
  const mutable = mobileManifest()
  mutable.icons.push({ src: '/elsewhere.svg' })
  mutable.display = 'browser'
  assert.deepEqual(mobileManifest(), manifest, 'and a fresh object each time, so a caller cannot corrupt the next answer')
}

// ---------------------------------------------------------------------------
// 2 — the route contract: GET is the manifest, anything else is a 405
// ---------------------------------------------------------------------------
{
  const get = await mobileResponse(new Request(`http://127.0.0.1${MOBILE_MANIFEST_PATH}`))
  assert.equal(get.status, 200)
  assert.equal(get.headers.get('content-type'), MOBILE_MANIFEST_TYPE)
  assert.equal(get.headers.get('cache-control'), 'no-store', 'a manifest is re-read rather than cached stale')
  const served = await get.json()
  assert.deepEqual(served, mobileManifest(), 'the route serves exactly the manifest builder, shared')
  assert.equal(served.display, 'standalone')
  assert.equal(served.start_url, '/')
  assert.equal(served.scope, '/')
  assert.deepEqual(served.icons.map(entry => entry.src), ['/favicon.svg'])

  const head = await mobileResponse(new Request(`http://127.0.0.1${MOBILE_MANIFEST_PATH}`, { method: 'HEAD' }))
  assert.equal(head.status, 200, 'a HEAD is answered like a GET; the server drops the body')

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const rejected = await mobileResponse(new Request(`http://127.0.0.1${MOBILE_MANIFEST_PATH}`, { method }))
    assert.equal(rejected.status, 405, `${method} is a 405, never a 500`)
    assert.equal(rejected.headers.get('allow'), 'GET')
    assert.equal(rejected.headers.get('content-type'), MOBILE_MANIFEST_TYPE)
    const body = await rejected.json()
    assert.equal(body.ok, false)
    assert.equal(body.reason, 'unsupported-method')
    assert.match(body.message, new RegExp(method, 'u'), 'the sentence names the method it refused')
  }

  const methodless = await mobileResponse({})
  assert.equal(methodless.status, 405)
  assert.match((await methodless.json()).message, /without a method/u)

  // A request object with no headers at all must still answer: this route reads
  // nothing but the method.
  assert.equal((await mobileResponse({ method: 'get' })).status, 200, 'the method is compared case-insensitively')
}

// ---------------------------------------------------------------------------
// 3 — the row: one registration inside an effect, and disposal unregisters it
// ---------------------------------------------------------------------------
{
  const { ctx, routes, disposers, warnings } = createContext()
  apply(ctx)

  assert.equal(routes.length, 1, 'the manifest route is registered')
  assert.equal(routes[0].path, MOBILE_MANIFEST_PATH)
  assert.deepEqual([...routes[0].methods], ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'every method is claimed so a wrong one gets the 405')
  assert.equal(routes[0].requestBody, 'buffered')
  assert.equal(typeof routes[0].fetch, 'function')

  const answered = await routes[0].fetch(new Request(`http://127.0.0.1${MOBILE_MANIFEST_PATH}`))
  assert.equal(answered.status, 200)
  assert.equal((await answered.json()).short_name, 'Harness')

  const refused = await routes[0].fetch(new Request(`http://127.0.0.1${MOBILE_MANIFEST_PATH}`, { method: 'DELETE' }))
  assert.equal(refused.status, 405, 'the registered route answers the wrong method itself')

  for (const dispose of [...disposers].reverse()) dispose()
  assert.equal(routes.length, 0, 'disposal unregisters the route')
  assert.equal(warnings.length, 0, `nothing warned: ${warnings.join(' | ')}`)

  // A composition that refuses the path logs and keeps everything else running.
  const refused2 = createContext({
    register() {
      throw new Error('connection: exact Fetch route already registered')
    },
  })
  apply(refused2.ctx)
  assert.equal(refused2.warnings.length, 1)
  assert.match(refused2.warnings[0], /registration failed/u)
  for (const dispose of [...refused2.disposers].reverse()) dispose()

  // A disposal that throws is swallowed too: the row going off must not escalate.
  const throwing = createContext({
    register() {
      return () => {
        throw new Error('already gone')
      }
    },
  })
  apply(throwing.ctx)
  for (const dispose of [...throwing.disposers].reverse()) dispose()
  assert.match(throwing.warnings.at(-1), /disposal failed/u)
}

// ---------------------------------------------------------------------------
// 4 — no services, no throw: the module must load on any Host
// ---------------------------------------------------------------------------
{
  const bare = {
    logger: { warn: () => {} },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
  }
  assert.doesNotThrow(() => apply(bare), 'a Host without the connection service must not throw')

  const logged = []
  const withoutFetch = {
    logger: { warn: (...args) => logged.push(args.map(String).join(' ')) },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
    connection: {},
  }
  assert.doesNotThrow(() => apply(withoutFetch))
  assert.equal(logged.length, 1)
  assert.match(logged[0], /registration failed/u)

  // And with no context hooks at all the pure builder still answers, so the
  // route can be unit-tested without a Host.
  assert.equal((await mobileResponse({ method: 'GET' })).status, 200)
}

console.log('edh mobile: all checks passed')
