/**
 * EDH feature: `mobile` — the Host half of "this GUI is a phone app".
 *
 * The seam matters more than the code here, so it is worth writing down.
 *
 * Everything *visual* about mobile belongs to EDH's **browser half**, and only
 * because of where it already runs: `client.js` is loaded into the live Harness
 * document, so it can insert a real `<style>`, real `<meta>` tags and a
 * `<link rel="manifest">` into the running page — through the DOM, with the
 * stylesheet that is already applied, and without guessing at a single class
 * name. Remote then proxies that same document to the phone, so the phone
 * inherits every one of those improvements for free.
 *
 * The alternative — a reverse proxy doing string surgery on the HTML — was
 * strictly worse, and deliberately dropped: it would have to find a `</head>`
 * that may be compressed, may be absent, or may belong to a redirect; and it
 * would mean shipping CSS written blind against build-hashed class names
 * (`AnXs9G_options` and friends), which break on every Harness release. A proxy
 * cannot see the document, only bytes.
 *
 * What is left for this module is what a page *cannot* do for itself:
 *
 *     GET /api/edh.mobile/manifest  → application/manifest+json
 *     GET /api/edh.mobile/icon?size=192|512|180&maskable=1 → image/png
 *
 * ## Why the icons are generated here, in-process
 *
 * Remote is served over **plain HTTP on the LAN**, which is not a secure context,
 * so there is **no service worker** and **Android Chrome will not offer an install
 * prompt** however good the manifest is. (iOS Safari's *Add to Home Screen* needs
 * no prompt — but it reads `apple-touch-icon` from the document and **ignores SVG
 * icons entirely**.) A manifest naming one SVG therefore installed with a blank
 * icon on iOS and failed Chrome's install criteria (PNG 192 and 512, at least one
 * `maskable`).
 *
 * There is no image library in this bundle and EDH ships dependency-free, so the
 * PNGs are rasterised here: flat rectangles and rounded corners into an RGBA
 * buffer, encoded by a hand-rolled PNG writer (IHDR/IDAT/IEND + `zlib.deflateSync`
 * + the PNG CRC-32), then cached in memory. The same size always yields the same
 * bytes, which is what makes `immutable` cache-control honest — and the whole
 * 512 px icon is a few kilobytes, because flat shapes compress.
 *
 * The mark itself is the repo's own `icon.svg` idea, drawn with rectangles: a
 * rounded plate (`#0b1220`) carrying three stacked bars and a rounded-rectangle
 * ring in the EDH accent (`#34d399`). The SVG's two arcs became that ring — arcs
 * are not drawable with rectangles — and everything else is its geometry.
 *
 * ## Manifest facts that are load-bearing
 *
 * - **`display: "standalone"`, not `"fullscreen"`.** Standalone keeps a status bar
 *   (so the clock is visible and there is a way out) and is what iOS honours.
 * - **`start_url` and `scope` are root-relative (`"/"`), not `"./"`.** Manifest
 *   URLs resolve against the *manifest's* URL, so `"./"` served from
 *   `/api/edh.mobile/manifest` would start the installed app inside
 *   `/api/edh.mobile/` — a path that does not exist — and `scope: "./"` would put
 *   the document (`/`) outside the app's scope, which makes it non-installable.
 * - **`id: "/"` pins the install identity.** Without it the identity is derived
 *   from `start_url`, and a future change to either spawns a *second* home-screen
 *   app instead of updating the one that is there.
 * - **The icon URLs are root-relative too**, for the same reason as `start_url`:
 *   they resolve against the manifest URL.
 */

import { deflateSync } from 'node:zlib'

export const name = 'edh-mobile'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const MOBILE_MANIFEST_PATH = '/api/edh.mobile/manifest'

/** The generated icons: one route, one size per request. */
export const MOBILE_ICON_ROUTE = '/api/edh.mobile/icon'

/** What a manifest must be served as, per the Web App Manifest spec. */
export const MOBILE_MANIFEST_TYPE = 'application/manifest+json; charset=utf-8'

