/**
 * EDH feature: `update` — update EDH itself from its published repo.
 *
 * Two routes answer on one path: `GET` reports the version this process loaded,
 * the version now on disk, the version the published branch carries, how many
 * commits behind that branch this checkout is, and whether this install is a git
 * checkout it can update; `POST` fast-forwards that checkout and reports what the
 * update touched. Both answers come from this module's own package root, so they
 * describe the code that is actually running.
 *
 * Availability is git's answer, never a version comparison: this repo commits far
 * more often than it bumps `version`, so a checkout behind `main` with an
 * unchanged `package.json` would read as up to date. `HEAD..FETCH_HEAD` does not.
 * Git is also the only network client here — there is no GitHub API call, so no
 * quota, no second transport to fail, and one source of truth.
 *
 * Applying an update never risks local work: only a checkout whose working tree
 * is clean is touched, the merge is `--ff-only` against the fetched head, and
 * nothing is forced, stashed, or discarded.
 *
 * A check the user asked for must not take the Host down, so every route answers
 * with a report — offline, a missing checkout, or a failed command included.
 */

import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'edh-update'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const UPDATE_PATH = '/api/edh.update'

/** The package root this feature updates: the directory this module lives in. */
export const PACKAGE_DIR = dirname(fileURLToPath(import.meta.url))

/** Branch the checkout follows. */
const REMOTE = 'origin'
const BRANCH = 'main'

/** How long one git command may take before it counts as offline. */
const GIT_TIMEOUT_MS = 60000

/** How many `git status --porcelain` lines a `dirty` refusal quotes. */
const DIRTY_SAMPLE = 5

/**
 * The answer when the changed paths could not be read.
 *
 * `applyUpdate` normally decides `requiresRestart` from the update's own diff: a
 * path only the browser half ships is replaced in place — the shipped HMR chain
 * republishes the bundle and `modules.entries.reload` swaps it — while any Host
 * path stops the old module from ever being re-read, so it needs a restart. When
 * the diff itself cannot be read there is no evidence either way, and the
 * conservative answer is that a restart is needed.
 *
 * Why a Host change genuinely cannot avoid the restart: the installed
 * `@deepseek-ai/cordis-plugin-loader` imports a module once per URL.
 * `Entry.refresh()` returns immediately for a started fiber, `entry.update()`
 * only re-applies options and context, and `EntryTree.import()` awaits the Node
 * ESM cache, which still holds the previous namespace for the same file. The
 * loader's documented entry API — `create`, `update`, `remove`, `resolve`,
 * `resolveGroup`, `await`, `locate` — has no re-read, and its only full-reload
 * path is the `loader.exit()` hook a host implements by restarting the process.
 */
export const REQUIRES_RESTART = true

/**
 * Paths that ship only to the browser half, so replacing it needs no restart.
 *
 * A change to any other path — `index.js`, `retry.js`, `edit.js`, `export.js`,
 * `update.js`, `cordis.patch.yml`, or anything new — is Host-side code the running
 * process already imported.
 */
const CLIENT_PATHS = new Set(['client.js', 'icon.svg', 'README.md', 'AGENTS.md', 'LICENSE', 'package.json'])

/** Directories whose contents ship only to the browser half. */
const CLIENT_DIRS = ['locale/', 'test/']

/** True when one changed path, as git prints it, affects only the browser half. */
export function isClientPath(path) {
  return CLIENT_PATHS.has(path) || CLIENT_DIRS.some(prefix => path.startsWith(prefix))
}

/** True when a change set needs a Harness restart: any Host-side path does. */
export function needsRestart(paths) {
  return paths.some(path => !isClientPath(path))
}

/** The version one manifest text carries, or `undefined` when it carries none. */
function versionOf(manifestText) {
  try {
    const version = JSON.parse(manifestText)?.version
    return typeof version === 'string' && version !== '' ? version : undefined
  } catch {
    return undefined
  }
}

