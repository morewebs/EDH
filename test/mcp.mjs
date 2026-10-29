import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  apply,
  CALL_TIMEOUT_MS,
  contentText,
  createChannel,
  createFileStore,
  createHttpTransport,
  createManager,
  createStdioDecoder,
  createStdioTransport,
  decodeStdioChunk,
  DEFAULT_PROTOCOL_VERSION,
  encodeStdioFrame,
  MCP_PATH,
  McpError,
  mcpResponse,
  mcpView,
  normalizeServer,
  openConnection,
  parseSseBody,
  resolveProfileDir,
  resolveStorePath,
  sanitizeJsonSchema,
  serverView,
  stdioEnvironment,
  SUPPORTED_PROTOCOL_VERSIONS,
  TOOL_OUTPUT_SCHEMA,
  toolDefinition,
  toolNameFor,
} from '../mcp.js'

/** One JSON-RPC success reply. */
const reply = (id, result) => ({ jsonrpc: '2.0', id, result })

/** One JSON-RPC error reply. */
const fault = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } })

// ---------------------------------------------------------------------------
// Fakes: a child process, an MCP server over it, a registry, a fetch endpoint
// ---------------------------------------------------------------------------

/** A `ChildProcess`-shaped emitter: stdin records what is written to it. */
function createChild() {
  const child = new EventEmitter()
  child.pid = 4242
  child.killed = false
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  const stdin = new EventEmitter()
  stdin.written = []
  stdin.ended = false
  stdin.write = chunk => {
    stdin.written.push(String(chunk))
    return true
  }
  stdin.end = () => {
    stdin.ended = true
  }
  child.stdin = stdin
  child.kill = () => {
    child.killed = true
    return true
  }
  return child
}

/**
 * A fake MCP server on the other end of a fake child.
 *
 * Every write is decoded with a fresh decoder, so the server understands both
 * framings and the client's framing switch is observable rather than assumed.
 */
function createStdioServer(handler, options = {}) {
  const child = createChild()
  const inbox = []
  child.protocolErrors = []
  const write = child.stdin.write
  child.stdin.write = chunk => {
    write.call(child.stdin, chunk)
    for (const message of decodeStdioChunk(createStdioDecoder(), String(chunk)).messages) {
      inbox.push(message)
      const answer = handler(message, child)
      if (answer === undefined || answer === null) continue
      queueMicrotask(() => child.stdout.emit('data', encodeStdioFrame(answer, options.framing ?? 'newline')))
    }
    return true
  }
  if (typeof options.noise === 'string') {
    queueMicrotask(() => child.stdout.emit('data', options.noise))
  }
  return { child, inbox }
}

/** The tools one fake server publishes: one honest, one that reports an error. */
const FAKE_TOOLS = [
  {
    name: 'echo',
    description: 'Echo the text back',
    inputSchema: { type: 'object', properties: { text: { type: 'string', format: 'text' } }, required: ['text'] },
  },
  { name: 'fail', description: 'Always fails', inputSchema: { type: 'object' } },
]

/**
 * The standard fake server: handshake, discovery, ping, and two tools.
 * @param options - the advertised revision, the tools, and the call behaviour.
 */
function fakeServerHandler(options = {}) {
  const tools = options.tools ?? FAKE_TOOLS
  const protocolVersion = options.protocolVersion ?? DEFAULT_PROTOCOL_VERSION
  return (message, child) => {
    if (message.id === undefined) {
      if (options.onNotification !== undefined) {
        queueMicrotask(() => options.onNotification(message))
      }
      return undefined
    }
    switch (message.method) {
      case 'initialize':
        if (options.refuse !== undefined && options.refuse.includes(message.params?.protocolVersion)) {
          return fault(message.id, -32602, `Unsupported protocol version ${message.params?.protocolVersion}`)
        }
        return reply(message.id, {
          protocolVersion,
          serverInfo: { name: 'fake-server', version: '1.2.3' },
          capabilities: { tools: {} },
        })
      case 'tools/list':
        return reply(message.id, { tools: tools.map(tool => ({ ...tool })) })
      case 'ping':
        return reply(message.id, {})
      case 'tools/call': {
        if (options.call !== undefined) return options.call(message, child)
        const name = message.params?.name
        if (name === 'echo') {
          return reply(message.id, { content: [{ type: 'text', text: `echo: ${message.params?.arguments?.text ?? ''}` }] })
        }
        return reply(message.id, { content: [{ type: 'text', text: 'the tool said no' }], isError: true })
      }
      default:
        return fault(message.id, -32601, `Unknown method ${message.method}`)
    }
  }
}

/** A ToolRuntime-shaped registry that records definitions and their disposers. */
function createRegistry(options = {}) {
  const definitions = new Map()
  return {
    definitions,
    register(definition) {
      if (options.reject === true) throw new Error('a foreign registration squats on this namespace')
      if (definitions.has(definition.name)) throw new Error(`duplicate tool ${definition.name}`)
      definitions.set(definition.name, definition)
      return () => {
        definitions.delete(definition.name)
        if (options.onDispose !== undefined) options.onDispose(definition.name)
      }
    },
  }
}

/** A `fetch` that answers JSON-RPC with JSON or with an event stream. */
function createHttpServer(handler, options = {}) {
  const requests = []
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body)
    requests.push({ url, headers: init.headers, body })
    const answer = handler(body)
    if (answer === undefined) return new Response(null, { status: 202 })
    const session = { 'mcp-session-id': options.sessionId ?? 'session-1' }
    if (options.stream === true) {
      return new Response(`data: ${JSON.stringify(answer)}\n\n`, {
        status: 200,
        headers: { 'content-type': 'text/event-stream', ...session },
      })
    }
    return new Response(JSON.stringify(answer), {
      status: 200,
      headers: { 'content-type': 'application/json', ...session },
    })
  }
  return { requests, fetch }
}

/** An in-memory store with the same contract as the file-backed one. */
function createMemoryStore(servers = []) {
  const state = { servers: servers.map(entry => structuredClone(entry)), error: undefined }
  return {
    state,
    read() {
      return { servers: state.servers.map(entry => structuredClone(entry)), ...(state.error === undefined ? {} : { error: state.error }) }
    },
    write(next) {
      state.servers = next.map(entry => structuredClone(entry))
      return { ok: true }
    },
  }
}

/** One fake `spawn` that answers one command per server name. */
function createSpawnTable(table) {
  const spawned = []
  const spawn = (command) => {
    spawned.push(command)
    const entry = table[command]
    if (entry === undefined) {
      const error = new Error(`spawn ${command} ENOENT`)
      error.code = 'ENOENT'
      throw error
    }
    const child = entry.child ?? entry
    child.spawnedWith = command
    return child
  }
  return { spawn, spawned }
}

/** A context-shaped Host: the effect scope, the route registry, and a logger. */
function createContext() {
  const routes = []
  const disposers = []
  const warnings = []
  const ctx = {
    logger: { warn: (...args) => warnings.push(args.map(String).join(' ')) },
    effect(callback) {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
      return dispose
    },
    inject(names, callback) {
      ctx.injected = names
      if (typeof callback === 'function') callback({ effect: fn => fn() })
    },
    get: () => undefined,
    connection: {
      fetch: {
        register(route) {
          routes.push(route)
          return () => routes.splice(routes.indexOf(route), 1)
        },
      },
    },
  }
  return { ctx, routes, disposers, warnings }
}

/** One request against the route. */
const post = body => new Request(`http://host${MCP_PATH}`, { method: 'POST', body: JSON.stringify(body) })

/**
 * Run one operation while the event loop has something else to do.
 *
 * Every deadline in the client is `unref`'d, because a Host's process must never
 * be held open by a timer waiting on a server. That is exactly right in the
 * product and awkward in a test whose only pending work is that timer, so the
 * test keeps the loop alive itself instead of the client keeping it alive.
 */
async function whileClockRuns(operation) {
  const keepAlive = setInterval(() => {}, 50)
  try {
    return await operation()
  } finally {
    clearInterval(keepAlive)
  }
}

/** Let every queued microtask, timer callback and I/O completion run. */
async function settle() {
  await new Promise(resolve => {
    setTimeout(resolve, 20)
  })
}

/**
 * Run one block with the MCP store pointed at a throwaway profile.
 *
 * `apply(ctx)` builds its own manager, and `createManager`'s store path defaults
 * to `resolveStorePath()` — **this machine's real `~/.dsh/mcp/servers.json`**.
 * A test that calls `apply` therefore used to read the developer's own server
 * list and `startEnabled()` it: a real `node.exe` (the playwright MCP server, here)
 * was spawned during the suite, and because the manager's disposal is fire-and-
 * forget the child outlived the run and the process never exited. Pointing the
 * profile at a temp directory makes the store empty, so nothing is started and
 * nothing is read that belongs to the user — a suite that touches real
 * configuration is a bug whether or not it leaks.
 * @param operation - the block to run.
 */
