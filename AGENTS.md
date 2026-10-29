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
- **Settings has two seats, and they are not interchangeable.** `settings.section` is a
  whole page in the Settings nav; `settings.plugins.tab` is a tab inside the built-in
  Plugins section. A feature that manages its own thing belongs in `settings.section` — a
  tab under Plugins buries it behind a page the user opened for something else.
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

## Usage

`usage.js` folds token usage out of every Session log. The facts that cost the most to
rediscover:

- **Count the four buckets, never `totalTokens`.** Σ(input + output + cacheRead + cacheWrite)
  differs from Σ`totalTokens` on 928 events in this profile — the field is the provider's own
  arithmetic. `cacheReadTokens` / `cacheWriteTokens` are optional; absent means zero.
- **Usage rides `assistant/message` as `data.usage`**, with the model at
  `data.message.source = {kind: 'model', provider, model}`. `turn/end` carries no rollup.
  `assistant/attempt` can also report a sample in its stream, and it names no route, so
  those tokens land under `unknown` unless a message for the same step replaces them.
- **One sample per `(turn, step)`, last wins.** The shipped `tokenUsage` projection keeps a
  single slot and *replaces* it (`addReplacing`), and `llm/retry-started` clears the slot so
  a retried attempt adds. Copy that rule or a retry double counts — and remember it is one
  slot, so a replay of an older step after a newer one adds rather than replaces.
- **Coverage is not everything.** Title generation, compaction summaries and web search
  record no usage at all, and the only assistant messages without usage are
  `interrupted: true`. The view says so instead of implying the total is complete.
- **`time` is epoch milliseconds, UTC, with no zone stored.** Days are this machine's local
  dates, keyed with `Intl.DateTimeFormat` in `resolvedOptions().timeZone`; a cache written
  under a different zone is discarded rather than mixed.
- **A log is Zstandard with one frame per append** (magic `28 B5 2F FD`), and
  `zlib.zstdDecompressSync` on the whole file returns only the FIRST frame. Split
  structurally — frame header, then block headers to the last-block bit, then the checksum
  — exactly as the shipped `scanZstdFrames` does. Searching for the magic bytes is wrong:
  they occur inside compressed blocks.
- **Frames are independent and the file is append-only, so a byte offset on a frame boundary
  stays valid forever.** That is what makes the incremental read legitimate: keep the
  offset, read only the tail, decode the new frames. Each frame's plaintext ends with a
  newline (one batch = `lines.join('\n') + '\n'`), so a frame without one is an append that
  never finished and its bytes are left for the next pass.
- **`ctx.sessionPersistence.list()` is the cheap enumerator** (header frames only, 153 ms
  for 200 Sessions) and `snapshot.sizeBytes` is the artifact size. The artifact path comes
  from the backend's own `locate({ id, cwd })` diagnostics hook, duck-typed — a handle read
  (`open(id, 'read')` + `read(0)` → `{events}`) is the slow fallback. `handle.read` is
  indexed by *event*, not by byte, so it cannot do the incremental read.
- **`sessionProjectionCache.cachedSnapshot(header, keys)` is a zero-I/O read, but it holds
  no model and no per-day data**, so it is only a cross-check, never the source of the
  series. It does carry `timeContext.lastMessageTime`, the fallback when a log is
  unreadable.
- **A full fold is ~15 s** (200 logs, 189 MB compressed, 761 MB plaintext, 247,805 events;
  this build folds them in about 7.5 s). Never block the Host on it: cache per Session under
  `<profile>/.edh/usage.json`, backfill two Sessions per tick behind `setImmediate`-style
  scheduling, and persist after each batch. The warm delta over every log is under a second.
- **Live folds only after a pass has caught up with a Session.** `ctx.on('session/event', …,
  { global: true })` is the post-commit feed for every Session including subagents, but
  dropping `seq <= lastSeq` is exact only when every lower `seq` is already folded — so an
  event for an unfolded Session schedules a pass instead of folding out of order.
- **The main/subagent split is the header's `origin`, and nothing else.** A delegated child
  records `origin: 'subagent'`; a main Session records no `origin` at all, and a *fork* keeps
  `parentSession` with no origin — so the parent link must not be read as "subagent". The
  view sends `scopes: { main, subagent }` beside the headline, and the two halves must add
  up to it exactly (the suite asserts totals, every model row and every day).

## Services

