# AGENTS.md — EDH

Notes for an agent working in this repo. The README says what EDH is; this says what will
bite you.

## The one rule

**Build in the plugin, never in the Harness.** No edits to the installed runtime, no fork
of the harness, no patching `app.asar`. Everything ships as an EDH feature. If a capability
looks impossible from the plugin side, the answer is a different seam, not a core change.

## Layout and why the shell row exists

`cordis.patch.yml` mounts a shell row (`@moreweb/edh`) plus one row per feature
(`@moreweb/edh/…`). The browser half is served for the row whose module name is the **bare
package name**. If the switch lived in a feature row, turning that feature off would unload
the switch that has to turn it back on — so the shell stays enabled and carries the UI.

The switch finds features by that prefix and only ever writes to rows EDH owns. Never write
to the shell row.

## Slots

- **Shadowing needs a lower `priority`.** A keyed slot does *not* replace on a duplicate
  key — it throws (`already has an entry for key "user" at priority 0 … register at a
  different priority to shadow it (lowest renders)`). Entries are sorted by `priority`
  ascending and the first entry per key wins, so a shadow registers *below* the shipped
  entry's implicit 0. EDH uses `-1` for `conversation.chat.node` / `user`.
- **Leave the shipped entry in place underneath.** Then a shadow that abdicates falls back
  to the original renderer instead of blanking the row.
- **Slot callbacks run after the `ctx.inject` body.** A `try` around `ctx.slots.inject`
  does not catch a registration that throws when the callback actually fires. Wrap each
  callback and record its own breadcrumb.
- There is no additive seam on a user message row: `MessageIconActions.extraActions` is fed
  only by the assistant-side `conversation.chat.assistant-actions`. Shadowing the `user`
  node is the only route, so the replacement must re-render the action row itself.
- Reuse the shipped Factory for the parts you are not replacing
  (`conversation.chat.user.content` still paints the bubble).
- **Plugin Manager seats hang off `main` keyed `plugins`.** `plugins.detail.actions` (list,
  root scope) is the head of a detail page; its owner props are `{ subject }`, where the
  page builds `{ kind: 'item', id }`, `{ kind: 'row', pkg, row }`, or `{ kind: 'bundle', pkg }`.
  A package name is only on `pkg.name`, so that is what identifies EDH — an `item.id` is a
  catalog id, not a package name. An entry must render `null` for a subject it has no
  control for, and it exists only once the Plugins panel has been opened, because those
  rows are declared by the panel's own entry.
- **`modules.entries.reload(id, rev)` is how a browser half replaces itself**, but `rev` is
  the Host's: it selects the rebuilt artifact and an unpublished revision answers 404. Read
  the revision off the same `plugins/events` stream the shipped HMR client reads; never
  synthesise one.

## Sessions

- The log is **append-only and immutable** — it is the sole source of truth for fork,
  resume, and replay. There is no truncate, rollback, rewind, or edit call anywhere.
- The only mutation is `ctx.sessions.fork({ sessionId, atSeq, increaseTitle })`. `atSeq` is
  **inclusive** (`events.slice(0, boundary + 1)`), so landing *before* a message means
  `seq - 1`.
- Open the fork with `ctx.uiWorkspace.openSession(childId)`.
- Never treat an "edit" as a rewrite. Fork, then hand the text to the composer.
- To read a Session's history, go through `ctx.sessionPersistence.open(id, 'read')` and
  `handle.read(0, undefined)` — the committed log only, never a torn tail. Flush a live
  Session (`ctx.sessions.get(id)` + `ctx.sessions.flush(session)`) first, or the export
  misses work still in memory.
- **A replacement is model-only: never build a human-facing view from the surface.**
  `isAppendSurfaceEvent` says it outright — "the model-visible surface deliberately shadows
  replaced ranges, so it is the wrong source for a human transcript — a landed replacement
  would erase conversation the user already saw." Compaction lands exactly such a
  replacement (a `user/message` with `surfaceOp: {op: 'replace', …}`) and prunes with
  `system/message` too. Skip every event whose `surfaceOp` is an object; the turns it
  shadows are still in the log and still readable.
