# EDH

Everything DeepSeek Harness — one plugin, one master switch, a feature per row.

## Features

| Feature | What it does |
|---|---|
| `retry` | Retries a failed model request inside the same turn, with no attempt limit |
| `edit` | Adds a pencil to every user message: forks the Session just before it and puts the text back in the composer |
| `btw` | `/btw` and `/side` open a side chat: a fork of this conversation, shown beside it in the right-hand pane |
| `export` | Downloads the Session as a Markdown document |
| `update` | Updates EDH itself from its published repo, from EDH's page in Plugin Manager, and reloads the new browser half in place |
| `mcp` | Connects MCP servers from a settings page — no Cordis config — and gives their tools to the model as it goes |
| `remote` | Opens the same Web GUI on a phone over the LAN, behind a login page and a username and password you set |
| `usage` | Shows where your tokens went: totals, per model and per day across every Session, with streaks and peaks |

A switch in the conversation header turns them all on or off together.

## Install

EDH is a Harness bundle: the package carries a `dsh.bundle.patch`, which adds its Loader
rows. Install it like any other bundle — `"@moreweb/edh": "link:/path/to/EDH"`, or the
packed tarball — then enable the rows you want in Plugin Manager.

## License

MIT
