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
  setTimeout,
  clearTimeout,
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
const {
  remoteView,
  remoteReport,
  readRemoteView,
  remoteMissing,
  remoteState,
  remoteStateLabel,
  remoteStateTone,
  portCheck,
  remoteDraft,
  validateRemoteDraft,
  toggleBody,
  remoteActionBody,
  remoteRefusal,
  addressLine,
  remoteAddressLines,
  warningLines,
  sessionsText,
  remotePage,
  REMOTE_ROUTE,
  REMOTE_MODULE,
  REMOTE_SECTION_SLOT,
  REMOTE_SECTION_ORDER,
  REMOTE_ACTIONS,
  REMOTE_DEFAULT_PORT,
  REMOTE_PORT_MIN,
  REMOTE_PORT_MAX,
  REMOTE_DEBUG_KEY,
  en,
  zh,
} = mod.__test
const {
  usageTotals,
  usageModel,
  usageDay,
  usageStamp,
  usageScopes,
  usageView,
  usageReport,
  readUsageView,
  usageMissing,
  usageEmpty,
  usageScope,
  parseDay,
  isoDay,
  weekStart,
  finishBucket,
  usageBuckets,
  usagePalette,
  usageSeries,
  usageUnits,
  formatTokens,
  formatPercent,
  formatDuration,
  usageDaysText,
  usageScale,
  usageGeometry,
  usagePoints,
  usagePath,
  usageDot,
  donutSlices,
  usageFooter,
  usagePage,
  createUsagePage,
  USAGE_ROUTE,
  USAGE_MODULE,
  USAGE_SECTION_SLOT,
  USAGE_SECTION_ORDER,
  USAGE_ACTIONS,
  USAGE_RANGES,
  USAGE_SCOPES,
  USAGE_SERIES_MAX,
  USAGE_PALETTE,
  USAGE_NEUTRAL,
  USAGE_CSS,
  USAGE_CHART,
  USAGE_DONUT,
  USAGE_OTHER,
  USAGE_DEBUG_KEY,
} = mod.__test
const {
  createMobileLayer,
  installMobileLayer,
  mobileIconHref,
  MOBILE_MODULE,
  MOBILE_CSS,
  MOBILE_VIEWPORT,
  MOBILE_MANIFEST,
  MOBILE_QUERY,
  MOBILE_THEME,
  MOBILE_META,
  MOBILE_DEBUG_KEY,
  remoteQrModel,
  remoteQrSvg,
  qrBytes,
  qrVersionFor,
  qrDataCodewords,
  qrTotalCodewords,
  qrFormatBits,
  REMOTE_QR_VERSIONS,
  REMOTE_QR_ALIGNMENT,
  REMOTE_QR_QUIET,
} = mod.__test
const {
  notifyDefaults,
  notifyClampVolume,
  notifyDomId,
  readNotifySettings,
  writeNotifySettings,
  notifyCatalog,
  notifyTransition,
  notifyAllows,
  notifySoundFor,
  createNotifyAudio,
  createNotifyPopup,
  createNotifier,
  installNotifier,
  runNotifyTest,
  notifyClampText,
  notifyTitleText,
  notifyBodyText,
  runNotifyText,
  notifySessionTitle,
  notifyOpenSession,
  readNotifyLast,
  raiseNotifyWindow,
  NOTIFY_LAST_ROUTE,
  NOTIFY_RAISE_ROUTE,
  NOTIFY_RAISE_TIMEOUT_MS,
  NOTIFY_TITLE_MAX,
  NOTIFY_BODY_MAX,
  notifyPage,
  createNotifyPage,
  NOTIFY_TONES,
  NOTIFY_MODULE,
  NOTIFY_SETTINGS_KEY,
  NOTIFY_DEBUG_KEY,
  NOTIFY_SECTION_ORDER,
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

/**
 * A React-shaped `createElement` plus inert hooks: one page state can then be
 * rendered and inspected without a browser, and without running an effect that
 * would reach for a route the Node process cannot answer.
 */
function stubPageFactory() {
  return definition.factory(() => ({
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => undefined,
    useRef: value => ({ current: value }),
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useId: () => 'edh',
  })).__test
}

/** Every element in a stub tree, root first. */
function treeNodes(tree, found = []) {
  if (Array.isArray(tree)) {
    for (const child of tree) treeNodes(child, found)
    return found
  }
  if (tree === null || tree === undefined || typeof tree !== 'object') return found
  found.push(tree)
  treeNodes(tree.props.children, found)
  return found
}

/** Every element of one type in a stub tree. */
function treeByType(tree, type) {
  return treeNodes(tree).filter(node => node.type === type)
}

/** Every string a stub tree places directly in an element, in document order. */
function treeText(tree) {
  const text = []
  for (const node of treeNodes(tree)) {
    const children = Array.isArray(node.props.children) ? node.props.children : []
    for (const child of children) {
      if (typeof child === 'string') text.push(child)
    }
  }
  return text
}

/** Whether any visible string contains this phrase. */
function hasText(tree, phrase) {
  return treeText(tree).some(line => line.includes(phrase))
}

/** Every button's visible label. */
function treeButtons(tree) {
  return treeByType(tree, 'button').map(button => button.props.children
    .filter(child => typeof child === 'string').join(' '))
}

// 27 — the remote seat: one settings section, right after MCP, gated on its row.
// The listener only exists while the `remote` row is mounted, so the nav cell is
// registered from the row's own state and withdrawn when the row goes away —
// exactly the rule the MCP page follows, on the seat next to it.
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
        register: (options, component) => {
          const entry = { options, component }
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
    const sections = () => entries.filter(entry => entry.options.name === REMOTE_SECTION_SLOT)
    return {
      ctx,
      entries,
      sections,
      section: id => sections().find(entry => entry.options.id === id),
      /** Change a row the way the Host would, then let the switch re-read. */
      async setRow(entryId, enabled) {
        const row = rows.find(candidate => candidate.entryId === entryId)
        row.enabled = enabled
        handlers.get('plugin-manager/changed')()
        await new Promise(resolve => setTimeout(resolve, 0))
      },
    }
  }

  assert.equal(REMOTE_ROUTE, 'api/edh.remote', 'document-relative, like the MCP and update routes')
  assert.equal(REMOTE_MODULE, '@moreweb/edh/remote', 'the row that owns the route')
  assert.equal(REMOTE_SECTION_SLOT, 'settings.section', 'a page of its own in the Settings nav')
  assert.equal(REMOTE_SECTION_ORDER, 17, 'the seat right after MCP')
  assert.equal(REMOTE_SECTION_ORDER, MCP_SECTION_ORDER + 1, 'the two EDH pages stay contiguous')
  assert.deepEqual(REMOTE_ACTIONS, ['set', 'logout-all', 'regenerate-secret'], 'every action the route accepts')
  assert.equal(REMOTE_DEBUG_KEY, 'edh:remote', 'its own breadcrumb, beside edh:mcp')
  assert.equal(rowEnabled({ status: 'ready', moduleStates: { [REMOTE_MODULE]: true } }, REMOTE_MODULE), true)
  assert.equal(rowEnabled({ status: 'ready', moduleStates: { [MCP_MODULE]: true } }, REMOTE_MODULE), false, 'MCP is not this row')
  assert.equal(rowEnabled({ status: 'loading', moduleStates: { [REMOTE_MODULE]: true } }, REMOTE_MODULE), false)

  const shell = { entryId: 'include:edh', moduleName: '@moreweb/edh', enabled: true, fiberPhase: 'active' }
  const mcpRow = { entryId: 'include:edh-mcp', moduleName: MCP_MODULE, enabled: true, fiberPhase: 'active' }
  const remoteRow = { entryId: 'include:edh-remote', moduleName: REMOTE_MODULE, enabled: true, fiberPhase: 'active' }
  const harness = fakeSectionCtx([shell, { ...mcpRow }, { ...remoteRow }])
  mod.apply(harness.ctx)
  await new Promise(resolve => setTimeout(resolve, 0))

  assert.deepEqual(harness.sections().map(entry => entry.options.id), ['mcp', 'remote'], 'one page per feature')
  const page = harness.section('remote')
  assert.ok(page, 'the page registers once its row is known to be there')
  assert.equal(page.options.order, REMOTE_SECTION_ORDER, 'and sits where the constant says')
  assert.equal(page.options.label(), 'remoteNav', 'the nav reads the localized name')
  assert.equal(page.options.locale, 'edh', 'its copy comes from the plugin dictionary')
  assert.equal(page.options.children, undefined, 'a section page owns no child slots')
  assert.equal(typeof page.component, 'function', 'and it renders the page the row is about')
  assert.equal(
    harness.entries.filter(entry => entry.options.name === 'settings.plugins.tab').length,
    0,
    'nothing is buried under the Plugins page',
  )

  // The row is the switch: off withdraws the entry, on puts it back, and the MCP
  // page beside it is untouched either way.
  await harness.setRow('include:edh-remote', false)
  assert.deepEqual(harness.section('remote'), undefined, 'a row that is off leaves no nav cell')
  assert.ok(harness.section('mcp'), 'and does not take the page next to it')
  await harness.setRow('include:edh-remote', true)
  assert.ok(harness.section('remote'), 'turning it back on restores the page')

  // A bundle patch that predates the row: no entry at all, never a dead cell.
  const patchless = fakeSectionCtx([shell, { ...mcpRow }])
  mod.apply(patchless.ctx)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(patchless.section('remote'), undefined, 'no row in this profile means no page to open')
  assert.ok(patchless.section('mcp'))
}

// 28 — the answer is the view: a GET's state, a POST's own state, and the four
// listener words the page is allowed to say.
{
  assert.deepEqual(remoteView({
    ok: true,
    available: true,
    enabled: true,
    listening: true,
    port: 8787,
    username: '  me  ',
    hasPassword: true,
    addresses: ['192.168.1.20', ' ', '192.168.1.20', 7, '192.168.1.21'],
    warning: ' LAN only ',
    secure: false,
    sessions: 2,
  }), {
    available: true,
    enabled: true,
    listening: true,
    port: 8787,
    username: 'me',
    hasPassword: true,
    addresses: ['192.168.1.20', '192.168.1.21'],
    warning: 'LAN only',
    sessions: 2,
    failure: '',
  }, 'the record is a projection: trimmed, de-duplicated, and typed')
  assert.equal('secure' in remoteView({ ok: true, enabled: false, secure: true }), false, 'the page decided plain HTTP; it has no secure mode to report')
  for (const absent of [undefined, null, 0, 'nope', {}, { ok: true }, { report: { ok: true } }]) {
    assert.equal(remoteView(absent), undefined, `no view in ${JSON.stringify(absent)}`)
  }

  // A view that names only its switch is the off state, not a claim of anything
  // running, and an impossible port is not a port.
  const bare = remoteView({ ok: true, enabled: false })
  assert.equal(bare.port, REMOTE_DEFAULT_PORT, 'the default port stands in for an absent one')
  assert.equal(bare.enabled, false)
  assert.equal(bare.listening, false)
  assert.equal(bare.available, true, 'a view is available unless it says otherwise')
  assert.equal(remoteView({ ok: true, enabled: false, port: 0 }).port, REMOTE_DEFAULT_PORT)
  assert.equal(remoteView({ ok: true, enabled: false, port: 70000 }).port, REMOTE_DEFAULT_PORT, 'an impossible port is not a port')

  const read = readRemoteView({
    ok: true,
    enabled: false,
    listening: false,
    port: 8080,
    username: '',
    hasPassword: false,
    addresses: [],
    warning: '',
    sessions: 0,
  })
  assert.equal(read.ok, true)
  assert.equal(read.report, undefined)
  assert.equal(read.failure, '')
  assert.equal(read.view.port, 8080)

  // A POST answers the view *and* the report, and that view is the one to adopt:
  // the page never re-reads to find out what its own write did.
  const posted = readRemoteView({
    ok: true,
    enabled: true,
    listening: true,
    port: 9000,
    username: 'phone',
    hasPassword: true,
    addresses: ['10.0.0.5'],
    warning: '',
    sessions: 0,
    report: { ok: true, action: 'set' },
  })
  assert.equal(posted.ok, true)
  assert.equal(posted.view.port, 9000, 'the answer already carries the new port')
  assert.equal(posted.view.listening, true)
  assert.deepEqual(posted.report, { ok: true, action: 'set', reason: '', message: '' })

  // Every action answers the same shape, so every action's answer is a view the
  // page can adopt — the sign-out included.
  for (const action of REMOTE_ACTIONS) {
    const answered = readRemoteView({
      ok: true,
      enabled: true,
      listening: true,
      port: 8787,
      username: 'owner',
      hasPassword: true,
      addresses: [],
      warning: '',
      sessions: 0,
      report: { ok: true, action },
    })
    assert.equal(answered.ok, true, `${action} answers a view`)
    assert.equal(answered.view.port, 8787, `and ${action}'s view is the one to adopt`)
    assert.equal(answered.report.action, action)
  }

  // The page reads the route once on mount and once per retry; a write's answer
  // is the only thing that moves it afterwards.
  assert.equal(source.split("requestRemote('GET'").length - 1, 1, 'one read, and no blind re-fetch after a write')
  assert.equal(source.split("requestRemote('POST'").length - 1, 1, 'one write path')

  // A 400 answers the same body shape, so it still updates the page to the
  // Host's truth and is never mistaken for a broken route.
  const refused = readRemoteView({
    ok: false,
    enabled: false,
    listening: false,
    port: 8787,
    username: 'me',
    hasPassword: true,
    addresses: [],
    warning: '',
    sessions: 0,
    report: { ok: false, action: 'set', reason: 'port-in-use', message: 'port 9000 is already taken' },
  })
  assert.equal(refused.ok, true, 'the body is still a view')
  assert.equal(refused.view.port, 8787)
  assert.equal(refused.failure, 'port 9000 is already taken', 'the Host words the refusal')
  assert.equal(refused.report.ok, false)

  // A refusal with no view is a route that carries nothing to adopt.
  const absent = readRemoteView({ ok: false, reason: 'error', message: 'api/edh.remote answered 500' })
  assert.equal(absent.ok, false)
  assert.equal(absent.view, undefined)
  assert.equal(absent.failure, 'api/edh.remote answered 500')
  for (const empty of [undefined, null, 'nope', {}, { ok: false }]) {
    assert.equal(readRemoteView(empty).ok, false, `inert for ${JSON.stringify(empty)}`)
    assert.equal(readRemoteView(empty).view, undefined)
  }

  // The four words. Off wins over everything, because the switch is the authority:
  // nothing is meant to be running behind it.
  const states = [
    [{ enabled: false }, 'off', 'remoteStateOff', 'off'],
    [{ enabled: false, listening: true, failure: 'stale' }, 'off', 'remoteStateOff', 'off'],
    [{ enabled: true, listening: true }, 'listening', 'remoteStateListening', 'ok'],
    [{ enabled: true, listening: false }, 'starting', 'remoteStateStarting', 'busy'],
    [{ enabled: true, listening: false, failure: 'EADDRINUSE' }, 'failed', 'remoteStateFailed', 'bad'],
  ]
  for (const [view, state, label, tone] of states) {
    assert.equal(remoteState(view), state, `${JSON.stringify(view)} reads as ${state}`)
    assert.equal(remoteStateLabel(state), label, `${state} has one word`)
    assert.equal(remoteStateTone(state), tone, `${state} paints one dot`)
  }
  assert.equal(remoteState(undefined), 'off')

  // The missing-feature routes: either the view says so, or the refusal names it.
  assert.equal(remoteMissing({ view: { available: false } }), true)
  for (const reason of ['unavailable', 'no-services', 'missing']) {
    assert.equal(remoteMissing({ reason }), true, `${reason} means the services are missing`)
  }
  for (const reason of ['error', 'bad-port', '']) {
    assert.equal(remoteMissing({ reason }), false, `${reason} is not a missing feature`)
  }
  assert.equal(remoteMissing(undefined), false)
}

// 29 — the port and the account are checked before anything is sent, and the
// Host's own refusal lands on the field it came from.
{
  assert.equal(REMOTE_DEFAULT_PORT, 8787, 'the port the page offers')
  assert.equal(REMOTE_PORT_MIN, 1, 'the range the Host accepts, not a stricter one of our own')
  assert.equal(REMOTE_PORT_MAX, 65535, 'and nothing that is not a port')

  assert.deepEqual(portCheck('8787'), { ok: true, port: 8787 })
  assert.deepEqual(portCheck(' 8787 '), { ok: true, port: 8787 }, 'a pasted value is trimmed')
  assert.deepEqual(portCheck(8787), { ok: true, port: 8787 }, 'an already-numeric value still checks')
  assert.deepEqual(portCheck('1'), { ok: true, port: 1 }, 'the bottom of the range')
  assert.deepEqual(portCheck('80'), { ok: true, port: 80 }, 'a privileged port is the Host\'s call, not the page\'s')
  assert.deepEqual(portCheck('65535'), { ok: true, port: 65535 }, 'the top of the range')

  for (const blank of ['', '   ', undefined, null]) {
    assert.deepEqual(portCheck(blank), { ok: false, field: 'port', message: 'remotePortInvalid' }, `${JSON.stringify(blank)} is not a number`)
  }
  for (const notNumber of ['eighty', '8o87', '8.5', '-1', '0x22', '8e3', '8787 8787']) {
    assert.deepEqual(portCheck(notNumber), { ok: false, field: 'port', message: 'remotePortInvalid' }, `${notNumber} is not a port number`)
  }
  for (const outOfRange of ['0', '65536', '99999']) {
    assert.deepEqual(portCheck(outOfRange), { ok: false, field: 'port', message: 'remotePortRange' }, `${outOfRange} is out of range`)
  }

  // The range is stated before a request goes out; "in use" can only come back
  // from the Host, so it is read from the refusal and shown on the same field.
  assert.deepEqual(remoteRefusal({ ok: false, reason: 'port-in-use', message: '' }), { field: 'port', message: 'remotePortInUse' })
  assert.deepEqual(remoteRefusal({ ok: false, reason: 'eaddrinuse', message: '' }), { field: 'port', message: 'remotePortInUse' })
  assert.deepEqual(remoteRefusal({ reason: 'bad-port' }), { field: 'port', message: 'remotePortInvalid' })
  assert.deepEqual(remoteRefusal({ reason: 'bad-port-range' }), { field: 'port', message: 'remotePortRange' })
  assert.deepEqual(remoteRefusal({ reason: 'bad-username' }), { field: 'username', message: 'remoteUsernameInvalid' })
  assert.deepEqual(remoteRefusal({ reason: 'bad-password' }), { field: 'password', message: 'remotePasswordRequired' })
  assert.deepEqual(remoteRefusal({ reason: 'password-required' }), { field: 'password', message: 'remotePasswordRequired' })
  assert.deepEqual(remoteRefusal({ reason: 'something-new' }), { field: '', message: 'remoteActionFailed' }, 'an unknown reason is a sentence, not a code')
  assert.deepEqual(remoteRefusal(undefined), { field: '', message: 'remoteActionFailed' })

  const form = (overrides = {}) => ({ port: '8787', username: 'owner', password: '', confirm: '', ...overrides })
  assert.deepEqual(validateRemoteDraft(form()), {
    ok: true,
    body: { action: 'set', port: 8787, username: 'owner' },
    fields: ['port', 'username'],
  }, 'an untouched account saves the port and the name, and nothing else')
  assert.deepEqual(validateRemoteDraft(form({ port: '0' })), { ok: false, field: 'port', message: 'remotePortRange' })
  assert.deepEqual(validateRemoteDraft(form({ port: 'eighty' })), { ok: false, field: 'port', message: 'remotePortInvalid' })
  for (const blank of ['', '   ']) {
    assert.deepEqual(validateRemoteDraft(form({ username: blank })), { ok: false, field: 'username', message: 'remoteUsernameRequired' })
  }
  assert.deepEqual(
    validateRemoteDraft(form({ username: 'x'.repeat(65) })),
    { ok: false, field: 'username', message: 'remoteUsernameInvalid' },
    'longer than the Host stores',
  )
  assert.equal(validateRemoteDraft(form({ username: 'x'.repeat(64) })).ok, true, 'sixty-four characters is still a name')
  assert.equal(validateRemoteDraft(form({ username: 'a' })).ok, true, 'one character is a name the Host accepts')
  assert.equal(
    validateRemoteDraft(form({ username: 'a b' })).ok,
    true,
    'a space is the Host\'s call, not the page\'s — it trims and stores what it is given',
  )
  assert.equal(validateRemoteDraft(form({ username: '  owner  ' })).body.username, 'owner', 'the name is trimmed, not refused')
}