async function withTempProfile(operation) {
  const previous = process.env.DSH_PROFILE_DIR
  const dir = mkdtempSync(join(tmpdir(), 'edh-mcp-profile-'))
  process.env.DSH_PROFILE_DIR = dir
  try {
    return await operation(dir)
  } finally {
    if (previous === undefined) delete process.env.DSH_PROFILE_DIR
    else process.env.DSH_PROFILE_DIR = previous
    rmSync(dir, { recursive: true, force: true })
  }
}

/** A manager over a fake stdio server and a fake registry. */
function startFakeManager(options = {}) {
  const server = createStdioServer(fakeServerHandler(options), options)
  const registry = createRegistry(options.registry)
  const store = createMemoryStore(options.servers ?? [])
  const { spawn } = createSpawnTable({ 'fake-mcp': server.child })
  const warnings = []
  const manager = createManager({
    store,
    spawn,
    getTools: () => registry,
    logger: { warn: message => warnings.push(String(message)) },
    timeoutMs: options.timeoutMs ?? CALL_TIMEOUT_MS,
    connectTimeoutMs: options.connectTimeoutMs ?? 2000,
  })
  return { manager, server, registry, store, warnings }
}

/** The standard stored record for the fake server. */
const FAKE_RECORD = {
  id: 'fake-tools',
  label: 'Fake tools',
  transport: 'stdio',
  command: 'fake-mcp',
  args: ['--stdio'],
  env: { GITHUB_TOKEN: 'super-secret-value' },
  enabled: true,
}

// ---------------------------------------------------------------------------
// 1 — JSON-RPC frame construction
// ---------------------------------------------------------------------------
{
  assert.deepEqual(
    { jsonrpc: '2.0', id: 7, method: 'ping' },
    JSON.parse(encodeStdioFrame({ jsonrpc: '2.0', id: 7, method: 'ping' })),
  )
  assert.equal(encodeStdioFrame({ method: 'notifications/initialized' }), '{"method":"notifications/initialized"}\n')
  assert.equal(
    encodeStdioFrame({ jsonrpc: '2.0', id: 1, method: 'ping' }, 'content-length'),
    'Content-Length: 40\r\n\r\n{"jsonrpc":"2.0","id":1,"method":"ping"}',
  )
  // A multi-byte body counts bytes, not characters.
  const accented = encodeStdioFrame({ text: 'héllo' }, 'content-length')
  assert.equal(Number(/^Content-Length: (\d+)/u.exec(accented)[1]), Buffer.byteLength('{"text":"héllo"}', 'utf8'))
}

// ---------------------------------------------------------------------------
// 2 — newline framing: a partial frame waits, then resolves
// ---------------------------------------------------------------------------
{
  const state = createStdioDecoder()
  assert.deepEqual(decodeStdioChunk(state, '{"id":1,"result":{"tools":').messages, [])
  assert.equal(state.buffer, '{"id":1,"result":{"tools":')
  const rest = decodeStdioChunk(state, '[]}}\n{"id":2,"result":{}}\n')
  assert.deepEqual(
    rest.messages.map(message => message.id),
    [1, 2],
  )
  assert.deepEqual(rest.messages[0].result, { tools: [] })
  assert.equal(state.buffer, '')
  assert.equal(state.framing, 'newline')
}

// ---------------------------------------------------------------------------
// 3 — header framing: encoded by us, decoded by us, split mid-frame
// ---------------------------------------------------------------------------
{
  const message = { jsonrpc: '2.0', id: 3, result: { content: [{ type: 'text', text: 'héllo ✓' }] } }
  const frame = encodeStdioFrame(message, 'content-length')
  const state = createStdioDecoder()
  const cut = 30
  const first = decodeStdioChunk(state, frame.slice(0, cut))
  assert.deepEqual(first.messages, [])
  const second = decodeStdioChunk(state, frame.slice(cut))
  assert.deepEqual(second.messages, [message])
  assert.equal(state.framing, 'content-length')
  // Two frames in one chunk, the second header-framed too.
  const both = decodeStdioChunk(createStdioDecoder(), `${frame}${encodeStdioFrame({ jsonrpc: '2.0', id: 4 }, 'content-length')}`)
  assert.deepEqual(
    both.messages.map(entry => entry.id),
    [3, 4],
  )
}

// ---------------------------------------------------------------------------
// 4 — an unparseable stdout line is reported, and its neighbours survive
// ---------------------------------------------------------------------------
{
  const state = createStdioDecoder()
  const decoded = decodeStdioChunk(state, 'this is not json\n{"jsonrpc":"2.0","id":9,"result":{}}\n')
  assert.equal(decoded.messages.length, 1)
  assert.equal(decoded.messages[0].id, 9)
  assert.equal(decoded.errors.length, 1)
  assert.equal(decoded.errors[0].reason, 'unparseable-frame')
  assert.equal(decoded.errors[0].text, 'this is not json')
  // A header block that carries no length is dropped, not buffered forever.
  const broken = decodeStdioChunk(createStdioDecoder(), 'Content-Length: x\r\n\r\n{"id":1}\n')
  assert.equal(broken.messages.length, 0)
  assert.equal(broken.errors.length, 1)
}

// ---------------------------------------------------------------------------
// 5 — server-sent events: keep-alives are skipped, data blocks are parsed
// ---------------------------------------------------------------------------
{
  const messages = parseSseBody(
    ': keep-alive\n\ndata: {"jsonrpc":"2.0","id":1,"result":{}}\n\nevent: message\ndata: {"jsonrpc":"2.0",\ndata: "id":2}\n\n',
  )
  assert.deepEqual(
    messages.map(message => message.id),
    [1, 2],
  )
  assert.deepEqual(parseSseBody('not an event stream'), [])
}

// ---------------------------------------------------------------------------
// 6 — the channel: a deadline rejects the call that missed it
// ---------------------------------------------------------------------------
{
  const channel = createChannel({ deliver: () => undefined, timeoutMs: 20 })
  const failed = await whileClockRuns(() =>
    channel.call('tools/list').then(
      () => undefined,
      error => error,
    ),
  )
  assert.ok(failed instanceof McpError)
  assert.equal(failed.code, 'TIMEOUT')
  assert.match(failed.message, /No response from tools\/list within 20 ms/u)
  assert.equal(channel.pendingCount(), 0)
}

// ---------------------------------------------------------------------------
// 7 — the channel: a terminal failure rejects everything, late calls included
// ---------------------------------------------------------------------------
{
  const channel = createChannel({ deliver: () => undefined, timeoutMs: 5000 })
  const pending = channel.call('initialize')
  channel.fail('SERVER_EXIT', 'Server exited with code 1')
  const settled = await pending.then(
    () => undefined,
    error => error,
  )
  assert.equal(settled.code, 'SERVER_EXIT')
  assert.equal(settled.message, 'Server exited with code 1')
  const late = await channel.call('ping').then(
    () => undefined,
    error => error,
  )
  assert.equal(late.code, 'SERVER_EXIT', 'a dead channel fails fast instead of waiting')
  assert.equal(channel.failed(), true)
}

