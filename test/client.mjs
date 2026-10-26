// Loose deepEqual: the client module runs in its own vm realm, so its plain
// objects carry that realm's prototypes.
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

/** Load the browser module the way the page's module loader would. */
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
let definition
const sandbox = {
  window: { __ModuleLoader__: { load: value => { definition = value } } },
  console,
}
vm.runInNewContext(source, sandbox, { filename: 'client.js' })

assert.ok(definition, 'module definition captured')
assert.equal(definition.id, '@moreweb/edh')
const mod = definition.factory(() => ({}))
assert.deepEqual(mod.inject, ['slots', 'locale', 'remote', 'remote.pluginManager'])
const { createController, findFeatures, featureEnabled, rowEnabled, contentParts, unwrap, EDIT_MODULE, EXPORT_MODULE } = mod.__test
const {
  updateSubject,
  readCheck,
  readApply,
  updateText,
  failureNote,
  revisionOfFrame,
  eventFrames,
  moduleRevision,
  UPDATE_MODULE,
  PACKAGE_NAME,
  UPDATE_ROUTE,
  EVENTS_ROUTE,
  UPDATE_DEBUG_KEY,
} = mod.__test
const {
  failureText,
  serverRecord,
  actionReport,
  reasonSentence,
  inputRejection,
  readMcpView,
  serverState,
  stateLabel,
  stateTone,
  emptyServerForm,
  splitLines,
  environmentMap,
  isHttpUrl,
  defaultServerName,
  validateServer,
  addServerBody,
  serverActionBody,
  withoutKey,
  reloadVisible,
  hostStaleness,
  reloadOutcome,
  reloadText,
  runReload,
  controlStyle,
  ICON_UPDATE,
  ICON_RELOAD,
  MCP_MODULE,
  MCP_ROUTE,
  MCP_SECTION_SLOT,
  MCP_SECTION_ORDER,
  MCP_ACTIONS,
  MCP_DEBUG_KEY,
} = mod.__test

const SHELL = { entryId: 'include:edh', moduleName: '@moreweb/edh', enabled: true, fiberPhase: 'active' }
const RETRY = { entryId: 'include:edh-retry', moduleName: '@moreweb/edh/retry', enabled: true, fiberPhase: 'active' }
const LATER = { entryId: 'include:edh-later', moduleName: '@moreweb/edh/later', enabled: true, fiberPhase: 'active' }

/** Fake `remote.pluginManager` with mutable row state. */
function fakeRemote(options = {}) {
  const rows = (options.rows ?? [SHELL, RETRY]).map(row => ({ ...row }))
  const state = {
    application: options.application ?? 'applied',
    returnRaw: options.returnRaw === true,
    rejects: options.rejects === true,
    throws: options.throws === true,
    failList: options.failList === true,
    rejectsWrite: options.rejectsWrite === true,
    throwsWrite: options.throwsWrite === true,
    failingEntry: options.failingEntry ?? null,
  }
  const calls = []
  const reply = value => (state.returnRaw ? value : { ok: true, value })
  return {
    rows,
    state,
    calls,
    async listPlugins() {
      calls.push(['listPlugins'])
      if (state.rejects) return { ok: false, error: { code: 'denied', message: 'no' } }
      if (state.failList) throw new Error('list failed')
      return reply(rows.map(row => ({ ...row })))
    },
    async setPluginEnabled(entryId, enabled) {
      calls.push(['setPluginEnabled', entryId, enabled])
      if (state.throwsWrite) throw new Error('write failed')
      if (state.rejectsWrite) return { ok: false, error: { code: 'denied', message: 'no' } }
      if (state.failingEntry === entryId) return reply({ application: 'overridden', target: entryId })
      const row = rows.find(candidate => candidate.entryId === entryId)
      if (row !== undefined && state.application !== 'overridden') row.enabled = enabled
      return reply({ application: state.application, target: entryId })
    },
  }
}

// 1 — feature discovery: the shell row and foreign rows never count as features.
{
  assert.deepEqual(findFeatures([SHELL, RETRY]).map(row => row.entryId), ['include:edh-retry'])
  assert.deepEqual(findFeatures([SHELL, RETRY, LATER]).map(row => row.entryId), ['include:edh-retry', 'include:edh-later'])
  assert.deepEqual(findFeatures([SHELL, { entryId: 'x', moduleName: '@moreweb/edhx' }]), [])
  assert.deepEqual(findFeatures([SHELL, { moduleName: '@moreweb/edh/retry' }]), [], 'a row without entryId is unusable')
  assert.deepEqual(findFeatures([]), [])
  assert.deepEqual(findFeatures(undefined), [])
  assert.deepEqual(unwrap({ ok: true, value: 7 }), { ok: true, value: 7 })
  assert.deepEqual(unwrap({ ok: false }), { ok: false, value: undefined })
  assert.deepEqual(unwrap(7), { ok: true, value: 7 })
}

// 2 — refresh reports the aggregate state of every feature row.
{
  const controller = createController(fakeRemote())
  assert.equal(controller.getSnapshot().status, 'loading')
  await controller.refresh()
  assert.deepEqual(
    { status: controller.getSnapshot().status, enabled: controller.getSnapshot().enabled, features: controller.getSnapshot().features },
    { status: 'ready', enabled: true, features: 1 },
  )
}

// 3 — toggling writes every feature row and never the shell row.
{
  const remote = fakeRemote({ rows: [SHELL, RETRY, LATER] })
  const controller = createController(remote)
  await controller.refresh()
  await controller.toggle()
  assert.deepEqual(remote.calls, [
    ['listPlugins'],
    ['setPluginEnabled', 'include:edh-retry', false],
    ['setPluginEnabled', 'include:edh-later', false],
    ['listPlugins'],
  ])
  assert.equal(controller.getSnapshot().enabled, false)
  assert.equal(remote.rows[0].enabled, true, 'the shell row stayed enabled')
}

// 4 — one paused feature makes the aggregate read off, and toggling restores all.
{
  const remote = fakeRemote({ rows: [SHELL, { ...RETRY, enabled: false }, LATER] })
  const controller = createController(remote)
  await controller.refresh()
  assert.equal(controller.getSnapshot().enabled, false)
  await controller.toggle()
  assert.equal(controller.getSnapshot().enabled, true)
  assert.ok(remote.rows.filter(row => row.entryId !== 'include:edh').every(row => row.enabled === true))
}

// 5 — a saved change that needs a restart is reported.
{
  const controller = createController(fakeRemote({ application: 'restart-required' }))
  await controller.refresh()
  await controller.toggle()
  assert.equal(controller.getSnapshot().note, 'restart')
  assert.equal(controller.getSnapshot().enabled, false)
}