/** The sizes this route renders. 180 is the `apple-touch-icon` iOS asks for. */
export const MOBILE_ICON_SIZES = Object.freeze([192, 512, 180])

/** The size a caller gets when it names none. */
export const MOBILE_ICON_DEFAULT_SIZE = 512

/**
 * The icon URL iOS reads from the document (`<link rel="apple-touch-icon">`).
 *
 * Not a manifest field: iOS ignores the manifest's icons entirely and takes its
 * home-screen icon from this link, which is filled in by EDH's browser half.
 */
export const MOBILE_APPLE_ICON_PATH = `${MOBILE_ICON_ROUTE}?size=180`

/**
 * The icon cache-control: a week, immutable.
 *
 * The mark changes only with a release, so a phone may keep it; the release that
 * changes it also changes this URL's `v` only if a caller adds one, which is why
 * the route ignores unknown query parameters instead of refusing them.
 */
export const MOBILE_ICON_CACHE = 'public, max-age=604800, immutable'

/** The dark surface the GUI opens on; a manifest cannot read the app's tokens. */
export const MOBILE_BACKGROUND = '#0b0c0e'

/** The status-bar tint around a standalone app. */
export const MOBILE_THEME = '#0b0c0e'

/** The display mode a home-screen app should use: a status bar, no browser chrome. */
export const MOBILE_DISPLAY = 'standalone'

/** What the installed app is called in a launcher. */
export const MOBILE_NAME = 'EDH · DeepSeek Harness'
export const MOBILE_SHORT_NAME = 'EDH'

/** The one-line description a launcher and an app store listing would show. */
export const MOBILE_DESCRIPTION = "The DeepSeek Harness, with EDH's features."

/** `id` pins the install identity so a name change cannot create a second app. */
export const MOBILE_ID = '/'

/** The plate the mark sits on, and the accent it is drawn in (the repo's `icon.svg`). */
export const MOBILE_ICON_PLATE = '#0b1220'
export const MOBILE_ICON_ACCENT = '#34d399'

// ---------------------------------------------------------------------------
// A PNG writer
// ---------------------------------------------------------------------------

/** The CRC-32 table the PNG chunk checksum uses (polynomial 0xEDB88320). */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let index = 0; index < 256; index += 1) {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[index] = value >>> 0
  }
  return table
})()

/**
 * The PNG CRC-32 of one byte range.
 * @param buffer - the bytes.
 * @returns the checksum as an unsigned 32-bit number.
 */
export function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** One PNG chunk: length, ASCII type, data, CRC-32 over type+data. */
function pngChunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBytes = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)
  return Buffer.concat([length, typeBytes, data, crc])
}

/** The eight bytes every PNG starts with. */
export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

/**
 * Encode one RGBA canvas as a PNG.
 *
 * 8-bit RGBA (colour type 6), no interlacing, filter 0 on every row — the simplest
 * legal encoding, which is all this needs: the content is flat shapes, so deflate
 * does the work and the file stays a few kilobytes.
 * @param width - pixels across.
 * @param height - rows.
 * @param pixels - `width * height * 4` bytes of RGBA, top row first.
 * @returns the PNG file bytes.
 */
export function encodePng(width, height, pixels) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 6 // colour type: truecolour with alpha
  header[10] = 0 // deflate
  header[11] = 0 // adaptive filtering
  header[12] = 0 // no interlace
  // Each row is prefixed with its filter byte; filter 0 means "the bytes as they are".
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let row = 0; row < height; row += 1) {
    raw[row * (stride + 1)] = 0
    pixels.copy(raw, row * (stride + 1) + 1, row * stride, row * stride + stride)
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// The mark
// ---------------------------------------------------------------------------

/** One colour as 8-bit RGBA. */
function rgbaOf(hex, alpha = 255) {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16), alpha]
}

/** A blank canvas: transparent, which is what an "any" icon's corners stay. */
function createCanvas(size) {
  return { size, pixels: Buffer.alloc(size * size * 4) }
}