Put optional contracts on their own `ctx.inject([...], scope => …)` — a missing service
must never unload the control surface. The switch keeps only `slots`, `locale`, `remote`,
and `remote.pluginManager`; the MCP row reaches `tools` and `modules` the same optional way.

```js
const dispose = ctx.tools.register({ name, description, parameters, output, execute })
```

`parameters` accepts a raw MCP `inputSchema` (it is projected as lossless JSON, no subset
assertion), but `output.schema` must pass the constrained subset and `output.render` must be
a function. **`register` scopes to the service's context, not your fiber** — the registration
outlives your row, so keep every disposer and run it on stop, on re-sync, and in `ctx.effect`
disposal, or turning the row off leaves tools pointing at dead servers.

`/btw` and `/side` are `commandUi` contributions of kind `action`: a bare invocation runs a
callback and submits no message. Three rules follow. They are client-only — a contribution
whose name a Host command already uses throws *while the menu is being built*, taking every
command with it. A contribution with arguments does not run at all: the input machine falls
through to `session.prompt`, so `/btw how …` would be sent to the current conversation, which
is why the copy says it takes no arguments. And `ui.run` is called un-awaited and
uncatchable, so every path inside it catches for itself or the failure disappears.

The side chat shows **beside** the conversation, never in place of it. Four facts cost a day
each to rediscover:

- **The right column is the only side-by-side space.** The centre panel (`main`) is a keyed
  replace-the-centre registry: there is no split API, and `uiWorkspace.openSession` navigates
  away. Anything that has to be visible *next to* a conversation lives in the right column.
- **`ctx.sidebarRight.openResource(address, { kind })` is the aside opener.** The kind, and a
  `replaceTab` only when a launcher card is being replaced, is all it should get:
  `preferNewPane` asks the dock to *split*, which lands the chat in a second pane beside the
  launcher instead of as a tab in the pane already open, and `revealIfOpened` is a placement
  override it does not want either (the default already re-activates a tab holding the same
  address). It throws synchronously for an address no registered tab type claims, and it acts
  on the *on-screen* session, which is why it never moves the view.
- **The right column's launcher ("Start") is not a slot of its own.** Those cards are
  `guide` entries on **tab type registrations** — `sidebarRightTabs.register({ …, guide: [{ id,
  order, title: () => …, description: () => …, icon }] })` — collected by the registry and
  sorted by `order` (shipped: Workspace files 10, New terminal 20, Browser 30). Picking one
  opens its type *as a page* in the card's own tab, so a card whose type needs an argument (a
  child Session address) must also register a body on the keyed, session-scoped
  `sidebar.right.tab.guide.entry` under its type id and run its own action there. Two
  consequences: the card only exists while the type is registered, which is how a row switch
  gates it, and `MAX_DESCRIBED_ENTRIES = 4` means a fifth card drops every card's description.
- **A Session cannot be renamed until it is resumed.** The Host's `session/rename` is
  documented as "rename one Session after explicitly resuming it" and refuses one it does not
  hold live; a fresh fork is not live, so a bare `sessions.rename(childId, …)` — the facade has no such method at all, only a retained Session's own `rename(title)` sends the RPC answers a
  failure and the tab keeps the fork's own number (`EDH (1)`). Wrap it in
  `sessions.using(childId, { source }, ref => ref.binding.session.rename(title))`, which retains the child,
  waits for the open, runs the rename, and releases again.
- **A pane body renders a second Session only through `SessionProvider`.** The address is a
  resource (`ctx.resources.register({ protocol, async *open() })`) whose `open` retains the
  child with `ctx.sessions.retain(id, { source, signal })` and releases it in `finally`; the
  body reads `useResource(tab.contentId)` and wraps its own **session-scoped child slot** in
  `SessionProvider session={reference}`. Without that provider, or with a bare id instead of a
  reference, the slot has no Session and paints nothing. Inside, `renderFactorySlot(
  'conversation.content', { variant: 'embedded', … }, { slots: { views: FixedChatView } })`
  is the real, writable conversation.
- **The pane is per-parent-session storage**, keyed by the tab type id: it stays with the
  conversation that opened it and will not follow you to another session.

## Remote access

`remote.js` serves the same Web GUI to a phone on the LAN. Most of it is one
fact: **the listener is ours, and the harness only ever sees loopback.**

