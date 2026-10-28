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
 * So the proxy's only mobile concern is the one thing it can do honestly and a
 * document cannot: **transport compression** (see `remote.js` → {@link
 * streamBody}), because `@deepseek-ai/dsh-host-webserver` runs with `compression:
 * none` and every asset and every RPC JSON answer otherwise crosses the wifi
 * uncompressed.
 *
 * What is left for this module is the piece a page *cannot* do for itself: a web
 * app manifest has to be fetched over HTTP from an origin, so the phone needs a
 * URL to point at. One route, no state, no filesystem, no secrets:
 *
 *     GET /api/edh.mobile/manifest → application/manifest+json
 *
 * It is deliberately minimal and honest about that.
 *
 * - **`display: "standalone"`, not `"fullscreen"`.** The page ships its own
 *   manifest with `fullscreen`; standalone is the mode that keeps a status bar
 *   (so the clock is visible and there is a way out) and is what iOS actually
 *   honours when it creates a home-screen app.
 * - **`start_url` and `scope` are root-relative (`"/"`), not `"./"`.** This is
 *   the one place the obvious value is wrong: manifest URLs resolve against the
 *   *manifest's* URL, so `"./"` served from `/api/edh.mobile/manifest` would
 *   start the installed app at `/api/edh.mobile/` — a path that does not exist —
 *   and `scope: "./"` would put the document (`/`) outside the app's scope, which
 *   makes it non-installable. `"/"` is origin-relative, works from any manifest
 *   location, and names no host.
 * - **The icon is verified, not hoped for.** `favicon.svg` is shipped at the
 *   origin root by `@deepseek-ai/dsh-web-frontend` (`dist/favicon.svg`, linked
 *   from its `index.html`, and answered `200 image/svg+xml` by the running
 *   server), so the manifest promises an icon that exists. A manifest naming a
 *   404 icon makes the install prompt fail, which is worse than having none.
 * - **The colours are constants.** A manifest cannot read the app's theme
 *   tokens, so these are the dark surface the GUI lands on; `theme_color` only
 *   tints the status bar around the app.
 */

export const name = 'edh-mobile'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const MOBILE_MANIFEST_PATH = '/api/edh.mobile/manifest'

/** What a manifest must be served as, per the Web App Manifest spec. */
export const MOBILE_MANIFEST_TYPE = 'application/manifest+json; charset=utf-8'

/**
 * The icon this manifest promises.
 *
 * Root-relative on purpose: an icon URL resolves against the *manifest's* URL, so
 * a bare `favicon.svg` would point at `/api/edh.mobile/favicon.svg`. The shipped
 * frontend serves this exact file at the origin root.
 */
export const MOBILE_ICON_PATH = '/favicon.svg'

/** The dark surface the GUI opens on; a manifest cannot read the app's tokens. */
export const MOBILE_BACKGROUND = '#0b0c0e'

/** The status-bar tint around a standalone app. */
export const MOBILE_THEME = '#0b0c0e'

/** The display mode a home-screen app should use: a status bar, no browser chrome. */
export const MOBILE_DISPLAY = 'standalone'

/**
 * The manifest itself, freshly built on every call.
 *
 * `start_url`/`scope` are `"/"` rather than `"./"` — see the module comment:
 * relative values resolve against this route's own path and would start the
 * installed app inside `/api/edh.mobile/`.
 * @returns a plain object ready to serialise.
 */
export function mobileManifest() {
  return {
    name: 'DeepSeek Harness',
    short_name: 'Harness',
    display: MOBILE_DISPLAY,
    start_url: '/',
    scope: '/',
    theme_color: MOBILE_THEME,
    background_color: MOBILE_BACKGROUND,
    icons: [
      {
        src: MOBILE_ICON_PATH,
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}

/** One JSON answer. A minuscule document, so no negotiation and no negotiation knob. */
function jsonResponse(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': MOBILE_MANIFEST_TYPE, 'cache-control': 'no-store', ...headers },
  })
}

/**
 * Answer one request on the manifest route.
 *
 * `GET` (and `HEAD`, which the server answers without a body anyway) is the
 * manifest. Anything else is a `405` carrying the same JSON shape and an
 * `allow` header, never a `500`: this route has no failure mode that a caller
 * caused, and a caller that asked the wrong way should get a sentence it can
 * read rather than a stack trace.
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
 * Register the manifest route on the Host connection.
 *
 * Every method is claimed so this route — not the gateway's 404 — answers a wrong
 * one with the 405 above. The registration lives inside `ctx.effect`, so turning
 * the row off unregisters it, and a deployment that refuses the path logs a
 * warning instead of taking the rest of EDH down.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  ctx.effect(() => {
    try {
      const dispose = ctx.connection.fetch.register({
        path: MOBILE_MANIFEST_PATH,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        requestBody: 'buffered',
        fetch: request => mobileResponse(request),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-mobile: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-mobile: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-mobile: manifest route')
}

/** The route needs the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
