import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  apply,
  applyUpdate,
  isClientPath,
  LOADED_VERSION,
  needsRestart,
  PACKAGE_DIR,
  readInstalled,
  REQUIRES_RESTART,
  statusResponse,
  updateApplied,
  updateFailure,
  updateMethod,
  updateResponse,
  updateStatus,
  UPDATE_PATH,
  versionOnDisk,
} from '../update.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))

/** Throwaway package directories, removed however this suite ends. */
const fixtures = []

/** A package directory on disk: a manifest, and a `.git` entry when asked for one. */
function makePackage({ version = '0.4.0', checkout = true, manifest = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'edh-update-'))
  fixtures.push(dir)
  if (manifest) writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: '@moreweb/edh', version }))
  if (checkout) mkdirSync(join(dir, '.git'))
  return dir
}

process.on('exit', () => {
  for (const dir of fixtures) rmSync(dir, { recursive: true, force: true })
})

/**
 * A git that records every call and answers by subcommand (`args[2]`, because
 * every call starts `-C <dir>`). An answer may be a list, consumed in order, so
 * a revision read before and after the merge can differ. Unlisted subcommands
 * succeed with no output.
 */
function fakeGit(answers = {}) {
  const calls = []
  const runGit = async args => {
    calls.push(args)
    const queue = answers[args[2]]
    const answer = (Array.isArray(queue) ? queue.shift() : queue) ?? {}
    return {
      ok: answer.ok !== false,
      stdout: answer.stdout ?? '',
      stderr: answer.stderr ?? '',
      timedOut: answer.timedOut === true,
      message: answer.message ?? (answer.ok === false ? 'Command failed' : ''),
    }
  }
  return { runGit, calls }
}

/** A stand-in for an install whose on-disk version moves between reads. */
function fakeInstalled(versions, { checkout = true } = {}) {
  let reads = 0
  return () => ({ version: versions[Math.min(reads++, versions.length - 1)], checkout })
}

/** No fetch may ever be shallow: a grafted tip has no common ancestor to fast-forward from. */
function assertNoDepth(calls) {
  for (const args of calls) {
    for (const arg of args) assert.equal(arg.startsWith('--depth'), false, `fetch is not shallow (saw ${arg})`)
  }
}

/** Minimal Cordis-shaped context: effect() plus the Host connection registry. */
function createContext({ register } = {}) {
  const routes = []
  const disposers = []
  const warnings = []
  const ctx = {
    logger: { warn: message => warnings.push(String(message)) },
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
            routes.pop()
          }
        },
      },
    },
  }
  return { ctx, routes, disposers, warnings }
}

// 1 — the loaded version is captured once at import, the on-disk one is read
// when asked, and a manifest that cannot be read is a thrown error there.
{
  assert.equal(PACKAGE_DIR, ROOT, 'the package root is this module’s directory')
  assert.equal(LOADED_VERSION, MANIFEST.version, 'the loaded version is this package’s own')
  assert.equal(versionOnDisk(), MANIFEST.version)

  const clone = makePackage({ version: '9.9.9' })
  assert.equal(versionOnDisk(clone), '9.9.9')
  assert.deepEqual(readInstalled(clone), { version: '9.9.9', checkout: true })

  const tarball = makePackage({ version: '9.9.9', checkout: false })
  assert.deepEqual(readInstalled(tarball), { version: '9.9.9', checkout: false })

  const missing = makePackage({ manifest: false })
  assert.equal(versionOnDisk(missing), undefined, 'the tolerant reader reports nothing')
  assert.throws(() => readInstalled(missing), /ENOENT/, 'the strict reader throws')
  assert.throws(
    () => {
      const dir = makePackage({ manifest: false })
      writeFileSync(join(dir, 'package.json'), '{"name":"@moreweb/edh"}')
      return readInstalled(dir)
    },
    /carries no version/,
  )
  assert.equal(versionOnDisk(makePackage({ manifest: false, version: 'x' })), undefined)
}