// ---------------------------------------------------------------------------
// 8 — the channel: one inbound message resolves exactly one call
// ---------------------------------------------------------------------------
{
  const channel = createChannel({ deliver: () => undefined, timeoutMs: 5000 })
  const first = channel.call('ping')
  const second = channel.call('tools/list')
  channel.accept({ jsonrpc: '2.0', id: 2, result: { tools: [] } })
  channel.accept({ jsonrpc: '2.0', method: 'notifications/message', params: { level: 'info' } })
  channel.accept({ jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Unknown method' } })
  assert.deepEqual(await second, { tools: [] })
  const rejected = await first.then(
    () => undefined,
    error => error,
  )
  assert.equal(rejected.code, 'RPC')
  assert.equal(rejected.message, 'Unknown method')
  assert.equal(rejected.rpcCode, -32601)
  assert.equal(channel.pendingCount(), 0)
}

// ---------------------------------------------------------------------------
// 9 — stdio transport: the handshake goes on the wire in the peer's framing
// ---------------------------------------------------------------------------
{
  const server = createStdioServer(fakeServerHandler(), { framing: 'content-length' })
  const transport = createStdioTransport({
    command: 'fake-mcp',
    args: ['--stdio'],
    spawn: () => server.child,
    timeoutMs: 2000,
  })
  assert.equal(transport.kind, 'stdio')
  const connection = await openConnection({ transport, timeoutMs: 2000 })
  assert.equal(connection.protocolVersion, DEFAULT_PROTOCOL_VERSION)
  assert.deepEqual(connection.serverInfo, { name: 'fake-server', version: '1.2.3' })
  const tools = await connection.listTools()
  assert.deepEqual(
    tools.map(tool => tool.name),
    ['echo', 'fail'],
  )
  assert.deepEqual(
    server.inbox.map(message => message.method),
    ['initialize', 'notifications/initialized', 'tools/list'],
  )
  // The first request left newline-framed; the peer answered header-framed, so
  // every later request adopts the peer's framing.
  assert.ok(server.child.stdin.written[0].endsWith('}\n'))
  assert.match(server.child.stdin.written[1], /^Content-Length: \d+\r\n\r\n/u)
  assert.equal(transport.framing(), 'content-length')
  assert.equal(await connection.ping(), true)
  transport.close()
  assert.equal(server.child.stdin.ended, true)
  assert.equal(server.child.killed, true)
}

// ---------------------------------------------------------------------------
// 10 — protocol negotiation falls back to the older revision the peer accepts
// ---------------------------------------------------------------------------
{
  const server = createStdioServer(fakeServerHandler({ refuse: [DEFAULT_PROTOCOL_VERSION], protocolVersion: '2025-06-18' }))
  const transport = createStdioTransport({ command: 'fake-mcp', spawn: () => server.child, timeoutMs: 2000 })
  const connection = await openConnection({ transport, timeoutMs: 2000 })
  assert.equal(connection.protocolVersion, '2025-06-18')
  assert.deepEqual(
    server.inbox.filter(message => message.method === 'initialize').map(message => message.params.protocolVersion),
    SUPPORTED_PROTOCOL_VERSIONS,
    'the newest revision first, then the next one it offers',
  )
  transport.close()
}

// ---------------------------------------------------------------------------
// 11 — discovery: pagination is followed, a duplicate name is a protocol error
// ---------------------------------------------------------------------------
{
  const pages = [
    { tools: [{ name: 'a', inputSchema: { type: 'object' } }], nextCursor: 'page-2' },
    { tools: [{ name: 'b', inputSchema: { type: 'object' } }] },
  ]
  let page = 0
  const paged = createStdioTransport({
    command: 'fake-mcp',
    spawn: () =>
      createStdioServer(message => {
        if (message.method === 'initialize') return reply(message.id, { protocolVersion: DEFAULT_PROTOCOL_VERSION, capabilities: { tools: {} } })
        if (message.method === 'tools/list') return reply(message.id, pages[page++])
        return undefined
      }).child,
    timeoutMs: 2000,
  })
  const discovered = await openConnection({ transport: paged, timeoutMs: 2000 })
  assert.deepEqual(
    (await discovered.listTools()).map(tool => tool.name),
    ['a', 'b'],
  )
  paged.close()

  const duplicates = createStdioTransport({
    command: 'fake-mcp',
    spawn: () =>
      createStdioServer(message => {
        if (message.method === 'initialize') return reply(message.id, { protocolVersion: DEFAULT_PROTOCOL_VERSION, capabilities: { tools: {} } })
        if (message.method === 'tools/list') return reply(message.id, { tools: [{ name: 'a' }, { name: 'a' }] })
        return undefined
      }).child,
    timeoutMs: 2000,
  })
  const second = await openConnection({ transport: duplicates, timeoutMs: 2000 })
  const rejected = await second.listTools().then(
    () => undefined,
    error => error,
  )
  assert.equal(rejected.code, 'PROTOCOL')
  assert.match(rejected.message, /listed tool "a" more than once/u)
  duplicates.close()
}

// ---------------------------------------------------------------------------
// 12 — schema projection: the harness subset is all a server's schema may reach
// ---------------------------------------------------------------------------
{
  assert.deepEqual(sanitizeJsonSchema({ type: 'object', properties: { text: { type: 'string', format: 'text' } } }), {
    type: 'object',
    properties: { text: { type: 'string' } },
  })
  assert.deepEqual(sanitizeJsonSchema({ anyOf: [{ type: 'string' }, { type: 'number' }] }), {})
  assert.deepEqual(sanitizeJsonSchema({ type: ['string', 'null'] }), { oneOf: [{ type: 'string' }, { type: 'null' }] })
  assert.deepEqual(sanitizeJsonSchema({ type: 'object', additionalProperties: { type: 'string' } }), { type: 'object' })
  assert.deepEqual(sanitizeJsonSchema({ type: 'object', properties: { a: { type: 'string' } }, required: ['a', 'ghost'] }), {
    type: 'object',
    properties: { a: { type: 'string' } },
    required: ['a'],
  })
  assert.deepEqual(sanitizeJsonSchema({ type: 'string', enum: ['a', 'b'], description: 'pick' }), {
    description: 'pick',
    type: 'string',
    enum: ['a', 'b'],
  })
  assert.deepEqual(sanitizeJsonSchema({ type: 'string', enum: ['a', 2] }), { type: 'string' })
  assert.deepEqual(sanitizeJsonSchema({ $ref: '#/defs/x' }), {})
  assert.deepEqual(sanitizeJsonSchema(undefined), {})
  // Every projected tree is inside the subset the registry admits.
  const allowed = new Set([
    'type',
    'oneOf',
    'properties',
    'required',
    'additionalProperties',
    'items',
    'enum',
    'const',
    'description',
    'title',
    'default',
    'examples',
  ])
  const deep = sanitizeJsonSchema({
    type: 'object',
    properties: { a: { type: 'array', items: { anyOf: [{ type: 'string' }], format: 'x' } } },
    additionalProperties: false,
  })
  for (const key of Object.keys(deep)) assert.ok(allowed.has(key), `unexpected keyword ${key}`)
  assert.deepEqual(deep.properties.a.items, {}, 'an unsupported item schema becomes unconstrained JSON')
}

// ---------------------------------------------------------------------------
// 13 — the public tool name: pinned shape, repaired only when it has to be
// ---------------------------------------------------------------------------
{
  assert.equal(toolNameFor('github', 'create_issue'), 'mcp__github__create_issue')
  assert.match(toolNameFor('github', 'create.issue'), /^mcp__github__create_issue_[0-9a-f]{12}$/u)
  const long = toolNameFor('server', 'x'.repeat(90))
  assert.equal(long.length, 64)
  assert.match(long, /_[0-9a-f]{12}$/u)
  assert.notEqual(long, toolNameFor('server', `${'x'.repeat(90)}y`), 'distinct identities never collapse')
  // A clean name is the identity, so history and permission rules stay stable.
  assert.equal(toolNameFor('server', 'x'.repeat(40)), `mcp__server__${'x'.repeat(40)}`)
}

// ---------------------------------------------------------------------------
// 14 — one tool definition: schema, render, dispatch, and error mapping
// ---------------------------------------------------------------------------
{
  const definition = toolDefinition({
    server: { id: 'fake-tools' },
    tool: FAKE_TOOLS[0],
    call: async args => ({ content: [{ type: 'text', text: `echo: ${args.text}` }] }),
  })
  assert.equal(definition.name, 'mcp__fake-tools__echo')
  assert.equal(definition.description, 'Echo the text back')
  assert.deepEqual(definition.parameters, { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] })
  assert.deepEqual(definition.output.schema, TOOL_OUTPUT_SCHEMA)
  const value = await definition.execute({ text: 'hi' }, {})
  assert.deepEqual(value, { content: [{ type: 'text', text: 'echo: hi' }] })
  assert.deepEqual(definition.output.render({}, value), [{ type: 'text', text: 'echo: hi' }])

  const failing = toolDefinition({
    server: { id: 'fake-tools' },
    tool: FAKE_TOOLS[1],
    call: async () => ({ content: [{ type: 'text', text: 'the tool said no' }], isError: true }),
  })
  const thrown = await failing.execute({}, {}).then(
    () => undefined,
    error => error,
  )
  assert.equal(thrown.code, 'TOOL')
  assert.equal(thrown.message, 'the tool said no')

  // An unnamed server still produces a valid identity, and a bare tool gets an
  // object-rooted parameters schema so a caller can always pass a record.
  const bare = toolDefinition({ server: { id: 's' }, tool: { name: 'bare' }, call: async () => ({ content: [] }) })
  assert.deepEqual(bare.parameters, { type: 'object' })
  assert.equal(bare.description, '')
  const empty = await bare.execute({}, {})
  assert.deepEqual(bare.output.render({}, empty), [{ type: 'text', text: 'The tool "bare" returned no content' }])
}

// ---------------------------------------------------------------------------
// 15 — result content: text passes through, everything else is a diagnostic
// ---------------------------------------------------------------------------
{
  assert.equal(
    contentText([
      { type: 'text', text: 'first' },
      { type: 'image', mimeType: 'image/png' },
      { type: 'audio', mimeType: 'audio/wav' },
      { type: 'resource_link', name: 'notes', uri: 'file:///notes.md' },
      { type: 'resource', resource: { uri: 'file:///x.txt', text: 'body' } },
      { type: 'something-new' },
      null,
    ]),
    'first\n[image image/png]\n[audio audio/wav]\n[resource link: notes file:///notes.md]\n[resource: file:///x.txt]\nbody\n[unsupported content: something-new]',
  )
  assert.equal(contentText([]), '')
  const long = contentText([{ type: 'text', text: 'y'.repeat(30000) }])
  assert.match(long, /characters not shown\)$/u)
  assert.ok(long.length < 24100)
}