// 6 — a partially overridden change reports failure and re-reads the rows.
{
  const remote = fakeRemote({ rows: [SHELL, RETRY, LATER], failingEntry: 'include:edh-later' })
  const controller = createController(remote)
  await controller.refresh()
  await controller.toggle()
  assert.equal(controller.getSnapshot().note, 'failed')
  // The first row accepted the write, the second was overridden: the aggregate
  // reads the authoritative mix, which is "off".
  assert.equal(controller.getSnapshot().enabled, false)
  assert.equal(remote.rows[1].enabled, false)
  assert.equal(remote.rows[2].enabled, true)
}

// 7 — no feature rows reports unavailable so the switch is inert.
{
  const controller = createController(fakeRemote({ rows: [SHELL] }))
  await controller.refresh()
  assert.equal(controller.getSnapshot().status, 'unavailable')
  assert.equal(controller.getSnapshot().features, 0)
  await controller.toggle()
  assert.deepEqual(controller.getSnapshot().note, '')
}

// 8 — a refused or broken Remote read reports an error.
{
  for (const options of [{ rejects: true }, { failList: true }]) {
    const controller = createController(fakeRemote(options))
    await controller.refresh()
    assert.equal(controller.getSnapshot().status, 'error')
  }
}

// 9 — a refused or broken write reports failure and leaves the switch ready.
{
  for (const options of [{ rejectsWrite: true }, { throwsWrite: true }]) {
    const controller = createController(fakeRemote(options))
    await controller.refresh()
    await controller.toggle()
    assert.equal(controller.getSnapshot().status, 'ready')
    assert.equal(controller.getSnapshot().note, 'failed')
    assert.equal(controller.getSnapshot().pending, false)
    assert.equal(controller.getSnapshot().enabled, true, 'no optimistic flip on a refused write')
  }
}

// 10 — a raw (unwrapped) Remote reply is accepted too.
{
  const controller = createController(fakeRemote({ returnRaw: true }))
  await controller.refresh()
  assert.equal(controller.getSnapshot().status, 'ready')
  await controller.toggle()
  assert.equal(controller.getSnapshot().enabled, false)
}

// 11 — per-row enablement gates a single feature without touching the others.
{
  const EDIT = { entryId: 'include:edh-edit', moduleName: EDIT_MODULE, enabled: true, fiberPhase: 'active' }
  const editOff = { ...EDIT, enabled: false }
  const on = createController(fakeRemote({ rows: [SHELL, RETRY, EDIT] }))
  await on.refresh()
  assert.equal(featureEnabled(on.getSnapshot(), EDIT_MODULE), true)
  assert.equal(featureEnabled(on.getSnapshot(), '@moreweb/edh/retry'), true)
  assert.equal(featureEnabled(on.getSnapshot(), '@moreweb/edh/absent'), true, 'an absent row follows the aggregate')

  const off = createController(fakeRemote({ rows: [SHELL, RETRY, editOff] }))
  await off.refresh()
  assert.equal(featureEnabled(off.getSnapshot(), EDIT_MODULE), false)
  assert.equal(featureEnabled(off.getSnapshot(), '@moreweb/edh/retry'), true, 'retry stays on')
  assert.equal(off.getSnapshot().enabled, false, 'the aggregate still reads off')

  // A profile still running the older patch knows only the retry row: the absent
  // edit row must follow the aggregate, not read as "off".
  const upgraded = createController(fakeRemote({ rows: [SHELL, RETRY] }))
  await upgraded.refresh()
  assert.equal(featureEnabled(upgraded.getSnapshot(), EDIT_MODULE), true)
  const paused = createController(fakeRemote({ rows: [SHELL, { ...RETRY, enabled: false }] }))
  await paused.refresh()
  assert.equal(featureEnabled(paused.getSnapshot(), EDIT_MODULE), false)

  for (const snapshot of [undefined, null, {}, { status: 'loading' }, { status: 'ready' }, { status: 'ready', moduleStates: null }]) {
    assert.equal(featureEnabled(snapshot, EDIT_MODULE), false, `inert for ${JSON.stringify(snapshot)}`)
  }

  // A feature whose UI is useless without its own Host half never borrows the
  // aggregate: before the restart that mounts its row there is no route behind it.
  const EXPORT = { entryId: 'include:edh-export', moduleName: EXPORT_MODULE, enabled: true, fiberPhase: 'active' }
  const exporting = createController(fakeRemote({ rows: [SHELL, RETRY, EXPORT] }))
  await exporting.refresh()
  assert.equal(rowEnabled(exporting.getSnapshot(), EXPORT_MODULE), true)
  assert.equal(rowEnabled(exporting.getSnapshot(), '@moreweb/edh/absent'), false, 'no aggregate fallback')

  const preRestart = createController(fakeRemote({ rows: [SHELL, RETRY] }))
  await preRestart.refresh()
  assert.equal(featureEnabled(preRestart.getSnapshot(), EDIT_MODULE), true, 'edit may follow the aggregate')
  assert.equal(rowEnabled(preRestart.getSnapshot(), EXPORT_MODULE), false, 'export may not: no route yet')
}

// 12 — a message body splits into text, attachments, and the remaining blocks.
{
  const attachment = { id: 'a1' }
  assert.deepEqual(contentParts([{ type: 'text', text: 'he' }, { type: 'text', text: 'llo' }]), {
    text: 'hello',
    attachments: [],
    rest: [],
  })
  assert.deepEqual(contentParts([
    { type: 'image', attachment },
    { type: 'text', text: 'look' },
    { type: 'file', attachment },
    { type: 'reasoning', text: 'x' },
  ]), {
    text: 'look',
    attachments: [{ type: 'image', image: { attachment } }, { type: 'file', file: attachment }],
    rest: [{ type: 'reasoning', text: 'x' }],
  })
  assert.deepEqual(contentParts(undefined), { text: '', attachments: [], rest: [] })
  assert.deepEqual(contentParts([]), { text: '', attachments: [], rest: [] })
  assert.deepEqual(contentParts([null, 7]), { text: '', attachments: [], rest: [] })
  assert.deepEqual(contentParts([{ type: 'image' }]), {
    text: '',
    attachments: [],
    rest: [{ type: 'image' }],
  }, 'an attachment block without a payload is kept verbatim')
}