// 2 — the GET body is a pure shape, and `available` is a commit count: equal or
// older version strings cannot make a checkout look current.
{
  assert.deepEqual(updateStatus({ installed: '0.4.0', onDisk: '0.4.0', latest: '0.4.1', behind: 2, checkout: true }), {
    ok: true,
    installed: '0.4.0',
    onDisk: '0.4.0',
    latest: '0.4.1',
    behind: 2,
    available: true,
    checkout: true,
  })
  const equalVersions = updateStatus({ installed: '0.4.0', onDisk: '0.4.0', latest: '0.4.0', behind: 3, checkout: true })
  assert.equal(equalVersions.available, true, 'an unbumped manifest does not hide a checkout that is behind')
  const olderPublished = updateStatus({ installed: '0.4.0', onDisk: '0.4.0', latest: '0.3.0', behind: 0, checkout: true })
  assert.equal(olderPublished.available, false, 'the version string decides nothing')
  const ahead = updateStatus({ installed: '0.4.0', onDisk: '0.4.1', latest: '0.4.1', behind: 0, checkout: true })
  assert.equal(ahead.available, false)
  assert.equal(updateStatus({ installed: '0.4.0', onDisk: '0.4.0', latest: '0.4.0', behind: 0, checkout: true }).available, false)
}

// 3 — the POST body is a pure shape, and the restart answer is not baked in.
{
  assert.deepEqual(
    updateApplied({ from: '0.4.0', to: '0.4.1', onDisk: '0.4.1', changed: ['update.js'], requiresRestart: true }),
    { ok: true, from: '0.4.0', to: '0.4.1', onDisk: '0.4.1', changed: ['update.js'], requiresRestart: true },
  )
  assert.deepEqual(
    updateApplied({ from: '0.4.0', to: '0.4.1', onDisk: '0.4.1', changed: ['client.js'], requiresRestart: false }),
    { ok: true, from: '0.4.0', to: '0.4.1', onDisk: '0.4.1', changed: ['client.js'], requiresRestart: false },
  )
  assert.equal(updateApplied({ from: 'a', to: 'b', changed: [], requiresRestart: false }).requiresRestart, false)
  assert.equal(updateApplied({ from: 'a', to: 'b', changed: [] }).requiresRestart, false, 'only an explicit true restarts')
  assert.deepEqual(updateFailure('dirty', 'uncommitted changes'), {
    ok: false,
    reason: 'dirty',
    message: 'uncommitted changes',
  })
}

// 4 — the classification: browser-only paths never restart, anything else does.
{
  for (const path of ['client.js', 'locale/en.json', 'locale/zh.json', 'icon.svg', 'README.md', 'AGENTS.md', 'LICENSE', 'package.json', 'test/update.mjs']) {
    assert.equal(isClientPath(path), true, `${path} ships only to the browser`)
    assert.equal(needsRestart([path]), false, `${path} alone needs no restart`)
  }
  for (const path of ['index.js', 'retry.js', 'edit.js', 'export.js', 'update.js', 'cordis.patch.yml', 'lib/extra.js', 'locale', 'test']) {
    assert.equal(isClientPath(path), false, `${path} is Host-side`)
    assert.equal(needsRestart([path]), true, `${path} needs the restart`)
  }
  assert.equal(needsRestart([]), false, 'nothing changed, nothing to reload')
  assert.equal(needsRestart(['client.js', 'update.js']), true, 'one Host path forces the restart')
  assert.equal(REQUIRES_RESTART, true, 'the unreadable-diff fallback is conservative')
}

// 5 — request parsing: GET is the status report, POST applies, nothing else.
{
  assert.equal(updateMethod(new Request('http://host/api/edh.update')), 'status')
  assert.equal(updateMethod(new Request('http://host/api/edh.update', { method: 'POST' })), 'apply')
  assert.equal(updateMethod(new Request('http://host/api/edh.update', { method: 'DELETE' })), undefined)
  assert.equal(updateMethod(undefined), undefined)
}

