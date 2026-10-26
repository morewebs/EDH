# EDH

Everything DeepSeek Harness — one plugin, one master switch, a feature per row.

## Features

| Feature | What it does |
|---|---|
| `retry` | Retries a failed model request inside the same turn, with no attempt limit |
| `edit` | Adds a pencil to every user message: forks the Session just before it and puts the text back in the composer |
| `export` | Downloads the Session as a Markdown document |

A switch in the conversation header turns them all on or off together.

## Install

EDH is a Harness bundle: the package carries a `dsh.bundle.patch`, which adds its Loader
rows. Install it like any other bundle — `"@moreweb/edh": "link:/path/to/EDH"`, or the
packed tarball — then enable the rows you want in Plugin Manager.

## License

MIT