- **The harness webserver refuses a wildcard bind.** `@deepseek-ai/dsh-host-webserver`
  requires a concrete IP literal and throws on an unspecified address; the
  desktop pins `--host 127.0.0.1 --port 0`. So `0.0.0.0:<port>` is a `node:http`
  server inside `apply()`, and `webServer.port` / `getOrigin()` only say where to
  forward. There is also **no pre-auth seam** — `WebServer` is
  register/registerUpgrade/registerFallback/tapIndex/renderIndex, nothing in
  front of its auth chain.
- **Host and Origin must both be rewritten to the loopback authority, and the
  harness cookie injected.** The browser-trust fence (`api-request-trust`) takes
  a loopback Host on any port but refuses a LAN authority with 403 even when the
  Origin matches, and requires an attached Origin to name that same Host. The
  session cookie is authority-bound (name `dsh-auth-<sha256(authority)>`), so the
  phone's cookie is dropped and never forwarded, and the proxy's own credential
  is the only one on the wire.
- **Obtain that credential through the service, not by re-deriving it.**
  `ctx.connection.authenticatedUrl(base)` yields the process launch token and
  `ctx.connection.authorizeIndex(request, response)` accepts any object with
  `method`, `url` and `headers.host` and answers via `writeHead`/`end`, so a
  synthetic pair captures the exact `set-cookie`. Both are typed members of the
  `connection` service contract.
- **The phone is the owner principal.** The cookie admits `browserPeer`, whose
  principal is `owner`: the whole shell, the file API, the terminal.
  `dsh-api-remote-access` cannot narrow it (`decide()` allows owner first). The
  login page is the entire barrier, so the store keeps a scrypt hash with a
  per-user salt, our own cookie is HMAC-signed and expiry-bounded, and attempts
  are rate-limited per address.
- **Plain HTTP, deliberately.** The transport is the harness's own: the desktop
  listener is plain and minting a certificate for a LAN address is out of scope.
  The cookie therefore cannot be marked `Secure`, so anyone who can watch the
  network can replay it. Every answer and the settings page carry that sentence
  (`LAN_WARNING`); do not drop it.