// 6 — the GET report: loaded and on-disk versions, published version, commit
// count, and the git it ran — a plain fetch, then the count, then the manifest.
{
  const dir = makePackage({ version: '0.4.0' })
  const { runGit, calls } = fakeGit({
    'rev-list': { stdout: '2\n' },
    show: { stdout: '{"name":"@moreweb/edh","version":"0.4.1"}' },
  })
  const response = await updateResponse(new Request('http://host/api/edh.update'), { dir, runGit })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), {
    ok: true,
    installed: LOADED_VERSION,
    onDisk: '0.4.0',
    latest: '0.4.1',
    behind: 2,
    available: true,
    checkout: true,
  })
  assert.deepEqual(calls, [
    ['-C', dir, 'fetch', 'origin', 'main'],
    ['-C', dir, 'rev-list', '--count', 'HEAD..FETCH_HEAD'],
    ['-C', dir, 'show', 'FETCH_HEAD:package.json'],
  ])
  assertNoDepth(calls)
}

// 7 — availability follows the commit count, not the version strings: behind
// with an unbumped manifest is available, and level is not.
{
  const dir = makePackage({ version: '0.4.0' })
  const behind = fakeGit({ 'rev-list': { stdout: '3\n' }, show: { stdout: '{"version":"0.4.0"}' } })
  assert.deepEqual(await statusResponse({ dir, runGit: behind.runGit }), {
    ok: true,
    installed: LOADED_VERSION,
    onDisk: '0.4.0',
    latest: '0.4.0',
    behind: 3,
    available: true,
    checkout: true,
  })

  const level = fakeGit({ 'rev-list': { stdout: '0\n' }, show: { stdout: '{"version":"0.9.9"}' } })
  assert.deepEqual(await statusResponse({ dir, runGit: level.runGit }), {
    ok: true,
    installed: LOADED_VERSION,
    onDisk: '0.4.0',
    latest: '0.9.9',
    behind: 0,
    available: false,
    checkout: true,
  })
}

// 8 — a published manifest git cannot read is not fatal: `latest` falls back to
// the checkout's own version and the commit count still answers the question.
{
  const dir = makePackage({ version: '0.4.0' })
  const unparsable = fakeGit({ 'rev-list': { stdout: '1\n' }, show: { stdout: 'not json at all' } })
  assert.deepEqual(await statusResponse({ dir, runGit: unparsable.runGit }), {
    ok: true,
    installed: LOADED_VERSION,
    onDisk: '0.4.0',
    latest: '0.4.0',
    behind: 1,
    available: true,
    checkout: true,
  })

  const failedShow = fakeGit({ 'rev-list': { stdout: '1\n' }, show: { ok: false, message: 'bad object' } })
  const answer = await statusResponse({ dir, runGit: failedShow.runGit })
  assert.equal(answer.ok, true)
  assert.equal(answer.latest, '0.4.0')

  const noVersion = fakeGit({ 'rev-list': { stdout: '0\n' }, show: { stdout: '{"name":"@moreweb/edh"}' } })
  assert.equal((await statusResponse({ dir, runGit: noVersion.runGit })).latest, '0.4.0')
}

// 9 — a commit count git cannot produce is an error, not a guess.
{
  const dir = makePackage({ version: '0.4.0' })
  const { runGit } = fakeGit({ 'rev-list': { ok: false, stderr: 'fatal: bad revision' } })
  const body = await statusResponse({ dir, runGit })
  assert.equal(body.ok, false)
  assert.equal(body.reason, 'error')
  assert.match(body.message, /rev-list/)

  const nonsense = fakeGit({ 'rev-list': { stdout: 'many\n' } })
  assert.equal((await statusResponse({ dir, runGit: nonsense.runGit })).reason, 'error', 'a non-number is not a count')
}

// 10 — a fetch that fails is classified: the network's own words are `offline`,
// a timeout is `offline`, and anything else is `error`.
{
  const dir = makePackage({ version: '0.4.0' })
  const offline = fakeGit({
    fetch: { ok: false, stderr: "fatal: unable to access 'https://github.com/morewebs/EDH/': Could not resolve host: github.com\n" },
  })
  const offlineBody = await statusResponse({ dir, runGit: offline.runGit })
  assert.equal(offlineBody.ok, false)
  assert.equal(offlineBody.reason, 'offline')
  assert.match(offlineBody.message, /git fetch failed/)

  const stalled = fakeGit({ fetch: { ok: false, timedOut: true, message: 'Command failed: timed out' } })
  assert.equal((await statusResponse({ dir, runGit: stalled.runGit })).reason, 'offline')

  const other = fakeGit({ fetch: { ok: false, stderr: 'fatal: invalid refspec' } })
  const otherBody = await statusResponse({ dir, runGit: other.runGit })
  assert.equal(otherBody.reason, 'error')
  assert.deepEqual(offline.calls, [['-C', dir, 'fetch', 'origin', 'main']], 'nothing follows a failed fetch')
}