// ---------------------------------------------------------------------------
// 16 — the store path: the harness profile's own data area, never this package
// ---------------------------------------------------------------------------
{
  assert.equal(
    resolveProfileDir({ DSH_PROFILE_DIR: 'C:\\prof\\desktop', DSH_HOME: 'C:\\home' }, 'C:\\Users\\x'),
    'C:\\prof\\desktop',
  )
  assert.equal(
    resolveProfileDir({ DSH_HOME: '/home/dsh', DSH_PROFILE: 'desktop' }, '/elsewhere'),
    join('/home/dsh', 'profiles', 'desktop'),
  )
  assert.equal(resolveProfileDir({ DSH_PROFILE: 'desktop' }, '/elsewhere'), join('/elsewhere', '.dsh', 'profiles', 'desktop'))
  assert.equal(resolveProfileDir({}, '/elsewhere'), join('/elsewhere', '.dsh'))
  assert.equal(resolveProfileDir({ DSH_PROFILE_DIR: '   ' }, '/elsewhere'), join('/elsewhere', '.dsh'), 'a blank override is unset')
  assert.equal(resolveStorePath({ DSH_PROFILE_DIR: '/p' }), join('/p', '.edh', 'mcp.json'))
  assert.match(MCP_PATH, /^\/api\/edh\.mcp$/u)
}

// ---------------------------------------------------------------------------
// 17 — normalisation: the stored record shape, and the spellings accepted
// ---------------------------------------------------------------------------
{
  const stdio = normalizeServer({
    label: 'GitHub tools',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'server-github', 7],
    env: { GITHUB_TOKEN: 'x', BAD: 1 },
    token: 'secret',
  })
  assert.deepEqual(stdio, {
    ok: true,
    server: {
      id: 'github-tools',
      label: 'GitHub tools',
      transport: 'stdio',
      enabled: true,
      command: 'npx',
      args: ['-y', 'server-github'],
      env: { GITHUB_TOKEN: 'x' },
      token: 'secret',
    },
  })
  const http = normalizeServer({ id: 'web', label: 'Web', transport: 'streamable-http', url: 'http://localhost:3000/mcp', authorization: 'token abc' })
  assert.equal(http.server.transport, 'http', 'the shipped spelling is accepted')
  assert.equal(http.server.token, 'token abc')
  assert.deepEqual(Object.keys(http.server).sort(), ['enabled', 'id', 'label', 'token', 'transport', 'url'])

  assert.equal(normalizeServer(null).reason, 'bad-input')
  assert.equal(normalizeServer({ label: 'x', transport: 'sse' }).reason, 'bad-transport')
  assert.equal(normalizeServer({ label: 'x', transport: 'stdio' }).reason, 'bad-command')
  assert.equal(normalizeServer({ label: 'x', transport: 'http', url: 'file:///etc/passwd' }).reason, 'bad-url')
  assert.equal(normalizeServer({ id: 'has space', label: 'x', transport: 'stdio', command: 'c' }).reason, 'bad-id')
  assert.equal(normalizeServer({ label: '!!!', transport: 'stdio', command: 'c' }).reason, 'bad-id', 'a label cannot slugify to nothing')
  assert.equal(normalizeServer({ id: 'a'.repeat(33), transport: 'stdio', command: 'c' }).reason, 'bad-id')
}

// ---------------------------------------------------------------------------
// 18 — the view: key names, never values; a token is only ever a flag
// ---------------------------------------------------------------------------
{
  const record = normalizeServer(FAKE_RECORD).server
  const view = serverView(record, { status: 'ready', protocolVersion: '2025-06-18', serverInfo: { name: 'fake', version: '1' }, tools: ['mcp__fake-tools__echo'], toolsRegistered: true })
  assert.deepEqual(view, {
    id: 'fake-tools',
    label: 'Fake tools',
    transport: 'stdio',
    enabled: true,
    status: 'ready',
    lastError: '',
    toolCount: 1,
    tools: ['mcp__fake-tools__echo'],
    toolsRegistered: true,
    hasToken: false,
    command: 'fake-mcp',
    args: ['--stdio'],
    envKeys: ['GITHUB_TOKEN'],
    protocolVersion: '2025-06-18',
    serverInfo: { name: 'fake', version: '1' },
  })
  const body = JSON.stringify(view)
  assert.ok(!body.includes('super-secret-value'), 'an environment value never reaches the browser half')
  assert.ok(!body.includes('token"'), 'no token field at all')

  const withSecret = serverView({ ...record, token: 'abc' }, undefined)
  assert.equal(withSecret.hasToken, true)
  assert.equal(withSecret.status, 'stopped')
  assert.equal(withSecret.toolCount, 0)
  assert.ok(!JSON.stringify(withSecret).includes('"abc"'))

  const whole = mcpView({ storePath: '/p', servers: [record], states: new Map(), toolsAvailable: true })
  assert.equal(whole.ok, true)
  assert.equal(whole.toolCount, 0)
  assert.equal(whole.servers.length, 1)
  assert.ok(!JSON.stringify(whole).includes('super-secret-value'))
}

// ---------------------------------------------------------------------------
// 19 — the environment: ambient credentials and DSH_* names are scrubbed
// ---------------------------------------------------------------------------
{
  const env = stdioEnvironment(
    { env: { GITHUB_TOKEN: 'explicit', PATH: '/usr/bin' } },
    { GITHUB_TOKEN: 'ambient', ACTIONS_TOKEN: 'ambient', HOME: '/home/x', DSH_HOME: '/home/x/.dsh', PATH: '/usr/bin' },
  )
  assert.deepEqual(env, { GITHUB_TOKEN: 'explicit', HOME: '/home/x', PATH: '/usr/bin' })
}

