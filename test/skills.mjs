import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  apply,
  createSkills,
  inject,
  isSafeKey,
  MAX_DESCRIPTION,
  MAX_SESSION_ID,
  name,
  resolveScope,
  resourcePathOf,
  sanitizeDescription,
  sessionIdOf,
  SKILL_SOURCES,
  SKILLS_PATH,
  skillRow,
  skillsResponse,
  sourceInfoOf,
  splitSkills,
  UNKNOWN_SOURCE_RANK,
} from '../skills.js'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))

/** One registry summary, the shape `SkillSummary` gives. */
function summary(overrides = {}) {
  return {
    name: 'a-skill',
    description: 'Does a useful thing.',
    invocation: { modelInvocable: true, userInvocable: true },
    source: 'bundled',
    provider: 'bundled',
    ...overrides,
  }
}

/** A registry stand-in that records the options it was asked for. */
function fakeRegistry({ skills = [], complete = true, withInvalidate = true, snapshotError } = {}) {
  const calls = []
  const registry = {
    calls,
    invalidations: 0,
    async snapshot(options) {
      calls.push(options)
      if (snapshotError !== undefined) throw new Error(snapshotError)
      return { skills, complete }
    },
    async list(options) {
      calls.push(options)
      if (snapshotError !== undefined) throw new Error(snapshotError)
      return skills
    },
  }
  if (withInvalidate === true) {
    registry.invalidateCache = function invalidateCache() {
      registry.invalidations += 1
    }
  } else {
    delete registry.snapshot
  }
  return registry
}

/** A sessionQuery stand-in: one known Session, with projection, header and preset. */
function fakeSessionQuery({ workingDirectory, headerCwd, agentPreset, error } = {}) {
  const calls = []
  const observation = {
    released: 0,
    projections: { values: { ...(workingDirectory === undefined ? {} : { workingDirectory }), ...(agentPreset === undefined ? {} : { agentPreset }) } },
    header: { cwd: headerCwd },
    async [Symbol.asyncDispose]() {
      observation.released += 1
    },
  }
  return {
    calls,
    observation,
    sessionQuery: {
      async observeSession(sessionId) {
        calls.push(sessionId)
        if (error !== undefined) throw error
        return observation
      },
    },
  }
}

/** A live agent with its own `skills` layer, as `agentPresets.serviceFor` would give. */
function fakeAgent(overrides = {}) {
  return { id: 'session-live', cwd: 'C:\\live', registry: undefined, ...overrides }
}

/** The whole service map, one override at a time. */
function services(overrides = {}) {
  const released = []
  const map = {
    skills: fakeRegistry({ skills: [summary()] }),
    workingDirectory: { defaultDirectory: 'C:\\default', ensure: async agent => agent.cwd },
    agents: { get: () => undefined },
    agentPresets: {
      async acquireScope(preset) {
        return {
          key: `scope:${preset}`,
          async [Symbol.asyncDispose]() {
            released.push(preset)
          },
        }
      },
      serviceFor: agent => agent.registry,
    },
    workspaces: { resolveByPath: async () => ({ title: 'moreweb' }) },
    ...overrides,
  }
  return { map, released }
}