// 30 — the account: a secret never comes back, a typo cannot lock the owner out,
// and stopping never touches what is stored.
{
  const secret = 'hunter2-hunter2'
  const read = readRemoteView({
    ok: true,
    enabled: true,
    listening: true,
    port: 8787,
    username: 'me',
    hasPassword: true,
    password: secret,
    confirm: secret,
    secret,
    token: secret,
    credentials: { password: secret },
    addresses: [],
    warning: '',
    sessions: 1,
  })
  assert.equal(read.view.hasPassword, true, 'the page learns a password is set, not what it is')
  assert.equal(JSON.stringify(read.view).includes(secret), false, 'the password is not in the record')
  assert.equal(JSON.stringify(read).includes(secret), false, 'and not in the read result either')

  // The form is seeded from the view and never from a secret.
  assert.deepEqual(remoteDraft({ ...read.view, password: secret, confirm: secret }), {
    port: '8787',
    username: 'me',
    password: '',
    confirm: '',
  }, 'the two password fields are always empty')
  assert.deepEqual(remoteDraft(undefined), { port: '8787', username: '', password: '', confirm: '' })
  assert.deepEqual(remoteDraft({ port: 'not a port' }).port, '8787', 'a broken answer falls back to the default')

  const form = (overrides = {}) => ({ port: '8787', username: 'owner', password: '', confirm: '', ...overrides })
  // A typo in the confirm field blocks the submit instead of locking the owner
  // out of their own GUI.
  assert.deepEqual(
    validateRemoteDraft(form({ password: 'correct-horse', confirm: 'correct-hors' })),
    { ok: false, field: 'confirm', message: 'remotePasswordMismatch' },
  )
  assert.deepEqual(
    validateRemoteDraft(form({ password: 'short', confirm: 'short' })),
    { ok: false, field: 'password', message: 'remotePasswordShort' },
  )
  assert.deepEqual(
    validateRemoteDraft(form({ password: '', confirm: 'something' })),
    { ok: false, field: 'password', message: 'remotePasswordShort' },
    'a confirm with nothing to confirm is not a password',
  )
  const typed = validateRemoteDraft(form({ password: 'long-enough', confirm: 'long-enough' }))
  assert.deepEqual(typed.body, { action: 'set', port: 8787, username: 'owner', password: 'long-enough' })
  assert.equal('confirm' in typed.body, false, 'the Host never hears about the confirm field')
  assert.deepEqual(typed.fields, ['port', 'username', 'password'])
  assert.equal('password' in validateRemoteDraft(form()).body, false, 'an empty password is never sent')

  // Starting has to leave something guarding the door.
  const empty = remoteDraft({ enabled: false, hasPassword: false, port: 8787, username: 'owner' })
  assert.deepEqual(
    toggleBody({ enabled: false, hasPassword: false, port: 8787, username: 'owner' }, empty),
    { ok: false, field: 'password', message: 'remotePasswordRequired' },
    'a listener with no password would publish the GUI unprotected',
  )
  const stored = { enabled: false, hasPassword: true, port: 8787, username: 'owner' }
  assert.deepEqual(toggleBody(stored, remoteDraft(stored)), {
    ok: true,
    body: { action: 'set', enabled: true },
    fields: ['enabled'],
  }, 'with a stored password, starting is one field')
  assert.deepEqual(toggleBody(stored, form({ password: 'long-enough', confirm: 'long-enough' })), {
    ok: true,
    body: { action: 'set', port: 8787, username: 'owner', password: 'long-enough', enabled: true },
    fields: ['port', 'username', 'password', 'enabled'],
  }, 'a password typed in the same breath is saved by the start')
  const running = { enabled: true, listening: true, hasPassword: true, port: 8787, username: 'owner' }
  assert.deepEqual(toggleBody(running, form({ password: 'long-enough', confirm: 'long-enough' })), {
    ok: true,
    body: { action: 'set', enabled: false },
    fields: ['enabled'],
  }, 'stopping never touches the account')
  const failed = { enabled: true, listening: false, failure: 'EADDRINUSE', hasPassword: true }
  assert.equal(toggleBody(failed, remoteDraft(failed)).body.enabled, true, 'a failed listener offers Start again')

  assert.deepEqual(remoteActionBody('logout-all'), { action: 'logout-all' })
  for (const action of REMOTE_ACTIONS.filter(value => value !== 'set')) {
    assert.deepEqual(remoteActionBody(action), { action })
  }
}

// 31 — the addresses: one absolute line per address, on the port being served.
{
  assert.equal(addressLine('192.168.1.20', 8787), 'http://192.168.1.20:8787', 'a bare host gets the scheme and the port')
  assert.equal(addressLine(' 192.168.1.20 ', 8787), 'http://192.168.1.20:8787')
  assert.equal(addressLine('http://192.168.1.20:8787', 8787), 'http://192.168.1.20:8787', 'a finished line is left alone')
  assert.equal(addressLine('http://192.168.1.20', 9000), 'http://192.168.1.20:9000', 'the port being served fills the gap')
  assert.equal(addressLine('http://192.168.1.20:9000', 8787), 'http://192.168.1.20:9000', 'a port already on the line wins')
  assert.equal(addressLine('http://192.168.1.20:8787/', 8787), 'http://192.168.1.20:8787', 'no trailing slash')
  assert.equal(addressLine('192.168.1.20/gui', 8787), 'http://192.168.1.20:8787', 'the address is the door, not a path')
  assert.equal(addressLine('https://phone.example.com', 8787), 'https://phone.example.com:8787', 'a scheme the Host chose is kept')
  assert.equal(addressLine('[::1]', 8787), 'http://[::1]:8787', 'a bracketed address keeps its brackets')
  assert.equal(addressLine('[::1]:9000', 8787), 'http://[::1]:9000')
  assert.equal(addressLine('', 8787), '')
  assert.equal(addressLine(undefined, 8787), '')
  assert.equal(addressLine('   ', 8787), '')
  assert.equal(addressLine('192.168.1.20', undefined), 'http://192.168.1.20:8787', 'no port reported still yields a line')

  assert.deepEqual(remoteAddressLines({
    port: 8787,
    addresses: ['192.168.1.20', '192.168.1.21', '192.168.1.20', ''],
  }), ['http://192.168.1.20:8787', 'http://192.168.1.21:8787'], 'one line per address, in the Host order')
  assert.deepEqual(remoteAddressLines({ port: 9000, addresses: ['192.168.1.20'] }), ['http://192.168.1.20:9000'], 'on the port it serves')
  assert.deepEqual(remoteAddressLines({ port: 8787, addresses: [] }), [], 'nothing to open yet')
  assert.deepEqual(remoteAddressLines(undefined), [])

  // The plain-HTTP warning is the page's own sentence, always first.
  const t = (key, params) => (params === undefined ? key : `${key}(${params.count})`)
  for (const view of [undefined, {}, { warning: '' }, { warning: 'Host words' }, { warning: 'remotePlainHttp' }]) {
    assert.equal(warningLines(view, t)[0], 'remotePlainHttp', `the tradeoff is stated for ${JSON.stringify(view)}`)
  }
  assert.deepEqual(warningLines({ warning: 'Host words' }, t), ['remotePlainHttp', 'Host words'], 'and the Host may add its own')
  assert.deepEqual(warningLines({ warning: 'remotePlainHttp' }, t), ['remotePlainHttp'], 'the same sentence is said once')

  assert.equal(sessionsText(t, 0), 'remoteNoSessions')
  assert.equal(sessionsText(t, 1), 'remoteSessionOne')
  assert.equal(sessionsText(t, 2), 'remoteSessions(2)')
  assert.equal(sessionsText(t, undefined), 'remoteNoSessions')
  assert.equal(sessionsText(t, -3), 'remoteNoSessions')
}

// 32 — the page itself: real labels, one line per address, Enter saves, and no
// secret anywhere on screen.
{
  const stub = stubPageFactory()
  const t = (key, params) => (params === undefined ? key : `${key}(${params.count})`)
  const ids = {
    port: 'port-id',
    username: 'user-id',
    password: 'pass-id',
    confirm: 'confirm-id',
    passwordHint: 'pass-hint',
    error: 'error-id',
  }
  const calls = []
  const actions = {
    retry: () => calls.push('retry'),
    field: (name, value) => calls.push(`field:${name}:${value}`),
    submit: () => calls.push('submit'),
    toggle: () => calls.push('toggle'),
    signOut: () => calls.push('signOut'),
    copy: address => calls.push(`copy:${address}`),
  }
  const live = {
    status: 'ready',
    data: {
      available: true,
      enabled: true,
      listening: true,
      port: 8787,
      username: 'me',
      hasPassword: true,
      addresses: ['192.168.1.20', 'http://192.168.1.21'],
      warning: 'Host words',
      sessions: 1,
      failure: '',
    },
    failure: '',
  }
  const base = {
    enabled: true,
    view: live,
    draft: stub.remoteDraft(live.data),
    fieldError: { field: '', text: '' },
    busy: '',
    saved: false,
    notice: { text: '', tone: 'bad' },
    copy: { address: '', copied: false },
    ids,
    actions,
  }
  const page = (overrides = {}) => stub.remotePage(t, { ...base, ...overrides })
  const ready = page()
  const text = treeText(ready)

  assert.deepEqual(treeByType(ready, 'h2').map(node => node.props.children[0]), ['remoteTitle'], 'the page has one heading')
  assert.ok(text.includes('remoteIntro'), 'and one introduction line')
  assert.ok(text.includes('remoteStateListening'), 'the listener state is a word, not a colour')
  assert.ok(treeButtons(ready).includes('remoteStop'), 'and the control is named after what it will do')

  // The port: a number field at the default, with the range on it.
  const portInput = treeByType(ready, 'input').find(input => input.props.type === 'number')
  assert.ok(portInput, 'the port is a number field')
  assert.equal(portInput.props.value, '8787', 'starting at the default')
  assert.equal(portInput.props.min, REMOTE_PORT_MIN)
  assert.equal(portInput.props.max, REMOTE_PORT_MAX)

  // The passwords: two of them, both empty, both opaque, both off the
  // browser's own autofill of a stored secret.
  const passwordInputs = treeByType(ready, 'input').filter(input => input.props.type === 'password')
  assert.equal(passwordInputs.length, 2, 'one password field and its confirm')
  for (const input of passwordInputs) {
    assert.equal(input.props.value, '', 'never prefilled, even when the Host says a password is set')
    assert.equal(input.props.autoComplete, 'new-password')
  }
  assert.ok(text.includes('remotePasswordHint'), 'the hint says what changing it costs')

  // Every input is tied to a real label, and the label is the field's name.
  const labelFor = id => treeByType(ready, 'label').find(label => label.props.htmlFor === id)
  for (const input of treeByType(ready, 'input')) {
    assert.equal(typeof input.props.id, 'string', 'every input has an id')
    assert.ok(labelFor(input.props.id), `${input.props.id} has a label pointing at it`)
  }
  assert.deepEqual(labelFor(ids.port).props.children.filter(child => typeof child === 'string'), ['remotePort'])
  assert.deepEqual(labelFor(ids.username).props.children.filter(child => typeof child === 'string'), ['remoteUsername'])
  assert.deepEqual(labelFor(ids.password).props.children.filter(child => typeof child === 'string'), ['remotePassword'])
  assert.deepEqual(labelFor(ids.confirm).props.children.filter(child => typeof child === 'string'), ['remotePasswordConfirm'])

  // Enter submits: the fields live in one form, and its submit is the save.
  const [form] = treeByType(ready, 'form')
  assert.equal(typeof form.props.onSubmit, 'function', 'Enter in any field submits the form')
  assert.equal(form.props['aria-label'], 'remoteAccount', 'and the form has a name')
  form.props.onSubmit({ preventDefault() {} })
  assert.deepEqual(calls, ['submit'])
  calls.length = 0

  // Inputs and buttons call the handlers they were given.
  portInput.props.onChange({ target: { value: '9000' } })
  assert.deepEqual(calls, ['field:port:9000'])
  calls.length = 0
  treeByType(ready, 'button').find(button => button.props.children.includes('remoteStop')).props.onClick()
  assert.deepEqual(calls, ['toggle'])
  calls.length = 0
  treeByType(ready, 'button').find(button => button.props.children.includes('remoteSignOut')).props.onClick()
  assert.deepEqual(calls, ['signOut'])
  calls.length = 0
  const copyButtons = treeByType(ready, 'button').filter(button => button.props.children.includes('copy'))
  assert.equal(copyButtons.length, 2, 'one Copy control per address')
  copyButtons[0].props.onClick()
  assert.deepEqual(calls, ['copy:http://192.168.1.20:8787'])
  calls.length = 0

  // One line per address, each carrying the port, over a sentence about the phone.
  const items = treeByType(ready, 'li')
  assert.equal(items.length, 2, 'one line per address')
  assert.deepEqual(
    items.map(item => treeByType(item, 'code')[0].props.children[0]),
    ['http://192.168.1.20:8787', 'http://192.168.1.21:8787'],
    'each line is an address to open on the phone, with the port',
  )
  assert.ok(text.includes('remoteAddressesHint'), 'and a plain sentence says what to do with them')
  assert.deepEqual(treeButtons(ready).filter(label => label === 'copy'), ['copy', 'copy'])

  // The warning is on the page, in its own words and in the Host's.
  assert.ok(text.includes('remotePlainHttp'), 'the plain-HTTP tradeoff is stated, not decorated')
  assert.ok(text.includes('Host words'), 'and the Host may add its own sentence')

  // Saving and saved are the button's state, not its name.
  const saving = page({ busy: 'save' })
  assert.ok(treeText(saving).includes('remoteSaving'))
  assert.ok(treeButtons(saving).includes('remoteSave'), 'the button keeps one name through the flow')
  const saved = page({ saved: true })
  assert.ok(treeText(saved).includes('remoteSaved'))
  assert.ok(treeButtons(saved).includes('remoteSave'))
  const idle = page({ view: { ...live, data: { ...live.data, sessions: 0 } } })
  assert.equal(
    treeByType(idle, 'button').find(button => button.props.children.includes('remoteSignOut')).props.disabled,
    true,
    'nothing to sign out with no phone signed in',
  )
  assert.ok(treeText(idle).includes('remoteNoSessions'))
  const signedOut = page({ notice: { text: 'Every phone was signed out.', tone: 'ok' } })
  assert.ok(treeText(signedOut).includes('Every phone was signed out.'))
  assert.equal(treeByType(signedOut, 'p').find(node => node.props['data-tone'] === 'ok').props.role, 'status')

  // A field error is described, not just coloured: aria-invalid plus the id of
  // the sentence that says what is wrong.
  const badPort = page({ fieldError: { field: 'port', text: 'Use a port from 1024 to 65535.' } })
  const badPortInput = treeByType(badPort, 'input').find(input => input.props.type === 'number')
  assert.equal(badPortInput.props['aria-invalid'], true)
  assert.equal(badPortInput.props['aria-describedby'], ids.error)
  const alert = treeByType(badPort, 'p').find(node => node.props.role === 'alert')
  assert.equal(alert.props.id, ids.error, 'the sentence is the one that describes it')
  assert.deepEqual(alert.props.children.filter(child => typeof child === 'string'), ['Use a port from 1024 to 65535.'])
  const badPassword = page({ fieldError: { field: 'password', text: 'Use at least 8 characters.' } })
  const badPasswordInput = treeByType(badPassword, 'input').find(input => input.props.type === 'password')
  assert.equal(badPasswordInput.props['aria-invalid'], true)
  assert.equal(
    badPasswordInput.props['aria-describedby'],
    `${ids.passwordHint} ${ids.error}`,
    'the hint and the error both describe the password field',
  )
  assert.equal(
    treeByType(badPassword, 'input').find(input => input.props.type === 'number').props['aria-invalid'],
    undefined,
    'the port is not marked when the password is the problem',
  )
  const badConfirm = page({ fieldError: { field: 'confirm', text: 'The two passwords do not match.' } })
  const confirmInput = treeByType(badConfirm, 'input').filter(input => input.props.type === 'password')[1]
  assert.equal(confirmInput.props['aria-invalid'], true)
  assert.equal(confirmInput.props['aria-describedby'], ids.error)
}

// 33 — every state of the page, and the one promise the unavailable state makes:
// no control at all.
{
  const stub = stubPageFactory()
  const t = key => key
  const ids = { port: 'p', username: 'u', password: 'w', confirm: 'c', passwordHint: 'h', error: 'e' }
  const actions = {}
  const base = {
    enabled: true,
    draft: stub.remoteDraft({ port: 8787 }),
    fieldError: { field: '', text: '' },
    busy: '',
    saved: false,
    notice: { text: '', tone: 'bad' },
    copy: { address: '', copied: false },
    ids,
    actions,
  }
  const page = (view, overrides = {}) => stub.remotePage(t, { ...base, view, ...overrides })

  // Loading is one quiet line, and nothing to fill in yet.
  const loading = page({ status: 'loading' })
  assert.deepEqual(treeText(loading), ['remoteTitle', 'remoteIntro', 'remoteLoading'])
  assert.equal(treeByType(loading, 'form').length, 0)
  assert.equal(treeByType(loading, 'button').length, 0)
  assert.equal(treeByType(loading, 'input').length, 0)

  // A read that failed says so in the Host's words and offers one way back.
  const failed = page({ status: 'error', failure: 'api/edh.remote answered 500' })
  assert.ok(treeText(failed).includes('remoteLoadFailed'))
  assert.ok(treeText(failed).includes('api/edh.remote answered 500'))
  assert.deepEqual(treeButtons(failed), ['remoteRetry'])

  // The services are missing on this profile: one sentence, and no dead control.
  const unavailable = page({ status: 'unavailable' })
  assert.deepEqual(treeText(unavailable), ['remoteTitle', 'remoteIntro', 'remoteUnavailable'])
  assert.equal(treeByType(unavailable, 'button').length, 0, 'no promise this profile cannot keep')
  assert.equal(treeByType(unavailable, 'input').length, 0)
  assert.equal(treeByType(unavailable, 'form').length, 0)

  // A row switched off while the page is open: the same quiet answer.
  const off = page({ status: 'loading' }, { enabled: false })
  assert.deepEqual(treeText(off), ['remoteTitle', 'remoteIntro', 'remoteOff'])
  assert.equal(treeByType(off, 'button').length, 0)

  // Every listener state: its one word, the control that can change it, and the
  // warning — which is page copy, so it does not come and go with the listener.
  const listeners = [
    [{ enabled: false, listening: false }, 'remoteStateOff', 'remoteStart'],
    [{ enabled: false, listening: false, failure: 'old' }, 'remoteStateOff', 'remoteStart'],
    [{ enabled: true, listening: false }, 'remoteStateStarting', 'remoteStop'],
    [{ enabled: true, listening: true }, 'remoteStateListening', 'remoteStop'],
    [{ enabled: true, listening: false, failure: 'EADDRINUSE' }, 'remoteStateFailed', 'remoteStart'],
  ]
  for (const [data, word, control] of listeners) {
    const view = {
      status: 'ready',
      data: {
        available: true,
        port: 8787,
        username: 'me',
        hasPassword: true,
        addresses: [],
        warning: '',
        sessions: 0,
        failure: '',
        ...data,
      },
      failure: '',
    }
    const tree = page(view)
    const words = treeText(tree)
    assert.ok(words.includes(word), `${JSON.stringify(data)} reads ${word}`)
    assert.ok(treeButtons(tree).includes(control), `and offers ${control}`)
    assert.ok(words.includes('remotePlainHttp'), `${word} still states the plain-HTTP tradeoff`)
    assert.ok(words.includes('remoteAddressesWaiting'), 'and says there is no address until the listener has one')
  }

  // A listener that failed says so in the Host's own sentence, under its word.
  const broken = page({
    status: 'ready',
    data: {
      available: true,
      enabled: true,
      listening: false,
      port: 8787,
      username: 'me',
      hasPassword: true,
      addresses: [],
      warning: '',
      sessions: 0,
      failure: 'listen EADDRINUSE 0.0.0.0:8787',
    },
    failure: '',
  })
  assert.ok(treeText(broken).includes('listen EADDRINUSE 0.0.0.0:8787'))
  assert.ok(treeByType(broken, 'span').some(node => node.props.className.includes('edh-remote-failure')))
}