// ---------------------------------------------------------------------------
// 20 — the file store: a missing file is empty, a corrupt one is reported
// ---------------------------------------------------------------------------
{
  const directory = mkdtempSync(join(tmpdir(), 'edh-mcp-'))
  const path = join(directory, '.edh', 'mcp.json')
  const store = createFileStore(path)
  assert.deepEqual(store.read(), { servers: [] }, 'a first run is an empty list, not an error')
  assert.deepEqual(store.write([FAKE_RECORD]), { ok: true })
  const read = store.read()
  assert.equal(read.error, undefined)
  assert.equal(read.servers.length, 1)
  assert.equal(read.servers[0].id, 'fake-tools')
  assert.equal(read.servers[0].env.GITHUB_TOKEN, 'super-secret-value', 'the Host keeps the secret on disk')
  const onDisk = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(onDisk.version, 1)
  assert.equal(onDisk.servers.length, 1)

  writeFileSync(path, '{ not json', 'utf8')
  const broken = store.read()
  assert.deepEqual(broken.servers, [])
  assert.match(broken.error, /not valid JSON/u)

  writeFileSync(path, JSON.stringify({ servers: [FAKE_RECORD, { id: 'bad id' }] }), 'utf8')
  const partial = store.read()
  assert.equal(partial.servers.length, 1, 'the readable records still load')
  assert.match(partial.error, /1 stored server could not be read/u)
  rmSync(directory, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 21 — one server end to end: start, discover, register, call, stop
// ---------------------------------------------------------------------------
{
  const { manager, registry, store } = startFakeManager({ servers: [FAKE_RECORD] })
  const started = await manager.start('fake-tools')
  assert.equal(started.ok, true)
  assert.equal(started.toolCount, 2)
  assert.deepEqual([...registry.definitions.keys()].sort(), ['mcp__fake-tools__echo', 'mcp__fake-tools__fail'])

  const view = manager.view()
  assert.equal(view.toolsAvailable, true)
  assert.equal(view.servers[0].status, 'ready')
  assert.equal(view.servers[0].toolCount, 2)
  assert.equal(view.toolCount, 2)
  assert.equal(view.servers[0].label, 'Fake tools')

  const called = await manager.call('fake-tools', 'echo', { text: 'hi' })
  assert.equal(called.ok, true)
  assert.equal(called.text, 'echo: hi')
  const toolError = await manager.call('fake-tools', 'fail', {})
  assert.equal(toolError.ok, false)
  assert.equal(toolError.reason, 'tool-error')
  assert.equal(toolError.message, 'the tool said no')

  // The registered definition dispatches straight back into the server.
  const echo = registry.definitions.get('mcp__fake-tools__echo')
  assert.deepEqual(await echo.execute({ text: 'via tool' }, {}), { content: [{ type: 'text', text: 'echo: via tool' }] })

  const stopped = await manager.stop('fake-tools')
  assert.equal(stopped.ok, true)
  assert.equal(registry.definitions.size, 0, 'stopping removes every tool this server owned')
  assert.equal(manager.view().servers[0].status, 'stopped')
  assert.equal(manager.view().servers[0].toolCount, 0)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 22 — a server that dies mid-call is one report, and the other server works
// ---------------------------------------------------------------------------
{
  const dying = createStdioServer(
    fakeServerHandler({
      call: (message, child) => {
        queueMicrotask(() => child.emit('exit', 7, null))
        return undefined
      },
    }),
  )
  const alive = createStdioServer(fakeServerHandler())
  const registry = createRegistry()
  const store = createMemoryStore([
    { ...FAKE_RECORD, id: 'dying', command: 'dying-mcp' },
    { ...FAKE_RECORD, id: 'alive', command: 'alive-mcp' },
  ])
  const { spawn } = createSpawnTable({ 'dying-mcp': dying.child, 'alive-mcp': alive.child })
  const warnings = []
  const manager = createManager({
    store,
    spawn,
    getTools: () => registry,
    logger: { warn: message => warnings.push(String(message)) },
    timeoutMs: 2000,
    connectTimeoutMs: 2000,
  })
  assert.equal((await manager.start('dying')).ok, true)
  assert.equal((await manager.start('alive')).ok, true)
  const view = manager.view()
  assert.deepEqual(
    view.servers.map(server => server.status),
    ['ready', 'ready'],
  )

  const failed = await manager.call('dying', 'echo', { text: 'gone' })
  assert.equal(failed.ok, false)
  assert.equal(failed.reason, 'SERVER_EXIT')
  assert.equal(failed.message, 'Server exited with code 7')
  assert.equal((await manager.call('alive', 'echo', { text: 'still here' })).text, 'echo: still here')
  assert.ok(warnings.some(line => line.includes('edh-mcp(dying)')))
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 23 — an unparseable stdout line is a warning, not a lost call
// ---------------------------------------------------------------------------
{
  const noise = 'starting up: not json\n'
  const server = createStdioServer(fakeServerHandler(), { noise })
  const transport = createStdioTransport({
    command: 'fake-mcp',
    spawn: () => server.child,
    timeoutMs: 2000,
    onProtocolError: message => server.child.protocolErrors.push(message),
  })
  const connection = await openConnection({ transport, timeoutMs: 2000 })
  assert.deepEqual(
    (await connection.listTools()).map(tool => tool.name),
    ['echo', 'fail'],
    'the call after the bad line still answers',
  )
  assert.equal(server.child.protocolErrors.length, 1)
  assert.match(server.child.protocolErrors[0], /Could not parse unparseable-frame from the server: starting up: not json/u)
  transport.close()
}

// ---------------------------------------------------------------------------
// 24 — a call that never answers is a timeout, and the manager reports it
// ---------------------------------------------------------------------------
{
  const silent = createStdioServer(
    fakeServerHandler({
      call: () => undefined,
    }),
  )
  const registry = createRegistry()
  const { spawn } = createSpawnTable({ 'fake-mcp': silent.child })
  const manager = createManager({
    store: createMemoryStore([FAKE_RECORD]),
    spawn,
    getTools: () => registry,
    logger: { warn() {} },
    timeoutMs: 30,
    connectTimeoutMs: 2000,
  })
  assert.equal((await manager.start('fake-tools')).ok, true)
  const timedOut = await whileClockRuns(() => manager.call('fake-tools', 'echo', { text: 'nobody home' }))
  assert.equal(timedOut.ok, false)
  assert.equal(timedOut.reason, 'TIMEOUT')
  assert.match(timedOut.message, /No response from tools\/call within 30 ms/u)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 25 — a server that will not spawn is a report, and the store still loads
// ---------------------------------------------------------------------------
{
  const manager = createManager({
    store: createMemoryStore([FAKE_RECORD]),
    spawn: () => {
      throw new Error('spawn fake-mcp ENOENT')
    },
    getTools: () => createRegistry(),
    logger: { warn() {} },
    timeoutMs: 2000,
    connectTimeoutMs: 2000,
  })
  const started = await manager.start('fake-tools')
  assert.equal(started.ok, false)
  assert.equal(started.status, 'error')
  assert.match(started.message, /spawn fake-mcp ENOENT/u)
  const view = manager.view()
  assert.equal(view.servers[0].status, 'error')
  assert.match(view.servers[0].lastError, /ENOENT/u)
  assert.equal(view.servers[0].toolCount, 0)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 26 — without a tool registry the tools are discovered and the view says so
// ---------------------------------------------------------------------------
{
  const server = createStdioServer(fakeServerHandler())
  const { spawn } = createSpawnTable({ 'fake-mcp': server.child })
  const manager = createManager({
    store: createMemoryStore([FAKE_RECORD]),
    spawn,
    getTools: () => undefined,
    logger: { warn() {} },
    timeoutMs: 2000,
    connectTimeoutMs: 2000,
  })
  const started = await manager.start('fake-tools')
  assert.equal(started.ok, false)
  assert.equal(started.reason, 'tools-unavailable')
  const view = manager.view()
  assert.equal(view.toolsAvailable, false)
  assert.equal(view.servers[0].status, 'ready')
  assert.equal(view.servers[0].toolsRegistered, false)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 27 — a rejected registration rolls the whole generation back
// ---------------------------------------------------------------------------
{
  const { manager, registry } = startFakeManager({ servers: [FAKE_RECORD], registry: { reject: true } })
  const started = await manager.start('fake-tools')
  assert.equal(started.ok, false)
  assert.equal(started.reason, 'registration')
  assert.equal(registry.definitions.size, 0, 'no tool from this server stays active')
  assert.match(manager.view().servers[0].lastError, /no tools from this server are active/u)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 28 — Streamable HTTP: session id, protocol header, one call, an SSE answer
// ---------------------------------------------------------------------------
{
  const server = createHttpServer(message => {
    if (message.method === 'initialize') {
      return reply(message.id, { protocolVersion: '2026-07-28', serverInfo: { name: 'http-fake' }, capabilities: { tools: {} } })
    }
    if (message.method === 'notifications/initialized') return undefined
    if (message.method === 'tools/list') return reply(message.id, { tools: [{ name: 'search', inputSchema: { type: 'object' } }] })
    if (message.method === 'tools/call') return reply(message.id, { content: [{ type: 'text', text: 'found it' }] })
    return fault(message.id, -32601, 'unknown')
  }, { stream: true })
  const transport = createHttpTransport({ url: 'http://localhost:3000/mcp', token: 'abc', fetch: server.fetch, timeoutMs: 2000 })
  const connection = await openConnection({ transport, timeoutMs: 2000 })
  assert.equal(connection.protocolVersion, '2026-07-28')
  assert.deepEqual(
    (await connection.listTools()).map(tool => tool.name),
    ['search'],
  )
  const result = await connection.callTool('search', { q: 'x' })
  assert.equal(result.content[0].text, 'found it')

  const [first, second, third] = server.requests
  assert.equal(first.url, 'http://localhost:3000/mcp')
  assert.equal(first.headers.authorization, 'Bearer abc')
  assert.equal(first.headers['mcp-session-id'], undefined, 'the first request has no session yet')
  assert.equal(second.headers['mcp-session-id'], 'session-1', 'the assigned session id is sent back')
  assert.equal(second.headers['mcp-protocol-version'], '2026-07-28', 'the negotiated revision rides along')
  assert.equal(third.body.method, 'tools/list')
  assert.equal(server.requests[3].body.method, 'tools/call')
  assert.equal(server.requests[3].body.params.name, 'search')
  transport.close()

  // A bare token gets the Bearer scheme; one that already names a scheme does not.
  const echoing = createHttpServer(message => reply(message.id, { protocolVersion: '2026-07-28', capabilities: {} }))
  const explicit = createHttpTransport({ url: 'https://x/mcp', token: 'Token abc', fetch: echoing.fetch, timeoutMs: 2000 })
  await openConnection({ transport: explicit, timeoutMs: 2000 })
  assert.equal(echoing.requests[0].headers.authorization, 'Token abc')
  explicit.close()
}

// ---------------------------------------------------------------------------
// 29 — Streamable HTTP failures are reports: an error status, a dead endpoint
// ---------------------------------------------------------------------------
{
  const unauthorised = createHttpTransport({
    url: 'http://localhost:3000/mcp',
    fetch: async () => new Response('nope', { status: 401 }),
    timeoutMs: 2000,
  })
  const denied = await openConnection({ transport: unauthorised, timeoutMs: 2000 }).then(
    () => undefined,
    error => error,
  )
  assert.equal(denied.code, 'TRANSPORT')
  assert.equal(denied.message, 'The request could not be sent: HTTP 401 from server')
  unauthorised.close()

  const offline = createHttpTransport({
    url: 'http://localhost:3000/mcp',
    fetch: async () => {
      throw new Error('connect ECONNREFUSED')
    },
    timeoutMs: 2000,
  })
  const refused = await openConnection({ transport: offline, timeoutMs: 2000 }).then(
    () => undefined,
    error => error,
  )
  assert.equal(refused.code, 'TRANSPORT')
  assert.match(refused.message, /ECONNREFUSED/u)
  offline.close()
}

// ---------------------------------------------------------------------------
// 30 — the manager over HTTP: add, test, start, call, stop
// ---------------------------------------------------------------------------
{
  const server = createHttpServer(message => {
    if (message.method === 'initialize') {
      return reply(message.id, { protocolVersion: '2026-07-28', serverInfo: { name: 'http-fake', version: '9' }, capabilities: { tools: {} } })
    }
    if (message.method === 'notifications/initialized') return undefined
    if (message.method === 'tools/list') return reply(message.id, { tools: [{ name: 'search', description: 'Search', inputSchema: { type: 'object' } }] })
    if (message.method === 'tools/call') return reply(message.id, { content: [{ type: 'text', text: 'found it' }] })
    if (message.method === 'ping') return reply(message.id, {})
    return undefined
  })
  const registry = createRegistry()
  const store = createMemoryStore()
  const manager = createManager({
    store,
    fetch: server.fetch,
    getTools: () => registry,
    logger: { warn() {} },
    timeoutMs: 2000,
    connectTimeoutMs: 2000,
  })
  const added = await manager.add({ label: 'Web search', transport: 'http', url: 'http://localhost:3000/mcp', authorization: 'secret-token' })
  assert.equal(added.ok, true)
  assert.equal(added.id, 'web-search')
  assert.equal(added.status, 'ready')
  assert.equal(added.toolCount, 1)
  assert.deepEqual([...registry.definitions.keys()], ['mcp__web-search__search'])
  assert.equal(manager.view().servers[0].hasToken, true)
  assert.deepEqual(manager.view().servers[0].headerKeys, [])
  assert.deepEqual(manager.view().servers[0].serverInfo, { name: 'http-fake', version: '9' })
  assert.ok(!JSON.stringify(manager.view()).includes('secret-token'))

  const tested = await manager.test({ id: 'web-search' })
  assert.equal(tested.ok, true)
  assert.equal(tested.protocolVersion, '2026-07-28')
  assert.deepEqual(tested.tools, [{ name: 'search', publicName: 'mcp__web-search__search', description: 'Search' }])

  // A draft can be tested before it is saved.
  const draft = await manager.test({ server: { label: 'Draft', transport: 'http', url: 'http://localhost:3000/mcp' } })
  assert.equal(draft.ok, true)
  assert.equal(draft.id, 'draft')

  // A re-save without the secret keeps the stored one.
  const resaved = await manager.add({ id: 'web-search', label: 'Web search', transport: 'http', url: 'http://localhost:3000/mcp' })
  assert.equal(resaved.ok, true)
  assert.equal(store.state.servers[0].token, 'secret-token')
  await manager.dispose()
  assert.equal(registry.definitions.size, 0)
}

// ---------------------------------------------------------------------------
// 31 — the route: GET is the view
// ---------------------------------------------------------------------------
{
  const { manager } = startFakeManager({ servers: [FAKE_RECORD] })
  const response = await mcpResponse(new Request(`http://host${MCP_PATH}`), { manager })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.equal(body.path, '/api/edh.mcp')
  assert.equal(body.servers.length, 1)
  assert.equal(body.servers[0].id, 'fake-tools')
  assert.equal(body.servers[0].status, 'stopped')
  assert.equal(body.servers[0].hasToken, false)
  assert.ok(!JSON.stringify(body).includes('super-secret-value'))
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 32 — the route: every POST action answers the same view plus its report
// ---------------------------------------------------------------------------
{
  const { manager, registry } = startFakeManager()
  const add = await mcpResponse(
    post({
      action: 'add',
      server: { label: 'Fake tools', transport: 'stdio', command: 'fake-mcp', args: ['--stdio'], env: { GITHUB_TOKEN: 'super-secret-value' } },
    }),
    { manager },
  )
  assert.equal(add.status, 200)
  const added = await add.json()
  assert.equal(added.ok, true)
  assert.equal(added.report.action, 'add')
  assert.equal(added.report.status, 'ready')
  assert.equal(added.report.id, 'fake-tools')
  assert.equal(added.servers[0].status, 'ready')
  assert.equal(added.servers[0].toolCount, 2)
  assert.ok(!JSON.stringify(added).includes('super-secret-value'), 'a POST answer carries no secret either')
  assert.equal(registry.definitions.size, 2)

  const tested = await (await mcpResponse(post({ action: 'test', id: 'fake-tools' }), { manager })).json()
  assert.equal(tested.report.ok, true)
  assert.equal(tested.report.toolCount, 2)
  assert.equal(tested.servers[0].status, 'ready', 'a test does not disturb the live connection')

  const called = await (await mcpResponse(post({ action: 'call', id: 'fake-tools', tool: 'echo', arguments: { text: 'x' } }), { manager })).json()
  assert.equal(called.report.ok, true)
  assert.equal(called.report.text, 'echo: x')

  const stopped = await (await mcpResponse(post({ action: 'stop', id: 'fake-tools' }), { manager })).json()
  assert.equal(stopped.report.ok, true)
  assert.equal(stopped.servers[0].status, 'stopped')
  assert.equal(stopped.servers[0].toolCount, 0)

  const restarted = await (await mcpResponse(post({ action: 'start', id: 'fake-tools' }), { manager })).json()
  assert.equal(restarted.report.ok, true)
  assert.equal(restarted.servers[0].status, 'ready')

  const removed = await (await mcpResponse(post({ action: 'remove', id: 'fake-tools' }), { manager })).json()
  assert.equal(removed.report.ok, true)
  assert.deepEqual(removed.servers, [])
  assert.equal(registry.definitions.size, 0)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 33 — the route: bad input is a JSON report with a 4xx, never a 500
// ---------------------------------------------------------------------------
{
  const { manager } = startFakeManager()
  const noAction = await mcpResponse(post({}), { manager })
  assert.equal(noAction.status, 400)
  const noActionBody = await noAction.json()
  assert.equal(noActionBody.ok, false)
  assert.equal(noActionBody.reason, 'bad-input')
  assert.ok(Array.isArray(noActionBody.servers))

  const unknown = await mcpResponse(post({ action: 'launch' }), { manager })
  assert.equal(unknown.status, 400)
  assert.equal((await unknown.json()).reason, 'unknown-action')

  const badTransport = await mcpResponse(post({ action: 'add', server: { label: 'x', transport: 'carrier-pigeon' } }), { manager })
  assert.equal(badTransport.status, 400)
  assert.equal((await badTransport.json()).report.reason, 'bad-transport')

  const badUrl = await mcpResponse(post({ action: 'add', server: { label: 'x', transport: 'http', url: 'not a url' } }), { manager })
  assert.equal(badUrl.status, 400)
  assert.equal((await badUrl.json()).report.reason, 'bad-url')

  const missing = await mcpResponse(post({ action: 'remove', id: 'ghost' }), { manager })
  assert.equal(missing.status, 400)
  assert.equal((await missing.json()).report.reason, 'unknown-server')

  const notReady = await mcpResponse(post({ action: 'call', id: 'ghost', tool: 'echo' }), { manager })
  assert.equal((await notReady.json()).report.reason, 'not-ready')

  const malformed = await mcpResponse(new Request(`http://host${MCP_PATH}`, { method: 'POST', body: 'not json' }), { manager })
  assert.equal(malformed.status, 400)

  const wrongMethod = await mcpResponse(new Request(`http://host${MCP_PATH}`, { method: 'PUT' }), { manager })
  assert.equal(wrongMethod.status, 405)
  assert.equal((await wrongMethod.json()).ok, false)

  const noManager = await mcpResponse(new Request(`http://host${MCP_PATH}`), {})
  assert.equal(noManager.status, 200)
  assert.equal((await noManager.json()).ok, false)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 34 — the route survives a manager that throws
// ---------------------------------------------------------------------------
{
  const manager = {
    view: () => ({ ok: true, servers: [] }),
    add: async () => {
      throw new Error('the store is on fire')
    },
    refresh: async () => {
      throw new Error('the reconnect blew up')
    },
  }
  const response = await mcpResponse(post({ action: 'add', server: { label: 'x', transport: 'stdio', command: 'c' } }), { manager })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ok, false)
  assert.match(body.message, /the store is on fire/u)
  assert.deepEqual(body.servers, [])

  // A refresh that throws is the same report, never a 500.
  const refreshed = await mcpResponse(post({ action: 'refresh' }), { manager })
  assert.equal(refreshed.status, 200)
  const refreshBody = await refreshed.json()
  assert.equal(refreshBody.ok, false)
  assert.match(refreshBody.message, /the reconnect blew up/u)
  assert.deepEqual(refreshBody.servers, [])
}

// ---------------------------------------------------------------------------
// 35 — registration: one path, both methods, and disposal inside ctx.effect
// ---------------------------------------------------------------------------
await withTempProfile(async () => {
  const { ctx, routes, disposers, warnings } = createContext()
  try {
    apply(ctx)
    assert.equal(routes.length, 1)
    assert.equal(routes[0].path, '/api/edh.mcp')
    assert.equal(MCP_PATH, '/api/edh.mcp')
    assert.deepEqual(routes[0].methods, ['GET', 'POST'])
    assert.equal(routes[0].requestBody, 'buffered')
    assert.equal(typeof routes[0].fetch, 'function')
    assert.deepEqual(ctx.injected, ['tools'], 'the tool registry is taken as an optional contract')
    assert.equal(disposers.length, 2)
  } finally {
    for (const dispose of disposers) dispose()
    // The row's disposal is fire-and-forget, so give the manager's own teardown
    // (and any `startEnabled()` still in flight) a turn to finish before the block
    // ends: a child that outlives the assertion keeps the process alive forever.
    await settle()
  }
  assert.equal(routes.length, 0, 'turning the row off removes the route')
  assert.deepEqual(warnings, [])
})

// ---------------------------------------------------------------------------
// 36 — a refused route registration leaves the rest of EDH running
// ---------------------------------------------------------------------------
await withTempProfile(async () => {
  const { ctx, disposers, warnings } = createContext()
  ctx.connection.fetch = {
    register() {
      throw new Error('this deployment refuses the path')
    },
  }
  try {
    apply(ctx)
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /route registration failed/u)
  } finally {
    // This block used to leave the context undisposed, so its manager (and the
    // servers `startEnabled()` had begun starting) stayed alive for the rest of
    // the run. Nothing here is exempt from being closed.
    for (const dispose of disposers) dispose()
    await settle()
  }
})

// ---------------------------------------------------------------------------
// 37 — a pipe error is a report, never an uncaught exception in the Host
// ---------------------------------------------------------------------------
{
  const server = createStdioServer(fakeServerHandler())
  const transport = createStdioTransport({ command: 'fake-mcp', spawn: () => server.child, timeoutMs: 2000 })
  const connection = await openConnection({ transport, timeoutMs: 2000 })
  // A child that died between the last write and the next one raises EPIPE on
  // its stdin; an `error` event with no listener would end the process.
  server.child.stdin.emit('error', new Error('EPIPE'))
  const failed = await connection.ping().then(
    () => undefined,
    error => error,
  )
  assert.equal(failed.code, 'TRANSPORT')
  assert.equal(failed.message, 'The server could not be written to: EPIPE')
  // The same listener is on stdout and stderr, so a broken pipe there is a
  // report too instead of a crash.
  const other = createStdioServer(fakeServerHandler())
  const second = createStdioTransport({ command: 'fake-mcp', spawn: () => other.child, timeoutMs: 2000 })
  const live = await openConnection({ transport: second, timeoutMs: 2000 })
  other.child.stdout.emit('error', new Error('ECONNRESET'))
  const alsoFailed = await live.ping().then(
    () => undefined,
    error => error,
  )
  assert.equal(alsoFailed.message, 'The server could not be written to: ECONNRESET')
  transport.close()
  second.close()
}

// ---------------------------------------------------------------------------
// 38 — the store survives the process: a second manager finds and starts it
// ---------------------------------------------------------------------------
{
  const directory = mkdtempSync(join(tmpdir(), 'edh-mcp-run-'))
  const store = createFileStore(join(directory, '.edh', 'mcp.json'))
  const firstServer = createStdioServer(fakeServerHandler())
  const firstRegistry = createRegistry()
  const first = createManager({
    store,
    spawn: createSpawnTable({ 'fake-mcp': firstServer.child }).spawn,
    getTools: () => firstRegistry,
    logger: { warn() {} },
    timeoutMs: 2000,
    connectTimeoutMs: 2000,
  })
  const added = await first.add(FAKE_RECORD)
  assert.equal(added.ok, true)
  assert.equal(firstRegistry.definitions.size, 2)
  await first.dispose()
  assert.equal(firstRegistry.definitions.size, 0, 'unloading the row removes its tools')

  // A new process — a new manager over the same profile — sees the server as it
  // was left: enabled, and holding a secret the page never saw.
  const secondServer = createStdioServer(fakeServerHandler())
  const secondRegistry = createRegistry()
  const second = createManager({
    store,
    spawn: createSpawnTable({ 'fake-mcp': secondServer.child }).spawn,
    getTools: () => secondRegistry,
    logger: { warn() {} },
    timeoutMs: 2000,
    connectTimeoutMs: 2000,
  })
  const restored = second.view()
  assert.deepEqual(restored.servers.map(server => server.id), ['fake-tools'])
  assert.equal(restored.servers[0].enabled, true)
  assert.deepEqual(restored.servers[0].envKeys, ['GITHUB_TOKEN'])
  assert.ok(!JSON.stringify(restored).includes('super-secret-value'))

  const started = await second.startEnabled()
  assert.equal(started.servers[0].status, 'ready')
  assert.deepEqual([...secondRegistry.definitions.keys()].sort(), ['mcp__fake-tools__echo', 'mcp__fake-tools__fail'])
  await second.dispose()
  rmSync(directory, { recursive: true, force: true })
}

// ---------------------------------------------------------------------------
// 39 — refresh: the tool registry is rebuilt from a fresh tools/list
// ---------------------------------------------------------------------------
{
  // The fake server's advertised list is an array the test mutates, so a refresh
  // is only correct if it asks the server again rather than trusting what it holds.
  const tools = [{ name: 'echo', description: 'Echo', inputSchema: { type: 'object' } }]
  const server = createStdioServer(fakeServerHandler({ tools }))
  const log = []
  const definitions = new Map()
  const registry = {
    definitions,
    register(definition) {
      // A duplicate would throw here, so "registered once" is enforced, not asserted.
      if (definitions.has(definition.name)) throw new Error(`duplicate tool ${definition.name}`)
      definitions.set(definition.name, definition)
      log.push(`register:${definition.name}`)
      return () => {
        definitions.delete(definition.name)
        log.push(`dispose:${definition.name}`)
      }
    },
  }
  const { spawn, spawned } = createSpawnTable({ 'fake-mcp': server.child })
  const manager = createManager({ store: createMemoryStore([FAKE_RECORD]), spawn, getTools: () => registry, connectTimeoutMs: 2000 })
  await manager.startEnabled()
  assert.deepEqual([...definitions.keys()], ['mcp__fake-tools__echo'])

  // The server now publishes one more tool and loses the old one.
  tools.length = 0
  tools.push(
    { name: 'search', description: 'Search', inputSchema: { type: 'object' } },
    { name: 'fetch', description: 'Fetch', inputSchema: { type: 'object' } },
  )
  const report = await manager.refresh({ id: 'fake-tools' })
  assert.equal(report.ok, true)
  assert.equal(report.action, 'refresh')
  assert.deepEqual(report.refreshed, [
    { id: 'fake-tools', ok: true, tools: ['mcp__fake-tools__search', 'mcp__fake-tools__fetch'] },
  ])
  assert.deepEqual(report.failed, [])
  assert.equal(report.toolCount, 2)
  assert.deepEqual([...definitions.keys()].sort(), ['mcp__fake-tools__fetch', 'mcp__fake-tools__search'], 'the registry follows the new list')
  assert.equal(definitions.has('mcp__fake-tools__echo'), false, 'the tool the server dropped is gone')

  // **The order that matters**: every disposer of the old generation ran before
  // any registration of the new one. Anything else means duplicates or dead names.
  const firstRegister = log.indexOf('register:mcp__fake-tools__search')
  const lastDispose = log.lastIndexOf('dispose:mcp__fake-tools__echo')
  assert.equal(lastDispose < firstRegister, true, `old disposers run first: ${log.join(' → ')}`)
  assert.equal(
    log.filter(line => line === 'register:mcp__fake-tools__echo').length,
    1,
    'the old tool was never registered a second time',
  )
  assert.equal(
    log.filter(line => line.startsWith('register:')).length,
    [...new Set(log.filter(line => line.startsWith('register:')))].length,
    'no name is registered twice',
  )
  assert.equal(spawned.length, 2, 'a refresh reconnects: start, then one reconnect')

  // A second refresh with nothing changed is still one reconnect and one generation.
  await manager.refresh({})
  assert.equal(spawned.length, 3)
  assert.equal(definitions.size, 2)
  await manager.dispose()
  assert.equal(definitions.size, 0, 'disposal unregisters')
}

// ---------------------------------------------------------------------------
// 40 — refresh: a server that does not come back keeps no stale tools
// ---------------------------------------------------------------------------
{
  const server = createStdioServer(fakeServerHandler())
  const registry = createRegistry()
  let spawns = 0
  const spawn = command => {
    spawns += 1
    // The first start works; the reconnect refuses to spawn at all.
    if (spawns === 1) return server.child
    const error = new Error(`spawn ${command} ENOENT`)
    error.code = 'ENOENT'
    throw error
  }
  const manager = createManager({ store: createMemoryStore([FAKE_RECORD]), spawn, getTools: () => registry, connectTimeoutMs: 2000 })
  await manager.startEnabled()
  assert.equal(registry.definitions.size, 2)

  const report = await manager.refresh({ id: 'fake-tools' })
  assert.equal(report.ok, false, 'a refresh that failed is not a success')
  assert.deepEqual(report.refreshed, [])
  assert.equal(report.failed.length, 1)
  assert.equal(report.failed[0].id, 'fake-tools')
  assert.equal(typeof report.failed[0].reason, 'string')
  assert.equal(registry.definitions.size, 0, 'the old tools are gone, not restored')
  const row = manager.view().servers[0]
  assert.equal(row.status, 'error', 'the row says the server is not connected')
  assert.equal(typeof row.lastError, 'string')
  assert.equal(row.lastError.length > 0, true, 'with the Host\u2019s own sentence')
  assert.equal(row.toolCount, 0)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 41 — refresh never starts what the user turned off, and honours the enabled flag
// ---------------------------------------------------------------------------
{
  const manager = createManager({
    store: createMemoryStore([
      FAKE_RECORD,
      { ...FAKE_RECORD, id: 'off', label: 'Off', enabled: false },
      { ...FAKE_RECORD, id: 'idle', label: 'Idle', enabled: true },
    ]),
    spawn: createSpawnTable({ 'fake-mcp': createStdioServer(fakeServerHandler()).child }).spawn,
    getTools: () => createRegistry(),
    connectTimeoutMs: 2000,
  })
  // Start only the first: `idle` is enabled but stopped, `off` is disabled.
  await manager.start('fake-tools')
  const spawnedBefore = manager.view().servers.map(row => row.status)

  const report = await manager.refresh({})
  assert.equal(report.action, 'refresh')
  assert.deepEqual(report.refreshed.map(entry => entry.id), ['fake-tools'], 'only the enabled, running server was refreshed')
  assert.deepEqual(report.failed, [], 'a server that was never meant to run is not a failure')

  const after = manager.view().servers
  assert.equal(after.find(row => row.id === 'off').status, 'stopped', 'a disabled server is left alone')
  assert.equal(after.find(row => row.id === 'idle').status, 'stopped', 'and so is an enabled one that is not running')
  assert.deepEqual(spawnedBefore, ['ready', 'stopped', 'stopped'])

  // Naming a stopped server explicitly is a report, not a silent start.
  const named = await manager.refresh({ id: 'off' })
  assert.equal(named.ok, false)
  assert.deepEqual(named.refreshed, [])
  assert.deepEqual(named.failed, [{ id: 'off', reason: 'not-running' }])
  assert.equal(manager.view().servers.find(row => row.id === 'off').status, 'stopped')
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 42 — refresh: single-flight per server, unknown ids, and the route's shape
// ---------------------------------------------------------------------------
{
  const server = createStdioServer(fakeServerHandler())
  const registry = createRegistry()
  const { spawn, spawned } = createSpawnTable({ 'fake-mcp': server.child })
  const manager = createManager({ store: createMemoryStore([FAKE_RECORD]), spawn, getTools: () => registry, connectTimeoutMs: 2000 })
  await manager.startEnabled()
  assert.equal(spawned.length, 1)

  // Two reloads of the same server at once: the second joins the first.
  const [first, second] = await Promise.all([manager.refresh({ id: 'fake-tools' }), manager.refresh({ id: 'fake-tools' })])
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(spawned.length, 2, 'one reconnect for two concurrent refreshes')
  assert.equal(registry.definitions.size, 2, 'and one generation of tools')

  // An unknown id is the route's existing 400.
  const unknown = await manager.refresh({ id: 'ghost' })
  assert.equal(unknown.ok, false)
  assert.equal(unknown.reason, 'unknown-server')
  const unknownResponse = await mcpResponse(post({ action: 'refresh', id: 'ghost' }), { manager })
  assert.equal(unknownResponse.status, 400)
  assert.equal((await unknownResponse.json()).report.reason, 'unknown-server')

  // The route answers the view plus the report, with real counts.
  const response = await mcpResponse(post({ action: 'refresh' }), { manager })
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.ok, true)
  assert.equal(body.report.action, 'refresh')
  assert.equal(body.report.ok, true)
  assert.deepEqual(Object.keys(body.report).sort(), ['action', 'failed', 'ok', 'refreshed', 'toolCount'])
  assert.deepEqual(body.report.refreshed, [{ id: 'fake-tools', ok: true, tools: ['mcp__fake-tools__echo', 'mcp__fake-tools__fail'] }])
  assert.deepEqual(body.report.failed, [])
  assert.equal(body.servers[0].status, 'ready', 'the answer is the same view the page renders')
  assert.equal(body.servers[0].toolCount, 2)
  await manager.dispose()
}

// ---------------------------------------------------------------------------
// 43 — a refresh cut short by disposal leaves no registered tool behind
// ---------------------------------------------------------------------------
{
  /**
   * A server whose handshake (`gate: 'connect'`) or discovery (`gate: 'discover'`)
   * hangs until the test lets it go, so disposal can land underneath the refresh.
   */
  const gatedManager = async gate => {
    const tools = [{ name: 'echo', description: 'Echo', inputSchema: { type: 'object' } }]
    const state = { release: undefined, listCalls: 0 }
    const server = createStdioServer((message, child) => {
      const answer = () =>
        child.stdout.emit(
          'data',
          encodeStdioFrame(
            message.method === 'initialize'
              ? reply(message.id, {
                  protocolVersion: DEFAULT_PROTOCOL_VERSION,
                  serverInfo: { name: 'gated', version: '1' },
                  capabilities: { tools: {} },
                })
              : reply(message.id, { tools: tools.map(tool => ({ ...tool })) }),
            'newline',
          ),
        )
      if (message.method === 'initialize') {
        // The first handshake is the start; the refresh's reconnect is held.
        if (gate === 'connect') {
          state.release = answer
          return undefined
        }
        return answerMessage(answer)
      }
      if (message.method === 'tools/list') {
        state.listCalls += 1
        if (gate === 'discover' && state.listCalls > 1) {
          state.release = answer
          return undefined
        }
        return answerMessage(answer)
      }
      return undefined
    })
    // `createStdioServer` encodes whatever the handler returns; an immediate answer
    // is built here so the gated path can emit its own frame later.
    function answerMessage(emit) {
      emit()
      return undefined
    }
    const registry = createRegistry()
    const manager = createManager({
      store: createMemoryStore([FAKE_RECORD]),
      spawn: createSpawnTable({ 'fake-mcp': server.child }).spawn,
      getTools: () => registry,
      connectTimeoutMs: 2000,
    })
    return { manager, registry, state }
  }

  for (const gate of ['connect', 'discover']) {
    const { manager, registry, state } = await gatedManager(gate)
    // The start itself must get through its gate before the refresh is attempted.
    if (gate === 'connect') {
      const starting = manager.startEnabled()
      for (let turn = 0; turn < 200 && state.release === undefined; turn += 1) await Promise.resolve()
      const firstRelease = state.release
      state.release = undefined
      firstRelease()
      await starting
    } else {
      await manager.startEnabled()
    }
    assert.equal(registry.definitions.size, 1, `${gate}: the server started`)

    const refreshing = manager.refresh({ id: 'fake-tools' })
    for (let turn = 0; turn < 200 && state.release === undefined; turn += 1) await Promise.resolve()
    assert.equal(typeof state.release, 'function', `${gate}: the refresh reached its ${gate}`)
    const release = state.release
    // Dispose underneath the in-flight refresh, *then* let it finish: the reply
    // arrives into a shutdown and must not become a registered tool.
    await manager.dispose()
    release()
    const report = await refreshing
    assert.equal(report.ok, false, `${gate}: a refresh during shutdown reports rather than registers`)
    assert.equal(registry.definitions.size, 0, `${gate}: no tool survives the disposal`)
    assert.equal((await mcpResponse(post({ action: 'refresh' }), { manager })).status, 200)
  }
}

console.log('edh mcp: all checks passed')