- **Bodies are piped, both ways.** Uploads (`POST /api/session/uploadFileBinary`),
  the SSE stream (`/plugins/events`) and the one WebSocket (`/api/remote.mux`)
  never get buffered and never get an idle timeout. The WS proxy is the shipped
  inspector's `cdp` pattern: `net.connect`, a hand-written `GET … Upgrade:
  websocket` with the forwarded `sec-websocket-*` headers, then
  `socket.pipe(upstream).pipe(socket)`.
- **Responses are re-compressed on the way out.** The harness webserver runs with
  `compression: none`, so every asset and every RPC JSON answer would cross the
  wifi as-is. The proxy negotiates `br`/`gzip` itself (`shouldCompress`), streams
  it through a zlib transform and never buffers a body to do it — and refuses
  anything that is not plainly a compressible document: `text/event-stream`, a
  redirect, `204`/`205`/`304`, `HEAD`, an already-encoded body, a range request,
  `no-transform`, and an empty body.

## Mobile

`mobile.js` is the smallest row in EDH, and the seam is the point.

- **The browser half injects; the proxy does not.** `client.js` is loaded *into*
  the live Harness document, so it can insert a real `<style>`, real `<meta>`
  tags and a `<link rel="manifest">` through the DOM. Remote proxies that same
  document to the phone, so the phone inherits all of it. A reverse proxy cannot
  see a document — only bytes — and CSS written against the harness's
  build-hashed class names (`AnXs9G_options`) breaks on every release, so
  proxy-side HTML surgery was tried and dropped on purpose.
- **The proxy's only mobile concern is compression** (see above): a transport
  fact the document cannot fix for itself.
- **One thing a page cannot do for itself is a manifest**, so this row serves
  `GET /api/edh.mobile/manifest` as `application/manifest+json`. `display` is
  `standalone` (not the shipped manifest's `fullscreen`: keep a status bar and a
  way out), and `start_url`/`scope` are `"/"`, **not** `"./"` — manifest URLs
  resolve against the manifest's own URL, so `"./"` served from
  `/api/edh.mobile/manifest` would start the installed app inside
  `/api/edh.mobile/` and put the document outside its own scope, which makes the
  app non-installable.
- **The icon is verified, or it is omitted.** A manifest that promises a 404
  icon fails the whole install prompt. `/favicon.svg` is shipped at the origin
  root by `@deepseek-ai/dsh-web-frontend` (`dist/favicon.svg`, linked from its
  `index.html`) and answers `200 image/svg+xml`, so it is named — root-relative,
  because an icon URL resolves against the manifest URL too. If that file ever
  moves, drop the `icons` array rather than guess.

## Notifications

`notify.js` exists for one reason: **a browser page cannot read
`C:\Windows\Media`.** The user asked for the default Windows sound, and that is a
WAV on this disk that no page may open — so the Host serves the real files and the
browser half does everything else (settings, the tones it synthesises with Web
Audio, and the watcher that decides when to fire).

- **The catalog is a curated allowlist, never a directory listing.** The folder
  holds ~70 WAVs — system events, hardware dings, setup chimes — and offering all
  of them is the opposite of a feature. `NOTIFY_CATALOG` names eleven, in a
  deliberate order with the Windows default (`Windows Notify System Generic`)
  first. `GET /api/edh.notify/sounds` answers `{ ok, available, sounds, note? }`,
  and a machine without that folder gets `available: false` **with a 200 and a
  sentence**, because the page has to be able to say so plainly.
- **An id is a catalog key, never a path fragment.** No request value is joined
  onto a path: the `id` must equal one of our own constants, the file name comes
  from the catalog entry, and `soundFilePath` re-checks that the resolved file
  still sits inside the media directory. Anything with `/`, `\`, `..`, a colon
  (drive letter or alternate data stream) or a control character is refused
  before the lookup — defence in depth, so a refactor of any single check cannot
  quietly reopen the traversal. `test/notify.mjs` keeps a matrix of those shapes
  and a source-level guard that no `join(` takes a bare id.
- **WAVs are streamed, never buffered** (`createReadStream` → `Readable.toWeb`),
  ~200 KB each, `private, max-age=86400`. `audio/wav` is deliberately absent from
  the proxy's compressible list, so Remote passes the bytes through untouched.
- **A renderer cannot raise its own window**, so a notification click calls
  `POST /api/edh.notify/raise`, and the Host restores-and-raises **its own
  process's window, found by pid** (`process.pid`, then `process.ppid` — on a
  desktop build the visible window may belong to the parent; nine of this app's
  ten processes have no window at all). Never by title text: raising "some
  DeepSeek window" could raise the wrong one.
- **`SetForegroundWindow` alone is not enough, and the reason is the caller.**
  The process that calls it is the `powershell.exe` we spawned: it owns no window
  and is not the foreground process, so Windows' foreground lock refuses — measured
  here as `raised=0 reason=denied` before the workaround. The script therefore
  climbs, verifying `GetForegroundWindow()` after every rung and printing which one
  won: `ShowWindowAsync(SW_RESTORE)` for a *minimised* window → `AttachThreadInput`
  (join the foreground thread's input queue, ask, detach) → the minimise/restore
  nudge (a visible flash) → `BringWindowToTop` for the Z order alone. **On this
  machine `step=attach` is the rung that works**: a genuinely background app window
  came forward in ~460 ms, confirmed by an independent foreground-pid probe. Keep
  the ladder in that order; a `raised=0 reason=denied steps=…` means all four were
  tried and Windows said no, which is reported as `{ ok: true, raised: false,
  reason: 'denied' }` and never dressed up. Where PowerShell or the OS refuses
  outright the answer degrades to `raised: false` with `not-windows`, `no-window`,
  `timeout` or `failed` — the click still made its sound. One raise runs at a time;
  a second click joins it.
- **The notification body is a bounded tail read, never a transcript fetch.**
  `GET /api/edh.notify/last?sessionId=…` reads the last 256 KB of the Session's
  Zstandard artifact, splits it into frames with `usage.js`'s `splitZstdFrames`
  (the window usually starts mid-frame, so the boundary is found by proposing each
  frame magic to the structural parser and accepting only a candidate whose first
  frame *decompresses* to newline-terminated plaintext), and walks the newest
  frames backwards to the newest `assistant/message` that has text. `handle.read`
  is indexed by event, so any transcript read decodes the whole log — measured on
  this profile, the whole route answers in ~13 ms over a 16.6 MB log. The
  `sessionId` is resolved through `ctx.sessionPersistence.locate({ id, cwd })`
  (the `cwd` comes from `list()`'s header), never joined onto a path; a 404 for an
  unknown id, `unavailable` without the service, `error` when it is slow.
- **Browser popups need a secure context.** The Notification API refuses a plain
  `http://` origin, so the Remote page on a LAN address gets *sound* (through Web
  Audio, which has no such rule) but no system notifications. That is a browser
  rule this side cannot work around; do not try to "fix" it in the Host.