// 34 — the dictionary: every string in both languages, and no key one of them
// is missing. The page is only as translated as its weakest dictionary.
{
  const enKeys = Object.keys(en).sort()
  const zhKeys = Object.keys(zh).sort()
  assert.deepEqual(enKeys, zhKeys, 'both dictionaries carry exactly the same keys')
  for (const key of enKeys) {
    assert.equal(typeof en[key], 'string', `${key} is a string in en`)
    assert.equal(typeof zh[key], 'string', `${key} is a string in zh`)
    assert.notEqual(en[key].trim(), '', `${key} says something in en`)
    assert.notEqual(zh[key].trim(), '', `${key} says something in zh`)
  }
  assert.equal(en.remoteSessions.includes('{count}'), true)
  assert.equal(zh.remoteSessions.includes('{count}'), true, 'the placeholder survives translation')

  const remoteKeys = enKeys.filter(key => key.startsWith('remote'))
  assert.ok(remoteKeys.length >= 35, `the remote page has its own copy (${remoteKeys.length} keys)`)

  // Every dictionary key the page asks for by name exists in both.
  const asked = new Set()
  for (const match of source.matchAll(/t\('(remote[A-Za-z]+)'/gu)) asked.add(match[1])
  assert.ok(asked.size >= 20, 'the page asks the dictionary for its copy')
  for (const key of asked) {
    assert.ok(Object.prototype.hasOwnProperty.call(en, key), `${key} is in en`)
    assert.ok(Object.prototype.hasOwnProperty.call(zh, key), `${key} is in zh`)
  }

  // The page decided plain HTTP, so the warning names the tradeoff rather than
  // hiding it behind a colour.
  assert.match(en.remotePlainHttp, /not encrypted/iu)
  assert.match(en.remotePlainHttp, /clear text/iu)
  assert.match(en.remotePlainHttp, /trust/iu)
  assert.match(zh.remotePlainHttp, /不加密/u)
  assert.match(zh.remotePlainHttp, /明文/u)
}

/**
 * The dictionary bound the way the locale service binds it: a template with
 * `{name}` placeholders, resolved against one language table.
 */
function dictionaryOf(language) {
  const table = language === 'zh' ? zh : en
  return (key, params) => {
    const template = typeof table[key] === 'string' ? table[key] : key
    if (params === undefined) return template
    return template.replace(/\{(\w+)\}/gu, (match, name) => (name in params ? String(params[name]) : match))
  }
}

/** A small, complete usage answer with three days, two weeks and three models. */
function sampleUsagePayload() {
  return {
    ok: true,
    timeZone: 'Europe/London',
    totals: {
      input: 60_000_000,
      output: 40_000_000,
      cacheRead: 20_000_000,
      cacheWrite: 200_000,
      total: 120_200_000,
      messages: 412,
      sessions: 17,
    },
    byModel: [
      { model: 'deepseek-v4', provider: 'deepseek', input: 55_000_000, output: 36_000_000, cacheRead: 18_000_000, cacheWrite: 120_000, total: 109_120_000, messages: 380, share: 0.9 },
      { model: 'claude-sonnet', provider: 'anthropic', input: 4_000_000, output: 3_500_000, cacheRead: 1_800_000, cacheWrite: 60_000, total: 9_360_000, messages: 26, share: 0.07 },
      { model: 'gpt-small', provider: 'openai', input: 1_000_000, output: 500_000, cacheRead: 200_000, cacheWrite: 20_000, total: 1_720_000, messages: 6, share: 0.01 },
    ],
    byDay: [
      { date: '2026-03-16', byModel: { 'deepseek-v4': 40, 'gpt-small': 10 }, total: 50, input: 40, output: 10, cacheRead: 0, cacheWrite: 0 },
      { date: '2026-03-10', byModel: { 'deepseek-v4': 60 }, total: 60, input: 50, output: 10, cacheRead: 0, cacheWrite: 0 },
      { date: '2026-03-09', byModel: { 'deepseek-v4': 100, 'claude-sonnet': 50 }, total: 150, input: 120, output: 30, cacheRead: 0, cacheWrite: 0 },
    ],
    stats: {
      peakDay: { date: '2026-03-09', total: 150 },
      longestSession: { id: 's1', title: 'Refactor the parser', durationMs: 8_040_000, startedAt: 1_770_000_000_000 },
      currentStreakDays: 3,
      longestStreakDays: 11,
      firstDay: '2026-03-09',
      lastDay: '2026-03-16',
    },
    backfill: { state: 'running', sessionsDone: 42, sessionsTotal: 200 },
    updatedAt: 1_770_000_000_000,
    notes: [
      'Title generation and search calls are not counted.',
      '  ',
      'Usage for subagents is attributed to the day it was spent.',
    ],
  }
}

/** The view a `sampleUsagePayload` read produces. */
function sampleUsageView() {
  return readUsageView(sampleUsagePayload()).view
}

// 35 — the usage seat: one settings section, right after Remote, gated on its row.
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
        getSnapshot: () => ({ active: 'en', locales: ['en', 'zh'], revision: 0 }),
      },
      effect: fn => fn(),
      slots: {
        inject: (_name, callback) => callback(),
        register: (options, component) => {
          const entry = { options, component }
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
    const sections = () => entries.filter(entry => entry.options.name === USAGE_SECTION_SLOT)
    return {
      ctx,
      entries,
      sections,
      section: id => sections().find(entry => entry.options.id === id),
      /** Change a row the way the Host would, then let the switch re-read. */
      async setRow(entryId, enabled) {
        const row = rows.find(candidate => candidate.entryId === entryId)
        row.enabled = enabled
        handlers.get('plugin-manager/changed')()
        await new Promise(resolve => setTimeout(resolve, 0))
      },
    }
  }

  assert.equal(USAGE_ROUTE, 'api/edh.usage', 'document-relative, like the other EDH routes')
  assert.equal(USAGE_MODULE, '@moreweb/edh/usage', 'the row that owns the route')
  assert.equal(USAGE_SECTION_SLOT, 'settings.section', 'a page of its own in the Settings nav')
  assert.equal(USAGE_SECTION_ORDER, 18, 'the third seat')
  assert.equal(USAGE_SECTION_ORDER, REMOTE_SECTION_ORDER + 1, 'MCP 16, Remote 17, Usage 18, in a row')
  assert.deepEqual(USAGE_ACTIONS, ['refresh', 'rebuild'], 'both actions the route accepts')
  assert.deepEqual(USAGE_RANGES, ['daily', 'weekly', 'cumulative'], 'the three ways to bucket the same days')
  assert.deepEqual(USAGE_SCOPES, ['all', 'main'], 'every session, or the main ones')
  assert.equal(USAGE_DEBUG_KEY, 'edh:usage', 'its own breadcrumb')
  assert.equal(rowEnabled({ status: 'ready', moduleStates: { [USAGE_MODULE]: true } }, USAGE_MODULE), true)
  assert.equal(rowEnabled({ status: 'ready', moduleStates: { [REMOTE_MODULE]: true } }, USAGE_MODULE), false, 'Remote is not this row')
  assert.equal(rowEnabled({ status: 'loading', moduleStates: { [USAGE_MODULE]: true } }, USAGE_MODULE), false)

  const shell = { entryId: 'include:edh', moduleName: '@moreweb/edh', enabled: true, fiberPhase: 'active' }
  const mcpRow = { entryId: 'include:edh-mcp', moduleName: MCP_MODULE, enabled: true, fiberPhase: 'active' }
  const remoteRow = { entryId: 'include:edh-remote', moduleName: REMOTE_MODULE, enabled: true, fiberPhase: 'active' }
  const usageRow = { entryId: 'include:edh-usage', moduleName: USAGE_MODULE, enabled: true, fiberPhase: 'active' }
  const harness = fakeSectionCtx([shell, { ...mcpRow }, { ...remoteRow }, { ...usageRow }])
  mod.apply(harness.ctx)
  await new Promise(resolve => setTimeout(resolve, 0))

  assert.deepEqual(
    harness.sections().map(entry => entry.options.id),
    ['mcp', 'remote', 'usage'],
    'one page per feature, in nav order',
  )
  const page = harness.section('usage')
  assert.ok(page, 'the page registers once its row is known to be there')
  assert.equal(page.options.order, USAGE_SECTION_ORDER, 'and sits where the constant says')
  assert.equal(page.options.label(), 'usageNav', 'the nav reads the localized name')
  assert.equal(page.options.locale, 'edh', 'its copy comes from the plugin dictionary')
  assert.equal(page.options.children, undefined, 'a section page owns no child slots')
  assert.equal(typeof page.component, 'function')

  // The row is the switch: off withdraws the entry, on puts it back, and the two
  // pages beside it are untouched either way.
  await harness.setRow('include:edh-usage', false)
  assert.equal(harness.section('usage'), undefined, 'a row that is off leaves no nav cell')
  assert.ok(harness.section('mcp'), 'and does not take the pages next to it')
  assert.ok(harness.section('remote'))
  await harness.setRow('include:edh-usage', true)
  assert.ok(harness.section('usage'), 'turning it back on restores the page')

  const patchless = fakeSectionCtx([shell, { ...remoteRow }])
  mod.apply(patchless.ctx)
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(patchless.section('usage'), undefined, 'no row in this profile means no page to open')
}

// 36 — the answer is the view: totals, days, stats, and both actions adopted.
{
  assert.deepEqual(usageTotals({ input: 1, output: 2, cacheRead: 3, cacheWrite: 4 }), {
    input: 1,
    output: 2,
    cacheRead: 3,
    cacheWrite: 4,
    total: 10,
    messages: 0,
    sessions: 0,
  }, 'a total is the sum of its parts when the Host does not state one')
  assert.equal(usageTotals({ total: 999, input: 1 }).total, 999, 'a stated total is the Host counting, not the page')
  assert.equal(usageTotals({ input: -5, output: '12.9', cacheRead: 'nonsense' }).total, 12, 'only whole non-negative counts')
  assert.equal(usageTotals(undefined).total, 0)

  assert.deepEqual(usageModel({ model: '  deepseek-v4  ', provider: ' deepseek ', total: 5 }), {
    model: 'deepseek-v4',
    provider: 'deepseek',
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    total: 5,
    messages: 0,
    sessions: 0,
  })
  for (const absent of [undefined, null, {}, { model: '' }, { model: '   ' }]) {
    assert.equal(usageModel(absent), undefined, `no model in ${JSON.stringify(absent)}`)
  }

  assert.deepEqual(usageDay({ date: '2026-03-09', byModel: { a: 3, '': 4, b: 'x' }, total: 3 }), {
    date: '2026-03-09',
    byModel: { a: 3, b: 0 },
    total: 3,
  })
  assert.equal(usageDay({ byModel: {} }), undefined, 'a day without a date is not a day')

  assert.equal(usageStamp(1_770_000_000_000), 1_770_000_000_000)
  assert.equal(usageStamp('2026-03-09T12:00:00.000Z'), Date.parse('2026-03-09T12:00:00.000Z'))
  assert.equal(usageStamp('not a date'), 0)
  assert.equal(usageStamp(undefined), 0)

  const view = sampleUsageView()
  assert.deepEqual(view.byDay.map(day => day.date), ['2026-03-09', '2026-03-10', '2026-03-16'], 'days are sorted once, here')
  assert.deepEqual(view.notes, [
    'Title generation and search calls are not counted.',
    'Usage for subagents is attributed to the day it was spent.',
  ], 'blank notes are dropped')
  assert.equal(view.stats.peakDay.total, 150)
  assert.equal(view.stats.longestSession.durationMs, 8_040_000)
  assert.equal(view.stats.currentStreakDays, 3)
  assert.equal(view.backfill.state, 'running')
  assert.equal(view.timeZone, 'Europe/London')
  assert.equal(view.available, true)
  assert.equal(view.failure, '')

  // A failure sentence is a listener/read error, never a successful answer's message.
  assert.equal(usageView({ totals: {}, message: 'All good' }).failure, '', 'a 200 message is not a failure')
  assert.equal(usageView({ totals: {}, lastError: 'the store could not be read' }).failure, 'the store could not be read')
  for (const absent of [undefined, null, 7, 'nope', {}, { ok: false }]) {
    assert.equal(usageView(absent), undefined, `no view in ${JSON.stringify(absent)}`)
  }
  assert.equal(usageView({ totals: {} }).available, true, 'a view is available unless it says otherwise')

  // GSET adoption, and the same adoption for either POST: the answer carries the
  // numbers, so there is never a second read after a write.
  const getRead = readUsageView(sampleUsagePayload())
  assert.equal(getRead.ok, true)
  assert.equal(getRead.report, undefined)
  assert.equal(getRead.view.totals.total, 120_200_000)
  for (const action of USAGE_ACTIONS) {
    const answered = readUsageView({
      ...sampleUsagePayload(),
      report: { ok: true, action },
    })
    assert.equal(answered.ok, true, `${action} answers a view`)
    assert.equal(answered.view.totals.total, 120_200_000, `and ${action}'s numbers are adoptable`)
    assert.deepEqual(answered.report, { ok: true, action, reason: '', message: '' })
  }

  // A 400 answers the same body shape, so it still updates the page.
  const refused = readUsageView({
    ...sampleUsagePayload(),
    ok: false,
    report: { ok: false, action: 'rebuild', reason: 'busy', message: 'A rebuild is already running' },
  })
  assert.equal(refused.ok, true, 'the body is still a view')
  assert.equal(refused.failure, 'A rebuild is already running', 'the Host words the refusal')

  const absent = readUsageView({ ok: false, reason: 'error', message: 'api/edh.usage answered 500' })
  assert.equal(absent.ok, false)
  assert.equal(absent.view, undefined)
  assert.equal(absent.failure, 'api/edh.usage answered 500')

  assert.equal(usageMissing({ view: { available: false } }), true)
  for (const reason of ['unavailable', 'no-services', 'missing']) {
    assert.equal(usageMissing({ reason }), true, `${reason} means the services are missing`)
  }
  assert.equal(usageMissing({ reason: 'error' }), false)
  assert.equal(usageMissing(undefined), false)

  assert.equal(usageEmpty({ totals: { total: 0 } }), true)
  assert.equal(usageEmpty({ totals: { total: 1 } }), false)
  assert.equal(usageEmpty(undefined), true)

  // One read on mount, one write path, and no blind re-fetch after a write.
  assert.equal(source.split("requestUsage('GET'").length - 1, 1, 'one read')
  assert.equal(source.split("requestUsage('POST'").length - 1, 1, 'one write path')
}

// 37 — numbers in the reader's units, in both languages.
{
  const tEn = dictionaryOf('en')
  const tZh = dictionaryOf('zh')
  const enUnits = usageUnits('en', tEn)
  const zhUnits = usageUnits('zh', tZh)

  assert.deepEqual(enUnits.map(unit => unit.factor), [1e9, 1e6, 1e3], 'English counts by thousand')
  assert.deepEqual(zhUnits.map(unit => unit.factor), [1e12, 1e8, 1e4], 'Chinese counts by 万 and 亿')

  assert.equal(formatTokens(999, enUnits), '999', 'under a thousand is itself')
  assert.equal(formatTokens(12_400, enUnits), '12.4K')
  assert.equal(formatTokens(120_200_000, enUnits), '120.2M', 'the tenth survives a three-digit mantissa')
  assert.equal(formatTokens(1_600_000_000, enUnits), '1.6B')
  assert.equal(formatTokens(1000, enUnits), '1K', 'a whole number drops its decimal')
  assert.equal(formatTokens(999_999, enUnits), '1M', 'a value that rounds up moves up a unit')
  assert.equal(formatTokens(12_345_678, enUnits), '12.3M')
  for (const empty of [0, -5, undefined, null, Number.NaN, 'nonsense']) {
    assert.equal(formatTokens(empty, enUnits), '0', `${String(empty)} is zero tokens`)
  }

  assert.equal(formatTokens(999, zhUnits), '999')
  assert.equal(formatTokens(12_400, zhUnits), '1.2万')
  assert.equal(formatTokens(120_200_000, zhUnits), '1.2亿')
  assert.equal(formatTokens(1_600_000_000, zhUnits), '16亿')
  assert.equal(formatTokens(999_999, zhUnits), '100万', 'rounded to the 万 place, not promoted')

  assert.equal(formatPercent(0.342), '34.2%')
  assert.equal(formatPercent(0.5), '50%', 'a whole percentage drops its decimal')
  assert.equal(formatPercent(0.0123), '1.2%')
  assert.equal(formatPercent(0), '0%')
  assert.equal(formatPercent(undefined), '0%')

  assert.equal(formatDuration(8_040_000, tEn), '2h 14m')
  assert.equal(formatDuration(840_000, tEn), '14m')
  assert.equal(formatDuration(0, tEn), '0m')
  assert.equal(formatDuration(30_000, tEn), '1m', 'half a minute is still a minute')
  assert.equal(formatDuration(7_200_000, tZh), '2 小时 0 分')

  assert.equal(usageDaysText(tEn, 0), '0 days')
  assert.equal(usageDaysText(tEn, 1), '1 day')
  assert.equal(usageDaysText(tEn, 3), '3 days')
  assert.equal(usageDaysText(tZh, 3), '3 天')
}

// 38 — the page buckets the same days three ways, and never invents one.
{
  const view = sampleUsageView()
  const scoped = usageScope(view, 'all')

  const daily = usageBuckets(scoped, 'daily')
  assert.deepEqual(daily.map(bucket => bucket.key), ['2026-03-09', '2026-03-10', '2026-03-16'])
  assert.deepEqual(daily.map(bucket => bucket.label), ['03-09', '03-10', '03-16'], 'a day label is the month and day')
  assert.deepEqual(daily[0].values, { 'deepseek-v4': 100, 'claude-sonnet': 50 })
  assert.equal(daily[1].total, 60, 'a day with one model is still a day')
  assert.deepEqual(daily[2].values, { 'deepseek-v4': 40, 'gpt-small': 10 })

  const weekly = usageBuckets(scoped, 'weekly')
  assert.deepEqual(weekly.map(bucket => bucket.key), ['2026-03-09', '2026-03-16'], 'one bucket per week, keyed by its Monday')
  assert.deepEqual(weekly[0].values, { 'deepseek-v4': 160, 'claude-sonnet': 50 }, 'the week sums its days')
  assert.equal(weekly[0].total, 210)
  assert.deepEqual(weekly[1].values, { 'deepseek-v4': 40, 'gpt-small': 10 })

  const cumulative = usageBuckets(scoped, 'cumulative')
  assert.deepEqual(cumulative.map(bucket => bucket.values['deepseek-v4']), [100, 160, 200], 'cumulative only ever adds')
  assert.deepEqual(cumulative.map(bucket => bucket.values['claude-sonnet']), [50, 50, 50], 'a model silent on a day keeps its running total')
  // A model that has not appeared yet is absent from the bucket, and its series
  // reads that absence as the zero it is.
  assert.deepEqual(cumulative.map(bucket => bucket.values['gpt-small'] ?? 0), [0, 0, 10])
  assert.deepEqual(usageSeries(cumulative).find(entry => entry.model === 'gpt-small').values, [0, 0, 10])
  assert.equal(cumulative[2].total, 260)
  assert.equal(view.totals.total, 120_200_000, 'the sample total is the Host counting, not the day sums')

  // A zero day is a real zero: it stays in the daily list and its total is zero.
  const zeroDay = usageBuckets({ byDay: [{ date: '2026-04-01', byModel: {} }, { date: '2026-04-02', byModel: { a: 5 } }] }, 'daily')
  assert.deepEqual(zeroDay.map(bucket => bucket.total), [0, 5], 'an empty day is not a gap')
  assert.deepEqual(zeroDay[0].values, {})

  // Weeks start on Monday, in UTC calendar fields.
  assert.equal(weekStart('2026-03-09'), '2026-03-09', 'a Monday is its own week start')
  assert.equal(weekStart('2026-03-15'), '2026-03-09', 'a Sunday belongs to the Monday before it')
  assert.equal(weekStart('2026-03-16'), '2026-03-16')
  assert.equal(weekStart('not a day'), 'not a day')
  assert.deepEqual(parseDay('2026-03-09'), { year: 2026, month: 3, day: 9 })
  assert.equal(parseDay('2026-3-9'), undefined)
  assert.equal(isoDay(new Date(Date.UTC(2026, 2, 9))), '2026-03-09')

  assert.deepEqual(usageBuckets(scoped, 'nonsense').map(bucket => bucket.key), daily.map(bucket => bucket.key), 'an unknown range is the default one')
  assert.deepEqual(usageBuckets({ byDay: [] }, 'daily'), [])
  assert.deepEqual(usageBuckets(undefined, 'daily'), [])
  assert.deepEqual(
    finishBucket({ key: '2026-03-09', values: { a: 0, b: 3 } }).values,
    { b: 3 },
    'a model with nothing to show is not a series',
  )
}