/** The version the manifest in one directory carries, or `undefined` when it cannot be read. */
export function versionOnDisk(dir = PACKAGE_DIR) {
  try {
    return versionOf(readFileSync(join(dir, 'package.json'), 'utf8'))
  } catch {
    return undefined
  }
}

/**
 * The version this Host half was loaded from, read once when the module loaded.
 *
 * The process keeps running this module after a merge on disk, so this — not what
 * a later read of the manifest finds — is the honest "installed" version.
 * Reporting the on-disk one would let the page say "up to date" while the Host
 * runs the code it started with.
 */
export const LOADED_VERSION = versionOnDisk() ?? ''

/** One error's text, whatever was thrown. */
function messageOf(error) {
  return String(error?.message ?? error)
}

/**
 * The `GET` answer when the check ran.
 *
 * `available` is a commit count, so an unbumped `package.json` cannot hide a
 * checkout that is behind. `installed` is what the Host is running, `onDisk` is
 * what a reload would load.
 */
export function updateStatus({ installed, onDisk, latest, behind, checkout }) {
  return {
    ok: true,
    installed,
    onDisk,
    latest,
    behind,
    available: behind > 0,
    checkout: checkout === true,
  }
}

/**
 * The `POST` answer when the fast-forward ran.
 *
 * `from` is the version this process loaded and keeps running, `to` and `onDisk`
 * are the manifest the merge left behind, and `changed` is the evidence
 * `requiresRestart` was decided from.
 */
export function updateApplied({ from, to, onDisk, changed, requiresRestart }) {
  return { ok: true, from, to, onDisk, changed, requiresRestart: requiresRestart === true }
}

/** Every failure answer: one of the reasons the browser half knows, plus its text. */
export function updateFailure(reason, message) {
  return { ok: false, reason, message }
}

/**
 * Which route one incoming request addresses.
 * @param request - the incoming request.
 * @returns `status` for `GET`, `apply` for `POST`, `undefined` for anything else.
 */
export function updateMethod(request) {
  if (request?.method === 'GET') return 'status'
  if (request?.method === 'POST') return 'apply'
  return undefined
}

/**
 * The installed version and whether the package directory is a git checkout.
 * @param dir - the package root.
 * @returns the version and the checkout flag.
 * @throws when the manifest cannot be read or carries no version — every caller
 * reports that as `error` rather than guessing a version.
 */
export function readInstalled(dir = PACKAGE_DIR) {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const version = manifest?.version
  if (typeof version !== 'string' || version === '') throw new Error(`${join(dir, 'package.json')} carries no version`)
  return { version, checkout: existsSync(join(dir, '.git')) }
}

/**
 * Run one git command without a shell, in the checkout its arguments name.
 *
 * The caller passes `-C <dir>` itself, so every path this feature touches is an
 * argument rather than a command line, and the timeout bounds a hung network
 * operation instead of leaving the request open.
 * @param args - the complete argument list, starting with `-C <dir>`.
 * @returns whether it succeeded, its streams, and whether the timeout stopped it.
 */
export function gitCommand(args, { timeoutMs = GIT_TIMEOUT_MS } = {}) {
  return new Promise(resolve => {
    execFile('git', args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const out = String(stdout ?? '')
      if (error === null) return resolve({ ok: true, stdout: out, stderr: String(stderr ?? ''), timedOut: false, message: '' })
      resolve({
        ok: false,
        stdout: out,
        stderr: String(stderr ?? ''),
        timedOut: error.killed === true,
        message: messageOf(error),
      })
    })
  })
}

/** Words a git failure uses when the network, not the repository, is at fault. */
const OFFLINE = new RegExp([
  'could not resolve host',
  'unable to access',
  'could not read from remote repository',
  'network is unreachable',
  'temporary failure in name resolution',
  'failed to connect',
  'connection (refused|reset|closed|timed out)',
  'operation timed out',
].join('|'), 'iu')