// 11 — an install that is not a checkout answers `no-checkout` without touching
// the network.
{
  const dir = makePackage({ checkout: false })
  const { runGit, calls } = fakeGit()
  const body = await updateResponse(new Request('http://host/api/edh.update'), { dir, runGit })
  assert.equal(body.status, 200)
  assert.equal((await body.json()).reason, 'no-checkout')
  assert.equal(calls.length, 0)
}

// 12 — a manifest that cannot be read answers `error` without touching git.
{
  const dir = makePackage({ manifest: false })
  const { runGit, calls } = fakeGit()
  const body = await statusResponse({ dir, runGit })
  assert.equal(body.ok, false)
  assert.equal(body.reason, 'error')
  assert.match(body.message, /cannot read the installed package/)
  assert.equal(calls.length, 0)
}

// 13 — the POST report for a browser-only update: no restart, and the exact git
// it ran — status, the old revision, a plain fetch, the merge, the new revision,
// then the diff, with nothing after it.
{
  const dir = makePackage({ version: '0.4.0' })
  const { runGit, calls } = fakeGit({
    'rev-parse': [{ stdout: 'aaa111\n' }, { stdout: 'bbb222\n' }],
    diff: { stdout: 'client.js\nlocale/en.json\n' },
  })
  const response = await updateResponse(new Request('http://host/api/edh.update', { method: 'POST' }), { dir, runGit })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    ok: true,
    from: LOADED_VERSION,
    to: '0.4.0',
    onDisk: '0.4.0',
    changed: ['client.js', 'locale/en.json'],
    requiresRestart: false,
  })
  assert.deepEqual(calls, [
    ['-C', dir, 'status', '--porcelain'],
    ['-C', dir, 'rev-parse', 'HEAD'],
    ['-C', dir, 'fetch', 'origin', 'main'],
    ['-C', dir, 'merge', '--ff-only', 'FETCH_HEAD'],
    ['-C', dir, 'rev-parse', 'HEAD'],
    ['-C', dir, 'diff', '--name-only', 'aaa111', 'bbb222'],
  ])
  assertNoDepth(calls)
  assert.equal(calls[calls.length - 1][2], 'diff', 'nothing runs after the diff')
  assert.deepEqual(
    calls.find(args => args[2] === 'diff').slice(2),
    ['diff', '--name-only', 'aaa111', 'bbb222'],
    'the diff compares the revisions read before and after the merge',
  )
  for (const args of calls) {
    assert.equal(args[0], '-C', 'the checkout is named with -C, never a cwd or a shell')
    assert.equal(args[1], dir)
    for (const forbidden of ['--force', '-f', 'stash', 'reset', 'clean', 'checkout', 'rebase', 'pull', '--depth']) {
      assert.equal(args.includes(forbidden), false, `${forbidden} is never passed to git`)
    }
  }
}

