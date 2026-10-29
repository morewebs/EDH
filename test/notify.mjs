import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { zstdCompressSync } from 'node:zlib'
import {
  apply,
  assistantTextOf,
  catalogEntry,
  clipBody,
  decodeWindow,
  findFrameStart,
  inject,
  isSafeKey,
  LAST_TEXT_LIMIT,
  LAST_WINDOW_BYTES,
  lastActivityOf,
  locateSessionPath,
  MAX_SESSION_ID,
  MAX_SOUND_ID,
  name,
  NOTIFY_CATALOG,
  NOTIFY_LAST_PATH,
  NOTIFY_SOUND_CACHE,
  NOTIFY_SOUND_PATH,
  NOTIFY_SOUND_TYPE,
  NOTIFY_SOUNDS_PATH,
  notifyLastResponse,
  notifySoundResponse,
  notifySoundsRequest,
  openSoundStream,
  readLastWindow,
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
// 6 — the row: three registrations, disposal, and no services at all
// ---------------------------------------------------------------------------
{
  const { ctx, routes, disposers, warnings } = createContext()
  apply(ctx)

  assert.equal(routes.length, 3, 'all three routes are registered')
  assert.deepEqual(routes.map(route => route.path), [NOTIFY_SOUNDS_PATH, NOTIFY_SOUND_PATH, NOTIFY_LAST_PATH])
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

  // The last-message route resolves the persistence service lazily, per request,
  // so a Host that mounts it later still answers.
  const lastAnswer = await routes[2].fetch(new Request(`http://127.0.0.1${NOTIFY_LAST_PATH}?sessionId=session-abc`))
  assert.equal(lastAnswer.status, 200)
  assert.equal((await lastAnswer.json()).reason, 'unavailable', 'a context without the service says so')

  for (const dispose of [...disposers].reverse()) dispose()
  assert.equal(routes.length, 0, 'disposal unregisters every route')

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
  assert.equal(logged.length, 3, 'every route reports its own refusal')
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

// ---------------------------------------------------------------------------
// 8 — the tail window: a frame boundary found structurally, never by magic alone
// ---------------------------------------------------------------------------
{
  /** One synthetic Session artifact: JSON batches, one Zstandard frame per batch. */
  const zstdLog = batches => Buffer.concat(batches.map(batch => zstdCompressSync(Buffer.from(`${batch.join('\n')}\n`))))

  /** A fake artifact on disk, with exactly the fs calls `readLastWindow` makes. */
  const fakeFile = bytes => {
    const calls = { reads: 0, bytes: 0, positions: [] }
    return {
      calls,
      open: () => ({ fd: 7 }),
      fstat: () => ({ size: bytes.length }),
      read(handle, buffer, offset, length, position) {
        calls.reads += 1
        calls.positions.push(position)
        const slice = bytes.subarray(position, position + length)
        slice.copy(buffer, offset)
        calls.bytes += slice.length
        return slice.length
      },
      close() {
        calls.closed = true
      },
    }
  }

  const assistant = text => ({
    type: 'assistant/message',
    seq: 9,
    data: { message: { source: { kind: 'model' }, content: [{ type: 'text', text }] } },
  })
  const title = value => ({ type: 'session/title', seq: 3, data: { title: value } })

  const log = zstdLog([
    [JSON.stringify(title('First title')), JSON.stringify(assistant('first answer'))],
    [JSON.stringify({ type: 'turn/end', seq: 4 })],
    [JSON.stringify(title('Latest title')), JSON.stringify(assistant('newest answer'))],
  ])

  // A file shorter than the window is read whole — which is correct, it IS whole.
  {
    const file = fakeFile(log)
    const read = readLastWindow('C:\\sessions\\x.log', { window: LAST_WINDOW_BYTES, ...file })
    assert.equal(read.ok, true)
    assert.equal(read.wholeFile, true)
    assert.equal(read.size, log.length)
    assert.equal(read.buffer.length, log.length, 'a short log is the whole log')
    assert.equal(file.calls.closed, true, 'the handle is always closed')
  }

  // A file longer than the window: only the tail is read, from an exact offset.
  {
    const file = fakeFile(log)
    const window = 20
    const read = readLastWindow('C:\\sessions\\x.log', { window, ...file })
    assert.equal(read.wholeFile, false, 'a long log is a window, not a file')
    assert.equal(file.calls.bytes, window, 'exactly the window was read')
    assert.equal(file.calls.positions[0], log.length - window, 'and it started at size minus window')
    assert.equal(read.buffer.equals(log.subarray(log.length - window)), true)
    assert.equal(read.buffer.length, window)
  }

  // The window's first byte is inside a frame: the boundary is found by parsing.
  {
    const halves = Buffer.concat([
      zstdCompressSync(Buffer.from('{"a":1}\n')),
      zstdCompressSync(Buffer.from('{"b":2}\n')),
      zstdCompressSync(Buffer.from('{"c":3}\n')),
    ])
    // Where the three synthetic frames actually begin, so the fixture does not
    // depend on a compressed length.
    const starts = []
    for (let at = 0; at + 4 <= halves.length; at += 1) {
      if (halves.readUInt32LE(at) === 0xfd2fb528) starts.push(at)
    }
    assert.equal(starts.length, 3, 'three frames were written')
    const mid = starts[0] + 3
    const window = halves.subarray(mid)
    assert.equal(findFrameStart(window), starts[1] - mid, 'the next real boundary is found')
    assert.equal(window.readUInt32LE(starts[1] - mid), 0xfd2fb528, 'and it really is a frame start')
    assert.deepEqual(
      decodeWindow(window, starts[1] - mid).records,
      [{ b: 2 }, { c: 3 }],
      'and everything from there decodes',
    )
  }

  // No frame at all: no boundary, so the caller answers with no text rather than
  // decoding noise.
  assert.equal(findFrameStart(Buffer.from('not a session log at all')), -1)
  assert.equal(findFrameStart(Buffer.from([0x28, 0xb5])), -1, 'a truncated magic is not a boundary')

  // A frame magic *inside* other bytes is only a candidate: it is proposed, the
  // parser refuses it, and the real frame behind it is found.
  {
    const real = zstdCompressSync(Buffer.from('{"a":1}\n'))
    const decoy = Buffer.concat([Buffer.from([0x28, 0xb5, 0x2f, 0xfd]), Buffer.from('junkjunk'), real])
    assert.equal(findFrameStart(decoy), 12, 'the false candidate is skipped, the real frame found')
  }

  // A torn append (an interrupted write) is left alone and does not stop the read.
  {
    const whole = Buffer.concat([
      zstdCompressSync(Buffer.from('{"a":1}\n')),
      zstdCompressSync(Buffer.from('{"b":2}\n')),
    ])
    const torn = whole.subarray(0, whole.length - 5)
    assert.equal(findFrameStart(torn), 0)
    const decoded = decodeWindow(torn, 0)
    assert.equal(decoded.torn, true, 'the torn tail is reported')
    assert.deepEqual(decoded.records, [{ a: 1 }], 'and the complete frame before it is still read')
  }
}

// ---------------------------------------------------------------------------
// 9 — the message: newest wins, tool-only messages are skipped, the body is capped
// ---------------------------------------------------------------------------
{
  const assistant = (content, extra = {}) => ({
    type: 'assistant/message',
    seq: 1,
    data: { message: { content }, ...extra },
  })
  const textBlock = text => ({ type: 'text', text })

  assert.equal(assistantTextOf(assistant([textBlock('hello')])), 'hello')
  assert.equal(
    assistantTextOf(assistant([textBlock('first'), { type: 'tool-call', name: 'bash' }, textBlock('second')])),
    'first\nsecond',
    'text blocks are joined and other blocks ignored',
  )
  assert.equal(assistantTextOf(assistant([{ type: 'tool-call', name: 'bash' }])), undefined, 'a tool-only message has no text')
  assert.equal(assistantTextOf(assistant([])), undefined)
  assert.equal(assistantTextOf(assistant([{ type: 'text' }])), undefined, 'a text block with no text is nothing')
  assert.equal(assistantTextOf({ type: 'user/message', data: { message: { content: [textBlock('x')] } } }), undefined)
  assert.equal(assistantTextOf({ type: 'assistant/message' }), undefined)
  assert.equal(assistantTextOf(undefined), undefined)
  const tool = assistant([{ type: 'tool-call', name: 'bash' }])
  assert.equal(assistantTextOf(tool), undefined, 'a message with only tool calls is skipped, so the caller keeps looking back')

  // Whitespace is collapsed: a notification shows one line, not paragraphs.
  assert.deepEqual(clipBody('line one\n\nline two'), { text: 'line one line two', truncated: false })
  assert.deepEqual(clipBody('  lots\t\tof   space  '), { text: 'lots of space', truncated: false })
  assert.deepEqual(clipBody(''), { text: '', truncated: false })
  const long = 'x'.repeat(LAST_TEXT_LIMIT + 50)
  const clipped = clipBody(long)
  assert.equal(clipped.text.length, LAST_TEXT_LIMIT, 'the cap is exact')
  assert.equal(clipped.truncated, true, 'and it says it cut')
  assert.deepEqual(clipBody('x'.repeat(LAST_TEXT_LIMIT)), { text: 'x'.repeat(LAST_TEXT_LIMIT), truncated: false })

  // Newest wins, and a newer message without text is skipped rather than returned empty.
  const records = [
    assistant([textBlock('older answer')]),
    assistant([{ type: 'tool-call', name: 'bash' }]),
    { type: 'session/title', data: { title: 'Old title' } },
    { type: 'session/title', data: { title: 'New title' } },
  ]
  assert.deepEqual(lastActivityOf(records), { text: 'older answer', truncated: false, title: 'New title' })
  assert.deepEqual(
    lastActivityOf([assistant([textBlock('a')]), assistant([textBlock('b')])]),
    { text: 'b', truncated: false },
    'the newest message with text wins',
  )
  assert.deepEqual(lastActivityOf([]), { text: '', truncated: false }, 'empty only when there is none')
  assert.deepEqual(
    lastActivityOf([assistant([{ type: 'tool-call', name: 'bash' }])]),
    { text: '', truncated: false },
    'a window of tool calls only is empty, not a guess',
  )
  assert.deepEqual(
    lastActivityOf([assistant([textBlock('partial answer')], { interrupted: true })]),
    { text: 'partial answer', truncated: false },
    'an interrupted message is used when it has text — that is what the person saw',
  )
}

// ---------------------------------------------------------------------------
// 10 — the last-message route: bounded, resolved through persistence, never a path
// ---------------------------------------------------------------------------
{
  const zstdLog = batches => Buffer.concat(batches.map(batch => zstdCompressSync(Buffer.from(`${batch.join('\n')}\n`))))
  const assistant = text => ({
    type: 'assistant/message',
    seq: 9,
    data: { message: { content: [{ type: 'text', text }] } },
  })
  const fakeFile = bytes => {
    const calls = { reads: 0, bytes: 0, positions: [] }
    return {
      calls,
      open: () => ({ fd: 7 }),
      fstat: () => ({ size: bytes.length }),
      read(handle, buffer, offset, length, position) {
        calls.reads += 1
        calls.positions.push(position)
        const slice = bytes.subarray(position, position + length)
        slice.copy(buffer, offset)
        calls.bytes += slice.length
        return slice.length
      },
      close() {},
    }
  }

  /** A stand-in for `ctx.sessionPersistence`: one known session, located by the backend's own hook. */
  const fakePersistence = ({ id = 'session-abc', cwd = 'C:\\work\\proj', path = 'C:\\sessions\\x.log', withList = true } = {}) => {
    const calls = { list: 0, locate: [] }
    const persistence = {
      calls,
      async list() {
        calls.list += 1
        return [{ id, cwd, createdAt: 1 }]
      },
      locate(meta) {
        calls.locate.push(meta)
        return { kind: 'jsonl', path }
      },
    }
    if (withList !== true) delete persistence.list
    return persistence
  }

  const ask = (options, url = `${NOTIFY_LAST_PATH}?sessionId=session-abc`) =>
    notifyLastResponse({ method: 'GET', url }, options)

  // The happy path: the newest answer in the newest frame, plus the title.
  {
    const log = zstdLog([
      [JSON.stringify(assistant('older answer'))],
      [JSON.stringify({ type: 'turn/end', seq: 5 })],
      [JSON.stringify({ type: 'session/title', data: { title: 'Refactor the proxy' } }), JSON.stringify(assistant('The proxy now compresses every response.'))],
    ])
    const persistence = fakePersistence()
    const file = fakeFile(log)
    const answer = await ask({ persistence, ...file })
    assert.equal(answer.status, 200)
    const body = await answer.json()
    assert.deepEqual(Object.keys(body).sort(), ['ok', 'sessionId', 'text', 'title', 'truncated'])
    assert.equal(body.ok, true)
    assert.equal(body.sessionId, 'session-abc')
    assert.equal(body.text, 'The proxy now compresses every response.')
    assert.equal(body.truncated, false)
    assert.equal(body.title, 'Refactor the proxy')
    assert.equal(persistence.calls.list, 1, 'the header is read once, for the cwd the backend needs')
    assert.deepEqual(persistence.calls.locate, [{ id: 'session-abc', cwd: 'C:\\work\\proj' }], 'locate gets a session and its cwd, never a request path')
    assert.equal(file.calls.bytes, log.length, 'a short log is read whole — it is the whole file')
  }

  // A message outside the window is empty, and the read stays inside the window.
  {
    const log = zstdLog([
      [JSON.stringify(assistant('an answer from long ago'))],
      [JSON.stringify({ type: 'turn/end' })],
      [JSON.stringify({ type: 'turn/start' })],
    ])
    const file = fakeFile(log)
    const answer = await ask({ persistence: fakePersistence(), window: 20, ...file })
    const body = await answer.json()
    assert.equal(body.ok, true)
    assert.equal(body.text, '', 'no text in the window is an empty body, not an error')
    assert.equal(body.truncated, false)
    assert.equal(file.calls.bytes, 20, 'and the read never grew past the window')
    assert.equal(file.calls.bytes < log.length, true, 'the whole file was never read')
  }

  // A torn last frame: the previous complete answer is used.
  {
    const whole = zstdLog([[JSON.stringify(assistant('the last complete answer'))], [JSON.stringify(assistant('cut off mid-'))]])
    const torn = whole.subarray(0, whole.length - 6)
    const body = await (await ask({ persistence: fakePersistence(), ...fakeFile(torn) })).json()
    assert.equal(body.ok, true)
    assert.equal(body.text, 'the last complete answer', 'a torn append is skipped, not decoded')
  }

  // A long answer is capped, and says so.
  {
    const long = 'word '.repeat(400)
    const log = zstdLog([[JSON.stringify(assistant(long))]])
    const body = await (await ask({ persistence: fakePersistence(), ...fakeFile(log) })).json()
    assert.equal(body.truncated, true)
    assert.equal(body.text.length <= LAST_TEXT_LIMIT, true, 'never longer than the cap')
    assert.equal(body.text.length > LAST_TEXT_LIMIT - 2, true, 'and the cap was actually used, not shot short')
  }

  // A tool-only newest message falls back to the previous answer.
  {
    const log = zstdLog([
      [JSON.stringify(assistant('what I said before the tool'))],
      [JSON.stringify({ type: 'assistant/message', data: { message: { content: [{ type: 'tool-call', name: 'bash' }] } } })],
    ])
    const body = await (await ask({ persistence: fakePersistence(), ...fakeFile(log) })).json()
    assert.equal(body.text, 'what I said before the tool')
  }

  // HEAD is answered like GET (the server drops the body); any other method is a 405.
  {
    const head = await ask({ persistence: fakePersistence(), ...fakeFile(zstdLog([[JSON.stringify(assistant('a HEAD answer'))]])) }, `${NOTIFY_LAST_PATH}?sessionId=session-abc`)
    const headRequest = await notifyLastResponse(
      { method: 'HEAD', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
      { persistence: fakePersistence(), ...fakeFile(zstdLog([[JSON.stringify(assistant('a HEAD answer'))]])) },
    )
    assert.equal(head.status, 200)
    assert.equal(headRequest.status, 200, 'HEAD is answered like GET')
  }
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const rejected = await notifyLastResponse({ method, url: NOTIFY_LAST_PATH }, {})
    assert.equal(rejected.status, 405, `${method} is a 405`)
    assert.equal(rejected.headers.get('allow'), 'GET, HEAD')
    assert.equal((await rejected.json()).reason, 'unsupported-method')
  }
}

// ---------------------------------------------------------------------------
// 11 — the last-message route never fails loudly
// ---------------------------------------------------------------------------
{
  const fakeFile = bytes => ({
    open: () => ({ fd: 7 }),
    fstat: () => ({ size: bytes.length }),
    read(handle, buffer, offset, length, position) {
      const slice = bytes.subarray(position, position + length)
      slice.copy(buffer, offset)
      return slice.length
    },
    close() {},
  })
  const persistenceFor = (path = 'C:\\sessions\\x.log') => ({
    async list() {
      return [{ id: 'session-abc', cwd: 'C:\\work\\proj' }]
    },
    locate: () => ({ kind: 'jsonl', path }),
  })
  const uuid = 'ab12cd34-ef56-7890-ab12-cd34ef567890'

  // The traversal matrix: every hostile shape is bad input, and the answer echoes
  // neither the value nor this machine's paths.
  const hostile = [
    '../../windows/win.ini',
    '..\\..\\windows\\win.ini',
    'C:\\sessions\\x.log',
    '/etc/passwd',
    `${uuid}\u0000`,
    '..',
    '.',
    'session-abc/../session-def',
    'session-abc:zone',
    '\\\\server\\share\\x.log',
    'x'.repeat(MAX_SESSION_ID + 1),
  ]
  const BAD_INPUT = 'A "sessionId" query value is required, once, and must look like a session id.'
  const NOT_FOUND = 'No stored Session has that id.'
  for (const value of hostile) {
    const answer = await notifyLastResponse(
      { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=${encodeURIComponent(value)}` },
      { persistence: persistenceFor(), ...fakeFile(Buffer.from('')) },
    )
    // A hostile shape is either refused outright (400) or simply never matches a
    // stored Session (404); both are refusals, and neither names a path.
    assert.equal([400, 404].includes(answer.status), true, `${JSON.stringify(value)} is refused`)
    const body = await answer.json()
    assert.equal(body.ok, false)
    assert.equal(['bad-input', 'not-found'].includes(body.reason), true, `${JSON.stringify(value)}: ${body.reason}`)
    // The sentence is one of two fixed constants: nothing is interpolated into it,
    // so neither the request value nor this machine's paths can appear.
    assert.equal(body.message, body.reason === 'bad-input' ? BAD_INPUT : NOT_FOUND)
    assert.equal(body.message.includes('\\'), false, 'no path separator in the answer')
    assert.equal(body.message.includes('C:'), false, 'no drive path in the answer')
  }
  assert.equal(isSafeKey(uuid, MAX_SESSION_ID), true, 'a real session id passes the shape gate')
  assert.equal(isSafeKey('session-abc', MAX_SESSION_ID), true)

  // A missing or repeated key is bad input, not an empty answer.
  for (const url of [NOTIFY_LAST_PATH, `${NOTIFY_LAST_PATH}?sessionId=`, `${NOTIFY_LAST_PATH}?sessionId=a&sessionId=b`]) {
    assert.equal((await notifyLastResponse({ method: 'GET', url }, { persistence: persistenceFor() })).status, 400, url)
  }

  // A session the persistence does not know is a 404, twice over: no header, and
  // no path from the hook.
  const unknown = await notifyLastResponse(
    { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
    {
      persistence: { async list() { return [] }, locate: () => ({ kind: 'jsonl', path: 'C:\\x.log' }) },
    },
  )
  assert.equal(unknown.status, 404)
  assert.equal((await unknown.json()).reason, 'not-found')
  const noPath = await notifyLastResponse(
    { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
    { persistence: { async list() { return [{ id: 'session-abc', cwd: 'C:\\w' }] }, locate: () => ({ kind: 'jsonl' }) } },
  )
  assert.equal(noPath.status, 404)
  const missingFile = await notifyLastResponse(
    { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
    {
      persistence: persistenceFor(),
      open: () => {
        throw Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' })
      },
    },
  )
  assert.equal(missingFile.status, 404, 'a log that is not there is a 404')
  assert.equal((await missingFile.json()).reason, 'not-found')

  // A deployment without the service answers `unavailable`, and so does one whose
  // service cannot locate.
  for (const persistence of [undefined, null, {}, { list: async () => [] }]) {
    const answer = await notifyLastResponse({ method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` }, { persistence })
    assert.equal(answer.status, 200)
    const body = await answer.json()
    assert.equal(body.ok, false)
    assert.equal(body.reason, 'unavailable')
  }

  // A persistence that throws is a report, never an exception into the bridge.
  const throwing = await notifyLastResponse(
    { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
    {
      persistence: {
        async list() {
          throw new Error('root is unreadable')
        },
        locate: () => ({ kind: 'jsonl', path: 'C:\\x.log' }),
      },
    },
  )
  assert.equal(throwing.status, 200)
  const throwingBody = await throwing.json()
  assert.equal(throwingBody.ok, false)
  assert.equal(throwingBody.reason, 'error')
  assert.match(throwingBody.message, /could not be read/u)

  // An empty artifact is "no activity yet", not a crash and not a 500.
  const empty = await notifyLastResponse(
    { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
    { persistence: persistenceFor(), ...fakeFile(Buffer.alloc(0)) },
  )
  assert.equal(empty.status, 200)
  const emptyBody = await empty.json()
  assert.equal(emptyBody.ok, false)
  assert.equal(emptyBody.reason, 'error')
  assert.match(emptyBody.message, /no stored activity/u)

  // A decoder that refuses every frame degrades to "nothing to say" — an empty
  // body the client falls back on — rather than throwing out of the route.
  const badDecode = await notifyLastResponse(
    { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
    {
      persistence: persistenceFor(),
      ...fakeFile(zstdCompressSync(Buffer.from('{"a":1}\n'))),
      decompress: () => {
        throw new Error('zstd: corrupt')
      },
    },
  )
  assert.equal(badDecode.status, 200)
  const badDecodeBody = await badDecode.json()
  assert.equal(badDecodeBody.ok, true)
  assert.equal(badDecodeBody.text, '', 'an unreadable body is empty, and the client falls back')
  assert.equal(badDecodeBody.truncated, false)

  // The budget guard: a slow Host answers fast instead of making the caller wait.
  let clock = 1_000
  const slow = await notifyLastResponse(
    { method: 'GET', url: `${NOTIFY_LAST_PATH}?sessionId=session-abc` },
    {
      persistence: {
        async list() {
          clock += 5_000
          return [{ id: 'session-abc', cwd: 'C:\\w' }]
        },
        locate: () => ({ kind: 'jsonl', path: 'C:\\sessions\\x.log' }),
      },
      now: () => clock,
      ...fakeFile(zstdCompressSync(Buffer.from('{"a":1}\n'))),
    },
  )
  assert.equal(slow.status, 200)
  const slowBody = await slow.json()
  assert.equal(slowBody.ok, false)
  assert.equal(slowBody.reason, 'error')
  assert.match(slowBody.message, /too long/u)

  // A service with no list() still resolves through locate, with no cwd invented.
  const noList = await locateSessionPath(
    {
      locate(meta) {
        assert.deepEqual(meta, { id: 'session-abc' }, 'no cwd is invented when there is no list')
        return { kind: 'jsonl', path: 'C:\\sessions\\x.log' }
      },
    },
    'session-abc',
  )
  assert.deepEqual(noList, { ok: true, path: 'C:\\sessions\\x.log' })
  assert.deepEqual(await locateSessionPath(undefined, 'session-abc'), { ok: false, reason: 'unavailable' })
}

console.log('edh notify: all checks passed')