// ---------------------------------------------------------------------------
// 1 — the split is by `source`, and an unknown source is kept in global
// ---------------------------------------------------------------------------
{
  assert.equal(name, 'edh-skills')
  assert.deepEqual(inject, ['connection'], 'the route needs the Host connection')
  assert.equal(SKILLS_PATH, '/api/edh.skills')

  // Every source in the table lands where the Harness's own ranks put it.
  assert.deepEqual(
    Object.fromEntries(Object.entries(SKILL_SOURCES).map(([source, info]) => [source, info.scope])),
    {
      'project-dsh': 'workspace',
      'project-agents': 'workspace',
      runtime: 'global',
      custom: 'global',
      'user-dsh': 'global',
      'user-agents': 'global',
      bundled: 'global',
    },
  )
  for (const info of Object.values(SKILL_SOURCES)) {
    assert.equal(typeof info.label, 'string')
    assert.equal(Number.isInteger(info.rank), true)
  }
  assert.deepEqual(sourceInfoOf('project-dsh'), { scope: 'workspace', label: 'Project .dsh/skills', rank: 100, known: true })
  assert.deepEqual(sourceInfoOf('bundled'), { scope: 'global', label: 'Bundled with the Harness', rank: 600, known: true })

  // A source this table does not know is global, under its own name, not dropped.
  assert.deepEqual(sourceInfoOf('mystery'), { scope: 'global', label: 'mystery', rank: UNKNOWN_SOURCE_RANK, known: false })
  assert.deepEqual(sourceInfoOf(''), { scope: 'global', label: 'unknown', rank: UNKNOWN_SOURCE_RANK, known: false })
  assert.deepEqual(sourceInfoOf(undefined), { scope: 'global', label: 'unknown', rank: UNKNOWN_SOURCE_RANK, known: false })

  const split = splitSkills([
    summary({ name: 'zeta', source: 'bundled' }),
    summary({ name: 'alpha', source: 'project-dsh' }),
    summary({ name: 'beta', source: 'user-agents' }),
    summary({ name: 'gamma', source: 'project-agents' }),
    summary({ name: 'delta', source: 'runtime' }),
    summary({ name: 'epsilon', source: 'custom' }),
    summary({ name: 'eta', source: 'user-dsh' }),
    summary({ name: 'theta', source: 'mystery' }),
    summary({ name: '' }),
  ])
  assert.deepEqual(split.workspace.map(row => row.name), ['alpha', 'gamma'], 'the two project sources are the workspace tab')
  assert.deepEqual(split.global.map(row => row.name), ['beta', 'delta', 'epsilon', 'eta', 'theta', 'zeta'], 'everything else, sorted by name')
  assert.deepEqual(split.counts, { global: 6, workspace: 2 }, 'counts match the rows, and the nameless one is dropped')
  assert.equal(split.global.find(row => row.name === 'theta').sourceLabel, 'mystery')
  assert.equal(split.global.find(row => row.name === 'theta').source, 'mystery', 'the unknown source is reported as it is')
}

// ---------------------------------------------------------------------------
// 2 — the row shape: what is absent stays absent
// ---------------------------------------------------------------------------
{
  const withPath = skillRow(
    summary({
      path: 'C:\\skills\\a-skill\\SKILL.md',
      whenToUse: 'When the task is about proxies.',
      resourceBase: { kind: 'directory', path: 'C:\\skills\\a-skill' },
    }),
  )
  assert.equal(withPath.path, 'C:\\skills\\a-skill\\SKILL.md')
  assert.equal(withPath.whenToUse, 'When the task is about proxies.')
  assert.equal(withPath.resourcePath, 'C:\\skills\\a-skill')
  assert.equal(withPath.descriptionFull, 'Does a useful thing.')
  assert.equal(withPath.name, 'a-skill')
  assert.equal(withPath.provider, 'bundled')
  assert.equal(withPath.source, 'bundled')
  assert.equal(withPath.sourceLabel, 'Bundled with the Harness')
  assert.equal(withPath.modelInvocable, true)
  assert.equal(withPath.userInvocable, true)

  // No path at all (the bundled/asr providers): the field is absent, not empty.
  const noPath = skillRow(summary({ source: 'runtime', provider: 'badge' }))
  assert.equal('path' in noPath, false, 'an empty string would claim a file that does not exist')
  assert.equal('whenToUse' in noPath, false)
  assert.equal('resourcePath' in noPath, false)

  // A model-only skill keeps the booleans exactly as the registry resolved them.
  const modelOnly = skillRow(summary({ invocation: { modelInvocable: true, userInvocable: false } }))
  assert.equal(modelOnly.modelInvocable, true)
  assert.equal(modelOnly.userInvocable, false)
  const userOnly = skillRow(summary({ invocation: { modelInvocable: false, userInvocable: true } }))
  assert.equal(userOnly.modelInvocable, false)
  assert.equal(userOnly.userInvocable, true)
  const missingInvocation = skillRow(summary({ invocation: undefined }))
  assert.equal(missingInvocation.modelInvocable, false)
  assert.equal(missingInvocation.userInvocable, false)

  // A resource base is a closed union: path, URL, or opaque prose.
  assert.equal(resourcePathOf({ kind: 'directory', path: 'C:\\x' }), 'C:\\x')
  assert.equal(resourcePathOf({ kind: 'url', url: 'https://example.invalid/skills' }), 'https://example.invalid/skills')
  assert.equal(resourcePathOf({ kind: 'opaque', description: 'managed elsewhere' }), undefined, 'prose is not a path')
  assert.equal(resourcePathOf(undefined), undefined)
  assert.equal('resourcePath' in skillRow(summary({ resourceBase: { kind: 'opaque', description: 'x' } })), false)

  // A blank name is dropped rather than rendered as an empty row.
  assert.equal(skillRow(summary({ name: undefined })).name, '')
  assert.deepEqual(splitSkills([summary({ name: '' })]).counts, { global: 0, workspace: 0 })
}