// 39 — the series: biggest models, the rest folded, shares from what is drawn.
{
  const buckets = usageBuckets(usageScope(sampleUsageView(), 'all'), 'daily')
  const series = usageSeries(buckets)
  assert.deepEqual(series.map(entry => entry.model), ['deepseek-v4', 'claude-sonnet', 'gpt-small'], 'ranked by total')
  assert.deepEqual(series.map(entry => entry.total), [200, 50, 10])
  assert.deepEqual(series.map(entry => entry.values), [[100, 60, 40], [50, 0, 0], [0, 0, 10]], 'a silent day is a zero, per series')
  const shareSum = series.reduce((sum, entry) => sum + entry.share, 0)
  assert.ok(Math.abs(shareSum - 1) < 1e-9, 'shares are of the drawn total and add up to one')
  assert.equal(series[0].share, 200 / 260, 'the Host\'s own share field is not consulted')

  // More models than colours: the tail folds into one neutral series.
  const many = {
    byDay: [
      { date: '2026-01-01', byModel: { a: 60, b: 50, c: 40, d: 30, e: 20, f: 10, g: 5 } },
    ],
  }
  const folded = usageSeries(usageBuckets(many, 'daily'))
  assert.equal(folded.length, USAGE_SERIES_MAX + 1, 'five models, then everything else')
  assert.deepEqual(folded.slice(0, USAGE_SERIES_MAX).map(entry => entry.model), ['a', 'b', 'c', 'd', 'e'])
  const other = folded[folded.length - 1]
  assert.equal(other.model, USAGE_OTHER)
  assert.equal(other.other, true)
  assert.equal(other.total, 15, 'the remainder is the sum of what was folded')
  assert.equal(other.colour, 'var(--edh-usage-other)', 'Other is the neutral, never a categorical hue')
  assert.ok(Math.abs(folded.reduce((sum, entry) => sum + entry.share, 0) - 1) < 1e-9, 'folding never loses a token')

  // Colour is by name, so a model keeps it when its numbers move.
  const one = usagePalette(['b', 'a'])
  const two = usagePalette(['a', 'b'])
  assert.equal(one.get('a'), two.get('a'), 'the same model, the same colour')
  assert.equal(one.get('b'), two.get('b'))
  assert.equal(usagePalette(['zz', 'aa']).get('aa'), usagePalette(['aa']).get('aa'), 'a model that stays keeps its colour')
  assert.equal(new Set([...one.values()]).size, 2, 'two models never share a colour')

  // The palette is ours, and never the interactive accent.
  assert.equal(USAGE_PALETTE.length, 6)
  for (const colour of USAGE_PALETTE) {
    assert.match(colour, /^#[0-9a-f]{6}$/u, `${colour} is a literal colour`)
    assert.notEqual(colour.toLowerCase(), 'var(--dsw-alias-brand-primary)')
  }
  for (const entry of series) {
    assert.equal(entry.colour.includes('--dsw-alias-brand-primary'), false, 'data is never painted with the accent')
    assert.match(entry.colour, /^var\(--edh-usage-[a-z0-9]+\)$/u, `${entry.colour} is one of our palette variables`)
  }
  assert.equal(USAGE_NEUTRAL, '#787c84', 'the neutral Other is drawn in')

  // The stylesheet declares exactly those values, so a chip and a line cannot
  // drift from the palette array the tests pin.
  for (const [index, colour] of USAGE_PALETTE.entries()) {
    assert.ok(USAGE_CSS.includes(`--edh-usage-${index + 1}:${colour}`), `the stylesheet declares --edh-usage-${index + 1}`)
  }
  assert.ok(USAGE_CSS.includes(`--edh-usage-other:${USAGE_NEUTRAL}`), 'and the neutral with it')
  assert.equal(USAGE_CSS.includes('--dsw-alias-brand-primary:' + USAGE_PALETTE[0]), false)
}

// 40 — the chart's maths: a scale from the data, and a dot instead of a path of one.
{
  assert.deepEqual(usageScale(0), { max: 0, ticks: [0] }, 'no data means no invented maximum')
  assert.deepEqual(usageScale(undefined), { max: 0, ticks: [0] })
  const hundred = usageScale(100)
  assert.equal(hundred.max, 100)
  assert.deepEqual(hundred.ticks, [0, 25, 50, 75, 100], 'a round step that covers the tallest point')
  assert.equal(usageScale(97).max, 100, 'the axis is rounded up, not truncated to the data')
  assert.ok(usageScale(97).max >= 97)
  assert.equal(usageScale(4).ticks[0], 0, 'every axis starts at zero')
  for (const sample of [1, 7, 99, 1000, 123_456, 120_200_000]) {
    const scale = usageScale(sample)
    assert.ok(scale.max >= sample, `${sample} fits under ${scale.max}`)
    assert.deepEqual(scale.ticks, [...scale.ticks].sort((a, b) => a - b), 'ticks are ordered')
    for (const tick of scale.ticks) assert.equal(Number.isFinite(tick), true)
  }

  const none = usageGeometry(0)
  assert.deepEqual(none.xs, [], 'no days, no x positions')
  const one = usageGeometry(1)
  assert.equal(one.xs.length, 1)
  assert.equal(one.xs[0], (one.x0 + one.x1) / 2, 'a single day sits in the middle')
  const many = usageGeometry(4)
  assert.equal(many.xs.length, 4)
  assert.equal(many.xs[0], many.x0)
  assert.equal(many.xs[3], many.x1)
  assert.deepEqual(many.xs, [...many.xs].sort((a, b) => a - b), 'days run left to right')

  // One point: a dot, never a degenerate path.
  const singlePoint = usagePoints([5], one, usageScale(5))
  assert.equal(singlePoint.length, 1, 'one day is one point')
  assert.equal(usagePath(singlePoint), '', 'a single point is not a path')
  assert.deepEqual(usageDot(singlePoint), singlePoint[0], 'it is drawn as a dot')
  assert.equal(usageDot([]), undefined)
  assert.equal(usageDot([{ x: 1, y: 2 }, { x: 3, y: 4 }]), undefined, 'two points are a line')

  // Many points: straight segments, one per gap.
  const points = usagePoints([0, 5, 2.5, 5], many, usageScale(5))
  const path = usagePath(points)
  assert.equal((path.match(/L/gu) ?? []).length, 3, 'three segments for four days')
  assert.ok(path.startsWith('M'), 'a path starts at the first day')
  assert.equal(path.includes('C'), false, 'no curve ever invents a value between days')
  for (const point of points) {
    assert.equal(Number.isFinite(point.x), true)
    assert.equal(Number.isFinite(point.y), true)
  }
  assert.equal(points[0].y, many.y1, 'zero sits on the baseline')
  assert.ok(points[1].y < points[0].y, 'a bigger number is higher on the screen')
  assert.equal(points[1].y > many.y0, true, 'the axis is rounded up, so data never touches the frame')
  const topOfAxis = usagePoints([usageScale(5).max], one, usageScale(5))[0]
  assert.equal(topOfAxis.y, one.y0, 'the axis maximum is the top of the plot')
  for (const point of points) {
    assert.ok(point.y >= many.y0 && point.y <= many.y1, 'every point stays inside the plot')
  }

  // An all-zero day: everything on the baseline, and no arithmetic that divides by zero.
  const zeros = usagePoints([0, 0, 0], usageGeometry(3), usageScale(0))
  assert.equal(zeros.every(point => point.y === usageGeometry(3).y1), true, 'every zero is the baseline')
  assert.equal(usagePath(zeros).includes('NaN'), false, 'no NaN coordinates')
  assert.equal(usagePath(zeros).includes('Infinity'), false)
}

// 41 — the donut: proportional slices of the same totals the list prints.
{
  const series = usageSeries(usageBuckets(usageScope(sampleUsageView(), 'all'), 'daily'))
  const circumference = 2 * Math.PI * USAGE_DONUT.radius
  const slices = donutSlices(series)
  assert.equal(slices.length, 3)
  assert.ok(Math.abs(slices.reduce((sum, slice) => sum + slice.length, 0) - circumference) < 1e-6, 'the slices close the ring')
  assert.ok(Math.abs(slices[0].share - 200 / 260) < 1e-9)
  assert.equal(slices[0].offset, -0, 'the first slice starts at the top')
  assert.ok(Math.abs(slices[1].offset + slices[0].length) < 1e-9, 'each slice starts where the last ended')

  const single = donutSlices([{ model: 'only', total: 10, colour: 'var(--edh-usage-1)', other: false }])
  assert.equal(single.length, 1)
  assert.ok(Math.abs(single[0].length - circumference) < 1e-9, 'one model is a full ring')
  assert.equal(single[0].share, 1)

  assert.deepEqual(donutSlices([]), [], 'no series, no ring')
  assert.deepEqual(donutSlices([{ model: 'x', total: 0, colour: 'var(--edh-usage-1)' }]), [])
  assert.equal(slices[2].other, false)
  const folded = donutSlices(usageSeries(usageBuckets({
    byDay: [{ date: '2026-01-01', byModel: { a: 6, b: 5, c: 4, d: 3, e: 2, f: 1 } }],
  }, 'daily')))
  assert.equal(folded[folded.length - 1].other, true, 'the folded remainder is one neutral slice')
  assert.equal(folded[folded.length - 1].colour, 'var(--edh-usage-other)')
}


// 42 — the page: figures, two charts, a legend that filters, and filters that say
// what they mean.
{
  const stub = stubPageFactory()
  const t = dictionaryOf('en')
  const units = usageUnits('en', t)
  const calls = []
  const actions = {
    retry: () => calls.push('retry'),
    refresh: action => calls.push(`refresh:${action}`),
    scope: value => calls.push(`scope:${value}`),
    range: value => calls.push(`range:${value}`),
    toggle: model => calls.push(`toggle:${model}`),
  }
  const base = {
    enabled: true,
    view: { status: 'ready', data: sampleUsageView(), failure: '' },
    scope: 'all',
    range: 'daily',
    hidden: {},
    busy: '',
    notice: { text: '', tone: 'bad' },
    units,
    actions,
  }
  const page = (overrides = {}) => stub.usagePage(t, { ...base, ...overrides })
  const ready = page()
  const text = treeText(ready)

  assert.deepEqual(treeByType(ready, 'h2').map(node => node.props.children[0]), ['Usage'], 'one heading')
  assert.ok(hasText(ready, 'Europe/London'), 'the intro names the zone the days are bucketed in')

  // The stat row: five figures over their labels, hairlines between.
  const stats = treeByType(ready, 'div').find(node => node.props.className === 'edh-usage-stats')
  const cells = treeByType(stats, 'div').filter(node => node !== stats).map(cell => {
    const spans = treeByType(cell, 'span')
    const byClass = name => spans.find(span => span.props.className === name)
    return {
      figure: byClass('edh-usage-statFigure').props.children[0],
      label: byClass('edh-usage-statLabel').props.children[0],
      note: byClass('edh-usage-statNote') === undefined
        ? ''
        : byClass('edh-usage-statNote').props.children[0],
    }
  })
  assert.equal(cells.length, 5, 'five figures')
  assert.deepEqual(cells.map(cell => cell.label), [
    'Total tokens',
    'Peak day',
    'Longest session',
    'Current streak',
    'Longest streak',
  ])
  assert.equal(cells[0].figure, '120.2M', 'the total in the reader\'s units')
  assert.equal(cells[0].note, '412 messages in 17 sessions')
  assert.equal(cells[1].figure, '150', 'the peak day is its own total')
  assert.equal(cells[1].note, '2026-03-09')
  assert.equal(cells[2].figure, '2h 14m', 'the longest session is a length')
  assert.equal(cells[2].note, 'Refactor the parser')
  assert.equal(cells[3].figure, '3 days')
  assert.equal(cells[4].figure, '11 days')

  // The trend chart: an accessible name that names the range and the models.
  const chart = treeByType(ready, 'svg').find(node => node.props.className === 'edh-usage-chart')
  assert.ok(chart, 'the trend is hand-built SVG')
  assert.equal(chart.props.role, 'img', 'and it has a role')
  assert.match(chart.props['aria-label'], /Daily token trend/u)
  assert.match(chart.props['aria-label'], /2026-03-09 to 2026-03-16/u, 'the label carries the range')
  assert.match(chart.props['aria-label'], /3 models/u)
  assert.equal(chart.props.viewBox, `0 0 ${USAGE_CHART.width} ${USAGE_CHART.height}`)
  assert.equal(treeByType(chart, 'path').length, 3, 'one line per drawn model')
  for (const path of treeByType(chart, 'path')) {
    assert.equal(path.props.fill, 'none', 'lines, not areas')
    assert.match(path.props.stroke, /^var\(--edh-usage-\d\)$/u, 'a line is painted from the palette')
    assert.equal(path.props.d.includes('C'), false, 'no smoothing')
  }

  // The legend: buttons, pressed while their series is drawn.
  const legend = treeByType(ready, 'div').find(node => node.props.className === 'edh-usage-legend')
  const legendButtons = treeByType(legend, 'button')
  assert.deepEqual(legendButtons.map(button => button.props.children[1].props.children[0]), [
    'deepseek-v4',
    'claude-sonnet',
    'gpt-small',
  ])
  assert.deepEqual(legendButtons.map(button => button.props['aria-pressed']), [true, true, true], 'all drawn to begin with')
  legendButtons[0].props.onClick()
  assert.deepEqual(calls, ['toggle:deepseek-v4'])
  calls.length = 0

  const filtered = page({ hidden: { 'deepseek-v4': true } })
  const filteredChart = treeByType(filtered, 'svg').find(node => node.props.className === 'edh-usage-chart')
  assert.equal(treeByType(filteredChart, 'path').length, 2, 'hiding a legend entry hides its line')
  assert.deepEqual(
    treeByType(treeByType(filtered, 'div').find(node => node.props.className === 'edh-usage-legend'), 'button')
      .map(button => button.props['aria-pressed']),
    [false, true, true],
    'and its button says so',
  )

  // The donut: the total in the middle, and a list that is real text.
  const donut = treeByType(ready, 'svg').find(node => node.props.className === 'edh-usage-donut')
  assert.ok(donut, 'the share is SVG too')
  assert.equal(donut.props.role, 'img')
  assert.match(donut.props['aria-label'], /deepseek-v4, claude-sonnet, gpt-small/u)
  assert.match(donut.props['aria-label'], /120\.2M tokens/u)
  const circleText = treeByType(donut, 'text').map(node => node.props.children[0])
  assert.deepEqual(circleText, ['120.2M', 'tokens'], 'the figure in the middle, with its unit')
  const slices = treeByType(donut, 'circle').filter(node => typeof node.props.stroke === 'string')
  assert.equal(slices.length, 3, 'one arc per model')

  const list = treeByType(ready, 'ul').find(node => node.props.className === 'edh-usage-models')
  const rows = treeByType(list, 'li')
  assert.equal(rows.length, 3, 'one row per model')
  assert.deepEqual(rows.map(row => treeByType(row, 'span')
    .find(span => span.props.className === 'edh-usage-modelShare').props.children[0]), ['76.9%', '19.2%', '3.8%'])
  assert.ok(treeText(rows[0]).includes('deepseek-v4'))
  assert.ok(treeText(rows[0]).includes('200 tokens'), 'the count sits beneath the name')

  // The filters: two groups, pressed states, and a sentence per range meaning.
  const groups = treeByType(ready, 'div').filter(node => node.props.className === 'edh-usage-group')
  assert.equal(groups.length, 2, 'scope and range')
  assert.deepEqual(treeByType(groups[0], 'button').map(button => button.props['aria-pressed']), [true, false])
  assert.deepEqual(treeByType(groups[1], 'button').map(button => button.props['aria-pressed']), [true, false, false])
  assert.equal(treeByType(groups[0], 'button')[1].props.disabled, true, 'no split in this answer, so the option cannot lie')
  assert.ok(hasText(ready, 'The Host counts every session together'))
  assert.ok(hasText(ready, 'Daily buckets by calendar day. Weekly sums each week from Monday. Cumulative adds every day up to that point.'))

  treeByType(groups[1], 'button')[2].props.onClick()
  assert.deepEqual(calls, ['range:cumulative'])
  calls.length = 0
  treeByType(groups[0], 'button')[0].props.onClick()
  assert.deepEqual(calls, ['scope:all'])
  calls.length = 0

  // A split, when the Host sends one, makes the option live and narrows the page.
  const splitView = { ...sampleUsageView() }
  splitView.scopes = {
    main: {
      totals: { input: 10, output: 10, total: 20, messages: 2, sessions: 1 },
      byModel: [{ model: 'deepseek-v4', total: 20 }],
      byDay: [{ date: '2026-03-09', byModel: { 'deepseek-v4': 20 }, total: 20 }],
    },
  }
  assert.equal(usageScope(splitView, 'all').supported, true)
  assert.equal(usageScope(splitView, 'main').totals.total, 20, 'main sessions only really narrows')
  assert.equal(usageScope(splitView, 'main').selected, 'main')
  assert.equal(usageScope(sampleUsageView(), 'main').selected, 'all', 'without a split, choosing main stays on every session')
  const mainPage = page({ view: { status: 'ready', data: splitView, failure: '' }, scope: 'main' })
  const mainGroups = treeByType(mainPage, 'div').filter(node => node.props.className === 'edh-usage-group')
  assert.equal(treeByType(mainGroups[0], 'button')[1].props.disabled, false, 'a split makes the option live')
  assert.deepEqual(treeByType(mainGroups[0], 'button').map(button => button.props['aria-pressed']), [false, true])
  assert.equal(hasText(mainPage, 'The Host counts every session together'), false, 'and the caveat goes away')

  // The quiet footer: history being read, or when the numbers were last updated.
  assert.ok(text.includes('Reading history… 42 of 200'), 'backfill progress while history is being read')
  const fresh = page({
    view: {
      status: 'ready',
      data: { ...sampleUsageView(), backfill: { state: 'done', sessionsDone: 200, sessionsTotal: 200 } },
      failure: '',
    },
  })
  assert.match(treeText(fresh).find(line => line.startsWith('Updated ')) ?? '', /^Updated /u)
  assert.equal(treeText(fresh).some(line => line.startsWith('Reading history…')), false, 'a finished read says when, not how far')

  // The notes: the Host's caveats, in its own words, as quiet lines.
  assert.ok(hasText(ready, 'Title generation and search calls are not counted.'))
  assert.ok(hasText(ready, 'Usage for subagents is attributed to the day it was spent.'))
  assert.equal(treeByType(ready, 'p').filter(node => node.props.className === 'edh-usage-note').length, 2)

  // Refresh is one control with one name.
  const refresh = treeByType(ready, 'button').find(button => button.props.children.includes('Refresh'))
  assert.ok(refresh)
  refresh.props.onClick()
  assert.deepEqual(calls, ['refresh:refresh'])
  calls.length = 0
  const busy = page({ busy: 'refresh' })
  assert.ok(treeText(busy).includes('Refreshing…'))
  assert.equal(
    treeByType(busy, 'button').find(button => button.props.children.includes('Refresh')).props.disabled,
    true,
    'the button keeps its name while it works',
  )

  // The hidden text alternative carries the same numbers the lines do.
  const table = treeByType(ready, 'table').find(node => node.props.className === 'edh-usage-sr')
  assert.ok(table, 'the chart has a text alternative')
  const header = treeByType(table, 'th').map(node => node.props.children[0])
  assert.deepEqual(header, ['Daily token trend', 'deepseek-v4', 'claude-sonnet', 'gpt-small', '2026-03-09', '2026-03-10', '2026-03-16'], 'every row and column is named')
  const bodyRows = treeByType(treeByType(table, 'tbody')[0], 'tr')
  assert.equal(bodyRows.length, 3, 'one row per day')
  assert.deepEqual(treeByType(bodyRows[0], 'td').map(cell => cell.props.children[0]), ['100', '50', '0'], 'the same numbers, formatted the same way')
  assert.deepEqual(treeByType(bodyRows[2], 'td').map(cell => cell.props.children[0]), ['40', '0', '10'])
}

// 43 — every state: no chart without data, no control without a service.
{
  const stub = stubPageFactory()
  const t = dictionaryOf('en')
  const units = usageUnits('en', t)
  const actions = { retry() {}, refresh() {}, scope() {}, range() {}, toggle() {} }
  const base = {
    enabled: true,
    view: { status: 'ready', data: sampleUsageView(), failure: '' },
    scope: 'all',
    range: 'daily',
    hidden: {},
    busy: '',
    notice: { text: '', tone: 'bad' },
    units,
    actions,
  }
  const page = overrides => stub.usagePage(t, { ...base, ...overrides })

  const loading = page({ view: { status: 'loading', data: undefined, failure: '' } })
  assert.deepEqual(treeText(loading), ['Usage', 'Token usage across every session.', 'Reading usage…'])
  assert.equal(treeByType(loading, 'svg').length, 0)
  assert.equal(treeByType(loading, 'button').length, 0)

  const failed = page({ view: { status: 'error', data: undefined, failure: 'api/edh.usage answered 500' } })
  assert.ok(treeText(failed).includes('The usage data could not be read.'))
  assert.ok(treeText(failed).includes('api/edh.usage answered 500'))
  assert.deepEqual(treeButtons(failed), ['Retry'])

  const unavailable = page({ view: { status: 'unavailable', data: undefined, failure: '' } })
  assert.deepEqual(treeText(unavailable), [
    'Usage',
    'Token usage across every session.',
    'This profile has no usage services, so there is nothing to count here.',
  ])
  assert.equal(treeByType(unavailable, 'button').length, 0, 'no dead control')
  assert.equal(treeByType(unavailable, 'input').length, 0)
  assert.equal(treeByType(unavailable, 'svg').length, 0, 'and no chart in front of nothing')

  // The row switched off while the page is open.
  const off = page({ enabled: false })
  assert.deepEqual(treeText(off), [
    'Usage',
    'Token usage across every session, bucketed by day in Europe/London.',
    'Usage is off. Turn it on with the EDH switch.',
  ], 'the frame, the intro, and the one sentence')

  // No usage yet: one sentence, no chart, and the one action that can help.
  const empty = page({
    view: {
      status: 'ready',
      data: {
        ...sampleUsageView(),
        totals: usageTotals({}),
        byModel: [],
        byDay: [],
        stats: { peakDay: {}, longestSession: {}, currentStreakDays: 0, longestStreakDays: 0 },
      },
      failure: '',
    },
  })
  assert.ok(treeText(empty).includes('No token usage has been recorded yet.'))
  assert.equal(treeByType(empty, 'svg').length, 0, 'no chart drawn with fake axes')
  assert.equal(treeByType(empty, 'table').length, 0)
  assert.deepEqual(treeButtons(empty), ['Read history again'], 'the one control that can fill it')

  // A Host that answers without a peak day or a longest session still gets a
  // readable row: the figure is an honest dash and the note says why.
  const bare = page({
    view: {
      status: 'ready',
      data: {
        ...sampleUsageView(),
        stats: { peakDay: {}, longestSession: {}, currentStreakDays: 0, longestStreakDays: 0 },
      },
      failure: '',
    },
  })
  const bareText = treeText(bare)
  assert.ok(bareText.includes('No peak day yet'))
  assert.ok(bareText.includes('No session recorded yet'))
  assert.deepEqual(bareText.filter(line => line === '—'), ['—', '—'], 'an absent figure is a dash, not a zero')

  // Days with no rows at all: the same rule, on the chart rather than the page.
  const noDays = page({
    view: {
      status: 'ready',
      data: { ...sampleUsageView(), byDay: [] },
      failure: '',
    },
  })
  assert.ok(treeText(noDays).includes('No usage in this range.'))
  assert.equal(treeByType(noDays, 'svg').length, 0, 'an empty range does not get an axis either')
}

/**
 * A document-shaped fake: just the elements the mobile layer reads and writes,
 * with the attribute bookkeeping the real DOM gives them.
 */
function fakeDocument(options = {}) {
  const head = {
    children: [],
    appendChild(node) {
      node.parentNode = head
      head.children.push(node)
      return node
    },
    removeChild(node) {
      const at = head.children.indexOf(node)
      if (at >= 0) head.children.splice(at, 1)
      node.parentNode = null
      return node
    },
  }
  const make = tag => {
    const element = {
      tagName: String(tag).toUpperCase(),
      attributes: new Map(),
      parentNode: null,
      textContent: '',
      setAttribute(name, value) {
        element.attributes.set(String(name), String(value))
      },
      getAttribute(name) {
        return element.attributes.has(String(name)) ? element.attributes.get(String(name)) : null
      },
      hasAttribute(name) {
        return element.attributes.has(String(name))
      },
      removeAttribute(name) {
        element.attributes.delete(String(name))
      },
    }
    return element
  }
  const add = (tag, attributes) => {
    const element = make(tag)
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value)
    head.appendChild(element)
    return element
  }
  if (options.viewport !== false) {
    add('meta', { name: 'viewport', content: options.viewport ?? 'width=device-width, initial-scale=1' })
  }
  if (options.manifest !== false) add('link', { rel: 'manifest', href: options.manifestHref ?? './manifest.webmanifest' })
  for (const icon of options.icons ?? []) add('link', { rel: 'icon', type: icon.type, href: icon.href })

  const matches = (element, selector) => {
    const parsed = /^([a-z]+)\[([a-z-]+)([~]?)=?"?([^"\]]*)"?\]$/u.exec(selector)
    if (parsed === null) return false
    const tag = parsed[1]
    const attribute = parsed[2]
    const operator = parsed[3]
    const value = parsed[4]
    if (element.tagName !== tag.toUpperCase()) return false
    const actual = element.getAttribute(attribute)
    if (actual === null) return false
    return operator === '~' ? actual.split(/\s+/u).includes(value) : actual === value
  }
  return {
    baseURI: options.baseURI ?? 'http://127.0.0.1:49944/',
    head,
    createElement: make,
    querySelector: selector => head.children.find(element => matches(element, selector)) ?? null,
    querySelectorAll: selector => head.children.filter(element => matches(element, selector)),
    /** The injected style, or nothing. */
    style: () => head.children.find(element => element.tagName === 'STYLE') ?? null,
    /** Every meta name currently in the head. */
    metaNames: () => head.children
      .filter(element => element.tagName === 'META')
      .map(element => element.getAttribute('name')),
  }
}