// 13 — the update control addresses one route, one row, and one breadcrumb key.
{
  assert.equal(UPDATE_ROUTE, 'api/edh.update', 'document-relative, like the export route')
  assert.equal(EVENTS_ROUTE, 'plugins/events', 'the route the shipped HMR client reads')
  assert.equal(UPDATE_MODULE, '@moreweb/edh/update', 'the row that owns the routes')
  assert.equal(PACKAGE_NAME, '@moreweb/edh', 'the package name and the module id are the same string')
  assert.equal(UPDATE_DEBUG_KEY, 'edh:update', 'its own breadcrumb, beside edh:export')
}

// 14 — the control renders on EDH's own Plugin Manager page and nowhere else.
{
  const pkg = { name: PACKAGE_NAME, installed: true, availability: 'installed', official: false, enabled: true, rows: [] }
  assert.equal(updateSubject({ kind: 'bundle', pkg }), 'bundle')
  assert.equal(updateSubject({
    kind: 'row',
    pkg,
    row: { rowId: 'edh-export', moduleName: EXPORT_MODULE, enabled: true },
  }), 'row', 'a row page of the same package is still EDH')
  assert.equal(updateSubject({ kind: 'bundle', pkg: { ...pkg, name: '@moreweb/edh-other' } }), undefined, 'another package is not ours')
  assert.equal(updateSubject({ kind: 'row', pkg: { ...pkg, name: '@other/plugin' } }), undefined)
  assert.equal(updateSubject({ kind: 'item', id: PACKAGE_NAME }), undefined, 'an official item id is not a package name')
  for (const absent of [undefined, null, 'subject', {}, { kind: 'bundle' }, { kind: 'bundle', pkg: null }, { pkg }]) {
    assert.equal(updateSubject(absent), undefined, `inert for ${JSON.stringify(absent)}`)
  }
}

// 15 — a check answer becomes one state, and never offers an update it cannot name.
{
  assert.deepEqual(readCheck({ ok: true, installed: '0.4.0', latest: '0.5.0', available: true, checkout: true }), {
    status: 'update-available',
    stage: 'check',
    installed: '0.4.0',
    latest: '0.5.0',
    from: '',
    to: '',
    reason: '',
  })
  assert.equal(readCheck({ ok: true, installed: '0.5.0', latest: '0.5.0', available: false, checkout: true }).status, 'up-to-date')
  assert.equal(readCheck({ ok: true, available: true }).status, 'up-to-date', 'an update with no version to show is not offered')
  assert.deepEqual(readCheck({ ok: false, reason: 'no-checkout', message: 'not a checkout' }), {
    status: 'not-a-checkout',
    stage: 'check',
    installed: '',
    latest: '',
    from: '',
    to: '',
    reason: 'no-checkout',
  })
  for (const reason of ['offline', 'error', 'dirty', 'nonsense']) {
    const state = readCheck({ ok: false, reason, message: 'no' })
    assert.equal(state.status, 'failed', `a ${reason} check is a failure`)
    assert.equal(state.stage, 'check')
    assert.equal(state.reason, reason)
  }
  assert.equal(readCheck({ ok: false }).reason, 'error', 'a refusal without a reason is an error')
  for (const absent of [undefined, null, 'nope']) {
    assert.equal(readCheck(absent).status, 'failed', `inert for ${JSON.stringify(absent)}`)
  }
}

// 16 — an apply answer applies in place only when the Host says it does not need a restart.
{
  assert.deepEqual(readApply({ ok: true, from: '0.4.0', to: '0.5.0', requiresRestart: false }), {
    status: 'updated-live',
    stage: 'apply',
    installed: '0.5.0',
    latest: '0.5.0',
    from: '0.4.0',
    to: '0.5.0',
    reason: '',
  })
  assert.equal(readApply({ ok: true, from: '0.4.0', to: '0.5.0', requiresRestart: true }).status, 'updated-needs-restart')
  assert.equal(readApply({ ok: true, from: '0.4.0', to: '0.5.0' }).status, 'updated-needs-restart', 'only an explicit false is live')
  for (const reason of ['dirty', 'no-checkout', 'offline', 'error']) {
    const state = readApply({ ok: false, reason, message: 'no' })
    assert.equal(state.status, 'failed')
    assert.equal(state.stage, 'apply')
    assert.equal(state.reason, reason)
  }
  assert.equal(readApply({ ok: false }).reason, 'error')
  assert.equal(readApply(null).status, 'failed')
}

// 17 — every state offers a short label and a tooltip, and an update names its version.
{
  const t = (key, params) => (params === undefined ? key : `${key}(${JSON.stringify(params)})`)
  assert.deepEqual(updateText(undefined, t), { label: 'update', title: 'updateHint' })
  assert.deepEqual(updateText({ status: 'checking' }, t), { label: 'checking', title: 'checkingHint' })
  assert.deepEqual(updateText({ status: 'up-to-date', latest: '0.5.0' }, t), {
    label: 'upToDate',
    title: 'upToDateHint({"version":"0.5.0"})',
  })
  assert.deepEqual(updateText({ status: 'update-available', latest: '0.5.0' }, t), {
    label: 'updateTo({"version":"0.5.0"})',
    title: 'updateToHint({"version":"0.5.0"})',
  })
  assert.deepEqual(updateText({ status: 'not-a-checkout', reason: 'no-checkout' }, t), {
    label: 'notCheckout',
    title: 'notCheckoutHint',
  })
  assert.deepEqual(updateText({ status: 'updating' }, t), { label: 'updating', title: 'updatingHint' })
  assert.deepEqual(updateText({ status: 'updated-live', latest: '0.5.0' }, t), {
    label: 'updated',
    title: 'updatedHint({"version":"0.5.0"})',
  })
  assert.deepEqual(updateText({ status: 'updated-needs-restart', latest: '0.5.0' }, t), {
    label: 'restartToFinish',
    title: 'restartHint({"version":"0.5.0"})',
  })
  assert.deepEqual(updateText({ status: 'failed', stage: 'apply', reason: 'dirty' }, t), {
    label: 'updateFailed',
    title: 'dirtyHint',
  })
  assert.deepEqual(updateText({ status: 'failed', stage: 'check', reason: 'offline' }, t), {
    label: 'checkFailed',
    title: 'offlineHint',
  })
  assert.equal(updateText({ status: 'update-available' }, t).label, 'updateTo({"version":"?"})', 'a nameless version still reads as an update')
  assert.equal(failureNote('no-checkout'), 'notCheckoutHint')
  assert.equal(failureNote('dirty'), 'dirtyHint')
  assert.equal(failureNote('offline'), 'offlineHint')
  assert.equal(failureNote('error'), 'errorHint')
  assert.equal(failureNote('anything else'), 'errorHint', 'an unknown refusal still has words for the user')
}

