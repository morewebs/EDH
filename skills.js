/**
 * EDH feature: `skills` — the Host half of the Skills settings tab.
 *
 * One discovery pass, split by where each skill came from. The route exists
 * because a settings page must show **what the agent can actually see**, and on
 * this build that is not what a directory listing says.
 *
 * ## The four facts that make this module what it is
 *
 * - **The registry is the only truth.** `ctx.skills.list({ cwd, scope })` on the
 *   `skills` service. Three shipped packages register skills *from inside the
 *   asar* — `dsh-skill-office` (seven), `dsh-sandbox-windows-acl`, `dsh-skill-badge`
 *   (the last with **no `path` at all**) — plus whatever the preset configured.
 *   A scan of `.dsh/skills` finds none of them, and `~/.claude/skills` is never
 *   scanned by the Harness at all, so scanning it here would make the tab lie
 *   about what the model can load.
 * - **A scope is mandatory, and the trap is silent.** `dsh-skill-filesystem` is
 *   mounted *per agent preset* (`dsh-web-app` disables the host row: "presets own
 *   local discovery"), so a bare `list({ cwd })` reads only the global layer and
 *   comes back empty. The Agent object *is* the scope key, and for a cold Session
 *   the preset lease is (`agentPresets.acquireScope(agentPreset)`). This module
 *   reuses the shipped derivation from
 *   `dsh-api-session-controller/lib/types/skill-catalog.js` rather than inventing
 *   its own: observe the Session, take the live agent when there is one, otherwise
 *   lease the recorded preset.
 * - **`source` is the only split.** `project-dsh` and `project-agents` are the
 *   workspace tab; `runtime`, `custom`, `user-dsh`, `user-agents` and `bundled`
 *   are global. Anything the registry reports that this table does not know is kept
 *   in **global** under its own label — a future provider's skills must not vanish
 *   from a settings page.
 * - **`sessionPersistence`'s `header.cwd` is the creation cwd, not the working
 *   directory.** The cwd comes from `sessionQuery`'s projection first, then the
 *   observation's header, then `workingDirectory.defaultDirectory`, and for a live
 *   agent from `workingDirectory.ensure(agent)` last — which is the value that
 *   wins in practice because it is the directory the tool sandbox is actually using.
 *
 * The listing is read-only and cheap: `SkillSummary` carries no body, and `get()`
 * is never called here — it re-reads the skill's text on every call by design.
 */

import { basename } from 'node:path'

export const name = 'edh-skills'

/** `sessionQuery`'s own code for "no such Session", which is the one 404 here. */
const SESSION_NOT_FOUND = 'SESSION_QUERY_SESSION_NOT_FOUND'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const SKILLS_PATH = '/api/edh.skills'

/** Longest description the tab shows; the full text rides beside it. */
export const MAX_DESCRIPTION = 200

/** Longest Session id accepted. */
export const MAX_SESSION_ID = 128

/** The largest request body the POST accepts; it carries one word. */
export const BODY_LIMIT = 4096

/**
 * Where each `source` belongs, and the label the tab shows.
 *
 * The ranks are the Harness's own precedence (a lower rank wins a name collision),
 * and they are the reason the split is trustworthy: the two `project-*` sources
 * are the only workspace-scoped ones.
 */
export const SKILL_SOURCES = Object.freeze({
  'project-dsh': { scope: 'workspace', label: 'Project .dsh/skills', rank: 100 },
  'project-agents': { scope: 'workspace', label: 'Project .agents/skills', rank: 200 },
  runtime: { scope: 'global', label: 'Registered at runtime', rank: 250 },
  custom: { scope: 'global', label: 'Configured by the preset', rank: 300 },
  'user-dsh': { scope: 'global', label: '~/.dsh/skills', rank: 400 },
  'user-agents': { scope: 'global', label: '~/.agents/skills', rank: 500 },
  bundled: { scope: 'global', label: 'Bundled with the Harness', rank: 600 },
})