/** The eight data masks, written out here so the decoder does not borrow them. */
function qrTestMask(index, row, col) {
  switch (index) {
    case 0: return (row + col) % 2 === 0
    case 1: return row % 2 === 0
    case 2: return col % 3 === 0
    case 3: return (row + col) % 3 === 0
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0
    default: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0
  }
}

/** One 15-bit format copy, read MSB first from a finished symbol. */
function qrTestFormat(model, copy) {
  const size = model.size
  const bits = []
  if (copy === 1) {
    for (let at = 0; at <= 5; at++) bits.push(model.modules[8][at])
    bits.push(model.modules[8][7], model.modules[8][8], model.modules[7][8])
    for (let at = 9; at <= 14; at++) bits.push(model.modules[14 - at][8])
  } else {
    for (let at = 0; at <= 6; at++) bits.push(model.modules[size - 1 - at][8])
    for (let at = 7; at <= 14; at++) bits.push(model.modules[8][size - 15 + at])
  }
  return bits.reduce((value, bit) => (value << 1) | bit, 0)
}

/** The function-module map, rebuilt from the standard rather than from the encoder. */
function qrTestReserved(version) {
  const size = version * 4 + 17
  const reserved = Array.from({ length: size }, () => new Array(size).fill(false))
  const mark = (row, col) => {
    if (row >= 0 && col >= 0 && row < size && col < size) reserved[row][col] = true
  }
  for (const [top, left] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let row = -1; row <= 7; row++) for (let col = -1; col <= 7; col++) mark(top + row, left + col)
  }
  for (let at = 8; at < size - 8; at++) {
    mark(6, at)
    mark(at, 6)
  }
  const centres = REMOTE_QR_ALIGNMENT[version - 1]
  for (const row of centres) {
    for (const col of centres) {
      const corner = (row <= 8 && col <= 8) || (row <= 8 && col >= size - 9) || (row >= size - 9 && col <= 8)
      if (corner) continue
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) mark(row + dr, col + dc)
    }
  }
  mark(size - 8, 8)
  for (let at = 0; at <= 8; at++) {
    mark(8, at)
    mark(at, 8)
  }
  for (let at = 0; at < 8; at++) {
    mark(8, size - 1 - at)
    mark(size - 1 - at, 8)
  }
  if (version >= 7) {
    for (let at = 0; at < 18; at++) {
      mark(Math.floor(at / 3), size - 11 + (at % 3))
      mark(size - 11 + (at % 3), Math.floor(at / 3))
    }
  }
  return reserved
}

/** A field product, done by hand so it owes nothing to the encoder's log tables. */
function qrTestMultiply(left, right) {
  let product = 0
  let a = left
  let b = right
  while (b > 0) {
    if ((b & 1) === 1) product ^= a
    a <<= 1
    if ((a & 0x100) !== 0) a ^= 0x11d
    b >>= 1
  }
  return product
}

/** Evaluate a codeword polynomial at one field element, Horner style. */
function qrTestEvaluate(polynomial, at) {
  let value = 0
  for (const byte of polynomial) value = qrTestMultiply(value, at) ^ byte
  return value
}

/**
 * Read a finished symbol back the way a scanner does: format info, mask,
 * codewords, blocks, then the payload. Nothing here trusts an intermediate
 * result from the encoder — the mask predicates and the field arithmetic are
 * written out independently, and every block must satisfy its Reed-Solomon
 * syndromes before the text is read.
 */
function qrTestDecode(model) {
  const size = model.size
  const copyOne = qrTestFormat(model, 1)
  const copyTwo = qrTestFormat(model, 2)
  // The 15-bit format is five data bits (level, then mask) and ten BCH bits.
  const data5 = (copyOne ^ 0x5412) >> 10
  const level = (data5 >> 3) & 3
  const mask = data5 & 7
  const reserved = qrTestReserved(model.version)
  const bits = []
  let upward = true
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right = 5
    for (let step = 0; step < size; step++) {
      const row = upward ? size - 1 - step : step
      for (let offset = 0; offset < 2; offset++) {
        const col = right - offset
        if (reserved[row][col]) continue
        bits.push(model.modules[row][col] ^ (qrTestMask(mask, row, col) ? 1 : 0))
      }
    }
    upward = !upward
  }
  const codewords = []
  for (let at = 0; at + 8 <= bits.length; at += 8) {
    let byte = 0
    for (let bit = 0; bit < 8; bit++) byte = (byte << 1) | bits[at + bit]
    codewords.push(byte)
  }
  const spec = REMOTE_QR_VERSIONS[model.version - 1]
  const sizes = []
  for (const [count, blockSize] of spec.blocks) for (let index = 0; index < count; index++) sizes.push(blockSize)
  const blocks = sizes.map(blockSize => ({ data: new Array(blockSize), ec: new Array(spec.ec) }))
  let cursor = 0
  const longest = Math.max(...sizes)
  for (let at = 0; at < longest; at++) {
    for (let block = 0; block < blocks.length; block++) {
      if (at >= sizes[block]) continue
      blocks[block].data[at] = codewords[cursor++]
    }
  }
  for (let at = 0; at < spec.ec; at++) {
    for (const block of blocks) block.ec[at] = codewords[cursor++]
  }
  const syndromes = []
  for (const block of blocks) {
    const full = [...block.data, ...block.ec]
    const parity = []
    for (let at = 0; at < spec.ec; at++) {
      let root = 1
      for (let step = 0; step < at; step++) root = qrTestMultiply(root, 2)
      parity.push(qrTestEvaluate(full, root))
    }
    syndromes.push(parity)
  }
  const data = blocks.flatMap(block => block.data)
  const stream = []
  for (const byte of data) for (let at = 7; at >= 0; at--) stream.push((byte >> at) & 1)
  const read = (at, length) => {
    let value = 0
    for (let index = 0; index < length; index++) value = (value << 1) | (stream[at + index] ?? 0)
    return value
  }
  const countBits = model.version <= 9 ? 8 : 16
  const mode = read(0, 4)
  const count = read(4, countBits)
  const bytes = []
  for (let at = 0; at < count; at++) bytes.push(read(4 + countBits + at * 8, 8))
  let text = ''
  for (const byte of bytes) text += String.fromCharCode(byte)
  return { copyOne, copyTwo, mask, level, codewords, bits, syndromes, mode, count, text }
}

// 44 — the mobile layer: every head change is reversible by construction.
{
  // The real head: a viewport, a manifest, and two same-origin SVG icons.
  const doc = fakeDocument({
    baseURI: 'http://127.0.0.1:49944/',
    icons: [
      { type: 'image/svg+xml', href: './favicon-dark.svg' },
      { type: 'image/svg+xml', href: './favicon.svg' },
    ],
  })
  const layer = createMobileLayer(doc)
  assert.ok(layer, 'a document with a head is enough to install into')
  assert.equal(layer.applied(), false)

  assert.equal(layer.apply(), true)
  assert.equal(layer.applied(), true)
  assert.equal(doc.querySelectorAll('meta[name="viewport"]').length, 1, 'one viewport, never a second')
  assert.equal(
    doc.querySelector('meta[name="viewport"]').getAttribute('content'),
    MOBILE_VIEWPORT,
    'the shell viewport is upgraded in place, not duplicated',
  )
  assert.ok(MOBILE_VIEWPORT.includes('viewport-fit=cover'))
  const names = doc.metaNames()
  for (const [name] of MOBILE_META) assert.ok(names.includes(name), 'the ' + name + ' meta is added')
  assert.equal(names.filter(name => name === 'theme-color').length, 2, 'one theme colour per scheme')
  assert.deepEqual(
    doc.querySelectorAll('meta[name="theme-color"]').map(meta => meta.getAttribute('media')),
    ['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)'],
  )
  assert.equal(doc.querySelectorAll('link[rel="manifest"]').length, 1, 'one manifest, upgraded')
  assert.equal(doc.querySelector('link[rel="manifest"]').getAttribute('href'), MOBILE_MANIFEST)
  assert.equal(MOBILE_MANIFEST, 'api/edh.mobile/manifest', 'document-relative, so it follows the origin')
  assert.equal(doc.style().getAttribute('id'), 'edh-mobile', 'the stylesheet is named as promised')
  assert.equal(doc.style().textContent, MOBILE_CSS)
  // The page ships SVG icons only, and iOS ignores an SVG apple-touch-icon.
  assert.equal(doc.querySelector('link[rel="apple-touch-icon"]'), null, 'no icon promise the platform drops')

  // Idempotent: a re-sync that fires twice changes nothing.
  const settled = doc.head.children.length
  assert.equal(layer.apply(), false, 'a second apply is a no-op')
  assert.equal(doc.head.children.length, settled)
  assert.equal(doc.metaNames().filter(name => name === 'theme-color').length, 2, 'never a duplicate')

  // Withdrawal restores the document, attribute for attribute.
  assert.equal(layer.withdraw(), true)
  assert.equal(layer.applied(), false)
  assert.equal(doc.head.children.length, 4, 'the head is exactly what it was')
  assert.equal(
    doc.querySelector('meta[name="viewport"]').getAttribute('content'),
    'width=device-width, initial-scale=1',
    'the original viewport content is back',
  )
  assert.equal(
    doc.querySelector('link[rel="manifest"]').getAttribute('href'),
    './manifest.webmanifest',
    'the shell manifest is back',
  )
  assert.equal(doc.style(), null)

  // A second cycle leaves nothing behind: creation is per instance, not global.
  assert.equal(layer.apply(), true)
  assert.equal(layer.withdraw(), true)
  assert.equal(doc.head.children.length, 4)
  assert.deepEqual(doc.metaNames(), ['viewport'], 'no meta survived either cycle')

  // A page with no viewport at all gets one, and gives it back on disposal.
  const bare = fakeDocument({ viewport: false, manifest: false })
  const bareLayer = createMobileLayer(bare)
  bareLayer.apply()
  assert.equal(bare.querySelectorAll('meta[name="viewport"]').length, 1, 'a viewport is created when missing')
  assert.equal(bare.querySelector('link[rel="manifest"]').getAttribute('id'), 'edh-mobile-manifest')
  bareLayer.withdraw()
  assert.equal(bare.head.children.length, 0, 'and removed again')

  // A real raster icon is reused, absolute and same-origin; a cross-origin one is not.
  const raster = fakeDocument({ icons: [{ type: 'image/png', href: '/apple.png' }] })
  createMobileLayer(raster).apply()
  assert.equal(
    raster.querySelector('link[rel="apple-touch-icon"]').getAttribute('href'),
    'http://127.0.0.1:49944/apple.png',
    'the page\'s own icon, resolved against its origin',
  )
  const foreign = fakeDocument({ icons: [{ type: 'image/png', href: 'https://cdn.example.com/apple.png' }] })
  createMobileLayer(foreign).apply()
  assert.equal(foreign.querySelector('link[rel="apple-touch-icon"]'), null, 'a cross-origin icon is not offered')

  // No document, no layer: the install is a no-op rather than a crash.
  assert.equal(createMobileLayer(undefined), undefined)
  assert.equal(createMobileLayer({}), undefined)
  const inert = installMobileLayer(
    { effect: () => () => {} },
    { getSnapshot: () => undefined, subscribe: () => () => {} },
    undefined,
  )
  assert.equal(typeof inert, 'function', 'a document-less install still answers a disposer')
  assert.equal(inert(), undefined)
}

// 45 — the layer follows its row, and disposal puts the head back.
{
  const doc = fakeDocument()
  let rowOn = false
  const watchers = []
  const disposers = []
  const controller = {
    getSnapshot: () => ({ status: 'ready', moduleStates: { [MOBILE_MODULE]: rowOn } }),
    subscribe(listener) {
      watchers.push(listener)
      return () => {
        const at = watchers.indexOf(listener)
        if (at >= 0) watchers.splice(at, 1)
      }
    },
    setRow(next) {
      rowOn = next
      for (const watch of [...watchers]) watch()
    },
  }
  const ctx = {
    effect(fn, label) {
      assert.equal(label, 'edh: mobile layer', 'one effect owns the layer, under its own label')
      const dispose = fn()
      disposers.push(dispose)
      return dispose
    },
  }
  storage.length = 0
  const dispose = installMobileLayer(ctx, controller, doc)
  assert.equal(doc.style(), null, 'a row that is off at install touches nothing')
  assert.equal(watchers.length, 1, 'one subscription, owned by the effect')

  controller.setRow(true)
  assert.ok(doc.style(), 'turning the row on installs the layer')
  assert.equal(doc.querySelector('meta[name="viewport"]').getAttribute('content'), MOBILE_VIEWPORT)

  controller.setRow(false)
  assert.equal(doc.style(), null, 'turning it off withdraws the layer')
  assert.equal(doc.querySelector('meta[name="viewport"]').getAttribute('content'), 'width=device-width, initial-scale=1')

  controller.setRow(true)
  assert.ok(doc.style(), 'and it comes back when the row does')
  assert.equal(doc.querySelectorAll('meta[name="viewport"]').length, 1, 'still one viewport after a cycle')

  // Disposal is the third way out, and it too leaves nothing behind.
  disposers[0]()
  assert.equal(doc.style(), null)
  assert.equal(doc.head.children.length, 2)
  assert.equal(watchers.length, 0, 'the subscription is released')

  const phases = storage
    .filter(([key]) => key === MOBILE_DEBUG_KEY)
    .map(([, value]) => JSON.parse(value).phase)
  assert.deepEqual(phases, ['installed', 'withdrawn', 'installed', 'withdrawn'], 'each change is recorded')
  void dispose
}

// 46 — the stylesheet: phone-sized, two blocks, and no guessed class names.
{
  assert.ok(MOBILE_QUERY.startsWith('(max-width:'), 'a phone window is the whole condition')
  assert.equal(MOBILE_CSS.startsWith('@media ' + MOBILE_QUERY + '{'), true, 'every rule sits inside the query')
  assert.equal((MOBILE_CSS.match(/@media/gu) ?? []).length, 1, 'one media query, two blocks')
  assert.equal(MOBILE_CSS.endsWith('}'), true, 'and it closes')
  // The safe block.
  assert.ok(MOBILE_CSS.includes('-webkit-text-size-adjust:100%'))
  assert.ok(MOBILE_CSS.includes('overscroll-behavior-y:contain'))
  assert.ok(MOBILE_CSS.includes('touch-action:manipulation'))
  assert.ok(MOBILE_CSS.includes('-webkit-tap-highlight-color'))
  assert.ok(MOBILE_CSS.includes('env(safe-area-inset-top)'), 'the notch')
  assert.ok(MOBILE_CSS.includes('height:100dvh'), 'a phone-height shell')
  assert.ok(MOBILE_CSS.includes('font-size:max(16px,1em)'), 'the rule that stops iOS zooming the page on focus')
  assert.match(MOBILE_CSS, /input,textarea,select\{font-size:max\(16px,1em\)\}/u, 'applied to the fields that zoom')
  // The layout block.
  assert.ok(MOBILE_CSS.includes('min-height:44px'), 'thumb-sized targets')
  assert.ok(MOBILE_CSS.includes('-webkit-overflow-scrolling:touch'), 'momentum scrolling')
  assert.ok(MOBILE_CSS.includes('::-webkit-scrollbar'), 'scrollbars kept, slimmed')
  // Selectors: tags, an id, roles and attributes only.
  assert.equal(/[.#][A-Za-z0-9_-]*_[A-Za-z0-9]/u.test(MOBILE_CSS), false, 'no build-hashed class name is load-bearing')
  assert.equal(/\.[A-Za-z]/u.test(MOBILE_CSS), false, 'no class selector at all')
  assert.ok(MOBILE_CSS.includes('[role=button]'), 'roles are the stable hook')
  assert.ok(MOBILE_CSS.includes('#root'), 'and the one id the shell guarantees')
  assert.ok(MOBILE_CSS.length <= 1200, 'small enough to review in one screen (' + MOBILE_CSS.length + ' chars)')
}

// 47 — the QR: geometry, format information, and a full decode back to the text.
{
  // The drawing is built with React's createElement, so this block renders it.
  const stub = stubPageFactory()
  const text = 'http://192.168.1.20:8787'
  const model = remoteQrModel(text)
  assert.ok(model, 'a LAN address fits')
  assert.equal(model.version, 2, 'the smallest version that holds 24 bytes at level M')
  assert.equal(model.size, model.version * 4 + 17, 'module count follows the version')
  const again = remoteQrModel(text)
  assert.equal(again.mask, model.mask, 'the same input picks the same mask')
  assert.deepEqual(again.modules, model.modules, 'and the same symbol')

  // Finder patterns, three corners, with their light separators.
  for (const [top, left] of [[0, 0], [0, model.size - 7], [model.size - 7, 0]]) {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        const edge = row === 0 || row === 6 || col === 0 || col === 6
        const core = row >= 2 && row <= 4 && col >= 2 && col <= 4
        assert.equal(model.modules[top + row][left + col], edge || core ? 1 : 0, 'finder at ' + top + ',' + left)
      }
    }
  }
  for (let at = 0; at < 8; at++) {
    assert.equal(model.modules[7][at], 0, 'separator under the top-left finder')
    assert.equal(model.modules[at][7], 0, 'separator beside the top-left finder')
    assert.equal(model.modules[model.size - 8][at], 0, 'separator over the bottom-left finder')
    assert.equal(model.modules[7][model.size - 1 - at], 0, 'separator beside the top-right finder')
  }
  // Timing patterns alternate, starting dark on an even index.
  for (let at = 8; at < model.size - 8; at++) {
    assert.equal(model.modules[6][at], at % 2 === 0 ? 1 : 0, 'row timing at ' + at)
    assert.equal(model.modules[at][6], at % 2 === 0 ? 1 : 0, 'column timing at ' + at)
  }
  // The dark module, and both format copies agreeing with each other and the mask.
  assert.equal(model.modules[model.size - 8][8], 1, 'the dark module is where it must be')
  const decoded = qrTestDecode(model)
  assert.equal(decoded.copyOne, decoded.copyTwo, 'both format copies carry the same bits')
  assert.equal(decoded.copyOne, qrFormatBits(model.mask), 'and they are the format for the mask used')
  assert.equal(decoded.level, 0b00, 'error correction level M')
  assert.equal(decoded.mask, model.mask)
  assert.equal(decoded.mode, 0b0100, 'byte mode')
  assert.equal(decoded.count, text.length)
  assert.equal(decoded.text, text, 'the symbol decodes back to the address it was built from')

  // The codeword stream fills the symbol exactly: whole codewords, then the
  // version's remainder bits, which the standard pads with zeros.
  assert.equal(decoded.codewords.length, qrTotalCodewords(model.version), 'the block table and the geometry agree')
  const remainder = decoded.bits.length - decoded.codewords.length * 8
  assert.ok(remainder >= 0 && remainder < 8, 'at most seven remainder bits (' + remainder + ')')
  assert.deepEqual(
    decoded.bits.slice(decoded.codewords.length * 8),
    new Array(remainder).fill(0),
    'and they are zeros, not data',
  )
  for (const parity of decoded.syndromes) {
    assert.deepEqual(parity, parity.map(() => 0), 'every block is a valid Reed-Solomon codeword')
  }

  // Every supported version: full capacity decodes, one byte more moves up.
  for (let version = 1; version <= REMOTE_QR_VERSIONS.length; version++) {
    const countBits = version <= 9 ? 8 : 16
    const capacity = Math.floor((qrDataCodewords(version) * 8 - 4 - countBits) / 8)
    const payload = 'h'.repeat(capacity)
    const filled = remoteQrModel(payload)
    assert.equal(filled.version, version, 'a full-capacity payload picks this version')
    const round = qrTestDecode(filled)
    assert.equal(round.text, payload, 'and decodes at full capacity')
    assert.equal(round.codewords.length, qrTotalCodewords(version))
    assert.equal(qrVersionFor(capacity), version, 'capacity boundaries are exact at version ' + version)
  }
  assert.equal(remoteQrModel('h'.repeat(214)), undefined, 'past the largest supported version, no code is drawn')
  assert.equal(remoteQrModel(''), undefined)
  assert.equal(remoteQrModel(undefined), undefined)

  for (const sample of ['http://x:1', 'https://my-laptop.local:8443', 'http://[fe80::1]:8787']) {
    assert.equal(qrTestDecode(remoteQrModel(sample)).text, sample)
  }

  // Bytes beyond ASCII travel as UTF-8 and come back to the right count.
  const accented = 'http://cafe.example:8787/é'
  assert.equal(qrTestDecode(remoteQrModel(accented)).count, qrBytes(accented).length)

  // The drawing: quiet zone included, fixed colours, one path.
  const svg = stub.remoteQrSvg(model, 'label')
  assert.equal(svg.type, 'svg')
  assert.equal(svg.props.viewBox, '0 0 ' + (model.size + 8) + ' ' + (model.size + 8), 'four modules of quiet zone each side')
  assert.equal(svg.props.role, 'img')
  assert.equal(svg.props['aria-label'], 'label')
  assert.equal(svg.props.shapeRendering, 'crispEdges')
  const background = svg.props.children[0]
  const path = svg.props.children[1]
  assert.equal(background.type, 'rect')
  assert.equal(background.props.fill, '#ffffff', 'the quiet zone is white in every theme')
  assert.equal(path.props.fill, '#000000', 'modules are black in every theme')
  const dark = model.modules.flat().filter(value => value === 1).length
  assert.equal((path.props.d.match(/M/gu) ?? []).length, dark, 'one command per dark module')
  assert.equal(stub.remoteQrSvg(undefined, 'label'), null)
}