// 18 — the new revision is read from the Host's own frames, never invented.
{
  const REBUILT = JSON.stringify({ type: 'rebuilt', id: PACKAGE_NAME, rev: 'abc123' })
  assert.equal(revisionOfFrame(REBUILT, PACKAGE_NAME, 'def456'), 'abc123')
  assert.equal(revisionOfFrame(REBUILT, PACKAGE_NAME, 'abc123'), undefined, 'the page already runs it')
  assert.equal(revisionOfFrame(REBUILT, '@moreweb/edhx', 'def456'), undefined, 'another module is not ours')
  assert.equal(revisionOfFrame(JSON.stringify({
    type: 'graph',
    graph: { rev: 'g', modules: [{ id: PACKAGE_NAME, rev: 'abc123' }, { id: 'other', rev: 'zzz' }] },
  }), PACKAGE_NAME, 'def456'), 'abc123', 'a graph frame carries every row')
  assert.equal(revisionOfFrame(JSON.stringify({
    type: 'graph',
    graph: { modules: [{ id: PACKAGE_NAME, rev: 'abc123' }] },
  }), PACKAGE_NAME, 'abc123'), undefined)
  for (const frame of [
    'not json',
    'null',
    JSON.stringify({ type: 'graph' }),
    JSON.stringify({ type: 'graph', graph: null }),
    JSON.stringify({ type: 'graph', graph: { modules: [] } }),
    JSON.stringify({ type: 'graph', graph: { modules: [null, 7] } }),
    JSON.stringify({ type: 'rebuilt', id: PACKAGE_NAME, rev: 7 }),
    JSON.stringify({ type: 'other', id: PACKAGE_NAME, rev: 'abc123' }),
  ]) {
    assert.equal(revisionOfFrame(frame, PACKAGE_NAME, 'def456'), undefined, `inert for ${frame}`)
  }

  // One read carries complete frames, a partial frame, or only a comment.
  assert.deepEqual(eventFrames(`data: ${REBUILT}\n\n`), { frames: [REBUILT], rest: '' })
  assert.deepEqual(eventFrames(`: connected\n\ndata: ${REBUILT}\n\ndata: {"type":"gra`), {
    frames: [REBUILT],
    rest: 'data: {"type":"gra',
  })
  assert.deepEqual(eventFrames(''), { frames: [], rest: '' })
  assert.deepEqual(eventFrames(': connected\n\n'), { frames: [], rest: '' })
  assert.deepEqual(eventFrames('data:\n\n'), { frames: [], rest: '' }, 'an empty payload is not a frame')

  // The revision the page booted with comes from the module system's own manifest.
  const modules = { manifest: { modules: [{ id: PACKAGE_NAME, rev: 'abc123', url: 'plugins/??x&rev=abc123' }] } }
  assert.equal(moduleRevision(modules, PACKAGE_NAME), 'abc123')
  assert.equal(moduleRevision(modules, 'other'), undefined)
  for (const absent of [undefined, null, {}, { manifest: {} }, { manifest: { modules: null } }, { manifest: { modules: [null] } }]) {
    assert.equal(moduleRevision(absent, PACKAGE_NAME), undefined, `inert for ${JSON.stringify(absent)}`)
  }
}

// 19 — the MCP page addresses one route, one row, one settings section, and one breadcrumb key.
{
  assert.equal(MCP_ROUTE, 'api/edh.mcp', 'document-relative, like the export and update routes')
  assert.equal(MCP_MODULE, '@moreweb/edh/mcp', 'the row that owns the route')
  assert.equal(
    MCP_SECTION_SLOT,
    'settings.section',
    'the settings nav lists sections, so this is a page of its own rather than a tab under Plugins',
  )
  // Shipped sections are General 0, Models 10, Plugins 15: 16 is the first free
  // seat after them, which keeps the shipped pages contiguous and puts this one
  // next to them instead of at some arbitrary position.
  assert.equal(MCP_SECTION_ORDER, 16, 'the first seat after the shipped sections')
  assert.ok(MCP_SECTION_ORDER > 15, 'never ahead of a shipped section')
  assert.deepEqual(MCP_ACTIONS, ['add', 'remove', 'test', 'start', 'stop'], 'every action the route accepts')
  assert.equal(MCP_DEBUG_KEY, 'edh:mcp', 'its own breadcrumb, beside edh:export and edh:update')
  // The page is gated on its own row, as export and update are: the route is
  // what makes it useful, so the aggregate may never stand in for a missing row.
  const ready = { status: 'ready', moduleStates: { [MCP_MODULE]: true } }
  assert.equal(rowEnabled(ready, MCP_MODULE), true)
  assert.equal(rowEnabled({ status: 'ready', moduleStates: { [EXPORT_MODULE]: true } }, MCP_MODULE), false)
  assert.equal(rowEnabled({ status: 'loading', moduleStates: { [MCP_MODULE]: true } }, MCP_MODULE), false)
}

// 20 — one server record becomes one row: a state, its one word, and a tone.
{
  assert.deepEqual(
    serverRecord({
      id: 'fs',
      label: 'filesystem',
      transport: 'stdio',
      enabled: true,
      status: 'ready',
      toolCount: 12,
      hasToken: false,
      lastError: '',
    }),
    {
      id: 'fs',
      label: 'filesystem',
      transport: 'stdio',
      enabled: true,
      status: 'ready',
      toolCount: 12,
      hasToken: false,
      failure: '',
    },
  )
  const states = [
    ['ready', 'connected', 'mcpStateConnected', 'ok'],
    ['connecting', 'starting', 'mcpStateStarting', 'busy'],
    ['error', 'failed', 'mcpStateFailed', 'bad'],
    ['stopped', 'off', 'mcpStateOff', 'off'],
  ]
  for (const [status, state, label, tone] of states) {
    const record = serverRecord({ id: 'x', status, enabled: true })
    assert.equal(serverState(record), state, `${status} reads as ${state}`)
    assert.equal(stateLabel(state), label, `${state} has one word`)
    assert.equal(stateTone(state), tone, `${state} paints one dot`)
  }
  // The switch is the authority: off is off whatever the connection last said.
  assert.equal(serverState(serverRecord({ id: 'x', status: 'ready', enabled: false })), 'off')
  // An unknown status is not a claim of health.
  assert.equal(serverState(serverRecord({ id: 'x', status: 'nonsense', lastError: 'Server exited with code 1' })), 'failed')
  assert.equal(serverState(serverRecord({ id: 'x', status: '' })), 'starting')
  assert.equal(serverState(undefined), 'off')
  for (const absent of [undefined, null, 7, 'server', {}, { label: 'no id' }, { id: '   ' }]) {
    assert.equal(serverRecord(absent), undefined, `inert for ${JSON.stringify(absent)}`)
  }
  assert.deepEqual(serverRecord({ id: 'a' }), {
    id: 'a',
    label: 'a',
    transport: 'stdio',
    enabled: true,
    status: '',
    toolCount: 0,
    hasToken: false,
    failure: '',
  }, 'a bare record is a stopped command server with no tools')
  assert.equal(serverRecord({ id: 'a', transport: 'http' }).transport, 'http')
  assert.equal(serverRecord({ id: 'a', transport: 'websocket' }).transport, 'stdio', 'an unknown transport is not a badge')
  assert.equal(serverRecord({ id: 'a', toolCount: '4' }).toolCount, 4, 'a numeric string still counts')
  assert.equal(serverRecord({ id: 'a', toolCount: -1 }).toolCount, 0)
  assert.equal(failureText({ error: { code: 'denied', message: '401 from server' } }), '401 from server')
  assert.equal(failureText({ detail: '  No response within 10s  ' }), 'No response within 10s')
  assert.equal(failureText({ reason: 'not-ready' }), '', 'a code is not a sentence')
  assert.equal(failureText(undefined), '')
}