// ---------------------------------------------------------------------------
// 3 — the description is cut for a row, and the full text rides beside it
// ---------------------------------------------------------------------------
{
  const long = 'word '.repeat(80).trim()
  const cut = sanitizeDescription(long)
  assert.equal(cut.description.length <= MAX_DESCRIPTION, true)
  assert.equal(cut.description.endsWith('…'), true, 'a cut description says it was cut')
  assert.equal(cut.descriptionFull, long, 'the full text is kept')
  assert.equal(sanitizeDescription(long).descriptionFull.length, long.length)

  const exactly = 'x'.repeat(MAX_DESCRIPTION)
  assert.deepEqual(sanitizeDescription(exactly), { description: exactly, descriptionFull: exactly })
  const justOver = 'x'.repeat(MAX_DESCRIPTION + 1)
  assert.equal(sanitizeDescription(justOver).description.length <= MAX_DESCRIPTION, true)
  assert.equal(sanitizeDescription(justOver).description.endsWith('…'), true)

  // Whitespace collapses; the name is never touched, so a row stays identifiable.
  assert.deepEqual(sanitizeDescription('  one\n\ntwo\t three  '), { description: 'one two three', descriptionFull: 'one two three' })
  assert.deepEqual(sanitizeDescription(undefined), { description: '', descriptionFull: '' })
  const longNamed = skillRow(summary({ name: 'a-rather-long-but-stable-name', description: long }))
  assert.equal(longNamed.name, 'a-rather-long-but-stable-name')
  assert.equal(longNamed.description.length <= MAX_DESCRIPTION, true)
}

// ---------------------------------------------------------------------------
// 4 — the cwd, in the shipped derivation order
// ---------------------------------------------------------------------------
{
  // Projection beats the header, the header beats the default.
  {
    const { observation, sessionQuery } = fakeSessionQuery({ workingDirectory: 'C:\\projected', headerCwd: 'C:\\header' })
    const { map } = services({ sessionQuery })
    const resolved = await resolveScope({ get: serviceName => map[serviceName], sessionId: 'session-a' })
    assert.equal(resolved.cwd, 'C:\\projected')
    assert.equal(resolved.source, 'session')
    assert.equal(observation.released, 0, 'the observation is still held by the caller of resolveScope')
    await observation[Symbol.asyncDispose]()
  }
  {
    const { sessionQuery } = fakeSessionQuery({ headerCwd: 'C:\\header' })
    const { map } = services({ sessionQuery })
    const resolved = await resolveScope({ get: serviceName => map[serviceName], sessionId: 'session-a' })
    assert.equal(resolved.cwd, 'C:\\header', 'the header is the fallback, though it is the creation cwd')
  }
  {
    const { sessionQuery } = fakeSessionQuery({})
    const { map } = services({ sessionQuery })
    const resolved = await resolveScope({ get: serviceName => map[serviceName], sessionId: 'session-a' })
    assert.equal(resolved.cwd, 'C:\\default', 'a Session with no directory at all falls back to the default')
  }

  // A live agent's ensured directory wins over everything the observation said.
  {
    const live = fakeAgent()
    const { sessionQuery } = fakeSessionQuery({ workingDirectory: 'C:\\projected' })
    const { map } = services({ sessionQuery, agents: { get: () => live } })
    const resolved = await resolveScope({ get: serviceName => map[serviceName], sessionId: 'session-live' })
    assert.equal(resolved.cwd, 'C:\\live', 'the directory the agent is actually using now')
    assert.equal(resolved.scope, live, 'and the live agent is the scope')
    await resolved.observation[Symbol.asyncDispose]()
  }

  // No sessionQuery at all, and no sessionId: the default directory, source `default`.
  {
    const { map } = services({ sessionQuery: undefined })
    const resolved = await resolveScope({ get: serviceName => map[serviceName] })
    assert.equal(resolved.cwd, 'C:\\default')
    assert.equal(resolved.source, 'default')
    assert.equal(resolved.scope, undefined)
  }

  // No workingDirectory service either: an empty cwd, never a throw.
  {
    const { map } = services({ workingDirectory: undefined })
    const resolved = await resolveScope({ get: serviceName => map[serviceName] })
    assert.equal(resolved.cwd, '')
  }

  // An unknown Session is `not-found`, which is the whole point of the 404.
  {
    const error = Object.assign(new Error('session "x" not found'), { code: 'SESSION_QUERY_SESSION_NOT_FOUND' })
    const { sessionQuery } = fakeSessionQuery({ error })
    const { map } = services({ sessionQuery })
    assert.deepEqual(await resolveScope({ get: serviceName => map[serviceName], sessionId: 'session-x' }), {
      ok: false,
      reason: 'not-found',
      message: 'No stored Session has that id.',
    })
  }

  // Any other read failure is an error, not a lie about the Session.
  {
    const { sessionQuery } = fakeSessionQuery({ error: Object.assign(new Error('corrupt'), { code: 'SESSION_QUERY_CORRUPT_SESSION' }) })
    const { map } = services({ sessionQuery })
    const resolved = await resolveScope({ get: serviceName => map[serviceName], sessionId: 'session-x' })
    assert.equal(resolved.ok, false)
    assert.equal(resolved.reason, 'error')
  }
}