// 48 — the page: the code appears on request, and follows the address it belongs to.
{
  const stub = stubPageFactory()
  const t = dictionaryOf('en')
  const actions = { code() {}, copy() {}, retry() {}, refresh() {}, scope() {}, range() {}, toggle() {}, signOut() {} }
  const live = {
    status: 'ready',
    data: {
      available: true,
      enabled: true,
      listening: true,
      port: 8787,
      username: 'owner',
      hasPassword: true,
      addresses: ['192.168.1.20', '192.168.1.21'],
      warning: '',
      sessions: 1,
      failure: '',
    },
    failure: '',
  }
  const state = overrides => ({
    enabled: true,
    view: live,
    draft: stub.remoteDraft(live.data),
    fieldError: { field: '', text: '' },
    busy: '',
    saved: false,
    notice: { text: '', tone: 'bad' },
    copy: { address: '', copied: false },
    code: '',
    actions,
    ...overrides,
  })

  // Nothing but the address list and the two hints until the reader asks.
  const collapsed = stub.remotePage(t, state())
  assert.equal(treeByType(collapsed, 'svg').length, 0, 'no code is drawn until it is asked for')
  assert.ok(treeText(collapsed).includes('The phone must be on the same network as this computer.'))
  assert.equal(
    treeByType(collapsed, 'button').filter(button => button.props.children.includes('Show code')).length,
    1,
    'one control offers it',
  )
  assert.ok(treeText(collapsed).includes('Open one of these on your phone.'), 'the sentence still says what to do')

  // Asked for the first address: the symbol is that address, printed beneath.
  const first = remoteAddressLines(live.data)[0]
  const shown = stub.remotePage(t, state({ code: first }))
  const qr = treeByType(shown, 'svg').find(node => node.props.className === 'edh-remote-qr')
  assert.ok(qr, 'the code is inline SVG')
  assert.equal(qr.props['aria-label'], 'QR code for ' + first)
  assert.deepEqual(
    treeByType(qr, 'path').map(node => node.props.d),
    [stub.remoteQrSvg(remoteQrModel(first), 'x').props.children[1].props.d],
    'the drawing is the symbol for the address on screen',
  )
  assert.ok(treeText(shown).includes(first), 'the address is printed beneath it')
  assert.equal(
    treeByType(shown, 'button').filter(button => button.props.children.includes('Copy')).length,
    3,
    'the code carries its own Copy, beside the two addresses',
  )
  assert.equal(
    treeByType(shown, 'button').filter(button => button.props.children.includes('Hide code')).length,
    1,
    'and the control now offers to hide it',
  )

  // The address list changes under the code: it collapses rather than lying.
  const moved = stub.remotePage(t, state({
    code: first,
    view: { ...live, data: { ...live.data, addresses: ['192.168.1.99'] } },
  }))
  assert.equal(treeByType(moved, 'svg').length, 0, 'a code for an address no longer shown is not drawn')

  // An address too long for a supported symbol: the list stands alone, no control.
  const long = 'http://' + 'a'.repeat(300) + ':8787'
  const tooLong = stub.remotePage(t, state({ view: { ...live, data: { ...live.data, addresses: [long] } } }))
  assert.equal(treeByType(tooLong, 'svg').length, 0)
  assert.equal(
    treeByType(tooLong, 'button').filter(button => button.props.children.includes('Show code')).length,
    0,
    'no control that cannot produce a code',
  )
  assert.ok(treeText(tooLong).includes(long), 'the address itself is still there')
}

/**
 * An AudioContext-shaped fake: it records what was built and what was done to it,
 * so the lifecycle is assertable without a sound card.
 */
function fakeAudioContext() {
  const counters = { constructed: 0, resume: 0, close: 0, gain: 0, oscillator: 0, buffer: 0, starts: 0, stops: 0 }
  const context = {
    state: 'suspended',
    currentTime: 0,
    destination: { kind: 'destination' },
    resume() {
      counters.resume++
      context.state = 'running'
      return Promise.resolve()
    },
    close() {
      counters.close++
      context.state = 'closed'
      return Promise.resolve()
    },
    createGain() {
      counters.gain++
      return {
        gain: {
          value: 1,
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      }
    },
    createOscillator() {
      counters.oscillator++
      return {
        type: '',
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {
          counters.starts++
        },
        stop() {
          counters.stops++
        },
      }
    },
    createBufferSource() {
      counters.buffer++
      return {
        buffer: undefined,
        connect() {},
        start() {
          counters.starts++
        },
      }
    },
    decodeAudioData(bytes, done) {
      done({ decoded: true })
    },
  }
  return { context, counters }
}

/** A localStorage-shaped store, for the settings and the breadcrumbs. */
function fakeStore(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => {
      values.set(key, String(value))
    },
    removeItem: key => {
      values.delete(key)
    },
    values,
  }
}

// 49 — the settings: user data read back defensively, never half-valid.
{
  assert.deepEqual(notifyDefaults(), {
    enabled: true,
    backgroundOnly: true,
    sound: 'chime',
    volume: 60,
  }, 'the defaults are the brief\'s')

  assert.deepEqual(readNotifySettings(undefined), notifyDefaults(), 'no store, the defaults')
  assert.deepEqual(readNotifySettings(fakeStore({})), notifyDefaults(), 'no value, the defaults')
  assert.deepEqual(readNotifySettings(fakeStore({ [NOTIFY_SETTINGS_KEY]: 'not json' })), notifyDefaults(), 'junk JSON, the defaults')
  assert.deepEqual(readNotifySettings(fakeStore({ [NOTIFY_SETTINGS_KEY]: 'null' })), notifyDefaults())
  assert.deepEqual(readNotifySettings(fakeStore({ [NOTIFY_SETTINGS_KEY]: '"a string"' })), notifyDefaults())
  assert.deepEqual(
    readNotifySettings(fakeStore({ [NOTIFY_SETTINGS_KEY]: JSON.stringify({ enabled: 'yes', backgroundOnly: 1, sound: '  ', volume: 'loud' }) })),
    notifyDefaults(),
    'every field is checked, not just parsed',
  )
  assert.deepEqual(
    readNotifySettings(fakeStore({ [NOTIFY_SETTINGS_KEY]: JSON.stringify({ enabled: false, backgroundOnly: false, sound: ' blip ', volume: 41.6 }) })),
    { enabled: false, backgroundOnly: false, sound: 'blip', volume: 42 },
    'a valid store is read field by field, trimmed and rounded',
  )
  assert.deepEqual(
    readNotifySettings(fakeStore({ [NOTIFY_SETTINGS_KEY]: JSON.stringify({ sound: 'Windows Ding.wav' }) })),
    { ...notifyDefaults(), sound: 'Windows Ding.wav' },
    'a sound id is kept even when this page cannot resolve it yet',
  )

  // Volume: always a whole number in range.
  assert.equal(notifyClampVolume(0), 0)
  assert.equal(notifyClampVolume(60), 60)
  assert.equal(notifyClampVolume(100), 100)
  assert.equal(notifyClampVolume(140), 100, 'above 100 clamps')
  assert.equal(notifyClampVolume(-20), 0, 'below 0 clamps')
  assert.equal(notifyClampVolume(59.5), 60, 'rounded')
  assert.equal(notifyClampVolume('45'), 45)
  assert.equal(notifyClampVolume('nonsense'), 60)
  assert.equal(notifyClampVolume(undefined), 60)

  // Writing is best effort, and a refused store is not an error.
  const store = fakeStore()
  const wanted = { enabled: false, backgroundOnly: true, sound: 'two-tone', volume: 20 }
  assert.equal(writeNotifySettings(wanted, store), true)
  assert.deepEqual(readNotifySettings(store), wanted, 'what was written is what is read')
  assert.equal(writeNotifySettings(wanted, { setItem() { throw new Error('quota') } }), false, 'a refusal is answered, not thrown')
  assert.equal(writeNotifySettings(wanted, null), false, 'no store, nothing written')

  // The DOM id of a catalogue key is safe: the Host's ids carry spaces.
  assert.equal(notifyDomId('Windows Notify System Generic'), 'windows-notify-system-generic')
  assert.equal(notifyDomId('Windows Ding.wav'), 'windows-ding-wav')
  assert.equal(notifyDomId('  ...  '), '')
}

// 50 — the sound catalogue: transcriptions of the Host's list, and the tones first.
{
  const payload = {
    ok: true,
    available: true,
    sounds: [
      { id: 'Windows Notify System Generic', label: 'Windows Notify System Generic', file: 'Windows Notify System Generic.wav', bytes: 210_000, kind: 'system' },
      { id: 'chime', label: 'A tone that shadows ours' },
      { id: 'Windows Ding', label: 'Windows Ding', bytes: 90_000 },
      { id: '', label: 'no id' },
      { label: 'no id at all' },
    ],
  }
  const catalog = notifyCatalog(payload)
  assert.equal(catalog.available, true)
  assert.deepEqual(catalog.windows.map(entry => entry.id), ['Windows Notify System Generic', 'Windows Ding'], 'the Host curated the order, so it is kept as sent')
  assert.equal(catalog.windows[1].kind, 'system')
  assert.equal(catalog.windows[1].bytes, 90_000)
  assert.equal(catalog.windows.some(entry => entry.id === 'chime'), false, 'a Host id that shadows a tone is ignored')

  assert.equal(notifyCatalog({ ok: true, available: false, note: 'no media folder', sounds: [] }).available, false)
  assert.equal(notifyCatalog({ ok: true, available: true, sounds: [] }).available, false, 'available with nothing in it is not available')
  assert.equal(notifyCatalog({ available: true, note: 'hi', sounds: [{ id: 'x', label: 'X' }] }).note, 'hi')
  for (const empty of [undefined, null, 'nope', {}]) {
    assert.deepEqual(notifyCatalog(empty), { available: false, windows: [], note: '' }, 'nothing is nothing')
  }

  // Resolution: the stored id is the id that plays, and the catalogue is not a gate.
  const full = notifyCatalog(payload)
  assert.deepEqual(notifySoundFor({ ...notifyDefaults(), sound: 'two-tone' }), { id: 'two-tone', kind: 'tone' })
  assert.deepEqual(notifySoundFor({ ...notifyDefaults(), sound: 'Windows Ding' }), { id: 'Windows Ding', kind: 'system' })
  assert.deepEqual(
    notifySoundFor({ ...notifyDefaults(), sound: 'Windows Gone' }),
    { id: 'Windows Gone', kind: 'system' },
    'a stale id is attempted as stored, never rewritten into another sound',
  )
  assert.deepEqual(
    notifySoundFor({ ...notifyDefaults(), sound: 'Windows Ding' }),
    { id: 'Windows Ding', kind: 'system' },
    'and a catalogue is not needed to know what to play',
  )
  // Junk settings still resolve to a playable id, from the defaults.
  assert.deepEqual(notifySoundFor(undefined), { id: 'chime', kind: 'tone' })
  assert.deepEqual(notifySoundFor({ sound: '   ' }), { id: 'chime', kind: 'tone' })
  void full

  // The tones are ours, and they are the three the page offers, first.
  assert.deepEqual(NOTIFY_TONES.map(tone => tone.id), ['chime', 'two-tone', 'blip'])
  for (const tone of NOTIFY_TONES) {
    assert.ok(tone.voices.length >= 1, `${tone.id} has a voice`)
    for (const voice of tone.voices) {
      assert.ok(voice.gain > 0 && voice.gain <= 0.25, `${tone.id} peaks conservatively (${voice.gain})`)
      assert.ok(voice.duration > 0 && voice.duration <= 1.5, `${tone.id} is short`)
      assert.ok(voice.start >= 0)
    }
  }
}

// 51 — the transition detector: one finished turn, once.
{
  let state = { running: {}, fired: {} }

  /** Feed one status event, the way the Remote listener does. */
  const feed = (sessionId, running) => {
    const outcome = notifyTransition(state, sessionId, running)
    state = outcome.state
    return outcome.fire
  }

  assert.equal(feed('s1', true), false, 'running is not a finish')
  assert.equal(feed('s1', false), true, 'the first idle after running is one finished turn')
  assert.equal(feed('s1', false), false, 'the same finish reported again stays silent')
  assert.equal(feed('s1', false), false)

  assert.equal(feed('s1', true), false, 'a second turn starts silently')
  assert.equal(feed('s1', false), true, 'and finishes loudly')

  assert.equal(feed('s2', false), false, 'an idle session that was never seen running is not a turn')

  // Interleaved sessions do not confuse each other.
  assert.equal(feed('a', true), false)
  assert.equal(feed('b', true), false)
  assert.equal(feed('b', false), true)
  assert.equal(feed('a', false), true)
  assert.equal(feed('a', true), false)

  // The state survives a junk input rather than throwing.
  const junk = notifyTransition(undefined, 'x', true)
  assert.equal(junk.fire, false)
  assert.equal(junk.state.running.x, true)

  // The switches.
  assert.equal(notifyAllows(notifyDefaults(), true), true, 'hidden, and that is what was asked for')
  assert.equal(notifyAllows(notifyDefaults(), false), false, 'visible, so stay quiet by default')
  assert.equal(notifyAllows({ ...notifyDefaults(), backgroundOnly: false }, false), true, 'unless the switch says otherwise')
  assert.equal(notifyAllows({ ...notifyDefaults(), enabled: false }, true), false, 'the master switch wins')
  assert.equal(notifyAllows(undefined, true), true, 'junk settings read as the defaults')
}

// 52 — the popup: absent is a silent skip, never an error.
{
  const none = createNotifyPopup({})
  assert.equal(none.available, false, 'this is the phone over plain http')
  assert.equal(none.permission(), '')
  assert.equal(await none.request(), '')
  assert.equal(none.show({ title: 'title', body: 'body' }), false, 'no popup is claimed where there is no API')

  const shown = []
  const granted = createNotifyPopup({
    Notification: Object.assign(function FakeNotification(title, options) {
      shown.push({ title, options })
    }, {
      permission: 'granted',
      requestPermission: async () => 'granted',
    }),
  })
  assert.equal(granted.available, true)
  assert.equal(granted.permission(), 'granted')
  assert.equal(granted.show({ title: 'Turn finished', body: 'ready' }), true)
  assert.deepEqual(shown, [{ title: 'Turn finished', options: { body: 'ready', silent: true } }], 'the popup is asked for silently')
  assert.equal(shown[0].options.silent, true, 'silent: true, so the OS adds no second sound')

  const denied = createNotifyPopup({
    Notification: Object.assign(function FakeNotification() {
      throw new Error('should not be constructed')
    }, { permission: 'denied' }),
  })
  assert.equal(denied.show({ title: 'x', body: 'y' }), false, 'a denied permission is not asked again and shows nothing')

  const thrown = createNotifyPopup({
    Notification: Object.assign(function FakeNotification() {
      throw new Error('blocked')
    }, { permission: 'granted' }),
  })
  assert.equal(thrown.show({ title: 'x', body: 'y' }), false, 'a refusing constructor is caught')

  const asks = createNotifyPopup({
    Notification: Object.assign(function FakeNotification() {}, {
      permission: 'default',
      requestPermission: async () => 'granted',
    }),
  })
  assert.equal(await asks.request(), 'granted', 'the gesture-time request answers')
}

// 53 — one AudioContext: created on first use, resumed when suspended, closed on dispose.
{
  const fake = fakeAudioContext()
  const constructions = []
  class TrackedContext {
    constructor() {
      constructions.push(this)
      Object.assign(this, fake.context)
      this.state = 'suspended'
      const counters = fake.counters
      this.resume = () => {
        counters.resume++
        this.state = 'running'
        return Promise.resolve()
      }
      this.close = () => {
        counters.close++
        this.state = 'closed'
        return Promise.resolve()
      }
      this.createGain = fake.context.createGain
      this.createOscillator = fake.context.createOscillator
      this.decodeAudioData = fake.context.decodeAudioData
    }
  }
  const audio = createNotifyAudio({ AudioContext: TrackedContext })
  assert.equal(audio.created(), false, 'nothing is created at load: autoplay would refuse it')
  assert.equal(constructions.length, 0)

  const chime = NOTIFY_TONES.find(tone => tone.id === 'chime')
  assert.equal(audio.playTone(chime, 60), true, 'the first gesture creates the context')
  assert.equal(constructions.length, 1)
  assert.equal(fake.counters.resume, 1, 'and resumes it, because it started suspended')
  assert.equal(audio.state(), 'running')
  assert.equal(fake.counters.oscillator, 2, 'the chime is a fundamental and an octave')
  assert.equal(fake.counters.gain, 3, 'one master and one envelope per voice')
  assert.equal(fake.counters.starts, 2)

  assert.equal(audio.playTone(NOTIFY_TONES[2], 30), true, 'the next play reuses the same context')
  assert.equal(constructions.length, 1, 'one context, forever')
  assert.equal(fake.counters.oscillator, 3, 'the blip is one note')

  // A browser that suspends it behind our back is resumed on the next play.
  constructions[0].state = 'suspended'
  audio.playTone(chime, 60)
  assert.equal(fake.counters.resume, 2, 'resumed again')

  audio.close()
  assert.equal(fake.counters.close, 1)
  assert.equal(audio.created(), false, 'closed and forgotten')
  assert.equal(audio.state(), '')

  // No Web Audio at all is a quiet failure, not a throw.
  const absent = createNotifyAudio({ AudioContext: undefined })
  assert.equal(absent.playTone(chime, 60), false)
  assert.equal(absent.created(), false)
}

// 54 — the page: every row, the tones first, Windows only when available, and the line.
{
  const stub = stubPageFactory()
  const t = dictionaryOf('en')
  const calls = []
  const actions = {
    toggle: (field, value) => calls.push(`toggle:${field}:${value}`),
    sound: id => calls.push(`sound:${id}`),
    volume: value => calls.push(`volume:${value}`),
    preview: id => calls.push(`preview:${id}`),
    test: () => calls.push('test'),
  }
  const base = {
    enabled: true,
    settings: notifyDefaults(),
    catalog: { available: false, windows: [], note: '' },
    status: 'ready',
    notice: { text: '', tone: 'bad' },
    busy: '',
    actions,
  }
  const page = (overrides = {}) => stub.notifyPage(t, { ...base, ...overrides })
  const ready = page()
  const text = treeText(ready)

  assert.deepEqual(treeByType(ready, 'h2').map(node => node.props.children[0]), ['Notifications'])
  // Every labelled row is present.
  for (const label of ['Notify me', 'Only when this window is in the background', 'Sound', 'Volume', 'Test']) {
    assert.ok(text.includes(label), `the page has the ${label} row`)
  }
  assert.ok(text.includes('A sound when a turn finishes while you are looking somewhere else.'))
  // The switches are real buttons with a switch role.
  const switches = treeByType(ready, 'button').filter(button => button.props.role === 'switch')
  assert.equal(switches.length, 2)
  assert.deepEqual(switches.map(button => button.props['aria-checked']), [true, true], 'both default on')
  switches[0].props.onClick()
  assert.deepEqual(calls, ['toggle:enabled:false'])
  calls.length = 0

  // The three tones, in order, each with a radio and a Play.
  const radios = treeByType(ready, 'input').filter(input => input.props.type === 'radio')
  assert.deepEqual(radios.map(input => input.props.value), ['chime', 'two-tone', 'blip'], 'the tones come first')
  assert.equal(radios[0].props.checked, true, 'the default tone is chosen')
  assert.equal(radios[0].props.name, 'edh-notify-sound', 'one radio group')
  assert.equal(treeByType(ready, 'ul').find(list => list.props.role === 'radiogroup').props['aria-label'], 'Sound')
  const plays = treeByType(ready, 'button').filter(button => button.props.children.includes('Play'))
  assert.equal(plays.length, 3, 'one Play per tone')
  plays[1].props.onClick()
  assert.deepEqual(calls, ['preview:two-tone'])
  calls.length = 0

  // No Windows folder: the tones, one line, and no Windows heading.
  assert.equal(text.includes('Windows'), false, 'no heading without a catalogue')
  assert.ok(text.includes('The Windows sounds are not on this machine.'))

  // With a catalogue: a Windows heading and its rows, after the tones.
  const withWindows = page({
    catalog: notifyCatalog({
      available: true,
      sounds: [
        { id: 'Windows Ding', label: 'Windows Ding', bytes: 1000 },
        { id: 'Windows Notify System Generic', label: 'Windows Notify System Generic', bytes: 2000 },
      ],
    }),
  })
  const windowsRadios = treeByType(withWindows, 'input').filter(input => input.props.type === 'radio')
  assert.deepEqual(
    windowsRadios.map(input => input.props.value),
    ['chime', 'two-tone', 'blip', 'Windows Ding', 'Windows Notify System Generic'],
    'tones first, then the Windows list',
  )
  assert.ok(treeText(withWindows).includes('Windows'), 'the quiet heading is there')
  assert.equal(
    windowsRadios[3].props.id,
    'edh-notify-sound-windows-ding',
    'the radio id is a safe id even though the Host id has a space',
  )
  assert.equal(
    treeByType(withWindows, 'label').find(label => label.props.htmlFor === 'edh-notify-sound-windows-ding')
      .props.children[0].props.children[0],
    'Windows Ding',
    'and its label points at it',
  )

  // Volume: a range with the value beside it.
  const range = treeByType(ready, 'input').find(input => input.props.type === 'range')
  assert.equal(range.props.min, 0)
  assert.equal(range.props.max, 100)
  assert.equal(range.props.value, 60)
  assert.equal(range.props.id, 'edh-notify-volume')
  assert.ok(text.includes('60%'), 'the value is written out')
  range.props.onChange({ target: { value: '35' } })
  assert.deepEqual(calls, ['volume:35'])
  calls.length = 0

  // Test: one button with one name.
  const test = treeByType(ready, 'button').find(button => button.props.children.includes('Test'))
  assert.ok(test)
  test.props.onClick()
  assert.deepEqual(calls, ['test'])
  calls.length = 0
  assert.ok(page({ busy: 'test' }).props.children !== undefined)
  assert.equal(
    treeByType(page({ busy: 'test' }), 'button').find(button => button.props.children.includes('Test')).props.disabled,
    true,
    'the button keeps its name while it works',
  )

  // The plain-HTTP line is always there, in its own words.
  assert.ok(text.some(line => line.includes('plain http') && line.includes('popup')))
  assert.ok(
    hasText(ready, 'Popups need a secure (https) page'),
    'the honest limitation is stated',
  )

  // The row switched off: one line, no controls.
  const off = page({ enabled: false })
  assert.equal(treeByType(off, 'button').length, 0)
  assert.deepEqual(treeText(off), [
    'Notifications',
    'A sound when a turn finishes while you are looking somewhere else.',
    'Notifications are off. Turn them on with the EDH switch.',
  ])
}