// 21 — the add form validates one branch at a time and never asks for both.
{
  const command = validateServer({
    ...emptyServerForm(),
    command: '  npx  ',
    args: ' -y \n\n @modelcontextprotocol/server-filesystem \n . \n',
    env: '',
  })
  assert.deepEqual(command, {
    ok: true,
    server: {
      label: 'npx',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '.'],
    },
  }, 'a blank args line is dropped and the name falls back to the command')
  assert.equal(command.ok && 'url' in command.server, false, 'a command server carries no URL')
  assert.equal(command.ok && 'env' in command.server, false, 'no environment means no env key')

  for (const blank of ['', '   ', undefined]) {
    assert.deepEqual(
      validateServer({ branch: 'command', command: blank }),
      { ok: false, field: 'command', message: 'mcpCommandRequired' },
      `a command server with ${JSON.stringify(blank)} is invalid`,
    )
  }

  assert.deepEqual(validateServer({
    ...emptyServerForm(),
    branch: 'url',
    url: ' https://mcp.example.com/mcp ',
    authorization: 'Bearer abc123',
  }), {
    ok: true,
    server: {
      label: 'mcp.example.com',
      transport: 'http',
      url: 'https://mcp.example.com/mcp',
      authorization: 'Bearer abc123',
    },
  }, 'a URL server takes the host as its name and keeps the credential')
  const bareUrl = validateServer({ ...emptyServerForm(), branch: 'url', url: 'http://127.0.0.1:8100/mcp' })
  assert.equal(bareUrl.ok, true)
  assert.equal('authorization' in bareUrl.server, false, 'an empty Authorization is not sent')
  assert.equal('command' in bareUrl.server, false, 'a URL server carries no command')
  for (const bad of ['example.com/mcp', 'ftp://example.com/mcp', 'https://', 'localhost:8100', '']) {
    assert.deepEqual(
      validateServer({ ...emptyServerForm(), branch: 'url', url: bad }),
      { ok: false, field: 'url', message: 'mcpUrlInvalid' },
      `${JSON.stringify(bad)} is not a URL server`,
    )
  }

  // A typed name always wins over the derived one.
  const named = validateServer({ ...emptyServerForm(), label: '  Files  ', command: 'node', args: 'server.js' })
  assert.equal(named.server.label, 'Files')
  assert.deepEqual(named.server.args, ['server.js'])

  const withEnv = validateServer({
    branch: 'command',
    command: 'npx',
    args: '',
    env: 'GITHUB_TOKEN=ghp_1\n\nEMPTY=\n',
  })
  assert.deepEqual(withEnv.server.env, { GITHUB_TOKEN: 'ghp_1', EMPTY: '' })
  assert.deepEqual(withEnv.server.args, [])
  assert.deepEqual(
    validateServer({ branch: 'command', command: 'npx', env: 'JUSTAWORD' }),
    { ok: false, field: 'env', message: 'mcpEnvInvalid' },
  )
  assert.deepEqual(environmentMap('=value'), { ok: false })
  assert.deepEqual(environmentMap(''), { ok: true, env: {} })

  // The branch decides the fields: an untouched form is the Command branch.
  assert.equal(emptyServerForm().branch, 'command')
  assert.deepEqual(validateServer(emptyServerForm()), validateServer({ branch: 'command', command: '' }))
  assert.deepEqual(splitLines(undefined), [])
  assert.deepEqual(splitLines('a\r\n\n b '), ['a', 'b'])
  assert.equal(isHttpUrl('https://example.com'), true)
  assert.equal(isHttpUrl('not a url'), false)
  assert.equal(defaultServerName({ transport: 'stdio', command: 'C:\\tools\\npx.CMD' }), 'npx')
  assert.equal(defaultServerName({ transport: 'http', url: 'https://mcp.example.com/mcp?x=1' }), 'mcp.example.com')
}

// 22 — a secret in a response never reaches a record, and never reaches a sentence.
{
  const secret = 'sk-secret-value'
  const read = readMcpView({
    ok: true,
    servers: [{
      id: 'remote',
      label: 'remote',
      transport: 'http',
      enabled: true,
      status: 'ready',
      toolCount: 3,
      hasToken: true,
      token: secret,
      authorization: `Bearer ${secret}`,
      headers: { Authorization: `Bearer ${secret}` },
      env: { GITHUB_TOKEN: 'ghp_secret' },
      envKeys: ['GITHUB_TOKEN'],
      lastError: '',
    }],
  })
  assert.equal(read.servers.length, 1)
  assert.equal(read.servers[0].hasToken, true, 'the page learns a secret is set, not what it is')
  const shown = JSON.stringify(read.servers[0])
  assert.equal(shown.includes(secret), false, 'the token is not in the record')
  assert.equal(shown.includes('ghp_secret'), false, 'an environment value is not in the record')
  assert.equal(shown.includes('Authorization'), false, 'the header is not in the record')

  // The failure line is the Host's own sentence, and carries no secret either.
  const failed = readMcpView({
    ok: false,
    servers: [{ id: 'remote', status: 'error', token: secret, lastError: `HTTP 401 from server (${secret})` }],
  })
  assert.equal(failed.servers[0].failure, `HTTP 401 from server (${secret})`, 'the Host words it; the page shows it verbatim')
  const withoutSecret = readMcpView({
    ok: false,
    servers: [{ id: 'remote', status: 'error', token: secret, lastError: 'HTTP 401 from server' }],
  })
  assert.equal(JSON.stringify(withoutSecret.servers[0]).includes(secret), false)
}

