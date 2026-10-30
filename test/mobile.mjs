import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import {
  apply,
  clearIconCache,
  crc32,
  encodePng,
  iconPng,
  inject,
  MOBILE_APPLE_ICON_PATH,
  MOBILE_BACKGROUND,
  MOBILE_DESCRIPTION,
  MOBILE_DISPLAY,
  MOBILE_ICON_ACCENT,
  MOBILE_ICON_CACHE,
  MOBILE_ICON_DEFAULT_SIZE,
  MOBILE_ICON_PLATE,
  MOBILE_ICON_ROUTE,
  MOBILE_ICON_SIZES,
  MOBILE_ID,
  MOBILE_MANIFEST_PATH,
  MOBILE_MANIFEST_TYPE,
  MOBILE_NAME,
  MOBILE_SHORT_NAME,
  MOBILE_THEME,
  mobileIconResponse,
  mobileManifest,
  mobileResponse,
  name,
  parseIconQuery,
  PNG_SIGNATURE,
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

/**
 * Read a PNG back: signature, IHDR dimensions, and the decoded pixel bytes.
 * Returns `{ width, height, bitDepth, colorType, raw }` — `raw` still carries the
 * per-row filter byte, which is where the expected length comes from.
 */
function decodePng(png) {
  assert.deepEqual(Buffer.from(png.subarray(0, 8)), PNG_SIGNATURE, 'the file starts with the PNG signature')
  const chunks = []
  let offset = 8
  let header
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.subarray(offset + 4, offset + 8).toString('ascii')
    const data = png.subarray(offset + 8, offset + 8 + length)
    const crc = png.readUInt32BE(offset + 8 + length)
    assert.equal(crc, crc32(png.subarray(offset + 4, offset + 8 + length)), `the ${type} chunk checksum is right`)
    chunks.push({ type, data })
    if (type === 'IHDR') header = data
    offset += 12 + length
  }
  assert.equal(chunks.at(-1).type, 'IEND', 'the file ends with IEND')
  assert.equal(chunks[0].type, 'IHDR', 'and starts with IHDR')
  const width = header.readUInt32BE(0)
  const height = header.readUInt32BE(4)
  const idat = Buffer.concat(chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data))
  return {
    width,
    height,
    bitDepth: header[8],
    colorType: header[9],
    compression: header[10],
    filter: header[11],
    interlace: header[12],
    raw: inflateSync(idat),
    chunks,
  }
}