// ---------------------------------------------------------------------------
// 5 — the scope: a preset lease for a cold Session, the agent for a live one
// ---------------------------------------------------------------------------
{
  // Cold, with a recorded preset: the lease key is the scope, and it is released.
  {
    const { sessionQuery, observation } = fakeSessionQuery({ agentPreset: 'coding' })
    const { map, released } = services({ sessionQuery })
    const skills = createSkills({ get: serviceName => map[serviceName] })
    await skills.list({ sessionId: 'session-a' })
    const options = map.skills.calls[0]
    assert.equal(options.scope, 'scope:coding', 'the preset lease key, because a cold Session has no agent')
    assert.equal(options.cwd, 'C:\\default')
    assert.deepEqual(released, ['coding'], 'the lease is disposed, so the preset can be released')
    assert.equal(observation.released, 1, 'and so is the observation')
  }

  // Live: the agent is the scope, and the agent's own skills layer is used.
  {
    const scoped = fakeRegistry({ skills: [summary({ name: 'scoped-only', source: 'project-dsh' })] })
    const live = fakeAgent({ registry: scoped })
    const root = fakeRegistry({ skills: [summary({ name: 'root-only' })] })
    const { map } = services({ agents: { get: id => (id === 'session-live' ? live : undefined) }, skills: root })
    const skills = createSkills({ get: serviceName => map[serviceName] })
    const view = await skills.list({ sessionId: 'session-live' })
    assert.equal(root.calls.length, 0, 'the root registry is not asked when the agent owns one')
    assert.deepEqual(scoped.calls[0].scope, live)
    assert.deepEqual(view.global.map(row => row.name), [], 'the scoped skills are workspace ones here')
    assert.deepEqual(view.workspace.map(row => row.name), ['scoped-only'])
  }

  // Neither: no scope at all — the global layer only, which is the honest answer.
  {
    const { map } = services()
    const skills = createSkills({ get: serviceName => map[serviceName] })
    await skills.list({})
    assert.equal('scope' in map.skills.calls[0], false, 'no scope means no per-preset layer')
  }
}