/** Where a source this table does not know is shown: global, under its own name. */
export const UNKNOWN_SOURCE_RANK = 900

/** True for a plain JSON object. */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** One error's text, whatever was thrown. */
function messageOf(error) {
  return String(error?.message ?? error)
}

/**
 * Where one source belongs and what to call it.
 *
 * An unknown source is deliberately kept rather than dropped: a provider this
 * table predates still exists, and a tab that silently omits its skills would be
 * wrong about what the agent can see.
 * @param source - the `source` one summary reports.
 * @returns `{ scope, label, rank, known }`.
 */
export function sourceInfoOf(source) {
  const key = typeof source === 'string' && source !== '' ? source : 'unknown'
  const known = Object.prototype.hasOwnProperty.call(SKILL_SOURCES, key) ? SKILL_SOURCES[key] : undefined
  if (known !== undefined) return { scope: known.scope, label: known.label, rank: known.rank, known: true }
  return { scope: 'global', label: key, rank: UNKNOWN_SOURCE_RANK, known: false }
}

/**
 * One description, cut for a settings row.
 *
 * Whitespace is collapsed to single spaces, and a description longer than
 * {@link MAX_DESCRIPTION} is cut with an ellipsis so the reader can see it was
 * cut. The full text rides in `descriptionFull`; the *name* is never touched, so
 * a row can always be identified.
 * @param raw - the summary's description.
 * @returns `{ description, descriptionFull }`.
 */