// 23 — the answer is the view: a POST's own list is adopted, its report explains a failure.
{
  const read = readMcpView({
    ok: true,
    servers: [{ id: 'a', label: 'a', status: 'ready', toolCount: 2 }],
    report: { ok: true, action: 'add', id: 'a', status: 'ready' },
  })
  assert.equal(read.ok, true)
  assert.equal(read.list, true)
  assert.deepEqual(read.servers.map(server => server.id), ['a'], 'the answer is the list — no re-read')
  assert.equal(read.failure, '')
  assert.deepEqual(read.report, { ok: true, action: 'add', id: 'a', status: 'ready', reason: '', message: '', toolCount: 0 })

  // A rejected input answers a non-200 status with the same body, so the page
  // reads the report instead of treating the status as a broken route.
  const rejected = readMcpView({
    ok: false,
    servers: [],
    report: { ok: false, action: 'add', reason: 'bad-url', message: 'URL must start with http:// or https://' },
  })
  assert.equal(rejected.ok, true, 'the list is still the answer')
  assert.equal(rejected.failure, 'URL must start with http:// or https://', 'the Host words the failure')
  assert.equal(rejected.report.ok, false)

  // A refusal without a message still gets one plain sentence, never a code.
  const silent = readMcpView({ ok: false, servers: [], report: { ok: false, action: 'start', reason: 'not-ready' } })
  assert.equal(silent.failure, '')
  assert.equal(reasonSentence('not-ready'), 'mcpNotReady')
  assert.equal(reasonSentence('unknown-server'), 'mcpUnknownServer')
  assert.equal(reasonSentence('tool-error'), 'mcpActionFailed')
  assert.equal(reasonSentence('anything else'), 'mcpActionFailed')

  // A refused field keeps the panel open to be corrected; a refused server was
  // stored anyway, so its row carries the reason instead.
  for (const reason of ['bad-input', 'bad-id', 'bad-transport', 'bad-command', 'bad-url']) {
    assert.equal(inputRejection(reason), true, `${reason} is a form problem`)
  }
  for (const reason of ['store', 'spawn', 'connect', 'not-ready', 'unknown-server', '']) {
    assert.equal(inputRejection(reason), false, `${reason} is not a form problem`)
  }

  // A read that returned no list is not a list: the page shows the error and a retry.
  const broken = readMcpView({ ok: false, reason: 'error', message: 'api/edh.mcp answered 404' })
  assert.equal(broken.ok, false)
  assert.equal(broken.list, false)
  assert.equal(broken.failure, 'api/edh.mcp answered 404')
  assert.deepEqual(broken.servers, [])
  for (const absent of [undefined, null, 'nope', {}]) {
    assert.equal(readMcpView(absent).ok, false, `inert for ${JSON.stringify(absent)}`)
  }

  assert.deepEqual(
    addServerBody({ label: 'fs', transport: 'stdio', command: 'npx', args: [] }),
    { action: 'add', server: { label: 'fs', transport: 'stdio', command: 'npx', args: [] } },
    'add nests the server, like the route reads it',
  )
  for (const action of MCP_ACTIONS.filter(value => value !== 'add')) {
    assert.deepEqual(serverActionBody(action, 'fs'), { action, id: 'fs' })
  }
  assert.deepEqual(withoutKey({ fs: 'test', other: 'add' }, 'fs'), { other: 'add' })
  assert.deepEqual(actionReport(undefined), undefined)
  assert.deepEqual(actionReport({ ok: true }), {
    ok: true,
    action: '',
    id: '',
    status: '',
    reason: '',
    message: '',
    toolCount: 0,
  })
  assert.equal(actionReport({ ok: true, toolCount: 12 }).toolCount, 12, 'a test reports what the server answered with')
}