// ---------------------------------------------------------------------------
// 6 — the view, end to end, including an incomplete discovery
// ---------------------------------------------------------------------------
{
  const { map } = services({
    skills: fakeRegistry({
      skills: [summary({ name: 'bundled-one' }), summary({ name: 'project-one', source: 'project-dsh' })],
    }),
    workspaces: { resolveByPath: async () => ({ title: 'moreweb' }) },
  })
  const skills = createSkills({ get: serviceName => map[serviceName] })
  const view = await skills.list({})
  assert.deepEqual(Object.keys(view).sort(), ['complete', 'counts', 'global', 'ok', 'scope', 'workspace'])
  assert.equal(view.ok, true)
  assert.equal(view.complete, true)
  assert.deepEqual(view.counts, { global: 1, workspace: 1 })
  assert.deepEqual(view.scope, { cwd: 'C:\\default', workspaceName: 'moreweb', source: 'default' }, 'no sessionId means the default scope')

  const forSession = await (async () => {
    const { sessionQuery } = fakeSessionQuery({ workingDirectory: 'C:\\work\\moreweb' })
    const withSession = services({ sessionQuery })
    const lister = createSkills({ get: serviceName => withSession.map[serviceName] })
    return lister.list({ sessionId: 'session-a' })
  })()
  assert.deepEqual(forSession.scope, { sessionId: 'session-a', cwd: 'C:\\work\\moreweb', workspaceName: 'moreweb', source: 'session' })

  // A provider that threw: the registry keeps the rest and reports incompleteness.
  {
    const { map: partial } = services({
      skills: fakeRegistry({ skills: [summary({ name: 'kept' })], complete: false }),
    })
    const lister = createSkills({ get: serviceName => partial[serviceName] })
    const view2 = await lister.list({})
    assert.equal(view2.ok, true, 'a partial listing is still a listing')
    assert.equal(view2.complete, false, 'and it says discovery did not finish')
    assert.deepEqual(view2.global.map(row => row.name), ['kept'])
  }

  // A registry that throws is a report, not a 500.
  {
    const { map: broken } = services({ skills: fakeRegistry({ snapshotError: 'registry exploded' }) })
    const lister = createSkills({ get: serviceName => broken[serviceName] })
    const view3 = await lister.list({})
    assert.equal(view3.ok, false)
    assert.equal(view3.reason, 'error')
    assert.equal(JSON.stringify(view3).includes('registry exploded'), false, 'the throw is not echoed')
  }

  // No registry at all.
  {
    const { map: none } = services({ skills: undefined })
    const lister = createSkills({ get: serviceName => none[serviceName] })
    assert.equal(lister.available(), false)
    assert.deepEqual(await lister.list({}), {
      ok: false,
      reason: 'unavailable',
      message: 'This Host has no skill registry.',
    })
  }

  // A registry with only `list` still works: the snapshot is optional.
  {
    const listOnly = {
      calls: [],
      async list(options) {
        listOnly.calls.push(options)
        return [summary({ name: 'list-only' })]
      },
    }
    const { map: legacy } = services({ skills: listOnly })
    const lister = createSkills({ get: serviceName => legacy[serviceName] })
    const view4 = await lister.list({})
    assert.equal(view4.ok, true)
    assert.equal(view4.complete, true, 'no snapshot means no incompleteness to report')
    assert.deepEqual(view4.global.map(row => row.name), ['list-only'])
  }
}

// ---------------------------------------------------------------------------
// 7 — refresh: a real invalidation when the registry has one
// ---------------------------------------------------------------------------
{
  const { map } = services()
  const skills = createSkills({ get: serviceName => map[serviceName] })
  await skills.list({})
  assert.equal(map.skills.invalidations, 0, 'a plain read does not invalidate')
  assert.equal(map.skills.calls.length, 1)

  await skills.list({ refresh: true })
  assert.equal(map.skills.invalidations, 1, 'refresh calls the registry’s own invalidation')
  assert.equal(map.skills.calls.length, 2, 'and then re-reads')

  // A registry with no invalidation: refresh is a plain re-read, and that is honest.
  {
    const { map: plain } = services({ skills: fakeRegistry({ skills: [summary()], withInvalidate: false }) })
    const lister = createSkills({ get: serviceName => plain[serviceName] })
    assert.equal(typeof plain.skills.invalidateCache, 'undefined')
    const view = await lister.list({ refresh: true })
    assert.equal(view.ok, true)
    assert.equal(plain.skills.calls.length, 1, 'the registry was re-read once')
  }

  // An invalidation that throws does not stop the listing.
  {
    const throwing = fakeRegistry({ skills: [summary()] })
    throwing.invalidateCache = () => {
      throw new Error('nope')
    }
    const { map: fragile } = services({ skills: throwing })
    const lister = createSkills({ get: serviceName => fragile[serviceName] })
    const view = await lister.list({ refresh: true })
    assert.equal(view.ok, true)
  }
}