// 55 — the watcher: one Remote listener, gated by the row, silent when it should be.
{
  const handlers = new Map()
  const watchers = []
  const disposers = []
  let rowOn = true
  const controller = {
    getSnapshot: () => ({ status: 'ready', moduleStates: { [NOTIFY_MODULE]: rowOn } }),
    subscribe(listener) {
      watchers.push(listener)
      return () => {
        const at = watchers.indexOf(listener)
        if (at >= 0) watchers.splice(at, 1)
      }
    },
    setRow(next) {
      rowOn = next
      for (const watch of [...watchers]) watch()
    },
  }
  const ctx = {
    effect(fn, label) {
      assert.equal(label, 'edh: notify watcher', 'one effect owns the watcher')
      const dispose = fn()
      disposers.push(dispose)
      return dispose
    },
    remote: {
      $on(event, handler) {
        handlers.set(event, handler)
        return () => handlers.delete(event)
      },
    },
  }
  const plays = []
  const audio = {
    playTone: (tone, volume) => {
      plays.push(`${tone.id}@${volume}`)
      return true
    },
    playSound: async id => {
      plays.push(id)
      return true
    },
    close: () => {
      plays.push('closed')
    },
  }
  const store = fakeStore({ [NOTIFY_SETTINGS_KEY]: JSON.stringify({ enabled: true, backgroundOnly: true, sound: 'blip', volume: 30 }) })
  let visible = false
  const install = overrides => installNotifier(ctx, controller, {
    audio,
    storage: store,
    scope: {},
    hidden: () => !visible,
    ...overrides,
  })

  storage.length = 0
  const notifier = install()
  assert.equal(typeof notifier, 'object')
  assert.ok(handlers.has('api-session/status'), 'the harness\'s own status feed is the seam')
  assert.equal(watchers.length, 1)

  const status = () => handlers.get('api-session/status')

  // Hidden, enabled, background-only: the finished turn plays the chosen sound.
  status()('s1', true)
  status()('s1', false)
  assert.deepEqual(plays, ['blip@30'], 'the stored sound at the stored volume')
  status()('s1', false)
  assert.deepEqual(plays, ['blip@30'], 'the same finish does not play twice')

  // Visible + background-only stays silent, and says why.
  storage.length = 0
  visible = true
  status()('s1', true)
  status()('s1', false)
  assert.deepEqual(plays, ['blip@30'], 'no sound while the reader is looking at it')
  const blocked = storage
    .filter(([key]) => key === NOTIFY_DEBUG_KEY)
    .map(([, value]) => JSON.parse(value))
  assert.equal(blocked.at(-1).phase, 'blocked')
  assert.equal(blocked.at(-1).reason, 'visible')

  // Allowed while visible when the switch says so: a second watcher, with its
  // own store, proves the master/background pair is what decides.
  const visibleStore = fakeStore({ [NOTIFY_SETTINGS_KEY]: JSON.stringify({ enabled: true, backgroundOnly: false, sound: 'chime', volume: 50 }) })
  const visibleWatcher = install({ storage: visibleStore })
  const visibleStatus = () => handlers.get('api-session/status')
  visible = true
  visibleStatus()('s9', true)
  visibleStatus()('s9', false)
  assert.deepEqual(plays, ['blip@30', 'chime@50'], 'the switch says it may play while visible')
  assert.equal(typeof visibleWatcher, 'object')

  // The row is the switch: off unsubscribes, on subscribes again.
  controller.setRow(false)
  assert.equal(handlers.has('api-session/status'), false, 'a row that is off listens to nothing')
  controller.setRow(true)
  assert.ok(handlers.has('api-session/status'), 'and turning it back on restores the listener')

  // Disposal closes the audio and drops the listener — for every watcher.
  while (disposers.length > 0) disposers.pop()()
  assert.equal(handlers.has('api-session/status'), false)
  assert.equal(plays.at(-1), 'closed', 'the AudioContext is closed on disposal')
  assert.equal(watchers.length, 0, 'nothing left subscribed')
  void visibleStore
  void visibleWatcher
  void notifier

  // The settings the page saves are the settings the engine fires with, because
  // the two share one notifier: a change made here is what the next turn plays.
  const probe = []
  const engine = createNotifier({
    audio: {
      playTone: (tone, volume) => {
        probe.push(tone.id + '@' + volume)
        return true
      },
      playSound: async () => true,
      close() {},
    },
    popup: createNotifyPopup({}),
    settings: notifyDefaults(),
    log: () => {},
  })
  engine.setSettings({ ...notifyDefaults(), sound: 'two-tone', volume: 25 })
  await engine.fire({ sessionId: 's7', title: '', body: '' })
  assert.deepEqual(probe, ['two-tone@25'], 'a change on the page is what the next finished turn plays')
}

/**
 * A notifier over a counting audio stub: every call that could make a noise is
 * counted, so "one notification is one sound" is an assertion and not a hope.
 */
function countingNotifier(options = {}) {
  const counts = { tone: 0, system: 0 }
  const audio = {
    playTone: (tone, volume) => {
      counts.tone++
      return options.toneOk !== false
    },
    playSound: async () => {
      counts.system++
      return options.systemOk !== false
    },
    close() {},
  }
  const popup = options.popup ?? createNotifyPopup({})
  const notifier = createNotifier({
    audio,
    popup,
    settings: options.settings ?? notifyDefaults(),
    log: () => {},
  })
  if (options.catalog !== undefined) notifier.setCatalog(options.catalog)
  return {
    notifier,
    counts,
    /** Every call that asks the platform for sound: a Web Audio tone or a WAV. */
    plays: () => counts.tone + counts.system,
  }
}

/** A Notification-shaped constructor that records how it was called. */
function recordingNotification(permission, behaviour) {
  const shown = []
  const api = function FakeNotification(title, options) {
    if (behaviour === 'throw') throw new Error('blocked by policy')
    shown.push({ title, options })
    const instance = shown.at(-1)
    instance.close = () => { instance.closed = (instance.closed ?? 0) + 1 }
    return instance
  }
  api.permission = permission
  api.requestPermission = async () => permission
  api.shown = shown
  return api
}

// 56 — one notification is one sound: every path that could make audio is counted.
{
  const windowsCatalog = notifyCatalog({
    available: true,
    sounds: [{ id: 'Windows Notify System Generic', label: 'System notification', bytes: 210_000 }],
  })

  // 1. A tone, with the popup permitted: our tone, and a silent popup.
  {
    const api = recordingNotification('granted')
    const harness = countingNotifier({ popup: createNotifyPopup({ Notification: api }) })
    await harness.notifier.fire({ sessionId: 's1', title: 'Turn finished', body: 'ready' })
    assert.equal(harness.plays(), 1, 'a tone chosen: exactly one play')
    assert.equal(harness.counts.tone, 1)
    assert.equal(harness.counts.system, 0)
    assert.equal(api.shown.length, 1, 'the visual is still shown')
    assert.equal(api.shown[0].options.silent, true, 'and the OS is asked for no sound')
  }

  // 2. A Windows sound, with the popup permitted: the WAV, and a silent popup.
  {
    const api = recordingNotification('granted')
    const harness = countingNotifier({
      popup: createNotifyPopup({ Notification: api }),
      catalog: windowsCatalog,
      settings: { ...notifyDefaults(), sound: 'Windows Notify System Generic' },
    })
    await harness.notifier.fire({ sessionId: 's2', title: 'Turn finished', body: 'ready' })
    assert.equal(harness.plays(), 1, 'a Windows sound chosen: exactly one play')
    assert.equal(harness.counts.system, 1)
    assert.equal(harness.counts.tone, 0, 'the WAV path never adds a tone')
    assert.equal(api.shown[0].options.silent, true)
  }

  // 3. Popup permission denied: the sound alone, and nothing constructed.
  {
    const api = recordingNotification('denied')
    const harness = countingNotifier({ popup: createNotifyPopup({ Notification: api }) })
    await harness.notifier.fire({ sessionId: 's3', title: 'Turn finished', body: 'ready' })
    assert.equal(harness.plays(), 1, 'denied permission: still exactly one play')
    assert.equal(api.shown.length, 0, 'no popup attempted')
  }

  // 4. The popup constructor throws: the sound already played, and nothing retries.
  {
    const api = recordingNotification('granted', 'throw')
    const harness = countingNotifier({ popup: createNotifyPopup({ Notification: api }) })
    await harness.notifier.fire({ sessionId: 's4', title: 'Turn finished', body: 'ready' })
    assert.equal(harness.plays(), 1, 'a throwing popup: still exactly one play')
  }

  // 5. No Notification at all (the phone over plain HTTP): sound only, no error.
  {
    const harness = countingNotifier({ popup: createNotifyPopup({}) })
    await harness.notifier.fire({ sessionId: 's5', title: 'Turn finished', body: 'ready' })
    assert.equal(harness.plays(), 1, 'no popup API: still exactly one play')
  }

  // 6. A decode/play failure stays quiet — it never adds a fallback tone.
  {
    const api = recordingNotification('granted')
    const harness = countingNotifier({
      popup: createNotifyPopup({ Notification: api }),
      catalog: windowsCatalog,
      settings: { ...notifyDefaults(), sound: 'Windows Notify System Generic' },
      systemOk: false,
    })
    const outcome = await harness.notifier.fire({ sessionId: 's6', title: '', body: '' })
    assert.equal(harness.counts.system, 1, 'the one attempt was made')
    assert.equal(harness.counts.tone, 0, 'and the failure added no second sound')
    assert.equal(harness.plays(), 1)
    assert.equal(outcome.played, false, 'the failure is reported, not hidden')
  }

  // 7. The page's Test: one sound, and a silent popup, through the same helper.
  {
    const api = recordingNotification('granted')
    const harness = countingNotifier({ popup: createNotifyPopup({ Notification: api }) })
    const outcome = await runNotifyTest({
      notifier: harness.notifier,
      settings: notifyDefaults(),
      catalog: windowsCatalog,
      title: 'Turn finished',
      body: 'ready',
      requestPermission: async () => api.requestPermission(),
    })
    assert.equal(harness.plays(), 1, 'Test: exactly one play')
    assert.equal(outcome.played, true)
    assert.equal(outcome.popup, true)
    assert.equal(api.shown.length, 1, 'Test shows one popup')
    assert.equal(api.shown[0].options.silent, true, 'and asks it to be silent')

    const denied = recordingNotification('denied')
    const deniedHarness = countingNotifier({ popup: createNotifyPopup({ Notification: denied }) })
    const deniedOutcome = await runNotifyTest({
      notifier: deniedHarness.notifier,
      settings: notifyDefaults(),
      catalog: windowsCatalog,
      requestPermission: async () => denied.requestPermission(),
    })
    assert.equal(deniedHarness.plays(), 1, 'Test with denied permission: exactly one play')
    assert.equal(deniedOutcome.popup, false)
    assert.equal(deniedOutcome.permission, 'denied')
  }

  // 8. Measured where the audio really is: one master gain per play, so a
  //    two-voice tone is one sound rather than two.
  {
    const fake = fakeAudioContext()
    const audio = createNotifyAudio({ AudioContext: class { constructor() { Object.assign(this, fake.context) } } })
    const chime = NOTIFY_TONES.find(tone => tone.id === 'chime')
    audio.playTone(chime, 60)
    assert.equal(fake.counters.gain, chime.voices.length + 1, 'one master gain, plus an envelope per voice')
    assert.equal(fake.counters.starts, chime.voices.length, 'both voices of the one tone started')
  }

  // 9. And the watcher fires the engine exactly once per transition.
  {
    const harness = countingNotifier({ popup: createNotifyPopup({}) })
    const handlers = new Map()
    const ctx = {
      effect: fn => {
        fn()
        return () => {}
      },
      remote: {
        $on(event, handler) {
          handlers.set(event, handler)
          return () => handlers.delete(event)
        },
      },
    }
    const controller = {
      getSnapshot: () => ({ status: 'ready', moduleStates: { [NOTIFY_MODULE]: true } }),
      subscribe: () => () => {},
    }
    installNotifier(ctx, controller, {
      audio: harness.notifier.audio,
      popup: createNotifyPopup({}),
      storage: fakeStore({ [NOTIFY_SETTINGS_KEY]: JSON.stringify(notifyDefaults()) }),
      scope: {},
      hidden: () => true,
    })
    const status = handlers.get('api-session/status')
    status('s-turn', true)
    status('s-turn', false)
    status('s-turn', false)
    assert.equal(harness.counts.tone, 1, 'one finished turn, one play, even when the finish repeats')
  }
}

// 57 — what the notification says, and what clicking it does.
{
  const t = dictionaryOf('en')

  // --- the title: the session's own name, or one honest sentence ------------
  assert.equal(notifyTitleText('', t), 'Session finished', 'no title is not an invented title')
  assert.equal(notifyTitleText('   ', t), 'Session finished')
  assert.equal(notifyTitleText(undefined, t), 'Session finished')
  assert.equal(notifyTitleText('  Refactor the parser  ', t), 'Refactor the parser', 'trimmed')
  assert.equal(notifyTitleText('Fix\r\nthe\tparser', t), 'Fix the parser', 'newlines and tabs collapse')
  const longTitle = 'Refactor the streaming parser and its tests before the release'
  const cutTitle = notifyTitleText(longTitle, t)
  assert.ok(cutTitle.length <= NOTIFY_TITLE_MAX + 1, `a long title is cut with an ellipsis (${cutTitle.length})`)
  assert.ok(cutTitle.endsWith('…'), 'with a real ellipsis')
  assert.equal(longTitle.startsWith(cutTitle.slice(0, -1).trim()), true, 'and it is a prefix, not a paraphrase')
  assert.equal(cutTitle.includes('  '), false, 'never a double space at the cut')

  // --- the body: the turn's first line, or the plain sentence ---------------
  assert.equal(notifyBodyText('', t), 'The turn finished. Open it to read the result.', 'no text, the honest sentence')
  assert.equal(notifyBodyText(undefined, t), 'The turn finished. Open it to read the result.')
  assert.equal(notifyBodyText('  ', t), 'The turn finished. Open it to read the result.')
  assert.equal(
    notifyBodyText('Done. I fixed the parser and\n\nleft the tests alone.', t),
    'Done. I fixed the parser and left the tests alone.',
    'the first line, collapsed: no newlines reach the popup',
  )
  const longBody = 'I rewrote the streaming parser so that a torn zstd frame is reported instead of guessed at, and added a matrix of shapes to the suite.'.repeat(2)
  const cutBody = notifyBodyText(longBody, t)
  assert.ok(cutBody.length <= NOTIFY_BODY_MAX + 1, `a long body is cut (${cutBody.length})`)
  assert.ok(cutBody.endsWith('…'))
  assert.equal(cutBody.includes('  '), false, 'and it is one clean line')

  // Code points, not UTF-16 units: a surrogate pair is never split.
  const emoji = notifyClampText('😀'.repeat(80), 10)
  assert.equal([...emoji].length, 11, 'ten code points and the ellipsis')
  assert.equal([...notifyClampText('字'.repeat(80), 6)].length, 7, 'and the same for CJK')
  assert.equal(notifyClampText('', 20), '')
  assert.equal(notifyClampText(undefined, 20), '')
  assert.equal(notifyClampText('short', 20), 'short', 'nothing is cut when it fits')
  assert.equal(notifyClampText('a b c d e f', 4), 'a b…', 'it cuts at the last space inside the limit')
  assert.equal(notifyClampText('abcdefgh', 4), 'abcd…', 'and hard-cuts when there is no space to cut at')

  // --- the title source: the list projection the sidebar shows ---------------
  const rows = { list: { getSnapshot: () => ({ byId: { s1: { title: '  Refactor the parser ' }, s2: { title: '' } } }) } }
  assert.equal(notifySessionTitle(rows, 's1'), 'Refactor the parser')
  assert.equal(notifySessionTitle(rows, 's2'), '')
  assert.equal(notifySessionTitle(rows, 'missing'), '')
  assert.equal(notifySessionTitle(undefined, 's1'), '', 'no sessions service means no title')
  assert.equal(
    notifySessionTitle({ list: { getSnapshot() { throw new Error('refused') } } }, 's1'),
    '',
    'a refusing projection is not a crash',
  )

  // --- the body read: capped, never able to delay or suppress the sound -----
  {
    const sentence = 'The turn finished. Open it to read the result.'
    assert.deepEqual(
      await runNotifyText({ t }),
      { body: sentence, title: '' },
      'no reader, the sentence',
    )
    assert.deepEqual(await runNotifyText({ t, read: () => 'Fixed the parser.' }), { body: 'Fixed the parser.', title: '' })
    assert.equal(
      (await runNotifyText({ t, read: () => { throw new Error('read failed') } })).body,
      sentence,
      'a failed read is the sentence, not an error',
    )
    assert.equal(
      (await runNotifyText({ t, read: () => 42 })).body,
      sentence,
      'a reader that answers a non-string is not content',
    )
    // A reader may answer the Host's shape, and its title comes back with it.
    assert.deepEqual(
      await runNotifyText({ t, read: () => ({ text: 'I fixed the parser.', title: '  Refactor the parser  ' }) }),
      { body: 'I fixed the parser.', title: 'Refactor the parser' },
      'the reader carries a title alongside the text',
    )
    assert.equal(
      (await runNotifyText({ t, read: () => ({ text: '', title: 'Refactor' }) })).body,
      sentence,
      'a title without text is still no body',
    )
    const started = Date.now()
    const slow = await runNotifyText({ t, timeoutMs: 5, read: () => new Promise(() => {}) })
    assert.equal(slow.body, sentence, 'a hung read times out')
    assert.equal(slow.title, '')
    assert.ok(Date.now() - started < 1000, 'and the cap is the ceiling, not the read')
  }

  // --- the click: one open, one close, no throw -----------------------------
  {
    const writes = []
    const opened = []
    const log = payload => writes.push(payload)
    const okay = notifyOpenSession({
      sessionId: 's1',
      open: id => opened.push(id),
      focus: () => opened.push('focus'),
      log,
    })
    assert.deepEqual(okay, { opened: true, sessionId: 's1', focused: true, raising: false }, 'no raise was supplied, so none was started')
    assert.deepEqual(opened, ['focus', 's1'], 'the window is focused, then the conversation opens')
    assert.deepEqual(writes.at(-1), { phase: 'opened', turn: 's1', focused: true, raising: false })

    // A missing id navigates nowhere, and says so.
    opened.length = 0
    const absent = notifyOpenSession({ sessionId: '', open: id => opened.push(id), focus: () => opened.push('focus'), log })
    assert.equal(absent.opened, false)
    assert.equal(absent.reason, 'no-session')
    assert.deepEqual(opened, [], 'no focus, no navigation')
    assert.equal(writes.at(-1).phase, 'blocked')

    // No workspace: a failure breadcrumb, no throw, no fallback navigation.
    const nowhere = notifyOpenSession({ sessionId: 's2', focus: () => {}, log })
    assert.equal(nowhere.opened, false)
    assert.equal(nowhere.reason, 'no-workspace')
    assert.equal(writes.at(-1).phase, 'failed')
    assert.equal(writes.at(-1).reason, 'no-workspace')

    // A throwing opener is caught.
    const threw = notifyOpenSession({
      sessionId: 's3',
      open: () => {
        throw new Error('no such session')
      },
      focus: () => {},
      log,
    })
    assert.equal(threw.opened, false)
    assert.equal(threw.reason, 'threw')
    assert.equal(writes.at(-1).reason, 'no such session')

    // A refusing promise is caught too, and never becomes an unhandled rejection.
    const rejecting = notifyOpenSession({
      sessionId: 's4',
      open: () => Promise.reject(new Error('gone')),
      focus: () => {},
      log,
    })
    assert.equal(rejecting.opened, true, 'the call was made')
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(writes.at(-1).reason, 'gone')

    // A window that refuses to focus is not an error.
    const deaf = notifyOpenSession({
      sessionId: 's5',
      open: () => {},
      focus: () => {
        throw new Error('denied')
      },
      log,
    })
    assert.equal(deaf.opened, true)
    assert.equal(deaf.focused, false)
  }

  // --- the popup wires the click: once, and it closes itself ---------------
  {
    const instances = []
    const api = function FakeNotification(title, options) {
      instances.push({ title, options, closed: 0, onclick: null, onclose: null })
      const instance = instances.at(-1)
      instance.close = () => {
        instance.closed++
      }
      return instance
    }
    api.permission = 'granted'
    api.requestPermission = async () => 'granted'
    const popup = createNotifyPopup({ Notification: api })
    let clicks = 0
    let closes = 0
    assert.equal(popup.show({ title: 'Refactor', body: 'Fixed.', onClick: () => { clicks++ }, onClose: () => { closes++ } }), true)
    assert.equal(instances.length, 1)
    assert.equal(instances[0].options.silent, true, 'still silent')
    instances[0].onclick()
    instances[0].onclick()
    assert.equal(clicks, 1, 'a double click opens once')
    assert.equal(instances[0].closed, 1, 'and the popup closes itself')
    instances[0].onclose()
    assert.equal(closes, 1, 'the close handler ran')
    assert.equal(instances[0].onclick, null, 'no listener is left behind')

    // A second popup replaces the first rather than stacking.
    popup.show({ title: 'Two', body: 'second' })
    assert.equal(instances[0].closed, 1, 'the previous one was closed')
    popup.show({ title: 'Three', body: 'third' })
    assert.equal(instances.length, 3)
    assert.equal(instances[1].closed, 1, 'and the one before that')
  }

  // --- and one finished turn is still one sound, text or no text ----------
  {
    const api = recordingNotification('granted')
    const harness = countingNotifier({ popup: createNotifyPopup({ Notification: api }) })
    harness.notifier.setSettings(notifyDefaults())
    // A reader that never answers must not change the play count or the body.
    const slowRead = () => new Promise(() => {})
    const notifier = createNotifier({
      audio: harness.notifier.audio,
      popup: createNotifyPopup({ Notification: api }),
      settings: notifyDefaults(),
      log: () => {},
      t,
      readText: slowRead,
      textTimeoutMs: 5,
      openSession: () => {},
      focus: () => {},
    })
    const plays = harness.plays
    await notifier.fire({ sessionId: 's9', title: 'Refactor the parser' })
    assert.equal(plays(), 1, 'a slow read still plays exactly once')
    assert.equal(api.shown.length, 1, 'and still shows the popup')
    assert.equal(api.shown[0].options.body, 'The turn finished. Open it to read the result.', 'with the fallback sentence')
    assert.equal(api.shown[0].title, 'Refactor the parser', 'and the session title')

    // With a reader that answers, the line is the turn's own text.
    const fast = createNotifier({
      audio: harness.notifier.audio,
      popup: createNotifyPopup({ Notification: api }),
      settings: notifyDefaults(),
      log: () => {},
      t,
      readText: () => 'I fixed the parser and left the tests alone.',
      openSession: () => {},
      focus: () => {},
    })
    await fast.fire({ sessionId: 's9', title: 'Refactor the parser' })
    assert.equal(api.shown.at(-1).options.body, 'I fixed the parser and left the tests alone.')
    assert.equal(plays(), 2, 'one play per fire, still')
  }
}