- **`user/message` is mostly not the user.** The Harness logs runtime context, the time
  stamp, the skill catalog, agent instructions, subagent notices, and compaction
  checkpoints into the same stream with `source.kind`. Only `user` and `user-approval` were
  authored by a person; in one real Session 32 of 107 `user/message` events were the
  human's. Filter on `data.source.kind`, or you export the request body.
- Message shapes differ: `user/message` keeps the message on `data`, everything else under
  `data.message`. Nesting is the thing to get wrong.
- The Session's title is a `session/title` event (`data.title`, newest wins), not a header
  field. The header carries no title at all.

## Services

Put optional contracts on their own `ctx.inject([...], scope => …)` — a missing service
must never unload the control surface. The switch keeps only `slots`, `locale`, `remote`,
and `remote.pluginManager`.

## Styling

Class names are ours (`edh-`), but every rule and token is copied from the shipped
`MessageItem.module.css` / `MessageIconActions.module.css`, including the
`:has(~ [data-chat-flow-kind=user])` hover-reveal. Only `--dsw-alias-*` / `--dsh-*` tokens.
Icon glyphs are the shipped 16px outline path data, not lookalikes.

## Adding a feature

1. Add `foo.js` exporting `apply` (and `name`, optional `inject`), plus `"./foo": "./foo.js"`
   in `package.json` and `foo.js` in `files`.
2. Insert a row in `cordis.patch.yml`: `- id: edh-foo` / `name: '@moreweb/edh/foo'`.
3. If it needs UI, register it from `client.js` — the switch already aggregates every
   `@moreweb/edh/…` row, so no extra switch code.
4. Add a test beside the others and keep the suites green.

## Verifying

```
node --check client.js
node test/retry.mjs
node test/client.mjs
node test/export.mjs
node test/update.mjs
```

There is often no browser control in a session, so EDH writes Local Storage breadcrumbs:
`edh:debug` for the switch, `edh:edit` for message editing (`shadowed` / `shadow-failed` /
`view-mounted` with `sessionId`+`factory`+`seq` / `click` / `forked` / `draft-applied`),
`edh:export` for the download button (`mounted` / `click` / `failed`), and `edh:update` for
the update control (`mounted` / `checked` / `update-started` / `updated` / `reload-failed` /
`updated-needs-restart` / `failed`).
Read them off disk while the app is closed or running:

```
%APPDATA%\@deepseek-ai\dsh-desktop\Local Storage\leveldb\*.log
```

The values are UTF-16LE after the key. That breadcrumb is how the keyed-slot priority
collision was found after a full restart had failed to explain a missing button.

To learn what the shipped UI actually does, read the installed asar: `seek(12)`, read a u32
header length, parse the JSON header, then read entries at
`16 + header_len + offset`. Prototype scripts are throwaway — archive them, do not commit
them here.

## Shipping

Commit small; `main` is the release branch. The local profile points at this directory with
`link:`, so a page reload is enough for `client.js`, but a new or renamed row in
`cordis.patch.yml` only appears in Plugin Manager after a full restart.

The `edh-update` row is the way out of that: it updates this checkout from the published
repo on EDH's own Plugin Manager page, and it answers `requiresRestart` per update rather
than by a constant. Availability is a **commit count**, not a version string — `git fetch`
then `git rev-list --count HEAD..FETCH_HEAD` — because this repo commits small and rarely
bumps `package.json`, so a version comparison would call a stale checkout "up to date".
Never `--depth`: a shallow graft makes the following `merge --ff-only` fail with "refusing to
merge unrelated histories".

After a merge it diffs the two revisions and reports `requiresRestart: false` only when
nothing but browser-side files moved (`client.js`, `locale/`, `test/`, `package.json`,
`icon.svg`, the docs) — then the page replaces its own browser half through
`modules.entries.reload` and the change lands live. When a Host module moved it answers
`true`, because the Loader cannot re-import a started Host module: `refresh()` no-ops on a
live fiber, `update()` only re-patches options, `import()` hits the ESM cache, and
`loader.exit()` is the host restarting itself. Do not "fix" that by returning `false`: the
process would keep running the old Host half while the page claims it is current.

`installed` is the version the process **loaded** (`LOADED_VERSION`, captured at import),
reported beside `onDisk`. That distinction is load-bearing: after a merge the manifest on
disk already equals the new version, so a page reload must still see "restart to finish"
rather than "up to date".