// ---------------------------------------------------------------------------
// 8 — the route: GET, POST refresh, and the matrix of refusals
// ---------------------------------------------------------------------------
{
  const view = {
    ok: true,
    scope: { cwd: 'C:\\default', source: 'default' },
    global: [{ name: 'a' }],
    workspace: [],
    complete: true,
    counts: { global: 1, workspace: 0 },
  }
  const fakeSkills = {
    calls: [],
    async list(request) {
      fakeSkills.calls.push(request)
      return view
    },
    available: () => true,
  }
  const call = async (url, method = 'GET', body, skills = fakeSkills) => {
    const request = { method, url, text: async () => (body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)) }
    const response = await skillsResponse(request, { skills })
    return { status: response.status, body: await response.json() }
  }

  const listing = await call('/api/edh.skills')
  assert.equal(listing.status, 200)
  assert.equal(listing.body.ok, true)
  assert.deepEqual(fakeSkills.calls.at(-1), { sessionId: undefined, refresh: false })

  const forSession = await call('/api/edh.skills?sessionId=session-a')
  assert.deepEqual(fakeSkills.calls.at(-1), { sessionId: 'session-a', refresh: false })
  assert.equal(forSession.status, 200)

  // `any` and an empty value mean "every Session", which is the default scope.
  await call('/api/edh.skills?sessionId=any')
  assert.equal(fakeSkills.calls.at(-1).sessionId, undefined)
  await call('/api/edh.skills?sessionId=')
  assert.equal(fakeSkills.calls.at(-1).sessionId, undefined)

  // The refresh POST.
  const refreshed = await call('/api/edh.skills', 'POST', { action: 'refresh' })
  assert.equal(refreshed.status, 200)
  assert.deepEqual(fakeSkills.calls.at(-1), { sessionId: undefined, refresh: true })
  await call('/api/edh.skills?sessionId=session-a', 'POST', { action: 'refresh' })
  assert.deepEqual(fakeSkills.calls.at(-1), { sessionId: 'session-a', refresh: true }, 'the query string still names the Session')
  await call('/api/edh.skills', 'POST', { action: 'refresh', sessionId: 'session-b' })
  assert.deepEqual(fakeSkills.calls.at(-1), { sessionId: 'session-b', refresh: true }, 'or the body does')

  // A body that is not a small JSON object with a known action.
  for (const body of ['not json', '[]', '"text"', '42', '{}', { action: 'list' }, { action: '' }, 'x'.repeat(5000)]) {
    const rejected = await call('/api/edh.skills', 'POST', body)
    assert.equal(rejected.status, 400, JSON.stringify(body).slice(0, 24))
    assert.equal(rejected.body.reason, 'bad-input')
  }
  {
    const badId = await call('/api/edh.skills', 'POST', { action: 'refresh', sessionId: '../../x' })
    assert.equal(badId.status, 400)
  }

  // An unsafe or repeated sessionId on the query string.
  for (const value of ['../../x', 'C:\\x', 'a:b', 'x'.repeat(MAX_SESSION_ID + 1)]) {
    const rejected = await call(`/api/edh.skills?sessionId=${encodeURIComponent(value)}`)
    assert.equal(rejected.status, 400, value)
  }
  {
    const repeated = await call('/api/edh.skills?sessionId=a&sessionId=b')
    assert.equal(repeated.status, 400)
  }
  assert.equal(isSafeKey('session-a'), true)
  assert.equal(isSafeKey('a/b'), false)

  // Methods.
  for (const method of ['PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
    const rejected = await call('/api/edh.skills', method)
    assert.equal(rejected.status, 405, method)
    assert.equal(rejected.body.reason, 'unsupported-method')
  }

  // The lister's own failures keep their status.
  const failing = reason => ({ available: () => true, list: async () => ({ ok: false, reason, message: 'nope' }) })
  assert.equal((await call('/api/edh.skills', 'GET', undefined, failing('not-found'))).status, 404)
  assert.equal((await call('/api/edh.skills', 'GET', undefined, failing('unavailable'))).status, 200)
  assert.equal((await call('/api/edh.skills', 'GET', undefined, failing('error'))).status, 200)

  // No lister, and a lister that throws.
  const missing = await call('/api/edh.skills', 'GET', undefined, null)
  assert.equal(missing.status, 200)
  assert.equal(missing.body.reason, 'unavailable')
  const throwing = await call('/api/edh.skills', 'GET', undefined, {
    available: () => true,
    list: async () => {
      throw new Error('boom')
    },
  })
  assert.equal(throwing.status, 200)
  assert.equal(throwing.body.reason, 'error')
  assert.equal(JSON.stringify(throwing.body).includes('boom'), false, 'the throw is not echoed')

  // Nothing in an answer is a home path except the skill paths themselves.
  const text = JSON.stringify(listing.body)
  assert.equal(text.includes('AppData'), false)
}

