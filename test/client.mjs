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
const { createController, findFeatures, featureEnabled, contentParts, unwrap, EDIT_MODULE } = mod.__test

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

console.log('edh switch: all checks passed')