/** Paint one pixel, clipped to the canvas. */
function putPixel(canvas, x, y, rgba) {
  if (x < 0 || y < 0 || x >= canvas.size || y >= canvas.size) return
  const at = (y * canvas.size + x) * 4
  canvas.pixels[at] = rgba[0]
  canvas.pixels[at + 1] = rgba[1]
  canvas.pixels[at + 2] = rgba[2]
  canvas.pixels[at + 3] = rgba[3]
}

/** A plain rectangle, in whole pixels. */
function fillRect(canvas, x, y, width, height, rgba) {
  for (let row = Math.floor(y); row < Math.ceil(y + height); row += 1) {
    for (let column = Math.floor(x); column < Math.ceil(x + width); column += 1) putPixel(canvas, column, row, rgba)
  }
}

/**
 * A rectangle with rounded corners.
 *
 * The whole mark is drawn with this and {@link fillRect}: no arcs, no font, no
 * vector library — a corner is rounded by refusing pixels whose centre lies
 * outside the corner circle.
 */
function fillRoundRect(canvas, x, y, width, height, radius, rgba) {
  const r = Math.max(0, Math.min(radius, Math.floor(Math.min(width, height) / 2)))
  const left = x
  const top = y
  const right = x + width
  const bottom = y + height
  for (let row = Math.floor(top); row < Math.ceil(bottom); row += 1) {
    for (let column = Math.floor(left); column < Math.ceil(right); column += 1) {
      const cx = column + 0.5
      const cy = row + 0.5
      if (cx < left || cx > right || cy < top || cy > bottom) continue
      // Only the four corner squares need the distance test.
      const dx = cx < left + r ? left + r - cx : cx > right - r ? cx - (right - r) : 0
      const dy = cy < top + r ? top + r - cy : cy > bottom - r ? cy - (bottom - r) : 0
      if (dx > 0 && dy > 0 && dx * dx + dy * dy > r * r) continue
      putPixel(canvas, column, row, rgba)
    }
  }
}

/**
 * The mark, drawn into a canvas of any size.
 *
 * Geometry is expressed in the 64-unit space of the repo's own `icon.svg`, then
 * scaled: three stacked bars on the left, and a rounded-rectangle ring on the
 * right. `scale` shrinks the whole glyph for a maskable icon, whose outer edges a
 * launcher may crop (the safe zone is the middle 80 %).
 * @param canvas - where to draw.
 * @param options - `fullBleed` (an opaque square plate) and `scale` (glyph size).
 */
function drawMark(canvas, { fullBleed = false, scale = 1 } = {}) {
  const size = canvas.size
  const plate = rgbaOf(MOBILE_ICON_PLATE)
  const accent = rgbaOf(MOBILE_ICON_ACCENT)
  const px = value => (value * size) / 64
  // The plate. A maskable or iOS icon fills the canvas: the launcher applies its
  // own mask, and iOS composites transparency onto black, so neither wants corners.
  if (fullBleed === true) fillRect(canvas, 0, 0, size, size, plate)
  else fillRoundRect(canvas, 0, 0, size, size, px(14), plate)

  // The glyph is centred and scaled about the middle of the 64-unit space. The
  // drawing itself spans x 17…56, so it is shifted by −4.5 units: otherwise the
  // heavier right-hand ring pulls the mark off centre on a square launcher tile.
  const centre = 32
  const at = value => centre + (value - 4.5 - centre) * scale
  const bar = (x, y, width) => fillRoundRect(canvas, px(at(x)), px(at(y)), px(width * scale), px(4 * scale), px(2 * scale), accent)
  bar(17, 21, 16)
  bar(17, 30, 12)
  bar(17, 39, 16)
  // The ring: an accent rounded rectangle with the plate punched back through it.
  // A thin 4-unit stroke keeps the hole open at 48 px, where a thicker one reads as
  // a filled blob; the radius is most of the height, so the loop looks drawn rather
  // than boxed, which is the stand-in for `icon.svg`'s two arcs.
  fillRoundRect(canvas, px(at(36)), px(at(19)), px(20 * scale), px(26 * scale), px(10 * scale), accent)
  fillRoundRect(canvas, px(at(40)), px(at(23)), px(12 * scale), px(18 * scale), px(6 * scale), plate)
}