// 14 — the restart answer follows what the update touched: a Host path or a mix
// restarts, a browser-only or empty change set does not.
{
  const host = fakeGit({ 'rev-parse': [{ stdout: 'a\n' }, { stdout: 'b\n' }], diff: { stdout: 'update.js\n' } })
  const hostBody = await applyUpdate({ dir: makePackage(), runGit: host.runGit })
  assert.equal(hostBody.requiresRestart, true)
  assert.deepEqual(hostBody.changed, ['update.js'])

  const mixed = fakeGit({
    'rev-parse': [{ stdout: 'a\n' }, { stdout: 'b\n' }],
    diff: { stdout: 'client.js\nexport.js\nREADME.md\n' },
  })
  const mixedBody = await applyUpdate({ dir: makePackage(), runGit: mixed.runGit })
  assert.equal(mixedBody.requiresRestart, true)
  assert.deepEqual(mixedBody.changed, ['client.js', 'export.js', 'README.md'])

  const empty = fakeGit({ 'rev-parse': [{ stdout: 'a\n' }, { stdout: 'a\n' }], diff: { stdout: '' } })
  const emptyBody = await applyUpdate({ dir: makePackage(), runGit: empty.runGit })
  assert.equal(emptyBody.ok, true, 'already up to date is still a successful apply')
  assert.deepEqual(emptyBody.changed, [])
  assert.equal(emptyBody.requiresRestart, false, 'nothing changed, nothing to reload')
}

// 15 — a diff that cannot be read falls back to asking for the restart, and the
// evidence is an empty change list rather than a guess.
{
  const broken = fakeGit({ 'rev-parse': [{ stdout: 'a\n' }, { stdout: 'b\n' }], diff: { ok: false, message: 'Command failed' } })
  const brokenBody = await applyUpdate({ dir: makePackage(), runGit: broken.runGit })
  assert.equal(brokenBody.ok, true)
  assert.equal(brokenBody.requiresRestart, REQUIRES_RESTART)
  assert.deepEqual(brokenBody.changed, [])

  const noRevision = fakeGit({ 'rev-parse': { ok: false, message: 'Needed a single revision' } })
  const noRevisionBody = await applyUpdate({ dir: makePackage(), runGit: noRevision.runGit })
  assert.equal(noRevisionBody.ok, true, 'the merge still stands')
  assert.equal(noRevisionBody.requiresRestart, true, 'no revisions, no evidence, conservative answer')
  assert.deepEqual(noRevisionBody.changed, [])
  assert.equal(noRevision.calls.some(args => args[2] === 'diff'), false, 'no diff without both revisions')
}

// 16 — a dirty tree refuses with the paths that block it, and runs nothing else.
{
  const dir = makePackage({ version: '0.4.0' })
  const { runGit, calls } = fakeGit({
    status: { stdout: ' M README.md\n?? update.js\n M test/update.mjs\n M package.json\n M client.js\n?? notes.txt\n?? scratch.js\n' },
  })
  const body = await updateResponse(new Request('http://host/api/edh.update', { method: 'POST' }), { dir, runGit })
  assert.equal(body.status, 200)
  const failure = await body.json()
  assert.equal(failure.ok, false)
  assert.equal(failure.reason, 'dirty')
  assert.match(failure.message, /M README\.md/, 'the first blocking path is named')
  assert.match(failure.message, /\?\? update\.js/)
  assert.match(failure.message, /\+2 more/, 'the rest are counted, not dumped')
  assert.equal(failure.message.includes('scratch.js'), false, 'the sample is bounded')
  assert.deepEqual(calls, [['-C', dir, 'status', '--porcelain']], 'nothing was fetched or merged')
}

// 17 — an install that is not a checkout is refused without running git.
{
  const dir = makePackage({ version: '0.4.0' })
  const { runGit, calls } = fakeGit()
  const body = await applyUpdate({ dir, runGit, readInstalled: fakeInstalled(['0.4.0'], { checkout: false }) })
  assert.equal(body.ok, false)
  assert.equal(body.reason, 'no-checkout')
  assert.equal(calls.length, 0)
}

// 18 — a failed fetch answers `offline`, a refused merge answers `error`, and the
// version never moves.
{
  const dir = makePackage({ version: '0.4.0' })
  const failing = fakeGit({
    'rev-parse': [{ stdout: 'a\n' }],
    fetch: { ok: false, stderr: "fatal: unable to access 'https://github.com/morewebs/EDH/': Could not resolve host: github.com\n" },
  })
  const offline = await applyUpdate({ dir, runGit: failing.runGit })
  assert.equal(offline.ok, false)
  assert.equal(offline.reason, 'offline')
  assert.equal(failing.calls.some(args => args[2] === 'merge'), false, 'no merge after a failed fetch')

  const refused = fakeGit({
    'rev-parse': [{ stdout: 'a\n' }],
    merge: { ok: false, stderr: 'fatal: Not possible to fast-forward, aborting.\n' },
  })
  const error = await applyUpdate({ dir, runGit: refused.runGit })
  assert.equal(error.ok, false)
  assert.equal(error.reason, 'error')
  assert.match(error.message, /git merge --ff-only failed/)
  assert.equal(refused.calls.some(args => args[2] === 'diff'), false, 'no diff after a refused merge')
}