/** Why a git command that failed did so: a dead network is `offline`, everything else `error`. */
function gitFailureReason(result) {
  if (result.timedOut === true) return 'offline'
  return OFFLINE.test(`${result.stderr ?? ''}\n${result.message ?? ''}`) ? 'offline' : 'error'
}

/**
 * How many commits the fetched branch is ahead of the checkout.
 *
 * This, never a version string, is what "an update is available" means.
 * @returns the count, or `undefined` when git could not answer.
 */
async function commitsBehind(runGit, dir) {
  const result = await runGit(['-C', dir, 'rev-list', '--count', 'HEAD..FETCH_HEAD'])
  if (result.ok !== true) return undefined
  const count = Number(result.stdout.trim())
  return Number.isInteger(count) && count >= 0 ? count : undefined
}

/**
 * The version the fetched branch's manifest carries.
 *
 * Read out of git, so learning the published version needs no second network
 * client. A manifest git cannot read is not fatal: the caller falls back.
 * @returns the version, or `undefined` when git cannot show or parse it.
 */
async function publishedVersion(runGit, dir) {
  const result = await runGit(['-C', dir, 'show', 'FETCH_HEAD:package.json'])
  return result.ok === true ? versionOf(result.stdout) : undefined
}

/** The revision one `rev-parse HEAD` printed, or `undefined` when it failed. */
function revisionOf(result) {
  if (result.ok !== true) return undefined
  const value = result.stdout.trim()
  return value === '' ? undefined : value
}

/**
 * The paths one applied fast-forward touched.
 * @returns the paths as git prints them, or `undefined` when the diff cannot be read.
 */
async function changedPaths(runGit, dir, before, after) {
  if (before === undefined || after === undefined) return undefined
  const result = await runGit(['-C', dir, 'diff', '--name-only', before, after])
  if (result.ok !== true) return undefined
  return result.stdout.split('\n').map(line => line.trim()).filter(line => line !== '')
}

/**
 * Fast-forward the checkout to the published branch and report the move.
 *
 * A checkout that is not a git checkout, or one with uncommitted changes, is
 * refused before anything runs: the update never stashes, forces, or discards
 * local work. The refusal names the paths that block it, because this profile
 * installs EDH as a link into a working checkout that is dirty whenever work is
 * in progress. Offline and failed commands come back as reports, not throws.
 *
 * `from` is the version this process loaded and keeps running; `to`/`onDisk` are
 * the manifest the merge left behind. `requiresRestart` comes from the diff
 * between the two revisions, and falls back to `REQUIRES_RESTART` when that diff
 * cannot be read.
 * @param options - the package root, the git runner, and the package reader.
 * @returns the applied report, or the reason nothing was applied.
 */