export function sanitizeDescription(raw, limit = MAX_DESCRIPTION) {
  const full = String(raw ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
  if (full.length <= limit) return { description: full, descriptionFull: full }
  return { description: `${full.slice(0, Math.max(0, limit - 1)).trimEnd()}…`, descriptionFull: full }
}

/**
 * The location one `resourceBase` names, or `undefined`.
 *
 * `SkillResourceBase` is a closed union — a directory path, a base URL, or opaque
 * provider prose. Only the first two are a location a page can show; opaque
 * resources answer `undefined` rather than inventing a path.
 * @param base - the summary's `resourceBase`.
 * @returns the path or URL.
 */
export function resourcePathOf(base) {
  if (!isRecord(base)) return undefined
  if (base.kind === 'directory' && typeof base.path === 'string' && base.path !== '') return base.path
  if (base.kind === 'url' && typeof base.url === 'string' && base.url !== '') return base.url
  return undefined
}

/**
 * One row of the tab, from one `SkillSummary`.
 *
 * `path` is absent — not an empty string — when a provider has no file behind the
 * skill (the bundled and in-asar providers do not), which is what tells the tab to
 * render a name without a location.
 * @param summary - one registry summary.
 * @returns the row.
 */
export function skillRow(summary) {
  const source = typeof summary?.source === 'string' && summary.source !== '' ? summary.source : 'unknown'
  const info = sourceInfoOf(source)
  const invocation = isRecord(summary?.invocation) ? summary.invocation : {}
  const { description, descriptionFull } = sanitizeDescription(summary?.description)
  const row = {
    name: typeof summary?.name === 'string' ? summary.name : '',
    description,
    descriptionFull,
    source,
    sourceLabel: info.label,
    provider: typeof summary?.provider === 'string' ? summary.provider : '',
    modelInvocable: invocation.modelInvocable === true,
    userInvocable: invocation.userInvocable === true,
  }
  if (typeof summary?.whenToUse === 'string' && summary.whenToUse.trim() !== '') {
    row.whenToUse = sanitizeDescription(summary.whenToUse).description
  }
  if (typeof summary?.path === 'string' && summary.path !== '') row.path = summary.path
  const resourcePath = resourcePathOf(summary?.resourceBase)
  if (resourcePath !== undefined) row.resourcePath = resourcePath
  return row
}

/** Two rows in code-point order by name, so the tab is stable between reads. */
function byName(left, right) {
  if (left.name < right.name) return -1
  return left.name > right.name ? 1 : 0
}

/**
 * Every summary, split into the two tabs.
 *
 * A summary with no usable name is dropped (the registry cannot produce one, and a
 * nameless row cannot be identified); everything else lands in exactly one group.
 * @param summaries - the registry's summaries.
 * @returns `{ global, workspace, counts }`.
 */
export function splitSkills(summaries) {
  const global = []
  const workspace = []
  for (const summary of Array.isArray(summaries) ? summaries : []) {
    const row = skillRow(summary)
    if (row.name === '') continue
    if (sourceInfoOf(row.source).scope === 'workspace') workspace.push(row)
    else global.push(row)
  }
  global.sort(byName)
  workspace.sort(byName)
  return { global, workspace, counts: { global: global.length, workspace: workspace.length } }
}

/**
 * Dispose one caller-owned observation or lease, whatever shape it has.
 * @param value - the object, if any.
 */
async function release(value) {
  if (value === undefined || value === null) return
  try {
    if (typeof value[Symbol.asyncDispose] === 'function') await value[Symbol.asyncDispose]()
    else if (typeof value[Symbol.dispose] === 'function') value[Symbol.dispose]()
    else if (typeof value.dispose === 'function') await value.dispose()
  } catch {
    // Releasing a lease must never fail the read.
  }
}

/**
 * The cwd one Session is working in, and the scope that Session's skills live in.
 *
 * Mirrors the shipped `skill-catalog` derivation, in its order:
 *
 * 1. `sessionQuery.observeSession(id)` → `projections.values.workingDirectory`,
 * 2. then `observation.header.cwd`,
 * 3. then `workingDirectory.defaultDirectory`,
 * 4. and for a **live** agent `workingDirectory.ensure(agent)` last, because that
 *    is the directory the agent is actually using now.
 *
 * The scope is the live Agent object when there is one (its own provider layer),
 * otherwise the recorded preset's lease key, otherwise nothing — which is the
 * global layer only, and why a cold call with no preset finds so little.
 *
 * @param options - the lazily-read services, and the Session id (or `undefined`).
 * @returns `{ ok: true, cwd, scope, source, workspaceName }`, a `not-found`, or an `error`.
 */
export async function resolveScope(options = {}) {
  const { get = () => undefined, sessionId, logger } = options
  const workingDirectory = get('workingDirectory')
  const sessionQuery = get('sessionQuery')
  const agents = get('agents')
  const presets = get('agentPresets')
  let observation
  let lease
  try {
    let cwd
    let agentPreset
    let source = 'default'
    if (sessionId !== undefined && sessionQuery !== undefined && typeof sessionQuery.observeSession === 'function') {
      try {
        observation = await sessionQuery.observeSession(sessionId)
      } catch (error) {
        if (error?.code === SESSION_NOT_FOUND) {
          return { ok: false, reason: 'not-found', message: 'No stored Session has that id.' }
        }
        return { ok: false, reason: 'error', message: `That Session could not be read: ${messageOf(error)}` }
      }
      const values = isRecord(observation?.projections) ? observation.projections.values : undefined
      const projected = isRecord(values) && typeof values.workingDirectory === 'string' ? values.workingDirectory : undefined
      const fromHeader = isRecord(observation?.header) && typeof observation.header.cwd === 'string' ? observation.header.cwd : undefined
      cwd = projected ?? fromHeader
      agentPreset = isRecord(values) && typeof values.agentPreset === 'string' ? values.agentPreset : undefined
      source = 'session'
    }
    if (typeof cwd !== 'string' || cwd === '') {
      const fallback = typeof workingDirectory?.defaultDirectory === 'string' ? workingDirectory.defaultDirectory : ''
      cwd = fallback
    }

    // A live Session: the working directory it is using right now, and its own
    // skills layer (the preset layer lives on the Agent, not on the root registry).
    let live
    if (sessionId !== undefined && typeof agents?.get === 'function') {
      try {
        live = agents.get(sessionId)
      } catch (error) {
        logger?.warn?.('edh-skills: reading the live Session failed: %s', messageOf(error))
      }
    }
    if (live !== undefined && typeof workingDirectory?.ensure === 'function') {
      try {
        const ensured = await workingDirectory.ensure(live)
        if (typeof ensured === 'string' && ensured !== '') cwd = ensured
      } catch (error) {
        logger?.warn?.('edh-skills: the working directory could not be ensured: %s', messageOf(error))
      }
    }

    let scope
    if (live !== undefined) {
      scope = live
    } else if (agentPreset !== undefined && typeof presets?.acquireScope === 'function') {
      try {
        lease = await presets.acquireScope(agentPreset)
        scope = lease?.key
      } catch {
        // An unknown or unusable recorded preset falls back to the global registry.
        scope = undefined
      }
    }

    const scopedRegistry = live !== undefined && typeof presets?.serviceFor === 'function' ? presets.serviceFor(live, 'skills') : undefined
    return {
      ok: true,
      cwd,
      scope,
      source,
      registry: scopedRegistry,
      lease,
      observation,
    }
  } catch (error) {
    await release(lease)
    await release(observation)
    throw error
  }
}

/** The `sessionId` query value: absent, one value, or the reason it is not usable. */
export function sessionIdOf(request) {
  let url
  try {
    url = new URL(request?.url ?? SKILLS_PATH, 'http://edh.invalid')
  } catch {
    return { ok: false }
  }
  const values = url.searchParams.getAll('sessionId')
  if (values.length === 0) return { ok: true, sessionId: undefined }
  if (values.length > 1) return { ok: false }
  const raw = values[0].trim()
  if (raw === '' || raw.toLowerCase() === 'any') return { ok: true, sessionId: undefined }
  if (isSafeKey(raw) !== true) return { ok: false }
  return { ok: true, sessionId: raw }
}

/**
 * Whether one value is shaped like a Session id.
 * @param value - the untrusted value.
 * @returns true when it is plausible.
 */
export function isSafeKey(value) {
  if (typeof value !== 'string') return false
  if (value.length === 0 || value.length > MAX_SESSION_ID) return false
  // eslint-disable-next-line no-control-regex -- refusing control characters is the point
  if (/[\u0000-\u001f\u007f]/u.test(value)) return false
  if (value.includes('/') || value.includes('\\')) return false
  if (value.includes('..')) return false
  if (value.includes(':')) return false
  return true
}

/**
 * The skills service, read lazily so a late mount still answers.
 *
 * Every method that can fail returns a report instead of throwing, because this
 * object is wired straight into a route.
 * @param options - `get` (a service reader) and the logger.
 * @returns the listing: `available()`, `list({ sessionId, refresh })`.
 */
export function createSkills(options = {}) {
  const get = typeof options.get === 'function' ? options.get : () => undefined
  const logger = options.logger

  const registryOf = () => {
    const service = get('skills')
    if (service === undefined || service === null) return undefined
    if (typeof service.snapshot !== 'function' && typeof service.list !== 'function') return undefined
    return service
  }

  /** The workspace's display name, when this Host can name one. */
  const workspaceNameOf = async cwd => {
    const workspaces = get('workspaces')
    if (typeof workspaces?.resolveByPath === 'function' && typeof cwd === 'string' && cwd !== '') {
      try {
        const workspace = await workspaces.resolveByPath(cwd)
        const title = isRecord(workspace) && typeof workspace.title === 'string' ? workspace.title.trim() : ''
        if (title !== '') return title
      } catch (error) {
        logger?.warn?.('edh-skills: naming the workspace failed: %s', messageOf(error))
      }
    }
    return typeof cwd === 'string' && cwd !== '' ? basename(cwd) : undefined
  }

  return {
    /** Whether this Host has a skill registry at all. */
    available() {
      return registryOf() !== undefined
    },
    /**
     * One discovery pass, split by source.
     * @param request - `{ sessionId?, refresh? }`.
     * @returns the view, or the reason it cannot be built.
     */
    async list(request = {}) {
      const root = registryOf()
      if (root === undefined) {
        return { ok: false, reason: 'unavailable', message: 'This Host has no skill registry.' }
      }
      const sessionId = typeof request.sessionId === 'string' && request.sessionId !== '' ? request.sessionId : undefined
      let resolved
      try {
        resolved = await resolveScope({ get, logger, sessionId })
      } catch (error) {
        return { ok: false, reason: 'error', message: `The skill scope could not be resolved: ${messageOf(error)}` }
      }
      if (resolved.ok !== true) return resolved
      const { cwd, scope, source, lease, observation } = resolved
      const registry = resolved.registry ?? root
      try {
        // `refresh` is a real invalidation when the registry has one: this is the
        // same `invalidateCache()` the Harness calls after a registration change.
        // When it does not, re-reading is the honest limit — providers are
        // watcher-driven, so their own state is already current.
        if (request.refresh === true && typeof registry.invalidateCache === 'function') {
          try {
            registry.invalidateCache()
          } catch (error) {
            logger?.warn?.('edh-skills: invalidating the skill cache failed: %s', messageOf(error))
          }
        }
        const listOptions = {
          ...(cwd === undefined || cwd === '' ? {} : { cwd }),
          ...(scope === undefined ? {} : { scope }),
        }
        let snapshot
        if (typeof registry.snapshot === 'function') {
          snapshot = await registry.snapshot(listOptions)
        } else {
          snapshot = { skills: await registry.list(listOptions), complete: true }
        }
        const split = splitSkills(snapshot?.skills)
        const workspaceName = await workspaceNameOf(cwd)
        return {
          ok: true,
          scope: {
            ...(sessionId === undefined ? {} : { sessionId }),
            cwd: typeof cwd === 'string' ? cwd : '',
            ...(workspaceName === undefined || workspaceName === '' ? {} : { workspaceName }),
            source,
          },
          global: split.global,
          workspace: split.workspace,
          // The registry reports whether discovery finished: a provider that threw
          // or answered incompletely leaves its skills out and says so here.
          complete: snapshot?.complete !== false,
          counts: split.counts,
        }
      } catch (error) {
        logger?.warn?.('edh-skills: listing the skills failed: %s', messageOf(error))
        return { ok: false, reason: 'error', message: 'The skill registry could not be read.' }
      } finally {
        await release(lease)
        await release(observation)
      }
    },
  }
}

// ---------------------------------------------------------------------------
// The route
// ---------------------------------------------------------------------------

/** One JSON answer. */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** The method of one request, upper-cased, or the empty string. */
function methodOf(request) {
  return typeof request?.method === 'string' ? request.method.toUpperCase() : ''
}

/** Read one small JSON body: `{}` when there is none, or the reason it is unusable. */
async function readBody(request) {
  let text = ''
  try {
    text = typeof request?.text === 'function' ? await request.text() : ''
  } catch {
    return { ok: false }
  }
  if (typeof text !== 'string') return { ok: true, body: {} }
  if (text.length > BODY_LIMIT) return { ok: false }
  if (text.trim() === '') return { ok: true, body: {} }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false }
  }
  if (!isRecord(parsed)) return { ok: false }
  return { ok: true, body: parsed }
}

