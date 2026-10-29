import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import {
  apply,
  catalogEntry,
  inject,
  MAX_SOUND_ID,
  name,
  NOTIFY_CATALOG,
  NOTIFY_SOUND_CACHE,
  NOTIFY_SOUND_PATH,
  NOTIFY_SOUND_TYPE,
  NOTIFY_SOUNDS_PATH,
  notifySoundResponse,
  notifySoundsRequest,
  openSoundStream,
  resolveMediaDir,
  soundCatalog,
  soundFilePath,
} from '../notify.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const MEDIA = resolve(join('C:\\Windows', 'Media'))

/** A filesystem with exactly the files a test names, keyed by bare file name. */
function fakeFs({ files, exists = () => true } = {}) {
  const sizes =
    files ??
    Object.fromEntries(NOTIFY_CATALOG.map((entry, index) => [`${entry.id}.wav`, 1000 + index * 7]))
  return {
    exists,
    stat(path) {
      const fileName = path.split(/[\\/]/u).pop()
      if (!(fileName in sizes)) {
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`)
        error.code = 'ENOENT'
        throw error
      }
      return { size: sizes[fileName], isFile: () => true }
    },
  }
}

/** A context shaped like the Cordis one `apply` expects. */
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

/** One WAV body the test can inspect, with a count of how eagerly it was read. */
class CountingStream extends Readable {
  constructor(chunks) {
    super()
    this.chunks = [...chunks]
    this.reads = 0
  }

  _read() {
    this.reads += 1
    const next = this.chunks.shift()
    if (next === undefined) {
      this.push(null)
      return
    }
    this.push(next)
  }
}

// ---------------------------------------------------------------------------
// 1 — the catalog: a curated allowlist, in a deliberate order
// ---------------------------------------------------------------------------
{
  assert.equal(name, 'edh-notify')
  assert.deepEqual(inject, ['connection'], 'the routes need the Host connection')

  // Both paths must be ones the `/api` bridge can claim.
  for (const path of [NOTIFY_SOUNDS_PATH, NOTIFY_SOUND_PATH]) {
    assert.equal(path.startsWith('/api/'), true, `${path} is inside the shared channel`)
    assert.equal(path.endsWith('/'), false)
    for (const segment of path.slice('/api/'.length).split('/')) {
      assert.match(segment, /^[A-Za-z0-9_$.-]+$/u, `${path}: segment ${JSON.stringify(segment)} is registrable`)
    }
  }
  assert.equal(NOTIFY_SOUNDS_PATH, '/api/edh.notify/sounds')
  assert.equal(NOTIFY_SOUND_PATH, '/api/edh.notify/sound')

  // Exactly the eleven the feature offers, in this order: the Windows default
  // first, then the modern Windows set, then the older sounds. A 70-item list of
  // every WAV in the folder is the opposite of a feature.
  assert.deepEqual(
    NOTIFY_CATALOG.map(entry => entry.id),
    [
      'Windows Notify System Generic',
      'Windows Notify Calendar',
      'Windows Notify Email',
      'Windows Notify Messaging',
      'Windows Notify',
      'Windows Ding',
      'Windows Exclamation',
      'notify',
      'chimes',
      'ding',
      'tada',
    ],
    'the catalog is an allowlist in a deliberate order',
  )
  assert.deepEqual(
    NOTIFY_CATALOG.map(entry => entry.label),
    [
      'System notification',
      'Calendar',
      'Email',
      'Messaging',
      'Notification',
      'Ding',
      'Exclamation',
      'Notify (classic)',
      'Chimes',
      'Ding (classic)',
      'Tada',
    ],
    'labels are what a person reads, not file names',
  )
  assert.equal(new Set(NOTIFY_CATALOG.map(entry => entry.id)).size, NOTIFY_CATALOG.length, 'ids are unique')
  assert.equal(new Set(NOTIFY_CATALOG.map(entry => entry.label)).size, NOTIFY_CATALOG.length, 'labels are unique')
  for (const entry of NOTIFY_CATALOG) {
    assert.equal(entry.id.length <= MAX_SOUND_ID, true, `${entry.id} fits the id bound`)
    assert.equal(/[\\/:]/u.test(entry.id), false, `${entry.id} carries no separator`)
    assert.equal(entry.id.includes('..'), false)
  }

  // The media directory: `%WINDIR%\Media`, with a Windows default when the
  // environment says nothing.
  assert.equal(resolveMediaDir({ WINDIR: 'C:\\Windows' }), MEDIA)
  assert.equal(resolveMediaDir({}), resolve(join('C:\\Windows', 'Media')), 'a machine without WINDIR still names the default')
  assert.equal(resolveMediaDir({ WINDIR: '   ' }), resolve(join('C:\\Windows', 'Media')), 'a blank WINDIR is no WINDIR')
  assert.equal(resolveMediaDir({ WINDIR: 'D:\\Other' }), resolve(join('D:\\Other', 'Media')), 'another Windows drive is honoured')

  // The catalog view: shape, order, and the real sizes the injected stat reports.
  const fs = fakeFs()
  const catalog = soundCatalog({ env: { WINDIR: 'C:\\Windows' }, ...fs })
  assert.equal(catalog.available, true)
  assert.equal(catalog.note, undefined, 'a machine with every sound says nothing extra')
  assert.equal(catalog.sounds.length, NOTIFY_CATALOG.length)
  assert.deepEqual(Object.keys(catalog.sounds[0]).sort(), ['bytes', 'file', 'id', 'kind', 'label'])
  catalog.sounds.forEach((sound, index) => {
    const entry = NOTIFY_CATALOG[index]
    assert.equal(sound.id, entry.id, 'the curation order is preserved')
    assert.equal(sound.label, entry.label)
    assert.equal(sound.file, `${entry.id}.wav`, 'the file name is derived from our own id')
    assert.equal(sound.kind, 'system')
    assert.equal(sound.bytes, 1000 + index * 7, 'the size comes from stat, not a guess')
    assert.equal(typeof sound.bytes, 'number')
  })
  assert.equal(catalog.sounds.map(sound => sound.kind).every(kind => kind === 'system'), true)

  // The route answer carries `ok`, `available`, `sounds`, and no note.
  const answer = notifySoundsRequest({ method: 'GET', url: NOTIFY_SOUNDS_PATH }, { env: { WINDIR: 'C:\\Windows' }, ...fs })
  assert.equal(answer.status, 200)
  assert.equal(answer.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(answer.headers.get('cache-control'), 'no-store')
  const body = await answer.json()
  assert.equal(body.ok, true)
  assert.equal(body.available, true)
  assert.equal(body.sounds.length, 11)
  assert.equal('note' in body, false)
  assert.equal(JSON.stringify(body).includes('WINDIR'), false, 'no environment detail leaks out')
}

// ---------------------------------------------------------------------------
// 2 — a machine with no sound folder answers plainly instead of failing
// ---------------------------------------------------------------------------
{
  const missing = soundCatalog({ ...fakeFs(), exists: () => false })
  assert.equal(missing.available, false, 'no folder is `available: false`, not an error')
  assert.deepEqual(missing.sounds, [])
  assert.match(missing.note, /no Windows sound folder/u)
  assert.match(missing.note, /Media/u, 'the sentence names the folder it looked in')

  const answer = notifySoundsRequest({ method: 'GET', url: NOTIFY_SOUNDS_PATH }, { ...fakeFs(), exists: () => false })
  assert.equal(answer.status, 200, 'the route still answers 200 so the page can say it plainly')
  const body = await answer.json()
  assert.equal(body.ok, true)
  assert.equal(body.available, false)
  assert.deepEqual(body.sounds, [])
  assert.match(body.note, /no Windows sound folder/u)

  // An exists() that throws is the same answer, not a crash.
  const throwing = soundCatalog({
    ...fakeFs(),
    exists: () => {
      throw new Error('EACCES')
    },
  })
  assert.equal(throwing.available, false)
  assert.deepEqual(throwing.sounds, [])

  // The folder is there but every catalog file is missing: still available, no
  // sounds, and a note that explains it.
  const empty = soundCatalog({ exists: () => true, ...fakeFs({ files: {} }) })
  assert.equal(empty.available, true)
  assert.deepEqual(empty.sounds, [])
  assert.match(empty.note, /none of the sounds EDH offers/u)

  // One missing WAV is skipped, the rest still load — never a zeroed entry.
  const partial = Object.fromEntries(NOTIFY_CATALOG.map(entry => [`${entry.id}.wav`, 500]))
  delete partial['chimes.wav']
  const partialCatalog = soundCatalog({ exists: () => true, ...fakeFs({ files: partial }) })
  assert.equal(partialCatalog.sounds.some(sound => sound.id === 'chimes'), false, 'a missing sound is not offered')
  assert.equal(partialCatalog.sounds.length, NOTIFY_CATALOG.length - 1)
  assert.equal(partialCatalog.note, undefined)

  // A zero-byte file is not a sound.
  const zeroed = soundCatalog({ exists: () => true, ...fakeFs({ files: { 'ding.wav': 0 } }) })
  assert.equal(zeroed.sounds.some(sound => sound.id === 'ding'), false)

  // A directory where a file should be is not a sound either.
  const asDirectory = soundCatalog({
    exists: () => true,
    stat: path => (path.endsWith('ding.wav') ? { size: 12, isFile: () => false } : { size: 12, isFile: () => true }),
  })
  assert.equal(asDirectory.sounds.some(sound => sound.id === 'ding'), false)
}

// ---------------------------------------------------------------------------
// 3 — the traversal matrix: an id is a catalog key, never a path fragment
// ---------------------------------------------------------------------------
{
  const env = { WINDIR: 'C:\\Windows' }
  const hostile = [
    '../../windows/win.ini',
    '..\\..\\windows\\win.ini',
    'C:\\Windows\\Media\\ding.wav',
    'C:/Windows/Media/ding.wav',
    'ding.wav\u0000',
    '/etc/passwd',
    '\\\\server\\share\\ding.wav',
    'C:ding',
    'ding.wav',
    'ding.wav/..',
    'C$\\Windows\\ding.wav',
    '..%2fwindows%2fwin.ini',
    '%2e%2e%2f%2e%2e%2fwin.ini',
    '.',
    '..',
    'ding/../ding',
    'Windows Ding ',
    ' windows ding',
  ]
  for (const id of hostile) {
    assert.equal(soundFilePath(id, { env, ...fakeFs() }), undefined, `${JSON.stringify(id)} is not a path`)
    const answer = notifySoundResponse({ method: 'GET', url: `/api/edh.notify/sound?id=${encodeURIComponent(id)}` }, { env, ...fakeFs() })
    assert.equal(answer.status, 404, `${JSON.stringify(id)} is a 404`)
    // The refusal is one fixed sentence: nothing from the request and nothing
    // from this machine's filesystem can appear in it.
    const body = await answer.json()
    assert.deepEqual(body, {
      ok: false,
      reason: 'not-found',
      message: 'No sound with that id is offered here; ask /api/edh.notify/sounds for the list.',
    })
    const text = JSON.stringify(body)
    assert.equal(text.includes('\\'), false, 'no path separator appears in the answer')
    assert.equal(text.includes('Windows'), false, 'no folder name appears in the answer')
    assert.equal(text.includes('Media'), false)
  }

  // The safe-id gate itself, one rule at a time.
  assert.equal(soundFilePath('ding', { env, ...fakeFs() }).endsWith(`ding.wav`), true)
  for (const bad of [undefined, null, 42, '', 'x'.repeat(MAX_SOUND_ID + 1), 'a:b', 'a/b', 'a\\b', 'a..b', 'a\u0000b', 'a\nb']) {
    assert.equal(soundFilePath(bad, { env, ...fakeFs() }), undefined)
  }
  assert.equal(soundFilePath('x'.repeat(MAX_SOUND_ID), { env, ...fakeFs() }), undefined, 'a long id is refused before the lookup')

  // A real id resolves inside the media directory, and nowhere else.
  for (const entry of NOTIFY_CATALOG) {
    const path = soundFilePath(entry.id, { env, ...fakeFs() })
    assert.equal(path, join(MEDIA, `${entry.id}.wav`))
    assert.equal(path.startsWith(`${MEDIA}${sep}`), true, `${entry.id} resolves inside the media folder`)
  }
  assert.equal(catalogEntry('ding').label, 'Ding (classic)')
  assert.equal(catalogEntry('ding.wav'), undefined, 'the id is the name without the extension')
  assert.equal(catalogEntry('../ding'), undefined)
}

// ---------------------------------------------------------------------------
// 4 — one WAV: GET streams it, HEAD describes it, everything else is a 405
// ---------------------------------------------------------------------------
{
  const env = { WINDIR: 'C:\\Windows' }
  const files = { 'ding.wav': 70_060 }
  const bytes = [Buffer.alloc(100, 1), Buffer.alloc(100, 2), Buffer.alloc(100, 3)]
  let opened = 0
  let stream
  const openStream = path => {
    opened += 1
    assert.equal(path, join(MEDIA, 'ding.wav'), 'the stream is opened on the catalog path')
    stream = new CountingStream(bytes)
    return stream
  }
  const options = { env, ...fakeFs({ files }), createStream: openStream }

  const answer = notifySoundResponse({ method: 'GET', url: '/api/edh.notify/sound?id=ding' }, options)
  assert.equal(answer.status, 200)
  assert.equal(answer.headers.get('content-type'), NOTIFY_SOUND_TYPE)
  assert.equal(answer.headers.get('content-type'), 'audio/wav')
  assert.equal(answer.headers.get('content-length'), '70060', 'content-length is the stat size')
  assert.equal(answer.headers.get('cache-control'), NOTIFY_SOUND_CACHE)
  assert.equal(answer.headers.get('cache-control'), 'private, max-age=86400')
  assert.equal(typeof answer.body.getReader, 'function', 'the body is a stream, not a string')
  assert.equal(opened, 1, 'the file is opened once')
  assert.equal(stream.reads, 0, 'and nothing is read before the bridge asks for bytes')

  const received = Buffer.from(await answer.arrayBuffer())
  assert.equal(received.length, 300, 'every byte arrives')
  assert.equal(received.equals(Buffer.concat(bytes)), true)
  assert.equal(stream.reads > 0, true, 'the stream was pulled lazily while the body was read')

  // HEAD: the same headers, no body, and no file opened at all.
  let headOpened = 0
  const head = notifySoundResponse(
    { method: 'HEAD', url: '/api/edh.notify/sound?id=ding' },
    {
      env,
      ...fakeFs({ files }),
      createStream: () => {
        headOpened += 1
        return new CountingStream(bytes)
      },
    },
  )
  assert.equal(head.status, 200)
  assert.equal(head.body, null, 'HEAD carries no body')
  assert.equal(head.headers.get('content-length'), '70060', 'but describes the body exactly')
  assert.equal(head.headers.get('content-type'), 'audio/wav')
  assert.equal(head.headers.get('cache-control'), NOTIFY_SOUND_CACHE)
  assert.equal(headOpened, 0, 'HEAD never opens the file')

  // Wrong methods answer 405 with the methods that would have worked.
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const rejected = notifySoundResponse({ method, url: '/api/edh.notify/sound?id=ding' }, options)
    assert.equal(rejected.status, 405, `${method} is a 405`)
    assert.equal(rejected.headers.get('allow'), 'GET, HEAD')
    const body = await rejected.json()
    assert.equal(body.reason, 'unsupported-method')
    assert.match(body.message, new RegExp(method, 'u'))
  }
  const catalogPost = notifySoundsRequest({ method: 'POST', url: NOTIFY_SOUNDS_PATH }, options)
  assert.equal(catalogPost.status, 405)
  assert.equal(catalogPost.headers.get('allow'), 'GET, HEAD')

  // 404s: no id, a repeated id, an unknown id, a file that cannot be opened.
  for (const url of [
    '/api/edh.notify/sound',
    '/api/edh.notify/sound?id=',
    '/api/edh.notify/sound?id=ding&id=chimes',
    '/api/edh.notify/sound?other=ding',
    '/api/edh.notify/sound?id=nope',
    '/api/edh.notify/sound?id=ding?extra=1',
  ]) {
    const missing = notifySoundResponse({ method: 'GET', url }, options)
    assert.equal(missing.status, 404, `${url} is a 404`)
  }
  const unopenable = notifySoundResponse(
    { method: 'GET', url: '/api/edh.notify/sound?id=ding' },
    {
      env,
      ...fakeFs({ files }),
      createStream: () => {
        throw new Error('EACCES: permission denied')
      },
    },
  )
  assert.equal(unopenable.status, 404, 'a file that will not open is a 404, not a 500')
  assert.equal((await unopenable.json()).reason, 'not-found')

  // A file that disappeared between stat and open is the same answer.
  const vanished = notifySoundResponse(
    { method: 'GET', url: '/api/edh.notify/sound?id=ding' },
    {
      env,
      exists: () => true,
      stat: () => {
        throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      },
    },
  )
  assert.equal(vanished.status, 404)
}

// ---------------------------------------------------------------------------
// 5 — a failing stream or stat never escapes as a 500
// ---------------------------------------------------------------------------
{
  const env = { WINDIR: 'C:\\Windows' }
  const warnings = []
  const logger = { warn: (...args) => warnings.push(args.map(String).join(' ')) }

  // toWeb on a stream that errors: the error is logged, and the bridge is not
  // handed an unhandled `error` event on a Readable (which would crash the Host).
  const broken = new CountingStream([Buffer.from('a')])
  const web = openSoundStream('C:\\Windows\\Media\\ding.wav', { createStream: () => broken, logger })
  assert.equal(typeof web.getReader, 'function')
  broken.destroy(new Error('EIO'))
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(warnings.length, 1, 'a read failure is logged once')
  assert.match(warnings[0], /reading a system sound failed/u)

  // A createStream that throws synchronously is `undefined`, not an exception.
  assert.equal(
    openSoundStream('x', {
      createStream: () => {
        throw new Error('EMFILE')
      },
      logger,
    }),
    undefined,
  )

  // A stat that throws inside the sound route is a 404, and the catalog route
  // turns an unexpected throw into a JSON report rather than an error status.
  const statThrows = notifySoundResponse(
    { method: 'GET', url: '/api/edh.notify/sound?id=ding' },
    {
      env,
      stat: () => {
        throw new Error('EACCES')
      },
    },
  )
  assert.equal(statThrows.status, 404)

  const catalogThrows = notifySoundsRequest(
    { method: 'GET', url: NOTIFY_SOUNDS_PATH },
    {
      env,
      exists: () => true,
      stat: () => {
        throw new Error('EACCES')
      },
    },
  )
  assert.equal(catalogThrows.status, 200, 'a catalog that cannot be read is still a JSON answer')
  assert.deepEqual((await catalogThrows.json()).sounds, [])

  // The sounds route never 500s, whatever the filesystem does.
  const explode = notifySoundsRequest(
    { method: 'GET', url: NOTIFY_SOUNDS_PATH },
    {
      env,
      get exists() {
        throw new Error('boom')
      },
    },
  )
  assert.equal(explode.status, 200, 'even an exploding seam is a JSON answer, never a 500')
  const explodeBody = await explode.json()
  assert.equal(explodeBody.ok, false)
  assert.equal(explodeBody.available, false)
  assert.equal(explodeBody.reason, 'error')
  assert.deepEqual(explodeBody.sounds, [])
  assert.match(explodeBody.note, /could not be read/u, 'and the note is the sentence the page shows')
}

// ---------------------------------------------------------------------------
// 6 — the row: two registrations, disposal, and no services at all
// ---------------------------------------------------------------------------
{
  const { ctx, routes, disposers, warnings } = createContext()
  apply(ctx)

  assert.equal(routes.length, 2, 'both routes are registered')
  assert.deepEqual(routes.map(route => route.path), [NOTIFY_SOUNDS_PATH, NOTIFY_SOUND_PATH])
  for (const route of routes) {
    assert.deepEqual(
      [...route.methods],
      ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      'every method is claimed so a wrong one gets a 405 rather than a 404',
    )
    assert.equal(route.requestBody, 'buffered')
    assert.equal(typeof route.fetch, 'function')
  }
  assert.equal(warnings.length, 0, `nothing warned: ${warnings.join(' | ')}`)

  // The registered handlers are the exported ones.
  const catalogAnswer = await routes[0].fetch(new Request(`http://127.0.0.1${NOTIFY_SOUNDS_PATH}`))
  assert.equal(catalogAnswer.status, 200)
  assert.equal(typeof (await catalogAnswer.json()).available, 'boolean')

  for (const dispose of [...disposers].reverse()) dispose()
  assert.equal(routes.length, 0, 'disposal unregisters both routes')

  // One refused path does not cost the other.
  const half = createContext({
    register(route) {
      if (route.path === NOTIFY_SOUNDS_PATH) throw new Error('connection: exact Fetch route already registered')
      return () => {}
    },
  })
  apply(half.ctx)
  assert.equal(half.routes.length, 0, 'the throwing registration registered nothing')
  assert.equal(half.warnings.length, 1, 'and said so')
  assert.match(half.warnings[0], /registration failed/u)
  for (const dispose of [...half.disposers].reverse()) dispose()

  // A disposer that throws is swallowed: turning the row off must not escalate.
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

  // No services: the module must load on any Host without throwing.
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
  assert.equal(logged.length, 2, 'both routes report their own refusal')
  assert.equal(logged.every(line => /registration failed/u.test(line)), true)

  // And with no context hooks at all, the pure handlers still answer.
  assert.equal((await notifySoundsRequest({ method: 'GET', url: NOTIFY_SOUNDS_PATH }, { env: { WINDIR: 'C:\\Windows' }, ...fakeFs() })).status, 200)
  assert.equal(notifySoundResponse({ method: 'GET', url: '/api/edh.notify/sound?id=../../win.ini' }, { env: { WINDIR: 'C:\\Windows' }, ...fakeFs() }).status, 404)
}

// ---------------------------------------------------------------------------
// 7 — a WAV is streamed, never read whole: the module cannot buffer one
// ---------------------------------------------------------------------------
{
  // A structural guard, not a behavioural one: if anyone ever swaps the stream
  // for a whole-file read, this fails even if every other assertion still passes.
  const source = readFileSync(join(ROOT, 'notify.js'), 'utf8')
  assert.equal(/readFileSync\s*\(/u.test(source), false, 'no whole-file read')
  assert.equal(/readFile\s*\(/u.test(source), false, 'no promise-based whole-file read')
  assert.equal(source.includes('createReadStream'), true, 'the bytes come from a stream')

  // Nothing in the module reaches beyond the media directory with user input.
  // Every `join(` must take a name built by `fileNameOf(...)`: a bare id in a
  // path join is the bug this feature must never grow, so it is refused here
  // even though the behavioural tests already cover today's code.
  const joins = [...source.matchAll(/join\(([^)]*)\)/gu)].map(match => match[1])
  assert.equal(joins.length > 0, true, 'the module does build file paths')
  for (const args of joins) {
    assert.equal(
      args.includes('fileNameOf(') || /\bid\b/u.test(args) === false,
      true,
      `join(${args.trim()}) takes a catalog name, never a request value`,
    )
  }
}

console.log('edh notify: all checks passed')