## Search

`search.js` answers `GET /api/edh.search?q=…` for the Ctrl+K palette. The whole
design follows from one measurement: a full pass over this profile is **761 MB of
plaintext and 7.5–15 s**, so a search can never be a scan.

- **The index is derived, never authoritative.** `<profile>/.edh/search.json`, temp
  + rename, tolerant of a corrupt or foreign-version file (empty index, one
  warning, rebuild). The Session log stays the only truth; deleting the index
  loses nothing but a few seconds of background work.
- **Truncated text only.** Each stored message is collapsed to single spaces and
  capped at 600 characters — enough for a snippet, which is why the whole index for
  222 sessions / 222 MB of logs is **1.7 MB**. `snippet` and `matched` are cut from
  that same string, so `matched` always appears inside `snippet` verbatim and the
  client can highlight without re-deriving anything. Whitespace collapsing is also
  why a phrase written across a newline is found by a query typed with a space.
- **Incremental by byte offset and `seq`.** Frames are append-only, so a saved
  offset on a frame boundary stays valid: a pass reads only the bytes after it with
  `usage.js`'s `readLogTail` + `decodeLogFrames` (the same decoder — this module
  never splits or decompresses a frame itself) and keeps only messages with
  `seq > lastSeq`. A torn tail leaves the offset where it was; a log that shrank
  underneath us starts that Session again. A **live event is folded from the event
  itself** only when its Session is caught up; otherwise a pass is scheduled,
  because folding an unfolded Session would drop every lower `seq`.
- **A user message is the user's only when `data.source.kind` says so.** The same
  stream carries the runtime context, the agent instructions, the skill catalog, a
  time stamp and subagent notices — in one real Session 32 of 107 user messages
  were the human's — so only `user`/`user-approval` are indexed. An assistant
  message contributes its text blocks only (tool calls, reasoning and tool results
  are not prose), and a record with a `surfaceOp` is skipped because it replaced a
  range the conversation no longer shows. Note that a *delegated subagent prompt*
  is logged as kind `user` (it is a user-role message in that Session), so those do
  appear in results — that is the transcript, not noise.
- **Never block.** The build is a couple of Sessions per tick behind a timer —
  222 sessions in ~8 s of background work — and a query is an in-memory scan
  capped at 5 000 candidates. `indexed: { sessions, total, ready }` is what the
  palette shows as `Indexing… 42 of 200`; `ready` is true only when every
  enumerated Session is indexed through the end of its log, so a torn append is
  reported honestly as not ready.

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
node test/remote.mjs
node test/mobile.mjs
node test/notify.mjs
node test/search.mjs
node test/mcp.mjs
node test/usage.mjs
```

`test/remote.mjs` opens no socket on purpose: the listener, the proxy and the
sign-in gate are all driven through their injected seams (a fake `createServer`,
a fake `http.request`, a scripted request/response pair), because a suite that
binds a port cannot run twice at once or on a locked-down machine.

There is often no browser control in a session, so EDH writes Local Storage breadcrumbs:
`edh:debug` for the switch, `edh:edit` for message editing (`shadowed` / `shadow-failed` /
`view-mounted` with `sessionId`+`factory`+`seq` / `click` / `forked` / `draft-applied`),
`edh:export` for the download button (`mounted` / `click` / `failed`), `edh:update` for
both Plugin Manager controls — update (`mounted` / `checked` / `update-started` / `updated` /
`updated-needs-restart` / `failed`) and reload (`reloaded` / `reload-failed`) — `edh:mcp`
for the MCP page (`loaded` / `added` / `removed` / `tested` / `register-failed` / `failed`),
and `edh:btw` for the side-chat commands and its launcher card (`click` / `guide-click` /
`forked` / `named` / `pane-opened` / `pane-failed` / `register-failed` / `failed` with the
step that failed), and `edh:remote` for the Remote page (`loaded` / `saved` / `started` / `stopped` / `failed` / `register-failed`), and `edh:usage` for the Usage page (`loaded` / `refreshed` / `failed` / `register-failed`), and `edh:notify:debug` for the Notifications page and its watcher (`loaded` / `saved` / `played` / `fired` / `blocked` / `failed` / `register-failed`). Note that the settings themselves live under `edh:notify` — one key cannot hold durable data and the last diagnostic event, since a breadcrumb would erase the settings.
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