// 24 — the Reload control: on EDH's own detail page, gated on the module system
// alone, honest about the Host half, and it never throws.
{
  const t = (key, params) => (params === undefined ? key : `${key}(${JSON.stringify(params)})`)

  // EDH's own page, with the module system: the one case with a control to show.
  const edhPage = { kind: 'bundle', pkg: { name: PACKAGE_NAME } }
  const edhRow = { kind: 'row', pkg: { name: PACKAGE_NAME } }
  const otherPage = { kind: 'bundle', pkg: { name: '@moreweb/other' } }
  assert.equal(reloadVisible(updateSubject(edhPage), () => 'replaced'), true)
  assert.equal(reloadVisible(updateSubject(edhRow), () => 'replaced'), true, 'a row page for EDH is still EDH')
  assert.equal(reloadVisible(updateSubject(edhPage), undefined), false, 'no module system, no button to click')
  assert.equal(reloadVisible(updateSubject(otherPage), () => 'replaced'), false, 'nothing else reloads EDH')
  assert.equal(reloadVisible(updateSubject({ kind: 'item', id: 'catalog-entry' }), () => 'replaced'), false, 'a catalog id is not a package')
  for (const absent of [undefined, null, false, 'true', 1]) {
    assert.equal(reloadVisible(updateSubject(edhPage), absent), false, `no control for ${JSON.stringify(absent)}`)
  }
  // The update row is not consulted: reloading what is installed is not the
  // update feature, so a profile that paused updating keeps the button. The
  // gate reads the page and the module system, and nothing else.

  // `installed` vs `onDisk` is the only honest source for "a restart is still owed".
  assert.deepEqual(hostStaleness({ ok: true, installed: '0.5.0', onDisk: '0.5.0' }), {
    known: true,
    installed: '0.5.0',
    onDisk: '0.5.0',
    stale: false,
  })
  assert.deepEqual(hostStaleness({ ok: true, installed: '0.5.0', onDisk: '0.6.0' }), {
    known: true,
    installed: '0.5.0',
    onDisk: '0.6.0',
    stale: true,
  })
  for (const unknown of [{ ok: true }, { ok: false, reason: 'no-checkout' }, undefined, null, 'nope']) {
    assert.equal(hostStaleness(unknown).known, false, `an unreadable answer is not known: ${JSON.stringify(unknown)}`)
    assert.equal(hostStaleness(unknown).stale, false, `and it never claims a restart: ${JSON.stringify(unknown)}`)
  }

  // A replaced browser half is a success; a stale Host half changes what it says.
  assert.deepEqual(reloadOutcome('replaced', { known: true, stale: false }), { status: 'done', reason: '' })
  assert.deepEqual(reloadOutcome('replaced', { known: true, stale: true }), { status: 'needs-restart', reason: '' })
  assert.deepEqual(reloadOutcome('replaced', { known: false, stale: false }), { status: 'done', reason: '' }, 'unknown is not stale')
  assert.deepEqual(reloadOutcome('stale', undefined), { status: 'failed', reason: 'revision' }, 'no new revision to load')
  for (const outcome of ['absent', 'failed', 'nonsense']) {
    assert.deepEqual(reloadOutcome(outcome, undefined), { status: 'failed', reason: 'reload' }, `${outcome} is a reload failure`)
  }

  // The copy for every state, including the two sentences a failure can show.
  assert.deepEqual(reloadText(undefined, t), { label: 'reload', note: '', tone: '' })
  assert.deepEqual(reloadText({ status: 'idle', reason: '' }, t), { label: 'reload', note: '', tone: '' })
  assert.deepEqual(reloadText({ status: 'reloading' }, t), { label: 'reloading', note: '', tone: '' })
  assert.deepEqual(reloadText({ status: 'done' }, t), { label: 'reload', note: 'reloadDone', tone: 'ok' })
  assert.deepEqual(reloadText({ status: 'needs-restart' }, t), { label: 'reload', note: 'reloadStale', tone: 'warn' })
  assert.deepEqual(reloadText({ status: 'failed', reason: 'revision' }, t), {
    label: 'reload',
    note: 'reloadNoRevision',
    tone: 'bad',
  })
  assert.deepEqual(reloadText({ status: 'failed', reason: 'reload' }, t), {
    label: 'reload',
    note: 'reloadFailed',
    tone: 'bad',
  })

  // The glyphs are the shipped ones, not lookalikes: the identifying path of
  // each is pinned verbatim, so an invented path fails here rather than in the
  // browser. Update is the download mark, Reload the refresh arrow, and they are
  // different drawings rather than the same icon twice.
  assert.deepEqual(ICON_UPDATE.slice(0, 2), ['M8 1.95317V10.0469', 'M4.25 6.29688L8 10.0469L11.75 6.29688'], 'IconDownloadOutlineRegular')
  assert.equal(ICON_UPDATE.length, 3, 'the download glyph is an arrow and a tray')
  assert.equal(ICON_RELOAD.length, 2, 'the refresh glyph is a ring and its arrowhead')
  assert.equal(ICON_RELOAD[0].startsWith('M14.5001 8C14.5 9.28552'), true, 'IconRefreshOutlineRegular')
  assert.equal(ICON_RELOAD[1], 'M14.4999 1.5V5.1H10.8999', 'the refresh arrowhead')
  for (const glyph of [ICON_UPDATE, ICON_RELOAD]) {
    for (const d of glyph) assert.equal(d.startsWith('M'), true, 'every path is absolute geometry')
  }
  assert.notDeepEqual(ICON_UPDATE[0], ICON_RELOAD[0], 'two ideas, two glyphs')

  // Both controls draw one glyph plus a label, at the metric the row uses. The
  // module is loaded once more over a React-shaped `createElement`, because the
  // glyph helper is the one piece here that builds an element.
  const stub = definition.factory(() => ({
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  })).__test
  const drawn = stub.icon(ICON_RELOAD)
  assert.equal(drawn.type, 'svg')
  assert.equal(drawn.props.viewBox, '0 0 16 16', 'the shipped 16px box')
  assert.equal(drawn.props.width, 14, 'rendered at the size the row draws icons')
  assert.equal(drawn.props['aria-hidden'], 'true', 'the label is the accessible name')
  assert.equal(drawn.props.children.length, 2, 'one path per glyph path')
  assert.deepEqual(
    { d: drawn.props.children[0].props.d, stroke: drawn.props.children[0].props.stroke },
    { d: ICON_RELOAD[0], stroke: 'currentColor' },
  )
  assert.equal(stub.icon(ICON_UPDATE, 16).props.width, 16, 'the box can be the shipped 16')
  const idle = controlStyle(false, false, true)
  assert.equal(idle.height, '24px', 'the metric the action row uses')
  assert.equal(idle.gap, '6px', 'a small gap between glyph and label')
  assert.equal(idle.display, 'inline-flex', 'icon and label on one line')
  assert.equal(idle.cursor, 'pointer')
  assert.equal(idle.border, '1px solid transparent', 'an outline only when there is something to do')
  const offered = controlStyle(true, false, true)
  assert.equal(offered.border, '1px solid var(--dsw-alias-brand-primary)', 'an offered update is framed')
  assert.equal(offered.color, 'var(--dsw-alias-brand-primary)')
  assert.equal(controlStyle(false, true, true).background, 'var(--dsw-alias-bg-layer-1)', 'hover fills')
  assert.equal(controlStyle(false, true, false).background, 'transparent', 'a dead control does not fill')
  assert.equal(controlStyle(false, false, false).cursor, 'default')

  // One coherent run, and the breadcrumb it leaves: fresh bundle, then stale Host half.
  {
    const writes = []
    const state = await runReload({
      reload: async () => 'replaced',
      check: async () => ({ ok: true, installed: '0.5.0', onDisk: '0.5.0' }),
      log: payload => writes.push(payload),
    })
    assert.deepEqual(state, { status: 'done', reason: '' })
    assert.deepEqual(writes, [{ phase: 'reloaded', ok: true, stale: false, known: true }])
  }
  {
    const writes = []
    const state = await runReload({
      reload: async () => 'replaced',
      check: async () => ({ ok: true, installed: '0.5.0', onDisk: '0.6.0' }),
      log: payload => writes.push(payload),
    })
    assert.equal(state.status, 'needs-restart', 'only the Host half still owes a restart')
    assert.deepEqual(writes, [{ phase: 'reloaded', ok: true, stale: true, known: true }], 'the breadcrumb says a restart is owed')
  }

  // Every failure writes its breadcrumb and still answers a state to render, so
  // the page and its server list keep working.
  {
    const writes = []
    const state = await runReload({
      reload: async () => 'stale',
      check: async () => ({ ok: true, installed: '0.5.0', onDisk: '0.5.0' }),
      log: payload => writes.push(payload),
    })
    assert.deepEqual(state, { status: 'failed', reason: 'revision' })
    assert.equal(writes.length, 1)
    assert.deepEqual(
      { phase: writes[0].phase, reason: writes[0].reason },
      { phase: 'reload-failed', reason: 'revision' },
    )
  }
  {
    const writes = []
    const state = await runReload({ reload: undefined, check: async () => ({ ok: true }), log: payload => writes.push(payload) })
    assert.deepEqual(state, { status: 'failed', reason: 'reload' }, 'no module system is a failure, not a crash')
    assert.deepEqual(
      { phase: writes[0].phase, reason: writes[0].reason },
      { phase: 'reload-failed', reason: 'reload' },
    )
  }
  {
    const writes = []
    const state = await runReload({
      reload: async () => {
        throw new Error('reload threw')
      },
      check: async () => {
        throw new Error('api/edh.update answered 404')
      },
      log: payload => writes.push(payload),
    })
    assert.deepEqual(state, { status: 'failed', reason: 'reload' }, 'a throwing replacement is a state, never a dead page')
    assert.equal(writes.length, 1, 'one record: the key holds one payload, so the outcome is what it explains')
    assert.deepEqual(
      { phase: writes[0].phase, reason: writes[0].reason, message: writes[0].message },
      { phase: 'reload-failed', reason: 'error', message: 'reload threw' },
    )
    assert.equal(writes[0].known, false, 'a refused check leaves the Host half unknown, never freshly claimed')
  }

  // A refused check does not block the reload it could not describe: the bundle
  // still gets replaced, and the page simply makes no claim about the Host half.
  {
    const writes = []
    const state = await runReload({
      reload: async () => 'replaced',
      check: async () => {
        throw new Error('api/edh.update answered 404')
      },
      log: payload => writes.push(payload),
    })
    assert.deepEqual(state, { status: 'done', reason: '' })
    assert.deepEqual(writes.map(payload => payload.phase), ['reloaded'])
    assert.equal(writes[0].stale, false, 'an unknown Host half is never reported as owing a restart')
    assert.equal(writes[0].known, false)
  }
}