/** The in-memory icon cache: rendering is pure, so one render per variant is enough. */
const ICON_CACHE = new Map()

/**
 * The PNG bytes of one icon variant.
 *
 * Deterministic by construction — the same size and flags always produce the same
 * bytes — which is what lets the route send `immutable`. A maskable icon keeps the
 * mark inside the safe zone; a `fullBleed` square has no transparent corner for a
 * launcher's mask to reveal as a white notch.
 * @param size - one of {@link MOBILE_ICON_SIZES}.
 * @param maskable - shrink the glyph for a launcher that crops to a circle.
 * @returns the PNG file bytes.
 */
export function iconPng(size, maskable = false) {
  const key = `${String(size)}:${maskable === true ? 'maskable' : 'any'}`
  const cached = ICON_CACHE.get(key)
  if (cached !== undefined) return cached
  const canvas = createCanvas(size)
  // 180 is the iOS home-screen icon: it must be opaque edge to edge, because iOS
  // composites any transparency onto black before masking it.
  const apple = size === 180
  drawMark(canvas, { fullBleed: maskable === true || apple, scale: maskable === true ? 0.76 : 1 })
  const png = encodePng(size, size, canvas.pixels)
  ICON_CACHE.set(key, png)
  return png
}

/** Forget the generated icons; they are rebuilt on the next request. */
export function clearIconCache() {
  ICON_CACHE.clear()
}

// ---------------------------------------------------------------------------
// The manifest
// ---------------------------------------------------------------------------

/**
 * The manifest itself, freshly built on every call.
 *
 * `id`, `start_url`, `scope` and every icon URL are root-relative — see the
 * module comment: relative values resolve against this route's own path and would
 * start the installed app inside `/api/edh.mobile/`.
 * @returns a plain object ready to serialise.
 */
export function mobileManifest() {
  return {
    id: MOBILE_ID,
    name: MOBILE_NAME,
    short_name: MOBILE_SHORT_NAME,
    description: MOBILE_DESCRIPTION,
    start_url: '/',
    scope: '/',
    display: MOBILE_DISPLAY,
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'any',
    theme_color: MOBILE_THEME,
    background_color: MOBILE_BACKGROUND,
    categories: ['productivity', 'developer'],
    icons: [
      { src: `${MOBILE_ICON_ROUTE}?size=192`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${MOBILE_ICON_ROUTE}?size=512`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${MOBILE_ICON_ROUTE}?size=512&maskable=1`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [],
  }
}

// ---------------------------------------------------------------------------
// The routes
// ---------------------------------------------------------------------------

/** One JSON answer. A minuscule document, so no negotiation and no negotiation knob. */
function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': MOBILE_MANIFEST_TYPE, 'cache-control': 'no-store', ...headers },
  })
}

/** One PNG answer, with the byte length a client may rely on. */
function pngResponse(png) {
  return new Response(png, {
    status: 200,
    headers: {
      'content-type': 'image/png',
      'content-length': String(png.length),
      'cache-control': MOBILE_ICON_CACHE,
    },
  })
}

/**
 * Answer one request on the manifest route.
 *
 * `GET` (and `HEAD`, which the server answers without a body anyway) is the
 * manifest. Anything else is a `405` carrying the same JSON shape and an
 * `allow` header, never a `500`: this route has no failure mode that a caller
 * caused, and a caller that asked the wrong way should get a sentence it can read
 * rather than a stack trace.
 * @param request - the incoming request.
 * @returns the response.
 */
export function mobileResponse(request) {
  const method = typeof request?.method === 'string' ? request.method.toUpperCase() : ''
  if (method === 'GET' || method === 'HEAD') return jsonResponse(mobileManifest())
  const message = `Unsupported method ${request?.method ?? 'without a method'}; the manifest is a GET`
  return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405, { allow: 'GET' })
}