/**
 * Answer `GET|POST /api/edh.skills`.
 *
 * `GET` is a listing for the given `sessionId` (or for the default directory when
 * there is none). `POST { action: 'refresh' }` is the same listing after asking the
 * registry to invalidate its cache. A wrong method is a `405`; a bad body or an
 * unsafe id is `bad-input` (`400`); an unknown Session is `not-found` (`404`); a
 * Host without the registry is `unavailable` (`200`); a registry that throws is
 * `error` (`200`). The answer never carries a home path beyond the real skill
 * paths the registry itself reports.
 * @param request - the incoming request.
 * @param options - `skills`, the lister to read.
 * @returns the JSON answer.
 */
export async function skillsResponse(request, options = {}) {
  const method = methodOf(request)
  if (method !== 'GET' && method !== 'HEAD' && method !== 'POST') {
    const message = `Unsupported method ${request?.method ?? 'without a method'}; skills are a GET or a refresh POST`
    return jsonResponse({ ok: false, reason: 'unsupported-method', message }, 405)
  }
  const skills = options.skills
  if (skills === undefined || skills === null || typeof skills.list !== 'function') {
    return jsonResponse({ ok: false, reason: 'unavailable', message: 'Skills are not available on this Host.' })
  }
  if (typeof skills.available === 'function' && skills.available() !== true) {
    return jsonResponse({
      ok: false,
      reason: 'unavailable',
      message: 'This Host has no skill registry, so there is nothing to list.',
    })
  }
  const query = sessionIdOf(request)
  if (query.ok !== true) {
    return jsonResponse({ ok: false, reason: 'bad-input', message: 'That "sessionId" is not a Session id.' }, 400)
  }
  let refresh = false
  let sessionId = query.sessionId
  if (method === 'POST') {
    const body = await readBody(request)
    if (body.ok !== true) {
      return jsonResponse({ ok: false, reason: 'bad-input', message: 'That request body is not a small JSON object.' }, 400)
    }
    const action = typeof body.body.action === 'string' ? body.body.action.trim() : ''
    if (action !== 'refresh') {
      return jsonResponse({ ok: false, reason: 'bad-input', message: 'The only action is "refresh".' }, 400)
    }
    refresh = true
    if (typeof body.body.sessionId === 'string' && body.body.sessionId.trim() !== '') {
      const candidate = body.body.sessionId.trim()
      if (isSafeKey(candidate) !== true) {
        return jsonResponse({ ok: false, reason: 'bad-input', message: 'That "sessionId" is not a Session id.' }, 400)
      }
      sessionId = candidate
    }
  }
  try {
    const view = await skills.list({ sessionId, refresh })
    if (view?.ok !== true) {
      const reason = typeof view?.reason === 'string' ? view.reason : 'error'
      return jsonResponse(
        { ok: false, reason, message: typeof view?.message === 'string' ? view.message : 'The skills could not be listed.' },
        reason === 'not-found' ? 404 : reason === 'bad-input' ? 400 : 200,
      )
    }
    return jsonResponse(view)
  } catch {
    // Never a 500: a registry that explodes is a report the page can render.
    return jsonResponse({ ok: false, reason: 'error', message: 'The skills could not be listed.' })
  }
}

/**
 * Register the route on the Host connection.
 *
 * The route lives under the `connection` service (it is the browser's only way in)
 * and reads the `skills` service lazily, so a Host whose registry mounts later still
 * answers. The `ctx.inject(['skills'])` below declares that dependency — there is
 * nothing to start, because discovery happens per request.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  const skills = createSkills({ logger: ctx.logger, get: serviceName => ctx.get?.(serviceName) })

  ctx.effect(() => {
    try {
      const dispose = ctx.connection.fetch.register({
        path: SKILLS_PATH,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        requestBody: 'buffered',
        fetch: request => skillsResponse(request, { skills }),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-skills: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-skills: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-skills: route')

  try {
    ctx.inject?.(['skills'], () => {
      // A declaration, not a starter: discovery is per request, and this callback
      // existing is what tells the Loader the row wants the registry when it mounts.
      return undefined
    })
  } catch (error) {
    ctx.logger?.warn?.('edh-skills: the skill registry is not injectable: %o', error)
  }
}

/** The route needs the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