// 19 — bad input is refused, and a query the caller adds reaches neither git nor
// the package reader.
{
  const dir = makePackage({ version: '0.4.0' })
  const idle = fakeGit()
  const unsupported = await updateResponse(new Request('http://host/api/edh.update', { method: 'DELETE' }), {
    dir,
    runGit: idle.runGit,
  })
  assert.equal(unsupported.status, 405)
  assert.deepEqual(await unsupported.json(), { ok: false, reason: 'error', message: 'unsupported method DELETE' })
  assert.equal(idle.calls.length, 0)

  const { runGit, calls } = fakeGit({ 'rev-list': { stdout: '0\n' }, show: { stdout: '{"version":"0.4.0"}' } })
  const withQuery = await updateResponse(
    new Request('http://host/api/edh.update?force=1&branch=dev&dir=C:%5Celsewhere'),
    { dir, runGit },
  )
  assert.equal((await withQuery.json()).ok, true)
  assert.deepEqual(calls[0], ['-C', dir, 'fetch', 'origin', 'main'], 'the query string never reaches git')
}

// 20 — registration: one path, both methods, and disposal inside ctx.effect.
{
  const { ctx, routes, disposers, warnings } = createContext()
  apply(ctx)
  assert.equal(warnings.length, 0)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, UPDATE_PATH)
  assert.equal(UPDATE_PATH, '/api/edh.update')
  assert.deepEqual(routes[0].methods, ['GET', 'POST'])
  assert.equal(routes[0].requestBody, 'buffered')
  assert.equal(typeof routes[0].fetch, 'function')
  assert.equal(disposers.length, 1)
  // The registered handler is the dispatcher: an unsupported method is answered
  // without touching this install or running git.
  const answered = await routes[0].fetch(new Request('http://host/api/edh.update', { method: 'PATCH' }))
  assert.equal(answered.status, 405)
  disposers[0]()
  assert.equal(routes.length, 0, 'disposal unregisters the route')

  const refused = createContext({
    register() {
      throw new Error('route already registered')
    },
  })
  apply(refused.ctx)
  assert.equal(refused.warnings.length, 1, 'a refused route is a warning')
  assert.match(refused.warnings[0], /route registration failed/)
  assert.equal(typeof refused.disposers[0], 'function', 'a failed registration still disposes')
}

// 21 — the loaded version never follows the disk: the process keeps running what
// it imported, so `installed`/`from` stay put while `onDisk`/`to` move.
{
  const dir = makePackage({ version: '0.4.0' })
  const moved = fakeInstalled(['0.4.9'])
  const get = await statusResponse({
    dir,
    readInstalled: moved,
    runGit: fakeGit({ 'rev-list': { stdout: '0\n' }, show: { stdout: '{"version":"0.4.9"}' } }).runGit,
  })
  assert.equal(get.installed, LOADED_VERSION, 'installed is what the Host loaded')
  assert.equal(get.onDisk, '0.4.9', 'onDisk is what a reload would load')
  assert.equal(get.latest, '0.4.9')

  const { runGit } = fakeGit({ 'rev-parse': [{ stdout: 'a\n' }, { stdout: 'b\n' }], diff: { stdout: 'client.js\n' } })
  const post = await applyUpdate({ dir, runGit, readInstalled: fakeInstalled(['0.4.0', '0.4.9']) })
  assert.equal(post.from, LOADED_VERSION, 'the update came from the code that was running')
  assert.equal(post.to, '0.4.9')
  assert.equal(post.onDisk, '0.4.9')
  assert.equal(post.requiresRestart, false, 'a browser-only change reloads in place')
}

console.log('edh update: all checks passed')