/**
 * The icon variant one request asks for.
 *
 * `size` is one of {@link MOBILE_ICON_SIZES}; anything else is `bad-input` rather
 * than a surprise rendering. `maskable=1` (or `true`) picks the safe-zone variant.
 * **Unknown query parameters are ignored on purpose**: a cache-buster (`?v=2`) is
 * a legitimate thing for a page to append, and refusing it would break the link
 * the browser half writes.
 * @param request - the incoming request.
 * @returns `{ ok: true, size, maskable }` or `{ ok: false, reason, message, status }`.
 */
export function parseIconQuery(request) {
  let url
  try {
    url = new URL(request?.url ?? MOBILE_ICON_ROUTE, 'http://edh.invalid')
  } catch {
    return { ok: false, reason: 'bad-input', message: 'That icon request could not be read.', status: 400 }
  }
  const sizes = url.searchParams.getAll('size')
  if (sizes.length > 1) {
    return { ok: false, reason: 'bad-input', message: 'Name one "size" value.', status: 400 }
  }
  const raw = sizes.length === 0 ? '' : String(sizes[0]).trim()
  let size = MOBILE_ICON_DEFAULT_SIZE
  if (raw !== '') {
    if (!/^\d+$/u.test(raw) || MOBILE_ICON_SIZES.includes(Number(raw)) !== true) {
      return {
        ok: false,
        reason: 'bad-input',
        message: `"size" must be one of ${MOBILE_ICON_SIZES.join(', ')}.`,
        status: 400,
      }
    }
    size = Number(raw)
  }
  const maskableValues = url.searchParams.getAll('maskable')
  const maskableRaw = maskableValues.length === 0 ? '' : String(maskableValues[0]).trim().toLowerCase()
  const maskable = maskableRaw === '1' || maskableRaw === 'true'
  return { ok: true, size, maskable }
}

/**
 * Answer one request on the icon route.
 *
 * `GET`/`HEAD` answer a PNG with a correct length and a week of `immutable`
 * caching; anything else is a `405`; an unusable `size` is a `400` with a sentence.
 * Never a `500` — the encoder is pure and the sizes are a closed set.
 * @param request - the incoming request.
 * @returns the response.
 */
export function mobileIconResponse(request) {
  const method = typeof request?.method === 'string' ? request.method.toUpperCase() : ''
  if (method !== 'GET' && method !== 'HEAD') {
    const message = `Unsupported method ${request?.method ?? 'without a method'}; an icon is a GET`
    return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405, { allow: 'GET' })
  }
  const parsed = parseIconQuery(request)
  if (parsed.ok !== true) {
    return jsonResponse({ ok: false, reason: parsed.reason, message: parsed.message }, parsed.status ?? 400)
  }
  return pngResponse(iconPng(parsed.size, parsed.maskable))
}

/**
 * Register both routes on the Host connection.
 *
 * Every method is claimed so these routes — not the gateway's 404 — answer a wrong
 * one with the 405 above. The registrations live inside `ctx.effect`, so turning
 * the row off unregisters them, and a deployment that refuses a path logs a
 * warning instead of taking the rest of EDH down.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  const routes = [
    { label: 'manifest', path: MOBILE_MANIFEST_PATH, fetch: request => mobileResponse(request) },
    { label: 'icon', path: MOBILE_ICON_ROUTE, fetch: request => mobileIconResponse(request) },
  ]
  for (const route of routes) {
    ctx.effect(() => {
      try {
        const dispose = ctx.connection.fetch.register({
          path: route.path,
          methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
          requestBody: 'buffered',
          fetch: route.fetch,
        })
        return () => {
          try {
            dispose?.()
          } catch (error) {
            ctx.logger?.warn?.('edh-mobile: %s route disposal failed: %o', route.label, error)
          }
        }
      } catch (error) {
        ctx.logger?.warn?.('edh-mobile: %s route registration failed: %o', route.label, error)
        return () => {}
      }
    }, `edh-mobile: ${route.label} route`)
  }
}

/** The routes need the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
