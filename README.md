# EDH

Everything DeepSeek Harness — one plugin, one master switch, a feature per row.

Installed in the `desktop` profile.

## Features

| Feature | What it does |
|---|---|
| `retry` | Retries a failed model request inside the same turn, with no attempt limit |
| `edit` | Adds a pencil to every user message: forks the Session just before it and puts the text back in the composer |

A switch in the conversation header turns all of them on or off together, writing through
Plugin Manager so the choice persists.

## Install

EDH is a Harness bundle: the package carries a `dsh.bundle.patch`, which is what adds its
Loader rows.

- **From a checkout** — point a profile's `package.json` at this directory
  (`"@moreweb/edh": "link:../path/to/EDH"`) and install the profile's dependencies. A
  `link:` entry makes source edits live without reinstalling.
- **From a tarball** — `npm pack` here and install the resulting `.tgz` the same way.

Then check Plugin Manager for three rows: `edh` (the shell), `edh-retry`, and `edh-edit`.
A browser reload picks up changes to `client.js`; adding or renaming a row in
`cordis.patch.yml` needs a full Harness restart before Plugin Manager lists it.

## Structure

```
index.js            shell row (@moreweb/edh) — no behaviour; keeps the browser half alive
retry.js            feature: unlimited model-request retries
edit.js             feature: message editing (host half is empty)
client.js           browser half: the master switch and the edit surface
cordis.patch.yml    rows: edh (shell) + one per feature
locale/*.json       Plugin Manager title and description
icon.svg            plugin icon
test/*.mjs          Node suites
```

## Tests

```
node test/retry.mjs
node test/client.mjs
```

## License

MIT — see [LICENSE](LICENSE).