// ---------------------------------------------------------------------------
// 9 — the row: registration, disposal, and no services at all
// ---------------------------------------------------------------------------
{
  const routes = []
  const disposers = []
  const warnings = []
  const map = services().map
  const ctx = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    get: serviceName => map[serviceName],
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    inject: () => undefined,
    connection: {
      fetch: {
        register(route) {
          routes.push(route)
          return () => {
            const at = routes.indexOf(route)
            if (at !== -1) routes.splice(at, 1)
          }
        },
      },
    },
  }
  apply(ctx)
  assert.equal(routes.length, 1, 'the skills route is registered')
  assert.equal(routes[0].path, SKILLS_PATH)
  assert.deepEqual([...routes[0].methods], ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
  assert.equal(routes[0].requestBody, 'buffered')

  const answered = await routes[0].fetch(new Request('http://127.0.0.1/api/edh.skills'))
  assert.equal(answered.status, 200)
  const body = await answered.json()
  assert.equal(body.ok, true)
  assert.equal(typeof body.counts.global, 'number')

  for (const dispose of [...disposers].reverse()) dispose()
  assert.equal(routes.length, 0, 'disposal unregisters the route')

  // A Host with no connection at all must not throw.
  const bare = {
    logger: { warn: () => {} },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
  }
  assert.doesNotThrow(() => apply(bare))

  // A refused registration is a warning.
  const refused = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    get: () => undefined,
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') dispose()
      return dispose
    },
    inject: () => undefined,
    connection: {
      fetch: {
        register() {
          throw new Error('connection: exact Fetch route already registered')
        },
      },
    },
  }
  assert.doesNotThrow(() => apply(refused))
  assert.equal(warnings.some(line => /registration failed/u.test(line)), true)
}

// ---------------------------------------------------------------------------
// 10 — structural guards: the registry, never the filesystem
// ---------------------------------------------------------------------------
{
  const source = readFileSync(join(ROOT, 'skills.js'), 'utf8')
  for (const forbidden of ['readdirSync', 'readFileSync', 'opendirSync', 'statSync']) {
    assert.equal(source.includes(forbidden), false, `this module never touches the filesystem (${forbidden})`)
  }
  // The only mention of `~/.claude/skills` is the comment that says the Harness
  // does not scan it — so the tab cannot lie about skills the agent cannot load.
  assert.equal(
    source
      .split('\n')
      .filter(line => /claude/iu.test(line))
      .every(line => /^\s*\*/u.test(line)),
    true,
    'the ~/.claude/skills mention is documentation, not code',
  )
  assert.equal(source.includes("get('skills')"), true, 'it reads the skills service')
  assert.equal(/registry\.get\s*\(/u.test(source), false, 'and never asks the registry for a skill body')
  assert.equal(/\.snapshot\s*\(|\.list\s*\(/u.test(source), true, 'only the summary surfaces')
  // No request value is joined onto a path.
  const joins = [...source.matchAll(/join\(([^)]*)\)/gu)].map(match => match[1])
  for (const args of joins) {
    assert.equal(/sessionId|query|searchParams/u.test(args), false, `join(${args.trim()}) takes no request value`)
  }
  assert.equal(source.includes('basename('), true, 'the workspace name falls back to the directory name, not a scan')
}

console.log('edh skills: all checks passed')