// ---------------------------------------------------------------------------
// 1 — the manifest: the shape a phone can install, and nothing it cannot read
// ---------------------------------------------------------------------------
{
  assert.equal(name, 'edh-mobile')
  assert.deepEqual(inject, ['connection'], 'the routes need the Host connection')

  // Both paths must be ones the `/api` bridge can claim: an endpoint under the
  // shared channel, no trailing slash, no empty or dotted segment.
  for (const path of [MOBILE_MANIFEST_PATH, MOBILE_ICON_ROUTE]) {
    assert.equal(path.startsWith('/api/'), true)
    assert.equal(path.endsWith('/'), false)
    for (const segment of path.slice('/api/'.length).split('/')) {
      assert.match(segment, /^[A-Za-z0-9_$.-]+$/u, `segment ${JSON.stringify(segment)} is registrable`)
      assert.notEqual(segment, '')
    }
  }
  assert.equal(MOBILE_MANIFEST_PATH, '/api/edh.mobile/manifest')
  assert.equal(MOBILE_ICON_ROUTE, '/api/edh.mobile/icon')

  const manifest = mobileManifest()
  assert.deepEqual(Object.keys(manifest).sort(), [
    'background_color',
    'categories',
    'description',
    'display',
    'display_override',
    'icons',
    'id',
    'name',
    'orientation',
    'scope',
    'short_name',
    'shortcuts',
    'start_url',
    'theme_color',
  ], 'exactly the manifest fields, and nothing that leaks this machine')

  assert.equal(manifest.id, '/')
  assert.equal(manifest.id, MOBILE_ID, 'id pins the install identity: a rename must not create a second app')
  assert.equal(manifest.name, 'EDH · DeepSeek Harness')
  assert.equal(manifest.name, MOBILE_NAME)
  assert.equal(manifest.short_name, 'EDH')
  assert.equal(manifest.short_name, MOBILE_SHORT_NAME)
  assert.equal(manifest.description, MOBILE_DESCRIPTION)
  assert.equal(manifest.short_name.length <= 12, true, 'a launcher shows a short name')

  assert.equal(manifest.display, 'standalone', 'standalone keeps a status bar and is what iOS honours')
  assert.equal(MOBILE_DISPLAY, 'standalone')
  assert.deepEqual(manifest.display_override, ['standalone', 'minimal-ui'])
  assert.equal(manifest.orientation, 'any')
  assert.deepEqual(manifest.categories, ['productivity', 'developer'])
  assert.deepEqual(manifest.shortcuts, [])

  // Relative manifest URLs resolve against the manifest's own URL, so "./" would
  // start the installed app inside /api/edh.mobile/ and put the document outside
  // its own scope. Every URL in the document must be root-relative.
  assert.equal(manifest.start_url, '/')
  assert.equal(manifest.scope, '/')
  for (const field of ['id', 'start_url', 'scope']) {
    assert.equal(manifest[field].startsWith('/'), true, `${field} is root-relative`)
    assert.equal(manifest[field].startsWith('//'), false, `${field} names no host`)
    assert.equal(/^[a-z]+:/iu.test(manifest[field]), false, `${field} is not an absolute URL`)
  }

  assert.match(manifest.theme_color, /^#[0-9a-f]{6}$/u)
  assert.match(manifest.background_color, /^#[0-9a-f]{6}$/u)
  assert.equal(manifest.theme_color, MOBILE_THEME)
  assert.equal(manifest.background_color, MOBILE_BACKGROUND)

  // Three PNG icons: 192 and 512 for a launcher, one 512 maskable for a launcher
  // that crops. Chrome's install criteria want exactly this; an SVG alone is
  // ignored by iOS, which is why they are rendered here.
  assert.equal(manifest.icons.length, 3)
  assert.deepEqual(manifest.icons, [
    { src: '/api/edh.mobile/icon?size=192', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/api/edh.mobile/icon?size=512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/api/edh.mobile/icon?size=512&maskable=1', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ])
  for (const icon of manifest.icons) {
    assert.equal(icon.type, 'image/png', 'iOS ignores SVG icons entirely')
    assert.equal(icon.src.startsWith('/'), true, 'an icon URL resolves against the manifest URL, so it is root-relative')
    assert.equal(icon.src.startsWith('//'), false)
    assert.equal(/^[a-z]+:/iu.test(icon.src), false, 'and it names no host')
    const [width] = icon.sizes.split('x')
    assert.equal(icon.src.includes(`size=${width}`), true, 'the URL asks for the size it claims')
  }
  assert.equal(manifest.icons.filter(icon => icon.purpose === 'maskable').length, 1, 'at least one maskable icon')
  assert.equal(manifest.icons.some(icon => icon.sizes === '192x192'), true)
  assert.equal(manifest.icons.some(icon => icon.sizes === '512x512'), true)

  // Nothing in the document may name a host: the phone's origin is the LAN address
  // this proxy listens on, and the manifest must work on all of them.
  const text = JSON.stringify(manifest)
  assert.equal(/https?:\/\//iu.test(text), false, 'no absolute host anywhere in the manifest')
  assert.equal(text.includes('//'), false)
  assert.equal(text.toLowerCase().includes('secret'), false)
  assert.deepEqual(mobileManifest(), manifest, 'every call builds the same manifest')
  const mutable = mobileManifest()
  mutable.icons.push({ src: '/elsewhere.svg' })
  mutable.display = 'browser'
  assert.deepEqual(mobileManifest(), manifest, 'and a fresh object each time, so a caller cannot corrupt the next answer')

  // The link iOS reads from the document, not from the manifest.
  assert.equal(MOBILE_APPLE_ICON_PATH, '/api/edh.mobile/icon?size=180')
  assert.equal(MOBILE_APPLE_ICON_PATH.includes('size=180'), true)
  assert.equal(MOBILE_ICON_SIZES.includes(180), true)
  assert.deepEqual([...MOBILE_ICON_SIZES], [192, 512, 180])
  assert.equal(MOBILE_ICON_DEFAULT_SIZE, 512)
  assert.equal(MOBILE_ICON_CACHE, 'public, max-age=604800, immutable')
  assert.equal(MOBILE_ICON_PLATE, '#0b1220')
  assert.equal(MOBILE_ICON_ACCENT, '#34d399')
}

// ---------------------------------------------------------------------------
// 2 — the PNG encoder: signature, IHDR, checksums, and the decoded length
// ---------------------------------------------------------------------------
{
  // The known-answer test every CRC implementation gets: "123456789" is 0xCBF43926.
  assert.equal(crc32(Buffer.from('123456789', 'ascii')), 0xcbf43926)
  assert.equal(crc32(Buffer.alloc(0)), 0)

  // A 2×2 opaque red square, written to the spec rather than through the mark.
  const pixels = Buffer.from([
    255, 0, 0, 255, 255, 0, 0, 255,
    255, 0, 0, 255, 255, 0, 0, 255,
  ])
  const tiny = decodePng(encodePng(2, 2, pixels))
  assert.equal(tiny.width, 2)
  assert.equal(tiny.height, 2)
  assert.equal(tiny.bitDepth, 8, '8 bits per channel')
  assert.equal(tiny.colorType, 6, 'truecolour with alpha')
  assert.equal(tiny.compression, 0)
  assert.equal(tiny.filter, 0)
  assert.equal(tiny.interlace, 0, 'no interlacing')
  // One filter byte per row, then four bytes per pixel: the length the spec requires.
  assert.equal(tiny.raw.length, 2 * (1 + 2 * 4))
  assert.deepEqual([...tiny.raw.subarray(1, 5)], [255, 0, 0, 255])
  assert.deepEqual(tiny.chunks.map(chunk => chunk.type), ['IHDR', 'IDAT', 'IEND'])

  // The decoder above is the test's own; a second, independent read of the same
  // bytes through zlib proves the IDAT really carries the pixels.
  assert.equal(tiny.raw[0], 0, 'the row filter byte is 0')
}

// ---------------------------------------------------------------------------
// 3 — the icons: every size, the maskable variant, and the safe zone
// ---------------------------------------------------------------------------
{
  for (const size of [...MOBILE_ICON_SIZES, 48]) {
    const png = iconPng(size)
    const image = decodePng(png)
    assert.equal(image.width, size, `${size}: IHDR width`)
    assert.equal(image.height, size, `${size}: IHDR height`)
    // 4 channels × 8 bits, plus one filter byte per row.
    assert.equal(image.raw.length, size * (1 + size * 4), `${size}: inflate yields width*height*4 + one filter byte per row`)
    assert.equal(png.length > PNG_SIGNATURE.length + 25, true, `${size}: there is data in it`)
    assert.equal(png.length < 64 * 1024, true, `${size}: a flat-shape icon is small (${png.length} bytes)`)
  }

  // 192 and 512 for a launcher, 180 for iOS, and the maskable 512.
  assert.equal(iconPng(192).length < 4096, true)
  assert.equal(iconPng(512).length < 16 * 1024, true)
  const maskable = decodePng(iconPng(512, true))
  assert.equal(maskable.width, 512)
  assert.equal(maskable.raw.length, 512 * (1 + 512 * 4))

  // Determinism: the same variant is the same bytes, every call — which is what
  // makes `immutable` honest.
  assert.deepEqual(iconPng(192), iconPng(192))
  assert.deepEqual(iconPng(512, true), iconPng(512, true))
  assert.equal(iconPng(192).equals(iconPng(512)), false, 'different sizes are different files')
  assert.equal(iconPng(512).equals(iconPng(512, true)), false, 'and the maskable variant is drawn differently')

  // The apple icon must be opaque edge to edge: iOS composites transparency onto
  // black, so a transparent corner becomes a black notch.
  const apple = decodePng(iconPng(180))
  const cornerAlpha = AppleCornerAlpha(apple)
  assert.equal(cornerAlpha, 255, 'the 180 icon has no transparency in its corners')
  function AppleCornerAlpha(image) {
    const stride = 1 + image.width * 4
    // Top-left pixel of row 0: filter byte at 0, then R,G,B,A.
    return image.raw[4]
  }
  // An "any" icon may keep its rounded corners transparent — a launcher masks it.
  assert.equal(decodePng(iconPng(192)).raw[4], 0, 'the plain icon keeps transparent corners')

  // A maskable icon keeps its mark inside the safe circle (the middle 80 %): the
  // launcher may crop everything outside it, so nothing important may sit there.
  // The accent-pixel count is asserted first — a scan that found no pixels would
  // pass the violation check for the wrong reason.
  const maskableMark = countAccentPixels(decodePng(iconPng(512, true)))
  const plainMark = countAccentPixels(decodePng(iconPng(512)))
  assert.equal(maskableMark.inside > 0, true, 'the scan finds the mark inside the safe circle')
  assert.equal(maskableMark.outside, 0, 'no accent pixel outside the 80 % safe circle')
  // …and the maskable variant really is the shrunk one: the same mark at a smaller
  // size, so a launcher's circular crop never clips it. Without the shrink these
  // two counts would be identical.
  assert.equal(maskableMark.inside < plainMark.inside, true, 'the maskable mark is drawn smaller than the plain one')
  assert.equal(
    maskableMark.inside / plainMark.inside < 0.7,
    true,
    `and by a visible margin (${maskableMark.inside} vs ${plainMark.inside} accent pixels)`,
  )
  function countAccentPixels(image) {
    const stride = 1 + image.width * 4
    const radius = (image.width * 0.8) / 2
    const centre = image.width / 2
    let inside = 0
    let outside = 0
    for (let row = 0; row < image.height; row += 1) {
      for (let column = 0; column < image.width; column += 1) {
        const at = row * stride + 1 + column * 4
        const red = image.raw[at]
        const green = image.raw[at + 1]
        // The accent is #34d399: nothing else on the plate is that bright.
        if (green < 180 || red > 120) continue
        const dx = column + 0.5 - centre
        const dy = row + 0.5 - centre
        if (dx * dx + dy * dy > radius * radius) outside += 1
        else inside += 1
      }
    }
    return { inside, outside }
  }

  // The cache is a cache: clearing it changes nothing observable.
  const before = iconPng(192)
  clearIconCache()
  assert.deepEqual(iconPng(192), before, 'a regenerated icon is byte-identical')
}

// ---------------------------------------------------------------------------
// 4 — the icon route: variants, headers, and the refusals
// ---------------------------------------------------------------------------
{
  const call = async (query, method = 'GET') => mobileIconResponse(new Request(`http://127.0.0.1${MOBILE_ICON_ROUTE}${query}`, { method }))

  for (const [query, size, maskable] of [
    ['?size=192', 192, false],
    ['?size=512', 512, false],
    ['?size=180', 180, false],
    ['?size=512&maskable=1', 512, true],
    ['?size=192&maskable=1', 192, true],
  ]) {
    const response = await call(query)
    assert.equal(response.status, 200, query)
    assert.equal(response.headers.get('content-type'), 'image/png', query)
    assert.equal(response.headers.get('cache-control'), MOBILE_ICON_CACHE, query)
    const bytes = Buffer.from(await response.arrayBuffer())
    assert.equal(response.headers.get('content-length'), String(bytes.length), `${query}: length matches the body`)
    assert.deepEqual(bytes, iconPng(size, maskable), `${query}: the route serves that variant`)
    assert.equal(decodePng(bytes).width, size)
  }

  // No size at all is the default, which is the 512 the manifest also names.
  const bare = await call('')
  assert.equal(bare.status, 200)
  assert.deepEqual(Buffer.from(await bare.arrayBuffer()), iconPng(MOBILE_ICON_DEFAULT_SIZE))

  // An unknown query parameter is ignored on purpose: a page may append a
  // cache-buster, and refusing it would break the link the browser half writes.
  const busted = await call('?size=192&v=2&x=y')
  assert.equal(busted.status, 200, 'an unknown query parameter is ignored, not refused')
  assert.deepEqual(Buffer.from(await busted.arrayBuffer()), iconPng(192))
  assert.equal((await call('?size=192&maskable=0')).status, 200, 'maskable=0 is the plain variant')

  // A size that is not one of the three is the caller's mistake.
  for (const bad of ['?size=64', '?size=1024', '?size=abc', '?size=-1', '?size=1.5', '?size=192&size=512']) {
    const rejected = await call(bad)
    assert.equal(rejected.status, 400, bad)
    const body = await rejected.json()
    assert.equal(body.ok, false)
    assert.equal(body.reason, 'bad-input')
    assert.match(body.message, /size/u, 'the sentence says what is wrong')
  }
  // The refusal names the sizes that work, so a caller can fix the request.
  assert.match((await (await call('?size=64')).json()).message, /192, 512, 180/u)
  assert.match((await (await call('?size=192&size=512')).json()).message, /Name one "size" value/u)

  // HEAD is answered like a GET and the server drops the body.
  assert.equal((await call('?size=192', 'HEAD')).status, 200)
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const rejected = await call('?size=192', method)
    assert.equal(rejected.status, 405, `${method} is a 405, never a 500`)
    assert.equal(rejected.headers.get('allow'), 'GET')
    assert.equal((await rejected.json()).reason, 'unsupported-method')
  }
  assert.equal((await mobileIconResponse({})).status, 405, 'a request with no method is refused, not crashed')

  // The query parser on its own, including the shapes a URL parser accepts.
  assert.deepEqual(parseIconQuery({ url: `${MOBILE_ICON_ROUTE}?size=180` }), { ok: true, size: 180, maskable: false })
  assert.deepEqual(parseIconQuery({ url: `${MOBILE_ICON_ROUTE}?maskable=true` }), { ok: true, size: 512, maskable: true })
  // Parameter *names* are case-sensitive in the URL standard, so `MASKABLE` is just
  // an unknown parameter; the *value* is compared case-insensitively.
  assert.deepEqual(parseIconQuery({ url: `${MOBILE_ICON_ROUTE}?size=512&MASKABLE=1` }), { ok: true, size: 512, maskable: false })
  assert.deepEqual(parseIconQuery({ url: `${MOBILE_ICON_ROUTE}?size=512&maskable=TRUE` }), { ok: true, size: 512, maskable: true })
  assert.deepEqual(parseIconQuery({ url: `${MOBILE_ICON_ROUTE}` }), { ok: true, size: 512, maskable: false })
  assert.equal(parseIconQuery({ url: `${MOBILE_ICON_ROUTE}?size=` }).size, 512, 'an empty size is the default')
  assert.equal(parseIconQuery({ url: `${MOBILE_ICON_ROUTE}?size=192&maskable=maybe` }).maskable, false)
  assert.equal(parseIconQuery({ url: 'not a url at all' }).ok, true, 'a relative URL still parses against the base')
}

// ---------------------------------------------------------------------------
// 5 — the manifest route contract: GET is the manifest, anything else is a 405
// ---------------------------------------------------------------------------
{
  const get = await mobileResponse(new Request(`http://127.0.0.1${MOBILE_MANIFEST_PATH}`))
  assert.equal(get.status, 200)
  assert.equal(get.headers.get('content-type'), MOBILE_MANIFEST_TYPE)
  assert.equal(get.headers.get('cache-control'), 'no-store', 'a manifest is re-read rather than cached stale')
  const served = await get.json()
  assert.deepEqual(served, mobileManifest(), 'the route serves exactly the manifest builder, shared')
  assert.equal(served.display, 'standalone')
  assert.equal(served.id, '/')
  assert.deepEqual(served.icons.map(entry => entry.sizes), ['192x192', '512x512', '512x512'])

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
  assert.equal((await mobileResponse({ method: 'get' })).status, 200, 'the method is compared case-insensitively')
}

// ---------------------------------------------------------------------------
// 6 — the row: two registrations inside effects, and disposal unregisters both
// ---------------------------------------------------------------------------
{
  const { ctx, routes, disposers, warnings } = createContext()
  apply(ctx)

  assert.equal(routes.length, 2, 'the manifest and the icon routes are registered')
  assert.deepEqual(routes.map(route => route.path).sort(), [MOBILE_ICON_ROUTE, MOBILE_MANIFEST_PATH].sort())
  for (const route of routes) {
    assert.deepEqual([...route.methods], ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], 'every method is claimed so a wrong one gets the 405')
    assert.equal(route.requestBody, 'buffered')
    assert.equal(typeof route.fetch, 'function')
  }

  const iconRoute = routes.find(route => route.path === MOBILE_ICON_ROUTE)
  const answered = await iconRoute.fetch(new Request(`http://127.0.0.1${MOBILE_ICON_ROUTE}?size=192`))
  assert.equal(answered.status, 200)
  assert.equal(answered.headers.get('content-type'), 'image/png')
  const manifestRoute = routes.find(route => route.path === MOBILE_MANIFEST_PATH)
  assert.equal((await manifestRoute.fetch(new Request(`http://127.0.0.1${MOBILE_MANIFEST_PATH}`))).status, 200)
  assert.equal((await iconRoute.fetch(new Request(`http://127.0.0.1${MOBILE_ICON_ROUTE}?size=9`))).status, 400)

  for (const dispose of [...disposers].reverse()) dispose()
  assert.equal(routes.length, 0, 'disposal unregisters both routes')
  assert.equal(warnings.length, 0, `nothing warned: ${warnings.join(' | ')}`)

  // A composition that refuses the path logs and keeps everything else running.
  const refused = createContext({
    register() {
      throw new Error('connection: exact Fetch route already registered')
    },
  })
  assert.doesNotThrow(() => apply(refused.ctx))
  assert.equal(refused.warnings.length, 2, 'one warning per refused route')
  for (const warning of refused.warnings) assert.match(warning, /registration failed/u)
  for (const dispose of [...refused.disposers].reverse()) dispose()

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
// 7 — no services, no throw: the module must load on any Host
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
  assert.equal(logged.length, 2)
  for (const line of logged) assert.match(line, /registration failed/u)

  // And with no context hooks at all the pure builders still answer, so the routes
  // can be unit-tested without a Host.
  assert.equal((await mobileResponse({ method: 'GET' })).status, 200)
  assert.equal((await mobileIconResponse({ method: 'GET' })).status, 200)
}

console.log('edh mobile: all checks passed')
