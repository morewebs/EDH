# EDH

Everything DeepSeek Harness.

One plugin that carries every Harness tool needed here, feature by feature. Each capability is a feature row, so the whole set is switched from a single control in the conversation header instead of from Plugin Manager.

Installed in the `desktop` profile. It mounts **two kinds of Loader row**: a shell row and one row per feature.

## Install

EDH is a Harness bundle: the package carries a `dsh.bundle.patch`, which is what adds its Loader rows.

- **From a checkout** — point a profile's `package.json` at this directory (`"@moreweb/edh": "link:../path/to/EDH"`) and install the profile's dependencies. A `link:` entry makes source edits live without reinstalling.
- **From a tarball** — `npm pack` here and install the resulting `.tgz` the same way.

Then open the Harness UI and check Plugin Manager for three rows: `edh` (the shell), `edh-retry`, and `edh-edit`. A browser reload picks up changes to `client.js`; adding or renaming a row in `cordis.patch.yml` needs a full Harness restart before Plugin Manager lists it.

Requires a Harness build with the slot system, and one that ships a keyed `conversation.chat.node` / `user` entry — the pencil shadows it, so without it the edit feature simply has nothing to replace.

## Features

| Feature | Row | What it does |
|---|---|---|
| `retry` | `edh-retry` (`@moreweb/edh/retry`) | Retries a failed model request inside the same turn, with no attempt limit, so a flaky relay does not end the session |
| `edit` | `edh-edit` (`@moreweb/edh/edit`) | Adds a pencil action to every user message: it forks the Session immediately before that message and drops the message text into the fork's composer, ready to edit and resend |

## Structure

```
EDH/
  index.js            shell row (@moreweb/edh) — no behaviour; keeps the browser half alive
  retry.js            feature: unlimited model-request retries (its own row)
  edit.js             feature: message editing (host half is empty; see below)
  client.js           browser half: the EDH master switch and the edit surface
  cordis.patch.yml    rows: edh (shell) + edh-retry + edh-edit (features)
  locale/*.json       Plugin Manager title and description
  icon.svg            plugin icon
  test/retry.mjs      feature logic checks
  test/client.mjs     switch controller and message-body checks
```

### Why a shell row

The browser half is served for the row whose module name is the **bare package name**. If the switch were part of the feature row, turning the feature off would unload the switch that has to turn it back on. So the shell row (`@moreweb/edh`) stays enabled and carries the UI, while feature rows live under `@moreweb/edh/…` and can be switched freely.

The switch finds features by that prefix, so it only ever toggles rows EDH owns; the shell row is never written to.

## Adding a feature

1. Add `foo.js` exporting `apply` (and `name`, optional `inject`), plus an export entry `"./foo": "./foo.js"` in `package.json`.
2. Insert a row in `cordis.patch.yml`:
   ```yaml
   - id: edh-foo
     name: '@moreweb/edh/foo'
     config: {}
   ```
3. If it needs UI, register it from `client.js` — the switch already aggregates every `@moreweb/edh/…` row, so a new feature is controllable with no extra switch code.
4. Add a test next to the others; keep the existing suites green.

## The switch

Top-right of the conversation header, in the utilities row beside open-in-app, schedule, and log-download. `role="switch"` with `aria-checked`, theme-token colors only.

- Aggregates all feature rows: on only when every feature is on. Clicking writes the opposite state to every feature row through `remote.pluginManager.setPluginEnabled`, so Plugin Manager persists the choice and applies it live.
- Off unloads the feature rows (the retry listener goes away; a retry already waiting is cancelled and that failed step then ends the turn as usual). On mounts them again.
- Hover explains the state, or reports a refused write / restart-required note.
- No feature rows loaded → inert switch with an explanatory tooltip.

## Message editing

Hover a user message and the action row gains a pencil beside copy: `[time] [copy] [edit]`. Click it and EDH:

1. forks the Session at the event **immediately before** the message (`atSeq: seq - 1`), which is the only mutation the Harness exposes — the log is append-only and nothing can truncate, rewind, or rewrite it;
2. opens the fork and seeds its composer with the message text;
3. leaves the original Session untouched.

So "editing" is a non-destructive branch plus a composer hand-off, not an in-place rewrite. The fork is titled from the parent (`increaseTitle`), the transcript up to the edited message is carried over, and everything the user does next happens in the real composer — there is no second editor to learn.

**Why the browser half replaces a shipped renderer.** A user row is painted by the keyed `conversation.chat.node` / `user` entry, and its action row (`MessageIconActions`) has no seat a plugin can fill: `extraActions` exists but is only ever fed by the assistant-side `conversation.chat.assistant-actions` slot. So EDH registers the same `key` and shadows that entry (`replaceRisk: shadows-shipped-ui`).

**Shadowing requires a lower `priority`.** A keyed slot does *not* replace on a duplicate key — it throws:

```
keyed slot "conversation.chat.node" already has an entry for key "user"
at priority 0 (registered by …) — register at a different priority to shadow
it (lowest renders)
```

Entries are held sorted by `priority` ascending and `entriesOfSlot` keeps the *first* entry per key, so the lowest priority renders. The shipped `user` entry sits at the implicit priority 0, so EDH registers at `priority: -1`. Without it the registration throws and no pencil ever appears. Leaving the shipped entry in place underneath is deliberate: if EDH's entry abdicates, the original renderer takes over again.

The replacement keeps the shipped `conversation.chat.user.content` Factory for the bubble itself, so only the action row is EDH's — markup, class names, and CSS are copies of `MessageItem.module.css` and `MessageIconActions.module.css` under an `edh-` prefix, with the same theme tokens and the same hover-reveal rule. Copy and the clock are reimplemented so nothing regresses.

**Enablement.** The pencil is gated on the `edh-edit` row, falling back to the aggregate switch state when a profile is still running a bundle patch that predates the row (an upgrade that has not been restarted).

## Diagnostics

The page keeps one Local Storage breadcrumb under `edh:debug`: last list read (`features` / `no-features` / refused / threw), the mount box in viewport pixels, and the last write result. It is diagnostic only; a storage refusal cannot affect the switch.

Message editing keeps its own breadcrumb under `edh:edit`, so the switch trace stays readable: `shadowed` (registration won) / `shadow-failed` / `register-failed`, `view-mounted` (with `sessionId`, `factory`, `seq`, `editEnabled`), `click`, `forked` (with the child id), `fork-failed`, `open-failed`, `draft-applied`, and `no-session-id` (a chat row that arrived without a Session id, which is why a pencil would not appear).

Slot callbacks run after the `ctx.inject` scope body, so a deferred registration failure is invisible to a `try` around `ctx.slots.inject` — each callback records its own breadcrumb for that reason.

## Tests

```
node test/retry.mjs
node test/client.mjs
```

## License

MIT — see [LICENSE](LICENSE).