// 58 — the Host reader: one bounded read, and every way it can fail.
{
  const t = dictionaryOf('en')
  const sentence = 'The turn finished. Open it to read the result.'
  const written = []
  const log = payload => written.push(payload)

  /** A fetch-shaped fake whose answer is scripted per case. */
  const answerWith = (body, options = {}) => async (url, init) => {
    written.push({ url, init })
    if (options.reject === true) throw new Error('network down')
    return {
      ok: options.ok !== false,
      status: options.status ?? 200,
      json: options.jsonThrows === true
        ? async () => {
          throw new Error('not JSON')
        }
        : async () => body,
    }
  }

  // The happy answer: text and title, from the route the Host serves.
  {
    const seen = []
    const read = await readNotifyLast('s 1/2', {
      fetch: async (url, init) => {
        seen.push({ url, init })
        return { ok: true, status: 200, json: async () => ({ ok: true, sessionId: 's 1/2', text: 'I fixed the parser and left the tests alone.', title: ' Refactor the parser ', truncated: true }) }
      },
      log,
    })
    assert.deepEqual(read, { text: 'I fixed the parser and left the tests alone.', title: 'Refactor the parser' })
    assert.equal(seen[0].url, 'api/edh.notify/last?sessionId=s%201%2F2', 'the id is encoded into the route, document-relative')
    assert.equal(seen[0].init.headers.accept, 'application/json')
  }

  // Every failure answers empty rather than throwing.
  const failures = [
    ['a refusal body', answerWith({ ok: false, reason: 'no-session', message: 'gone' }), 'no-session'],
    ['an HTTP error', answerWith({}, { ok: false, status: 500 }), '500'],
    ['a body that is not JSON', answerWith(undefined, { jsonThrows: true }), 'not JSON'],
    ['a rejected fetch', answerWith(undefined, { reject: true }), 'network down'],
    ['an answer that is not an object', answerWith('nope'), 'refused'],
    ['no text in the answer', answerWith({ ok: true, text: '' }), undefined],
  ]
  for (const [label, request, reason] of failures) {
    written.length = 0
    const read = await readNotifyLast('s1', { fetch: request, log })
    assert.deepEqual(read, { text: '', title: '' }, `${label} answers empty`)
    if (reason !== undefined) {
      assert.equal(written.at(-1).phase, 'failed', `${label} is recorded`)
      assert.equal(written.at(-1).reason, reason, `${label} records the Host's own reason`)
    }
  }

  // No id, or no fetch, is a quiet empty answer and no request at all.
  {
    let calls = 0
    const counted = async () => {
      calls++
      return { ok: true, status: 200, json: async () => ({ ok: true, text: 'x' }) }
    }
    assert.deepEqual(await readNotifyLast('', { fetch: counted }), { text: '', title: '' })
    assert.equal(calls, 0, 'no id, no request')
    assert.deepEqual(await readNotifyLast('s1', { fetch: undefined }), { text: '', title: '' })
    assert.deepEqual(await readNotifyLast(undefined, { fetch: counting2() }), { text: '', title: '' })
    function counting2() {
      return async () => {
        calls++
        return { ok: true, status: 200, json: async () => ({ ok: true, text: 'x' }) }
      }
    }
    assert.equal(calls, 0)
  }

  // The sentence is the fallback for every shape, through the engine itself.
  const readCases = [
    ['the Host answer', answerWith({ ok: true, text: 'I fixed the parser.' }), 'I fixed the parser.'],
    ['a refusal body', answerWith({ ok: false, reason: 'no-session' }), sentence],
    ['an HTTP error', answerWith({}, { ok: false, status: 500 }), sentence],
    ['a non-JSON body', answerWith(undefined, { jsonThrows: true }), sentence],
    ['a rejected fetch', answerWith(undefined, { reject: true }), sentence],
    ['an empty text', answerWith({ ok: true, text: '' }), sentence],
    ['a hung fetch', () => new Promise(() => {}), sentence],
  ]
  for (const [label, request, expected] of readCases) {
    const api = recordingNotification('granted')
    const harness = countingNotifier({ popup: createNotifyPopup({ Notification: api }) })
    const notifier = createNotifier({
      audio: harness.notifier.audio,
      popup: createNotifyPopup({ Notification: api }),
      settings: notifyDefaults(),
      log,
      t,
      readText: id => readNotifyLast(id, { fetch: request, timeoutMs: 20 }),
      textTimeoutMs: 40,
      openSession: () => {},
      focus: () => {},
    })
    const started = Date.now()
    await notifier.fire({ sessionId: 's1', title: 'Refactor the parser' })
    assert.equal(harness.plays(), 1, `${label}: exactly one play`)
    assert.equal(api.shown.length, 1, `${label}: one popup`)
    assert.equal(api.shown.at(-1).options.body, expected, `${label}: the expected body`)
    assert.equal(api.shown.at(-1).options.silent, true, `${label}: still silent`)
    assert.ok(Date.now() - started < 2000, `${label}: bounded, never the read's own latency`)
  }

  // The Host's title is the second source, and the sentence the last resort.
  {
    const withHostTitle = recordingNotification('granted')
    const harness = countingNotifier({
      popup: createNotifyPopup({ Notification: withHostTitle }),
      settings: notifyDefaults(),
    })
    const notifier = createNotifier({
      audio: harness.notifier.audio,
      popup: createNotifyPopup({ Notification: withHostTitle }),
      settings: notifyDefaults(),
      log,
      t,
      readText: async () => ({ text: 'I fixed the parser.', title: 'Host title' }),
      openSession: () => {},
      focus: () => {},
    })
    // No title from the list projection: the Host's one is used.
    await notifier.fire({ sessionId: 's1', title: '' })
    assert.equal(withHostTitle.shown.at(-1).title, 'Host title', 'the Host title fills the gap')
    // A list title wins over the Host's.
    await notifier.fire({ sessionId: 's1', title: 'From the sidebar' })
    assert.equal(withHostTitle.shown.at(-1).title, 'From the sidebar', 'the sidebar title is preferred')
    // Neither: the plain sentence, never an empty title.
    const bare = createNotifier({
      audio: harness.notifier.audio,
      popup: createNotifyPopup({ Notification: withHostTitle }),
      settings: notifyDefaults(),
      log,
      t,
      readText: async () => ({ text: '', title: '' }),
      openSession: () => {},
      focus: () => {},
    })
    await bare.fire({ sessionId: 's1', title: '' })
    assert.equal(withHostTitle.shown.at(-1).title, 'Session finished', 'and the honest fallback title')
    assert.equal(withHostTitle.shown.at(-1).options.body, sentence, 'with the honest fallback body')
  }
}

// 59 — the sound that fires is the sound that was stored, in every scenario.
{
  const t = dictionaryOf('en')
  const WINDOWS = 'Windows Notify System Generic'

  /** A counting audio stub that records every id it was asked to play. */
  const audioFor = (options = {}) => {
    const played = []
    return {
      played,
      audio: {
        playTone: (tone, volume) => {
          played.push({ id: tone.id, kind: 'tone', volume })
          return options.toneOk !== false
        },
        playSound: async id => {
          played.push({ id, kind: 'system' })
          return options.systemOk !== false
        },
        close() {},
      },
    }
  }
  const storeOf = settings => fakeStore({ [NOTIFY_SETTINGS_KEY]: JSON.stringify(settings) })
  /** An engine over one store, exactly as the watcher builds it. */
  const engineOver = (store, audio) => createNotifier({
    audio,
    popup: createNotifyPopup({}),
    settings: readNotifySettings(store),
    storage: store,
    log: () => {},
    t,
    openSession: () => {},
    focus: () => {},
  })

  // 1 & 2. The default at install, then a save, then a second save: each fire
  //        plays what is stored at that moment, with no reload and no reopen.
  {
    const store = storeOf(notifyDefaults())
    const { audio, played } = audioFor()
    const engine = engineOver(store, audio)
    await engine.fire({ sessionId: 's1', title: '' })
    assert.deepEqual(played.at(-1), { id: 'chime', kind: 'tone', volume: 60 }, 'the default before any save')

    store.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify({ ...notifyDefaults(), sound: 'two-tone', volume: 35 }))
    await engine.fire({ sessionId: 's1', title: '' })
    assert.deepEqual(played.at(-1), { id: 'two-tone', kind: 'tone', volume: 35 }, 'a sound saved after install is what fires')

    store.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify({ ...notifyDefaults(), sound: 'blip', volume: 20 }))
    await engine.fire({ sessionId: 's1', title: '' })
    assert.deepEqual(played.at(-1), { id: 'blip', kind: 'tone', volume: 20 }, 'and a later change takes effect on the next fire')
    assert.equal(played.filter(entry => entry.id === 'chime').length, 1, 'the default played exactly once, before the save')
  }

  // 3 & 4. A page that was never opened, and another tab's write: no catalogue,
  //        no page state, and still the stored Windows sound — not a default tone.
  {
    const store = storeOf({ ...notifyDefaults(), sound: WINDOWS, volume: 40 })
    const { audio, played } = audioFor()
    const engine = engineOver(store, audio)
    assert.equal(engine.catalog().available, false, 'the engine never loaded a catalogue')
    await engine.fire({ sessionId: 's2', title: '' })
    assert.deepEqual(played.at(-1), { id: WINDOWS, kind: 'system' }, 'the stored Windows id plays, catalogue or not')

    // "Another tab": the store changes underneath a watcher that holds no cache.
    store.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify({ ...notifyDefaults(), sound: 'blip', volume: 15 }))
    await engine.fire({ sessionId: 's2', title: '' })
    assert.deepEqual(played.at(-1), { id: 'blip', kind: 'tone', volume: 15 }, 'a cross-tab write is honoured by the next fire')
  }

  // 5. A suspended context resumes, and the stored sound is what comes out.
  {
    const fake = fakeAudioContext()
    const liveAudio = createNotifyAudio({ AudioContext: class { constructor() { Object.assign(this, fake.context) } } })
    const store = storeOf({ ...notifyDefaults(), sound: 'blip', volume: 50 })
    const engine = engineOver(store, liveAudio)
    await engine.fire({ sessionId: 's3', title: '' })
    assert.equal(fake.counters.resume, 1, 'the suspended context was resumed')
    assert.equal(fake.counters.oscillator, 1, 'and the blip is what started')
  }

  // 6. A failed WAV fetch plays nothing at all — never a fallback tone.
  {
    const store = storeOf({ ...notifyDefaults(), sound: WINDOWS })
    const { audio, played } = audioFor({ systemOk: false })
    const engine = engineOver(store, audio)
    const outcome = await engine.fire({ sessionId: 's4', title: '' })
    assert.deepEqual(played, [{ id: WINDOWS, kind: 'system' }], 'one attempt, on the stored id')
    assert.equal(played.some(entry => entry.kind === 'tone'), false, 'no substituted tone')
    assert.equal(outcome.played, false, 'and the failure is reported')
  }

  // 7. Test and a fire resolve the same id for the same stored settings.
  {
    const store = storeOf({ ...notifyDefaults(), sound: 'two-tone', volume: 45 })
    const { audio, played } = audioFor()
    const engine = engineOver(store, audio)
    const api = recordingNotification('granted')
    await runNotifyTest({
      notifier: engine,
      settings: notifyDefaults(), // deliberately not what is stored
      catalog: { available: false, windows: [], note: '' },
      title: 'x',
      body: 'y',
      requestPermission: async () => api.requestPermission(),
    })
    const fromTest = played.at(-1)
    await engine.fire({ sessionId: 's5', title: '' })
    const fromFire = played.at(-1)
    assert.deepEqual(fromTest, fromFire, 'Test and a fire play the identical sound')
    assert.equal(fromTest.id, 'two-tone', 'the stored one, not the page-local default')
  }

  // 8. Idempotent: two fires in a row resolve the same values.
  {
    const store = storeOf({ ...notifyDefaults(), sound: 'blip', volume: 25 })
    const { audio, played } = audioFor()
    const engine = engineOver(store, audio)
    await engine.fire({ sessionId: 's6', title: '' })
    await engine.fire({ sessionId: 's6', title: '' })
    assert.deepEqual(played, [
      { id: 'blip', kind: 'tone', volume: 25 },
      { id: 'blip', kind: 'tone', volume: 25 },
    ], 'the same resolved values twice')
  }

  // 9. An unknown stored id is attempted as stored — no rewriting, no tone.
  {
    const store = storeOf({ ...notifyDefaults(), sound: 'Windows Long Gone' })
    const { audio, played } = audioFor()
    const engine = engineOver(store, audio)
    await engine.fire({ sessionId: 's7', title: '' })
    assert.deepEqual(played, [{ id: 'Windows Long Gone', kind: 'system' }], 'the stored id, as stored')
  }

  // 10. And through the watcher itself: a save between two finished turns is
  //     heard by the next one, with no reload (the reported bug, end to end).
  {
    const store = storeOf({ ...notifyDefaults(), sound: 'chime' })
    const { audio, played } = audioFor()
    const handlers = new Map()
    const ctx = {
      effect: fn => {
        fn()
        return () => {}
      },
      remote: {
        $on(event, handler) {
          handlers.set(event, handler)
          return () => handlers.delete(event)
        },
      },
    }
    const controller = {
      getSnapshot: () => ({ status: 'ready', moduleStates: { [NOTIFY_MODULE]: true } }),
      subscribe: () => () => {},
    }
    installNotifier(ctx, controller, {
      audio,
      popup: createNotifyPopup({}),
      storage: store,
      scope: {},
      hidden: () => true,
      t,
      title: () => '',
    })
    const status = handlers.get('api-session/status')
    status('turn-1', true)
    status('turn-1', false)
    assert.deepEqual(played.at(-1).id, 'chime', 'the stored default')

    // The reader saves a new sound on the page, which writes storage.
    store.setItem(NOTIFY_SETTINGS_KEY, JSON.stringify({ ...notifyDefaults(), sound: 'blip', volume: 30 }))
    status('turn-2', true)
    status('turn-2', false)
    assert.deepEqual(played.at(-1), { id: 'blip', kind: 'tone', volume: 30 }, 'the very next fire uses the saved sound')
  }
}

// 60 — the click raises the window without waiting for it, and opens the chat.
{
  const t = dictionaryOf('en')
  const order = []
  const requests = []
  const audio = { playTone: () => true, playSound: async () => true, close() {} }

  /** A Notification whose click the suite can invoke. */
  const clickable = () => {
    const instances = []
    const api = function FakeNotification(title, options) {
      const instance = { title, options, closed: 0, onclick: null, onclose: null }
      instance.close = () => {
        instance.closed++
      }
      instances.push(instance)
      return instance
    }
    api.permission = 'granted'
    api.requestPermission = async () => 'granted'
    return { popup: createNotifyPopup({ Notification: api }), instances }
  }

  /** A fetch-shaped fake for the raise route, one behaviour per case. */
  const fetchFor = behaviour => async (url, init) => {
    requests.push({ url, init })
    if (behaviour === 'reject') throw new Error('network down')
    if (behaviour === 'hang') return new Promise(() => {})
    if (behaviour === 'html') return { ok: true, status: 200, json: async () => { throw new Error('not JSON') } }
    if (behaviour === 'http') return { ok: false, status: 500, json: async () => ({}) }
    if (behaviour === 'refused') return { ok: true, status: 200, json: async () => ({ ok: false, reason: 'no-window' }) }
    if (behaviour === 'denied') return { ok: true, status: 200, json: async () => ({ ok: true, raised: false, reason: 'foreground-refused' }) }
    return { ok: true, status: 200, json: async () => ({ ok: true, raised: true }) }
  }

  /** Fire one notification over a scripted raise, then click it. */
  const clickWith = async (behaviour, options = {}) => {
    requests.length = 0
    order.length = 0
    const written = []
    const { popup, instances } = clickable()
    const opened = []
    const notifier = createNotifier({
      audio,
      popup,
      settings: notifyDefaults(),
      log: payload => written.push(payload),
      t,
      openSession: id => {
        opened.push(id)
        order.push('open')
      },
      focus: () => order.push('focus'),
      raise: () => {
        order.push('raise')
        return raiseNotifyWindow({ fetch: fetchFor(behaviour), timeoutMs: options.raiseTimeoutMs ?? 20, log: payload => written.push(payload) })
      },
    })
    await notifier.fire({ sessionId: options.sessionId ?? 's-click', title: 'Refactor the parser' })
    if (options.noClick !== true) instances.at(-1).onclick()
    order.push('after-click')
    await new Promise(resolve => setTimeout(resolve, options.settleMs ?? 60))
    return { instances, opened, written, order }
  }

  // Every failure of the raise still ends in one open, with the popup closed.
  const failures = [
    ['a rejected raise', 'reject'],
    ['a raising-timeout', 'hang'],
    ['a raise answering raised:false', 'denied'],
    ['a raise answering ok:false', 'refused'],
    ['a raise answering HTML', 'html'],
    ['a raise answering 500', 'http'],
  ]
  for (const [label, behaviour] of failures) {
    const { instances, opened, written } = await clickWith(behaviour)
    assert.deepEqual(opened, ['s-click'], `${label}: the session opened, exactly once`)
    assert.equal(instances.at(-1).closed, 1, `${label}: the popup closed`)
    assert.equal(requests.length, 1, `${label}: exactly one raise request`)
    assert.equal(written.some(payload => payload.action === 'raise' || payload.reason === 'raise-denied'), true, `${label}: the failure is recorded, not swallowed`)
  }

  // The raise is a POST to the exact route, and never waited for.
  {
    const { order: seen } = await clickWith('ok')
    assert.equal(requests[0].url, NOTIFY_RAISE_ROUTE, 'the exact route')
    assert.equal(requests[0].init.method, 'POST', 'POST, with no body needed')
    assert.equal(requests[0].init.headers.accept, 'application/json')
    assert.deepEqual(seen.slice(0, 4), ['focus', 'raise', 'open', 'after-click'], 'focus, then raise, then open — the click does not wait')
    assert.equal(seen.includes('settle'), false)
  }

  // Navigation does not await the raise, proven on the pending promise itself.
  {
    order.length = 0
    let releaseRaise
    const gate = new Promise(resolve => {
      releaseRaise = resolve
    })
    const opened = []
    const answer = notifyOpenSession({
      sessionId: 's-gate',
      focus: () => order.push('focus'),
      raise: () => {
        order.push('raise-start')
        return gate.then(() => {
          order.push('raise-settled')
          return { raised: true }
        })
      },
      open: id => {
        opened.push(id)
        order.push('open')
      },
      log: () => {},
    })
    assert.deepEqual(opened, ['s-gate'], 'the session opened while the raise is still in flight')
    assert.deepEqual(order, ['focus', 'raise-start', 'open'], 'and in that order')
    assert.equal(answer.raising, true, 'the answer says a raise is in flight')
    releaseRaise()
    await gate
    assert.equal(order.at(-1), 'raise-settled', 'the raise settles afterwards')
  }

  // A missing id navigates nowhere and starts no raise at all.
  {
    const opened = []
    let raised = 0
    const answer = notifyOpenSession({
      sessionId: '',
      focus: () => order.push('focus'),
      raise: () => {
        raised++
        return Promise.resolve({ raised: true })
      },
      open: id => opened.push(id),
      log: () => {},
    })
    assert.equal(raised, 0, 'no raise for no session')
    assert.deepEqual(opened, [], 'and no navigation')
    assert.equal(answer.reason, 'no-session')
  }

  // A double click produces one raise and one open.
  {
    const { instances, opened, written } = await clickWith('ok')
    instances.at(-1).onclick()
    instances.at(-1).onclick()
    assert.deepEqual(opened, ['s-click'], 'one open')
    assert.equal(requests.length, 1, 'one raise request')
    assert.equal(written.filter(payload => payload.phase === 'opened').length, 1, 'one opened breadcrumb')
  }

  // An honest answer is recorded as raised, not as a failure.
  {
    const { written } = await clickWith('ok')
    assert.equal(written.some(payload => payload.phase === 'raised'), true, 'a raised window is recorded')
    assert.equal(written.some(payload => payload.phase === 'failed' && payload.action === 'raise'), false)
  }
}

console.log('edh notify: click-to-raise checks passed')
console.log('edh notify: stored-sound fidelity checks passed')
console.log('edh notify: host-read fallback checks passed')
console.log('edh notify: title, body, and click checks passed')
console.log('edh notify: single-sound and popup-silence checks passed')
console.log('edh notify: settings, watcher, and sound checks passed')
console.log('edh mobile: layer, stylesheet, and QR checks passed')
console.log('edh mcp: page, form, and secret checks passed')
console.log('edh mcp: reload control checks passed')
console.log('edh mcp: settings section checks passed')
console.log('edh update: control and reload checks passed')
console.log('edh remote: page, account, and address checks passed')
console.log('edh usage: page, chart, and formatter checks passed')
console.log('edh btw: side chat command checks passed')
console.log('edh switch: all checks passed')