// 25 — the seat: one settings section, registered only while its row exists.
// The nav entry is what a section cannot get wrong: an entry that leads to an
// empty page is worse than no entry, so the page is registered from the row's
// own state and withdrawn when the row goes away.
{
  /** A fake ctx with the surfaces `apply` touches, recording every slot entry. */
  function fakeSectionCtx(rows) {
    const entries = []
    const handlers = new Map()
    const ctx = {
      locale: {
        bind: () => (key, params) => (params === undefined ? key : `${key}(${JSON.stringify(params)})`),
        register: () => () => {},
        subscribe: () => () => {},
      },
      effect: fn => fn(),
      slots: {
        inject: (_name, callback) => callback(),
        register: options => {
          const entry = { options }
          entries.push(entry)
          return () => {
            const at = entries.indexOf(entry)
            if (at >= 0) entries.splice(at, 1)
          }
        },
      },
      remote: {
        pluginManager: {
          async listPlugins() {
            return { ok: true, value: rows.map(row => ({ ...row })) }
          },
          async setPluginEnabled(entryId, enabled) {
            const row = rows.find(candidate => candidate.entryId === entryId)
            if (row !== undefined) row.enabled = enabled
            return { ok: true, value: { application: 'applied', target: entryId } }
          },
        },
        $on: (event, handler) => {
          handlers.set(event, handler)
          return () => handlers.delete(event)
        },
        on: () => () => {},
      },
      inject: () => undefined,
      get: () => undefined,
      logger: { warn() {}, error() {}, info() {} },
    }
    const sections = () => entries.filter(entry => entry.options.name === MCP_SECTION_SLOT)
    return {
      ctx,
      entries,
      sections,
      /** Change a row the way the Host would, then let the switch re-read. */
      async setRow(entryId, enabled) {
        const row = rows.find(candidate => candidate.entryId === entryId)
        row.enabled = enabled
        handlers.get('plugin-manager/changed')()
        await new Promise(resolve => setTimeout(resolve, 0))
      },
    }
  }

  const shell = { entryId: 'include:edh', moduleName: '@moreweb/edh', enabled: true, fiberPhase: 'active' }
  const mcpRow = { entryId: 'include:edh-mcp', moduleName: MCP_MODULE, enabled: true, fiberPhase: 'active' }
  const harness = fakeSectionCtx([shell, { ...mcpRow }])
  mod.apply(harness.ctx)
  await new Promise(resolve => setTimeout(resolve, 0))

  const [section] = harness.sections()
  assert.ok(section, 'the page registers once the row is known to be there')
  assert.equal(section.options.id, 'mcp', 'the nav cell is keyed by the feature, like the row')
  assert.equal(section.options.order, MCP_SECTION_ORDER, 'and sits where the constant says')
  assert.equal(section.options.label(), 'mcpNav', 'the nav reads the localized name')
  assert.equal(section.options.locale, 'edh', 'its copy comes from the plugin dictionary')
  assert.equal(section.options.children, undefined, 'a section page owns no child slots')
  assert.equal(
    harness.entries.filter(entry => entry.options.name === 'settings.plugins.tab').length,
    0,
    'nothing is buried under the Plugins page any more',
  )

  // The same apply seats the two detail-page actions: update, then reload right
  // beside it. Reload is its own entry rather than part of the update control,
  // which is what lets it show without the update row being on — its gate is the
  // module system, not a feature row, so nothing here consults `rows` for it.
  const actions = harness.entries.filter(entry => entry.options.name === 'plugins.detail.actions')
  assert.deepEqual(actions.map(entry => entry.options.id), ['edh-update', 'edh-reload'], 'two buttons, two entries')
  assert.deepEqual(actions.map(entry => entry.options.order), [10, 11], 'reload sits immediately right of update')
  assert.equal(actions[1].options.label(), 'reload', 'one word, read from the dictionary')
  assert.equal(actions[1].options.locale, 'edh', 'and it speaks the plugin dictionary too')

  // The MCP page owns no interface control any more: the button, its toolbar,
  // and its note live on the update surface, and none of their styling is left
  // behind in the page's stylesheet.
  for (const gone of ['edh-mcp-toolbar', 'edh-mcp-reload', 'reloadAvailable']) {
    assert.equal(source.includes(gone), false, `${gone} is gone from the client`)
  }

  // The row is the switch: off withdraws the entry, on puts it back, and the nav
  // redraws either way because the slot ledger changed.
  await harness.setRow('include:edh-mcp', false)
  assert.deepEqual(harness.sections(), [], 'a row that is off leaves no nav cell')
  await harness.setRow('include:edh-mcp', true)
  assert.equal(harness.sections().length, 1, 'and turning it back on restores the page')

  // A bundle patch that predates the row: no entry at all, never a dead cell.
  const patchless = fakeSectionCtx([shell])
  mod.apply(patchless.ctx)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.deepEqual(patchless.sections(), [], 'no row in this profile means no page to open')
}

console.log('edh mcp: page, form, and secret checks passed')
console.log('edh mcp: reload control checks passed')
console.log('edh mcp: settings section checks passed')
console.log('edh update: control and reload checks passed')
console.log('edh switch: all checks passed')