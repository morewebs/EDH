// Loose deepEqual: the client module runs in its own vm realm, so its plain
// objects carry that realm's prototypes.
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

/** Load the browser module the way the page's module loader would. */
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
let definition
// Every breadcrumb the module writes, in order: the features are diagnostic by
// Local Storage, so that is where a test can see what actually happened.
const storage = []
const sandbox = {
  window: {
    __ModuleLoader__: { load: value => { definition = value } },
    localStorage: {
      setItem(key, value) {
        storage.push([key, value])
      },
    },
  },
  console,
  // The browser globals the module parses addresses and signals with. They are
  // the real ones, so the resource protocol is exercised, not simulated.
  URL,
  URLSearchParams,
  AbortController,
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
const {
  BTW_MODULE,
  BTW_DEBUG_KEY,
  sideCommands,
  sideTitle,
  sessionTitle,
  sessionTitles,
  openSideChat,
  renameSideChat,
  SIDE_COMMAND_NAMES,
  registerSideChatPane,
  createSideGuideEntry,
  createSideChatRunner,
  sideChatTabType,
  SideGuideIcon,
  BTW_GUIDE_ORDER,
  btwAddress,
  parseBtwAddress,
  btwResourceProvider,
  BtwChatTab,
  BtwConversationPanel,
  BTW_PROTOCOL,
  BTW_ADDRESS,
  BTW_TAB_ID,
  BTW_TAB_KIND,
  BTW_CHAT_SLOT,
  BTW_RETAIN_SOURCE,
  ICON_SIDE,
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

// 26 — the side chat: two spellings, one handler, and a fork that cannot throw
// into the command registry. `ui.run` is called un-awaited and uncatchable, so a
// rejected fork would surface as an unhandled rejection and the command would
// look like it did nothing at all.
{
  const t = (key, params) => (params === undefined ? key : `${key}(${JSON.stringify(params)})`)
  /** The `edh:btw` breadcrumbs written since the last clear, newest last. */
  const crumbs = () => storage
    .filter(([key]) => key === BTW_DEBUG_KEY)
    .map(([, value]) => JSON.parse(value))
  const phases = () => crumbs().map(crumb => crumb.phase)

  /** A switch controller showing one row state, and nothing read from a Host. */
  const controllerAt = enabled => ({
    getSnapshot: () => ({
      status: 'ready',
      moduleStates: enabled === undefined ? {} : { [BTW_MODULE]: enabled },
      enabled: true,
    }),
  })
  /** Every call the shared runner saw, so identity can be checked by behaviour. */
  const runCalls = []
  /** The one runner the two commands and the launcher card all carry. */
  const runSpy = (session, options) => {
    runCalls.push({ session, options })
  }
  const noServices = { run: runSpy }

  // Both spellings, and only while the row is on.
  const on = sideCommands(t, controllerAt(true), noServices)
  const off = sideCommands(t, controllerAt(false), noServices)
  assert.deepEqual(SIDE_COMMAND_NAMES, ['btw', 'side'])
  assert.deepEqual(on.map(contribution => contribution.name), ['btw', 'side'], 'one contribution per spelling')
  assert.equal(on.every(contribution => contribution.available() === true), true, 'the row being on lists both')
  assert.equal(off.every(contribution => contribution.available() === false), true, 'and the row being off lists neither')
  // No aggregate fallback: the snapshot says every feature is enabled, but the
  // row itself is not in it, which is exactly the profile whose patch predates
  // the row — offering the command there would fork from a page that has no row.
  const patchless = sideCommands(t, controllerAt(undefined), noServices)
  assert.equal(patchless.every(contribution => contribution.available() === false), true, 'no row, no command')

  // The shape the registry reads: `label` and `description` are thunks, called
  // on every candidate pass, and an action is a callback plus a kind.
  for (const contribution of on) {
    assert.deepEqual(
      Object.keys(contribution).sort(),
      ['available', 'description', 'label', 'name', 'ui'],
      `${contribution.name} carries only what a contribution may`,
    )
    assert.equal(typeof contribution.label, 'function', 'the menu calls label()')
    assert.equal(contribution.label(), 'btwLabel')
    assert.equal(contribution.description(), 'btwDescription')
    assert.equal(contribution.ui.kind, 'action', 'a bare invocation runs a callback, never a prompt')
    assert.equal(typeof contribution.ui.run, 'function')
  }

  // One handler for both names, and it is the shared runner itself — the same
  // object the launcher card calls, not a second implementation of the flow.
  assert.equal(on[0].ui.run, runSpy, 'the contribution carries the shared runner verbatim')
  assert.equal(on[1].ui.run, runSpy, 'both spellings, one runner')
  runCalls.length = 0
  on[0].ui.run({ sessionId: 'parent' })
  assert.deepEqual(runCalls, [{ session: { sessionId: 'parent' }, options: undefined }], 'a command hands the runner its Session and nothing else')

  // The name a side chat carries: the parent's title, unique among its siblings.
  const parent = 'EDH'
  const base = 'btwTitle({"title":"EDH"})'
  const named = suffix => `${base} (${suffix})`
  assert.equal(sideTitle('Refactor the parser', [], t), 'btwTitle({"title":"Refactor the parser"})', 'nothing else: the base')
  assert.equal(sideTitle('  Padded  ', [], t), 'btwTitle({"title":"Padded"})', 'the title is trimmed')
  assert.equal(sideTitle(parent, [base], t), named(2), 'one side chat exists: the next number')
  assert.equal(sideTitle(parent, [base, named(2)], t), named(3), 'the third fork of one conversation')
  assert.equal(sideTitle(parent, [base, named(2), named(3)], t), named(4))
  // A gap is not reused: a title is a record, not a slot.
  assert.equal(sideTitle(parent, [base, named(3)], t), named(4), 'the next number after the highest in use')
  assert.equal(sideTitle(parent, [named(2)], t), named(3), 'and the same without a bare base')
  // Only an exact base or `base (<digits>)` is ours. These are somebody else's
  // titles that merely start with ours, or another parent's side chat.
  for (const foreign of [`${base} notes`, `${base} (2) notes`, `${base}2`, `${base} (x)`, `Other: EDH`, `${base} (2`, '', '   ', null, 42]) {
    assert.equal(sideTitle(parent, [foreign], t), base, `not a sibling: ${JSON.stringify(foreign)}`)
  }
  assert.equal(
    sideTitle(parent, ['Side: Other (2)', 'Side: EDH (draft)'], t),
    base,
    'another parent\'s numbered chat is not this parent\'s count',
  )
  // Titles that are not strings, or the list itself being unusable, cost a number.
  assert.equal(sideTitle(parent, undefined, t), base, 'no list at all')
  assert.equal(sideTitle(parent, ['', '   ', 7, null, base], t), named(2), 'junk is ignored, the real one counts')
  for (const absent of ['', '   ', undefined, null, 42]) {
    assert.equal(sideTitle(absent, [], t), 'btwLabel', `a parent without a title falls back: ${JSON.stringify(absent)}`)
    assert.equal(
      sideTitle(absent, ['btwLabel'], t),
      'btwLabel (2)',
      'and untitled parents number too, so their side chats stay apart',
    )
  }

  // The titles a count is taken from: the same list projection, tolerated.
  assert.deepEqual(
    sessionTitles({ list: { getSnapshot: () => ({ byId: { a: { title: 'EDH' }, b: { title: 'Side: EDH' }, c: {} } }) } }),
    ['EDH', 'Side: EDH'],
    'every readable title, nothing else',
  )
  assert.deepEqual(sessionTitles({}), [], 'no list, no titles')
  assert.deepEqual(sessionTitles({ list: { getSnapshot: () => { throw new Error('store refused') } } }), [], 'a refusing store')
  assert.deepEqual(sessionTitles({ list: { getSnapshot: () => ({ byId: null }) } }), [])

  // The parent's title comes from the Session list's own projection.
  assert.equal(
    sessionTitle({ list: { getSnapshot: () => ({ byId: { parent: { title: 'From the list' } } }) } }, { sessionId: 'parent' }),
    'From the list',
  )
  assert.equal(sessionTitle({}, { sessionId: 'parent', title: 'From the session' }), 'From the session', 'then the field')
  assert.equal(sessionTitle({ list: { getSnapshot: () => ({ byId: {} }) } }, { sessionId: 'parent' }), '', 'nothing, when it has neither')
  assert.equal(
    sessionTitle({ list: { getSnapshot: () => { throw new Error('store refused') } } }, { sessionId: 'parent' }),
    '',
    'a refusing store costs the name, not the command',
  )

  // A fork that refuses: recorded, and nothing thrown.
  storage.length = 0
  const navigations = []
  /** Every way a view could move: the row menu's Fork must not use any of them. */
  const stillHere = { openSession: id => navigations.push(id) }
  const refused = await openSideChat({
    t,
    sessions: { fork: async () => { throw new Error('fork refused') } },
    uiWorkspace: {
      ...stillHere,
      forkSession: async () => { throw new Error('fork refused') },
    },
    session: { sessionId: 'parent' },
  })
  assert.equal(refused, undefined, 'it answers nothing and never rejects')
  assert.deepEqual(phases(), ['click', 'failed'])
  assert.deepEqual({ step: crumbs()[1].step, message: crumbs()[1].message }, { step: 'fork', message: 'fork refused' })
  assert.deepEqual(navigations, [], 'nothing to show, so nothing is opened')

  // A fork with no session id to fork from is a breadcrumb, not a crash.
  storage.length = 0
  await openSideChat({
    t,
    sessions: { fork: async () => 'child' },
    uiWorkspace: { ...stillHere, forkSession: async () => 'child' },
    session: {},
  })
  assert.deepEqual(phases(), ['click', 'failed'])
  assert.equal(crumbs()[1].step, 'click')

  // The working path: fork the whole conversation in place, name it, and let the
  // list agree — the order the sidebar sees. Nothing navigates: the side chat is
  // a row next to this conversation, and this conversation stays selected.
  const calls = []
  const sessions = {
    list: { getSnapshot: () => ({ byId: { parent: { title: 'Refactor the parser' } } }) },
    async fork(options) {
      calls.push({ fork: options })
      options.onCreated('child-1')
      return 'child-1'
    },
    async using(target, options, operation) {
      return await operation({ binding: { session: { async rename(title) {
        calls.push({ rename: { sessionId: target, title } })
        return { ok: true, value: { title, seq: 7 } }
      } } } })
    },
    async refreshProjections(sessionId) {
      calls.push({ refresh: sessionId })
    },
  }
  navigations.length = 0
  storage.length = 0
  await openSideChat({
    t,
    sessions,
    uiWorkspace: {
      ...stillHere,
      /** The shipped fork-in-place: same call the sidebar's own Fork makes. */
      async forkSession(sessionId, onCreated) {
        calls.push({ forkSession: { sessionId, onCreated: typeof onCreated } })
        return sessions.fork({ sessionId, increaseTitle: true, onCreated })
      },
    },
    session: { sessionId: 'parent' },
  })
  assert.deepEqual(phases(), ['click', 'forked', 'named', 'pane-failed'], 'no right column in this case: fork, name, record the missing pane')
  assert.deepEqual({ sessionId: crumbs()[1].sessionId, childId: crumbs()[1].childId }, { sessionId: 'parent', childId: 'child-1' })
  assert.equal(crumbs()[2].renamed, true)
  assert.deepEqual(calls[0], { forkSession: { sessionId: 'parent', onCreated: 'function' } }, 'the shipped fork-in-place is the route')
  assert.equal(calls[1].fork.sessionId, 'parent')
  assert.equal(calls[1].fork.atSeq, undefined, 'no cut: the child carries everything said so far')
  assert.equal(calls[1].fork.increaseTitle, true, 'the fork also numbers it inside the parent line')
  assert.deepEqual(navigations, [], 'the view never moves: the child is a sidebar row')
  assert.deepEqual(calls[2].rename, { sessionId: 'child-1', title: 'btwTitle({"title":"Refactor the parser"})' })
  assert.equal(calls[3].refresh, 'child-1', 'the list is asked to agree after the rename')

  // A build without `forkSession`: the same fork straight from `sessions`, and
  // still no navigation — no path here may move the view.
  navigations.length = 0
  storage.length = 0
  const fallbackCalls = []
  await openSideChat({
    t,
    sessions: {
      list: { getSnapshot: () => ({ byId: {} }) },
      async fork(options) {
        fallbackCalls.push({ sessionId: options.sessionId, increaseTitle: options.increaseTitle })
        options.onCreated('child-5')
        return 'child-5'
      },
      async using(target, options, operation) {
        return await operation({ binding: { session: { rename: async () => ({ ok: true, value: { title: 'btwLabel', seq: 1 } }) } } })
      },    },
    uiWorkspace: stillHere,
    session: { sessionId: 'parent' },
  })
  assert.deepEqual(phases(), ['click', 'forked', 'named', 'pane-failed'])
  assert.deepEqual(fallbackCalls, [{ sessionId: 'parent', increaseTitle: true }])
  assert.deepEqual(navigations, [], 'the fallback does not navigate either')

  // The shipped fork can create the child and then throw (its own inherited-title
  // rename fails after creation). The chat exists, so it is still named.
  navigations.length = 0
  storage.length = 0
  await openSideChat({
    t,
    sessions: {
      list: { getSnapshot: () => ({ byId: {} }) },
      async fork(options) {
        options.onCreated('child-2')
        throw new Error('fork child rename failed: conflict: title taken')
      },
      async using(target, options, operation) {
        return await operation({ binding: { session: { rename: async () => ({ ok: true, value: { title: 'btwLabel', seq: 1 } }) } } })
      },      async refreshProjections() {},
    },
    uiWorkspace: stillHere,
    session: { sessionId: 'parent' },
  })
  assert.deepEqual(phases(), ['click', 'forked', 'failed', 'named', 'pane-failed'], 'the failed numbering is recorded, then the chat is still named')
  assert.equal(crumbs()[2].step, 'fork-title')
  assert.deepEqual(navigations, [], 'a chat that exists is still just a row')

  // A refused rename is the last step, so it costs the name and nothing else.
  navigations.length = 0
  storage.length = 0
  await openSideChat({
    t,
    sessions: {
      list: { getSnapshot: () => ({ byId: {} }) },
      async fork(options) {
        options.onCreated('child-3')
        return 'child-3'
      },
      async using(target, options, operation) {
        return await operation({ binding: { session: { rename: async () => ({ ok: false, error: { code: 'forbidden' } }) } } })
      },      async refreshProjections() {},
    },
    uiWorkspace: stillHere,
    session: { sessionId: 'parent' },
  })
  assert.deepEqual(navigations, [])
  assert.equal(crumbs()[2].renamed, false, 'the breadcrumb says the rename was refused')
  assert.equal(phases().includes('failed'), false, 'and no step failed: the chat exists and is usable')

  // A throwing rename or projection refresh is caught the same way.
  storage.length = 0
  await openSideChat({
    t,
    sessions: {
      list: { getSnapshot: () => ({ byId: {} }) },
      async fork(options) { options.onCreated('child-4'); return 'child-4' },
      async using(target, options, operation) {
        return await operation({ binding: { session: { rename: async () => { throw new Error('rename refused') } } } })
      },      async refreshProjections() { throw new Error('refresh refused') },
    },
    uiWorkspace: stillHere,
    session: { sessionId: 'parent' },
  })
  assert.deepEqual(phases(), ['click', 'forked', 'failed', 'pane-failed'])
  assert.equal(crumbs()[2].step, 'name')

  // The live right column: the fork, the name, then the pane — in that order, at
  // the address the resource protocol claims, and with no placement flags: the
  // tab belongs in the pane the person is already looking at, never in a split.
  {
    storage.length = 0
    const paneCalls = []
    const resumes = []
    const order = []
    await openSideChat({
      t,
      sessions: {
        list: { getSnapshot: () => ({ byId: { parent: { title: 'Refactor the parser' } } }) },
        async fork(options) { options.onCreated('child-6'); return 'child-6' },
        // The Host refuses a rename for a Session it is not holding live, so the
        // rename has to run after a resume. `using` is that resume.
        async using(target, options, operation) {
          resumes.push({ target, options: { source: options.source } })
          order.push('resume')
          return await operation({ binding: { session: { async rename(title) {
            order.push({ rename: { sessionId: target, title } })
            return { ok: true, value: { title, seq: 2 } }
          } } } })
        },

        async refreshProjections() {},
      },
      uiWorkspace: stillHere,
      pane: {
        openResource(address, options) {
          paneCalls.push({ address, options })
          order.push('openResource')
          return Promise.resolve()
        },
      },
      session: { sessionId: 'parent' },
    })
    assert.deepEqual(phases(), ['click', 'forked', 'named', 'pane-opened'], 'the pane is opened after the name is settled')
    assert.equal(crumbs()[3].childId, 'child-6')
    assert.deepEqual(paneCalls, [{
      address: btwAddress('child-6'),
      options: { kind: BTW_TAB_KIND },
    }], 'the tab is claimed by kind and nothing else: no split, no replacement')
    assert.equal(paneCalls[0].options.preferNewPane, undefined, 'a side chat never splits the dock')
    assert.equal(paneCalls[0].address, 'dsh-resource://edhbtw/session/child-6')
    assert.deepEqual(navigations, [], 'opening a pane is not navigating the centre')
    assert.deepEqual(resumes, [{ target: 'child-6', options: { source: BTW_RETAIN_SOURCE } }], 'the child is resumed before the rename')
    assert.deepEqual(order, [
      'resume',
      { rename: { sessionId: 'child-6', title: 'btwTitle({"title":"Refactor the parser"})' } },
      'openResource',
    ], 'resume, rename, then the tab: the title is in the store before the tab claims it')
  }

  // A rename the Host still refuses: recorded with its reason, and the pane opens
  // anyway — a numbered title is better than no chat.
  {
    storage.length = 0
    const paneCalls = []
    await openSideChat({
      t,
      sessions: {
        list: { getSnapshot: () => ({ byId: {} }) },
        async fork(options) { options.onCreated('child-10'); return 'child-10' },
        async using(target, options, operation) {
          return await operation({ binding: { session: { rename: async () => ({ ok: false, error: { code: 'session/title-invalid' } }) } } })
        },
        async refreshProjections() {},
      },
      uiWorkspace: stillHere,
      pane: { openResource: (address, options) => { paneCalls.push({ address, options }); return Promise.resolve() } },
      session: { sessionId: 'parent' },
    })
    assert.deepEqual(phases(), ['click', 'forked', 'named', 'pane-opened'])
    assert.deepEqual({ renamed: crumbs()[2].renamed, reason: crumbs()[2].reason }, { renamed: false, reason: 'session/title-invalid' })
    assert.equal(paneCalls.length, 1, 'the chat still opens')
  }

  // The route is `sessions.using`: `sessions` has no `rename(id, title)` of its
  // own, so a service without `using` has no way to rename and says so rather
  // than throwing a TypeError nobody would see.
  {
    const none = await renameSideChat({}, 'child-11', 'Side: x')
    assert.deepEqual({ ok: none.ok, code: none.error.code }, { ok: false, code: 'no-rename-route' })

    const seen = []
    const refused = await renameSideChat({
      async using(target, options, operation) {
        seen.push({ target, source: options.source })
        return await operation({ binding: { session: { rename: async title => ({ ok: true, value: { title, seq: 4 } }) } } })
      },
    }, 'child-11', 'Side: x')
    assert.deepEqual(seen, [{ target: 'child-11', source: BTW_RETAIN_SOURCE }], 'the child is retained to rename it')
    assert.deepEqual({ ok: refused.ok, value: refused.value }, { ok: true, value: { title: 'Side: x', seq: 4 } })
  }

  // Three side chats of one conversation: the third is named for its place.
  {
    storage.length = 0
    let asked = ''
    await openSideChat({
      t,
      sessions: {
        list: {
          getSnapshot: () => ({
            byId: {
              parent: { title: 'EDH' },
              // The two siblings as the dictionary renders them: `Side: EDH` and
              // `Side: EDH (2)` once the real translator is in play.
              one: { title: base },
              two: { title: named(2) },
            },
          }),
        },
        async fork(options) { options.onCreated('child-13'); return 'child-13' },
        async using(target, options, operation) {
          return await operation({ binding: { session: { rename: async title => { asked = title; return { ok: true, value: { title, seq: 5 } } } } } })
        },
      },
      uiWorkspace: stillHere,
      session: { sessionId: 'parent' },
    })
    assert.equal(asked, 'btwTitle({"title":"EDH"}) (3)', 'the third side chat of one conversation is numbered, not repeated')
    assert.equal(crumbs()[2].renamed, true)
  }

  // A right column that refuses the address: recorded, and the fork still stands.
  {
    storage.length = 0
    await openSideChat({
      t,
      sessions: {
        list: { getSnapshot: () => ({ byId: {} }) },
        async fork(options) { options.onCreated('child-7'); return 'child-7' },
        async using(target, options, operation) {
        return await operation({ binding: { session: { rename: async () => ({ ok: true, value: { title: 'Side chat', seq: 1 } }) } } })
      },        async refreshProjections() {},
      },
      uiWorkspace: stillHere,
      // `openResource` throws synchronously for an address no type claims.
      pane: { openResource() { throw new Error('sidebarRight: no registered tab type claims "x"') } },
      session: { sessionId: 'parent' },
    })
    assert.deepEqual(phases(), ['click', 'forked', 'named', 'pane-failed'])
    assert.equal(crumbs()[3].childId, 'child-7')
    assert.equal(crumbs()[3].message, 'sidebarRight: no registered tab type claims "x"')
  }
  {
    storage.length = 0
    await openSideChat({
      t,
      sessions: {
        list: { getSnapshot: () => ({ byId: {} }) },
        async fork(options) { options.onCreated('child-8'); return 'child-8' },
        async using(target, options, operation) {
        return await operation({ binding: { session: { rename: async () => ({ ok: true, value: { title: 'Side chat', seq: 1 } }) } } })
      },      },
      uiWorkspace: stillHere,
      pane: { openResource: async () => { throw new Error('no on-screen session') } },
      session: { sessionId: 'parent' },
    })
    assert.deepEqual(phases(), ['click', 'forked', 'named', 'pane-failed'], 'a rejecting open degrades the same way')
    assert.equal(crumbs()[3].message, 'no on-screen session')
  }

  // Structural: the side-chat path cannot navigate. `openSession` is the only
  // call that moves the main view, and it is nowhere in the handler — the `open`
  // failure step went with it.
  assert.equal(openSideChat.toString().includes('openSession'), false, 'a side chat is a row, not a view')

  // The address scheme: one side chat is one child Session, and nothing else
  // claims to be one.
  assert.equal(BTW_PROTOCOL, 'edhbtw')
  assert.equal(BTW_ADDRESS, 'dsh-resource://edhbtw/session/')
  assert.equal(btwAddress('child-1'), 'dsh-resource://edhbtw/session/child-1')
  assert.equal(btwAddress('a/b c'), 'dsh-resource://edhbtw/session/a%2Fb%20c', 'the id is encoded')
  assert.equal(parseBtwAddress('dsh-resource://edhbtw/session/a%2Fb%20c'), 'a/b c', 'and decoded back to the id')
  assert.equal(parseBtwAddress(btwAddress('child-1')), 'child-1')
  for (const foreign of [
    'dsh-resource://subagentchat/session/s1?parent=p&mode=one-shot',
    'dsh-resource://edhbtw/session/',
    'dsh-resource://edhbtw/session/a/b',
    'dsh-resource://edhbtw/other/a',
    'dsh-resource://edhbtw/session/%E0%A4%A',
    'sidebar://guide',
    'not a url',
    '',
  ]) {
    assert.equal(parseBtwAddress(foreign), undefined, `another plugin's address stays foreign: ${foreign}`)
  }

  // The registrations the pane needs, against fakes: the protocol, the keyed pane
  // entry with its session-scoped child, the panel on that child, the launcher
  // card, the stylesheet — and the tab type, which is the one seat that follows
  // the row because it carries the card.
  const stubbed = definition.factory(() => ({
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  })).__test
  {
    const effectLabels = []
    const protocols = []
    const tabTypes = []
    const slotEntries = []
    const watchers = []
    let rowOn = true
    const harnessController = {
      getSnapshot: () => ({
        status: 'ready',
        moduleStates: rowOn ? { [BTW_MODULE]: true } : { [BTW_MODULE]: false },
      }),
      subscribe(fn) {
        watchers.push(fn)
        return () => {
          const at = watchers.indexOf(fn)
          if (at >= 0) watchers.splice(at, 1)
        }
      },
    }
    /** Change the row the way the Host would, then let the pane re-sync. */
    const setRow = on => {
      rowOn = on
      for (const watch of [...watchers]) watch()
    }
    const scope = {
      sessions: {
        retain: () => ({ release() {} }),
        list: { getSnapshot: () => ({ byId: { 'child-1': { title: 'Side: Refactor the parser' } } }) },
      },
      resources: {
        register(provider) {
          protocols.push(provider)
          return () => {}
        },
      },
      sidebarRightTabs: {
        register(definition) {
          tabTypes.push(definition)
          return () => {
            const at = tabTypes.indexOf(definition)
            if (at >= 0) tabTypes.splice(at, 1)
          }
        },
      },
      slots: {
        inject(name, callback) {
          callback()
          return () => {}
        },
        register(options, component) {
          slotEntries.push({ name: options.name, options, component })
          return () => {}
        },
      },
      effect(fn, label) {
        const dispose = fn()
        effectLabels.push(label)
        return dispose
      },
    }
    registerSideChatPane(t, scope, harnessController, { run: runSpy })

    assert.deepEqual(effectLabels, [
      'edh: side chat resources',
      'edh: side chat styles',
      'edh: side chat pane',
      'edh: side chat panel',
      'edh: side chat guide',
      'edh: side chat tab-type',
    ], 'one effect per seat, each owning its own disposal')
    assert.deepEqual(protocols.map(provider => provider.protocol), ['edhbtw'], 'one resource protocol')

    const [type] = tabTypes
    assert.equal(type.id, 'moreweb-edh/btw', 'the id is namespaced: another plugin may register a kind too')
    assert.equal(type.kind, 'edh-btw-chat')
    assert.deepEqual(type.patterns, ['dsh-resource://edhbtw/session/**'], 'the glob claims our whole address space')
    assert.equal(type.priority, 'extension', 'a plugin outside the product registers in the extension band')
    assert.equal(type.canOpen(btwAddress('child-1')), true)
    assert.equal(type.canOpen('dsh-resource://subagentchat/session/x?parent=p&mode=one-shot'), false)
    assert.equal(type.title(btwAddress('child-1')), 'Side: Refactor the parser', 'the chip is the child Session title')
    assert.equal(type.title(btwAddress('unknown')), 'btwLabel', 'and the label when the list knows no title')
    assert.equal(type.title('not ours'), 'btwLabel')

    // The launcher card: the shipped entry shape, last among the shipped doors.
    assert.equal(type.guide.length, 1, 'one card, declared on the type that owns the address')
    const [card] = type.guide
    assert.deepEqual(Object.keys(card).sort(), ['description', 'icon', 'id', 'order', 'title'], 'exactly the shipped entry shape')
    assert.equal(card.id, 'side')
    assert.equal(card.order, BTW_GUIDE_ORDER)
    assert.equal(card.order > 30, true, 'after Workspace files 10, New terminal 20, Browser 30')
    assert.equal(card.title(), 'btwLabel')
    assert.equal(card.description(), 'btwGuide')
    assert.equal(typeof card.icon, 'function', 'the icon is a component, as the shipped cards pass')
    assert.equal(stubbed.SideGuideIcon({ size: 26 }).props.width, 26, 'and it draws at the card glyph size')

    const pane = slotEntries.find(entry => entry.name === 'sidebar.right.pane.tab')
    assert.equal(pane.options.key, BTW_TAB_ID, 'the tab type id keys the entry')
    assert.deepEqual(
      pane.options.children,
      { 'edh.btw.chat': { kind: 'single', scope: 'session' } },
      'the child slot is session-scoped: that is what gives the panel its Session',
    )
    assert.equal(pane.component, BtwChatTab, 'the body binds the retained reference')
    const panel = slotEntries.find(entry => entry.name === 'edh.btw.chat')
    assert.equal(panel.component, BtwConversationPanel, 'and the child renders the conversation')
    assert.equal(BTW_CHAT_SLOT, 'edh.btw.chat')
    const guideEntry = slotEntries.find(entry => entry.name === 'sidebar.right.tab.guide.entry')
    assert.equal(guideEntry.options.key, BTW_TAB_ID, 'the card body is keyed by the tab type id, as the shipped ones are')
    assert.equal(guideEntry.options.locale, undefined, 'copy comes from the plugin dictionary, not a package namespace')

    // The row is the switch: off withdraws the card and the address claim, on
    // puts both back, and nothing else is disturbed either way.
    setRow(false)
    assert.deepEqual(tabTypes, [], 'a row that is off leaves no card in the launcher')
    assert.equal(slotEntries.length >= 3, true, 'and the pane, panel and card body are still registered')
    setRow(true)
    assert.equal(tabTypes.length, 1, 'turning it back on restores the card')
    assert.equal(watchers.length, 1, 'one subscription, owned by the tab-type effect')
  }

  // The launcher card: the shipped markup, and the very runner the two commands
  // carry — clicking it is the flow, with the card's own tab to take the place of.
  {
    runCalls.length = 0
    storage.length = 0
    const SideGuideEntry = stubbed.createSideGuideEntry(t, { run: runSpy })
    const card = SideGuideEntry({ sessionId: 'parent', useTabInfo: () => ({ tab: { id: 'tab-7' } }) })
    assert.equal(card.type, 'button', 'the shipped card is a button')
    assert.equal(card.props.className, 'edh-btw-guide')
    assert.equal(card.props['data-sidebar-right-guide-entry'], BTW_TAB_KIND, 'the shipped marker, so the guide can style it')

    const [iconWell, text] = card.props.children
    assert.equal(iconWell.props.className, 'edh-btw-guideIcon')
    const glyph = iconWell.props.children[0]
    assert.equal(glyph.type, 'svg')
    assert.equal(glyph.props.width, 26, 'the shipped card draws its glyph at 26 while a description shows')
    assert.equal(glyph.props.viewBox, '0 0 16 16')
    assert.equal(glyph.props.children.length, ICON_SIDE.length, 'two branches and two nodes, as the glyph is drawn')
    assert.deepEqual(
      {
        type: glyph.props.children[2].type,
        cx: glyph.props.children[2].props.cx,
        cy: glyph.props.children[2].props.cy,
        r: glyph.props.children[2].props.r,
      },
      { type: 'circle', cx: 12.4502, cy: 3.3079, r: 1.56962 },
      'a node is a circle, not a rewritten path',
    )
    assert.equal(text.props.className, 'edh-btw-guideText')
    const [title, description] = text.props.children
    assert.equal(title.props.children, 'btwLabel', 'the card reads the dictionary')
    assert.equal(description.props.children, 'btwGuide')

    card.props.onClick()
    assert.deepEqual(phases(), ['guide-click'], 'the click is recorded before the shared flow speaks')
    assert.equal(crumbs()[0].sessionId, 'parent', 'from the on-screen Session the card was rendered in')
    assert.deepEqual(runCalls, [{
      session: { sessionId: 'parent' },
      options: { replaceTab: 'tab-7' },
    }], 'the card runs the shared runner, handing it its own tab to replace')
  }

  // A card in a build whose command surface never mounted: recorded, not thrown.
  {
    storage.length = 0
    const inert = stubbed.createSideGuideEntry(t, { run: undefined })({ sessionId: 'parent' })
    inert.props.onClick()
    assert.deepEqual(phases(), ['guide-click', 'failed'])
    assert.equal(crumbs()[1].step, 'guide')
  }

  // That runner is the flow: fork, name, then open the pane at the child's
  // address, replacing the card's tab so the launcher does not linger beside it.
  {
    storage.length = 0
    const calls = []
    const runner = createSideChatRunner(t, {
      sessions: {
        list: { getSnapshot: () => ({ byId: {} }) },
        async fork(options) {
          calls.push('fork')
          options.onCreated('child-12')
          return 'child-12'
        },
        async using(target, options, operation) {
          calls.push('using')
          return await operation({ binding: { session: { async rename() {
            calls.push('rename')
            return { ok: true, value: { title: 'Side chat', seq: 3 } }
          } } } })
        },

      },
      uiWorkspace: stillHere,
      pane: {
        current: {
          openResource(address, options) {
            calls.push({ openResource: { address, options } })
            return Promise.resolve()
          },
        },
      },
    })
    runner({ sessionId: 'parent' }, { replaceTab: 'tab-7' })
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.deepEqual(calls, [
      'fork',
      'using',
      'rename',
      { openResource: { address: btwAddress('child-12'), options: { kind: BTW_TAB_KIND, replaceTab: 'tab-7' } } },
    ], 'the card and the commands run one flow; only the tab replacement differs')
    assert.deepEqual(phases(), ['click', 'forked', 'named', 'pane-opened'])
  }

  // The provider: retain for the tab's lifetime, release in `finally`.
  {
    const retained = []
    const released = []
    const provider = btwResourceProvider({
      retain(target, options) {
        retained.push({ target, options })
        return { release: () => released.push(target) }
      },
    })
    const controller = new AbortController()
    const frames = provider.open(btwAddress('child-1'), { signal: controller.signal })
    const first = await frames.next()
    assert.equal(first.value.ok, true)
    assert.equal(first.value.value.childId, 'child-1')
    assert.equal(typeof first.value.value.reference, 'object', 'the pane is handed the reference, not the id')
    assert.equal(retained[0].target, 'child-1')
    assert.equal(retained[0].options.source, BTW_RETAIN_SOURCE, 'the retain is traceable to this feature')
    assert.equal(retained[0].options.signal, controller.signal, 'and rides the tab signal')
    assert.deepEqual(released, [], 'held while the tab lives')
    controller.abort()
    assert.deepEqual(await frames.next(), { value: undefined, done: true }, 'closing the tab ends the generator')
    assert.deepEqual(released, ['child-1'], 'and releases the Session in finally')

    // A retain that refuses (an unknown Session) throws before yielding, so the
    // body has no reference to bind and paints nothing.
    const failing = btwResourceProvider({ retain() { throw new Error('sessions.retain: unknown session child-9') } })
    await assert.rejects(
      async () => await failing.open(btwAddress('child-9'), { signal: new AbortController().signal }).next(),
      /unknown session child-9/,
    )
    const bad = btwResourceProvider({ retain: () => ({ release() {} }) })
    await assert.rejects(
      async () => await bad.open('dsh-resource://other/session/x', { signal: new AbortController().signal }).next(),
      /invalid side-chat address/,
    )
  }

  // The body: nothing without a reference, and `SessionProvider` around the chat
  // slot with one. The provider is what hands the child slot its Session.
  assert.equal(stubbed.BtwChatTab({
    useTabInfo: () => ({ tab: { contentId: btwAddress('child-9') } }),
    useResource: () => ({ value: undefined }),
    SessionProvider: () => 'should not render',
    renderSlot: () => 'should not render',
  }), null, 'no resource, no body: an empty pane is worse than none')

  {
    const reference = { sessionId: 'child-1', binding: {} }
    let asked = ''
    const SessionProvider = props => ({ provider: true, props })
    const tree = stubbed.BtwChatTab({
      useTabInfo: () => ({ tab: { contentId: btwAddress('child-1') } }),
      useResource: contentId => { asked = contentId; return { value: { reference } } },
      SessionProvider,
      renderSlot: name => `slot:${name}`,
    })
    assert.equal(asked, btwAddress('child-1'), 'the resource is read at the tab address')
    assert.equal(tree.type, SessionProvider, 'the child slot is wrapped in the provider and nothing else')
    assert.equal(tree.props.session, reference, 'bound to the retained reference')
    assert.equal(tree.props.children, 'slot:edh.btw.chat', 'and the session-scoped child renders inside it')
  }

  // The conversation: the shipped content, embedded, with a fixed chat view.
  {
    const calls = []
    const render = (session, summaryBlank) => stubbed.BtwConversationPanel({
      sessionId: 'child-1',
      useSession: selector => selector(session),
      useConversation: selector => selector({ activeTargets: new Map() }),
      useSessions: selector => selector({ byId: { 'child-1': { blank: summaryBlank } } }),
      renderFactorySlot: (name, props, options) => {
        calls.push({ name, props, options })
        return 'content'
      },
    })
    assert.equal(render({ blank: true, openState: 'open', running: false, promptAttempted: false }, true), 'content')
    assert.equal(calls[0].name, 'conversation.content')
    assert.deepEqual(
      { variant: calls[0].props.variant, phase: calls[0].props.phase, hero: calls[0].props.hero },
      { variant: 'embedded', phase: 'hero', hero: true },
      'a fresh fork opens on the hero, embedded in the pane',
    )
    assert.equal(typeof calls[0].options.slots.views, 'function', 'the chat view is fixed, not chosen by the pane')
    render({ blank: false, openState: 'open', running: true, promptAttempted: true }, false)
    assert.deepEqual(
      { phase: calls[1].props.phase, hero: calls[1].props.hero },
      { phase: 'active', hero: false },
      'and a running chat is the live one',
    )
  }

  // And the registration itself: two entries through `commandUi`, both removed
  // when the effect disposes. Nothing else in `apply` may need these services,
  // which is why a profile without them still mounts the switch.
  {
    const registered = []
    const effects = []
    const registry = {
      register(contribution) {
        registered.push(contribution)
        return () => {
          const at = registered.indexOf(contribution)
          if (at >= 0) registered.splice(at, 1)
        }
      },
    }
    const scope = {
      commandUi: registry,
      sessions: { fork: async () => 'child' },
      uiWorkspace: { forkSession: async () => 'child', openSession() {} },
      effect(fn) {
        const dispose = fn()
        effects.push(dispose)
        return dispose
      },
    }
    const ctx = {
      locale: { bind: () => t, register: () => () => {}, subscribe: () => () => {} },
      effect: () => () => {},
      slots: { inject: () => () => {} },
      remote: {
        pluginManager: { async listPlugins() { return { ok: true, value: [] } } },
        $on: () => () => {},
        on: () => () => {},
      },
      inject: (names, callback) => (names.includes('commandUi') ? callback(scope) : undefined),
      get: () => undefined,
      logger: { warn() {}, error() {}, info() {} },
    }
    storage.length = 0
    mod.apply(ctx)
    assert.deepEqual(registered.map(contribution => contribution.name), ['btw', 'side'], 'both spellings are registered')
    assert.equal(registered[0].ui.run, registered[1].ui.run, 'through the one handler')
    assert.equal(effects.length, 1, 'one effect owns both registrations')
    effects[0]()
    assert.deepEqual(registered, [], 'disposing the effect takes both names out of the menu')
  }
}

console.log('edh mcp: page, form, and secret checks passed')
console.log('edh mcp: reload control checks passed')
console.log('edh mcp: settings section checks passed')
console.log('edh update: control and reload checks passed')
console.log('edh btw: side chat command checks passed')
console.log('edh switch: all checks passed')