export async function applyUpdate(options = {}) {
  const { dir = PACKAGE_DIR, runGit = gitCommand, readInstalled: read = readInstalled } = options
  let before
  try {
    before = read(dir)
  } catch (error) {
    return updateFailure('error', `cannot read the installed package: ${messageOf(error)}`)
  }
  if (before.checkout !== true) {
    return updateFailure('no-checkout', `${dir} is not a git checkout, so EDH cannot update it here`)
  }
  const status = await runGit(['-C', dir, 'status', '--porcelain'])
  if (status.ok !== true) return updateFailure('error', `git status failed: ${status.message}`)
  const blocking = status.stdout.split('\n').map(line => line.trim()).filter(line => line !== '')
  if (blocking.length > 0) {
    const sample = blocking.slice(0, DIRTY_SAMPLE)
    const rest = blocking.length - sample.length
    return updateFailure(
      'dirty',
      `${dir} has uncommitted changes; nothing was changed. Blocking: ${sample.join('; ')}${rest > 0 ? ` (+${rest} more)` : ''}`,
    )
  }
  // The old revision must be read before the merge moves HEAD.
  const beforeRevision = revisionOf(await runGit(['-C', dir, 'rev-parse', 'HEAD']))
  const fetched = await runGit(['-C', dir, 'fetch', REMOTE, BRANCH])
  if (fetched.ok !== true) return updateFailure(gitFailureReason(fetched), `git fetch failed: ${fetched.message}`)
  const merged = await runGit(['-C', dir, 'merge', '--ff-only', 'FETCH_HEAD'])
  if (merged.ok !== true) return updateFailure('error', `git merge --ff-only failed: ${merged.message}`)
  const afterRevision = revisionOf(await runGit(['-C', dir, 'rev-parse', 'HEAD']))
  const changed = await changedPaths(runGit, dir, beforeRevision, afterRevision)
  let onDisk
  try {
    onDisk = read(dir).version
  } catch (error) {
    return updateFailure('error', `cannot read the installed package after the update: ${messageOf(error)}`)
  }
  return updateApplied({
    from: LOADED_VERSION,
    to: onDisk,
    onDisk,
    changed: changed ?? [],
    requiresRestart: changed === undefined ? REQUIRES_RESTART : needsRestart(changed),
  })
}

/**
 * The `GET` report: loaded and on-disk versions, the published version, how far
 * behind the checkout is, and whether this install can update itself.
 *
 * The checkout is checked before the network is touched, so an install that could
 * never apply an update does not go looking for one. A published manifest git
 * cannot read is not fatal: `latest` falls back to the checkout's own version and
 * `behind` still says whether there is anything to fetch.
 * @param options - the package root, the git runner, and the package reader.
 */
export async function statusResponse(options = {}) {
  const { dir = PACKAGE_DIR, runGit = gitCommand, readInstalled: read = readInstalled } = options
  let installed
  try {
    installed = read(dir)
  } catch (error) {
    return updateFailure('error', `cannot read the installed package: ${messageOf(error)}`)
  }
  if (installed.checkout !== true) {
    return updateFailure('no-checkout', `${dir} is not a git checkout, so EDH cannot update it here`)
  }
  const fetched = await runGit(['-C', dir, 'fetch', REMOTE, BRANCH])
  if (fetched.ok !== true) return updateFailure(gitFailureReason(fetched), `git fetch failed: ${fetched.message}`)
  const behind = await commitsBehind(runGit, dir)
  if (behind === undefined) return updateFailure('error', `git rev-list could not count the commits behind ${REMOTE}/${BRANCH}`)
  const latest = await publishedVersion(runGit, dir)
  return updateStatus({
    installed: LOADED_VERSION,
    onDisk: installed.version,
    latest: latest ?? installed.version,
    behind,
    checkout: true,
  })
}

/** One JSON answer. A report the user asked for is never an HTTP error status. */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * Answer one update request, whichever method it uses.
 * @param request - the incoming request.
 * @param options - the package root, the git runner, and the package reader.
 * @returns the JSON report; only an unsupported method is a non-200 status.
 */
export async function updateResponse(request, options = {}) {
  switch (updateMethod(request)) {
    case 'status':
      return jsonResponse(await statusResponse(options))
    case 'apply': {
      const { dir, runGit, readInstalled } = options
      return jsonResponse(await applyUpdate({ dir, runGit, readInstalled }))
    }
    default:
      return jsonResponse(updateFailure('error', `unsupported method ${request?.method ?? 'without a method'}`), 405)
  }
}

/**
 * Register both routes on the Host connection.
 *
 * The fiber waits on `connection` (see `inject`), so the registry is there. A
 * route this deployment refuses still must not take the whole bundle down, so a
 * registration failure is logged and the rest of EDH keeps running.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  ctx.effect(() => {
    try {
      const dispose = ctx.connection.fetch.register({
        path: UPDATE_PATH,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: request => updateResponse(request),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-update: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-update: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-update: update routes')
}

/** Both routes need the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
