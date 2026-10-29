/**
 * EDH feature: `mcp` — the MCP client, Host half.
 *
 * A Cordis plugin cannot insert a Loader row: the Plugin Manager service exposes
 * list, enable, install and remove — no `insert`. So a person who wants MCP tools
 * would otherwise have to hand-edit the profile's `cordis.yml`, which EDH must
 * never write. Instead EDH becomes the client itself: it keeps its own server
 * list, speaks JSON-RPC 2.0 to each server, and registers the tools it finds on
 * the harness ToolRuntime, which is a **dynamic** registration surface — the
 * inspective `Tool` provider says so ("scoped and dynamic registrations").
 * Adding a server is then a route call, not a configuration edit.
 *
 * Verified against the installed asar rather than guessed:
 *
 * - `ctx.tools.register(definition)` is the service key (`dsh-tools`,
 *   `ToolRuntime.register`). It returns the exact disposer that unregisters the
 *   tool. It validates only `output.schema` — against the enforced JSON Schema
 *   subset (type/oneOf/properties/required/additionalProperties/items/enum/const
 *   plus the annotations description/title/default/examples) — and requires
 *   `output.render`. `parameters` is projected as lossless JSON with no subset
 *   assertion, so an MCP `inputSchema` outside that subset is a model-facing
 *   liability rather than a registration failure; it is projected here anyway.
 * - One definition per tool is `{ name, description, parameters, output,
 *   execute }`; the value `execute` returns is validated against
 *   `output.schema` and then handed to `output.render(args, value)` for the
 *   model-facing content. A throw becomes a structured tool failure, which is
 *   how an MCP `isError` result stays visible instead of faking a success.
 * - The public name shape `mcp__<server>__<tool>` and its normalisation to the
 *   DeepSeek function-name contract (64 chars, `[A-Za-z0-9_-]`, a 12-hex-char
 *   SHA-256 suffix when normalisation is lossy) are copied from the shipped
 *   `dsh-mcp-client` bridge, because session history and permission rules key on
 *   that name.
 *
 * The store is EDH-owned JSON inside the harness's own data area. A profile is
 * `$DSH_HOME/profiles/<name>` (see `dsh-app-boot`), and `DSH_PROFILE_DIR` names
 * the active one, so the file lives at `<profile>/.edh/mcp.json` — beside the
 * shipped plugin manager's own `.plugin-manager` directory, never in this
 * package and never in the profile's `cordis.yml`.
 *
 * Secrets stay on this side of the wire: a token may be written by the browser
 * half, but every view answers `hasToken` and key names only. Environment and
 * header values never leave the Host.
 *
 * Nothing here may take EDH down. A server that will not start, a call that
 * times out, a child process that dies mid-request, a line of stdout that is not
 * JSON — each is a report and a warning, and every other server keeps working.
 */

import { createHash } from 'node:crypto'
import { spawn as spawnChild } from 'node:child_process'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export const name = 'edh-mcp'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const MCP_PATH = '/api/edh.mcp'

/** Directory EDH owns inside the active profile directory. */
export const STORE_DIRECTORY = '.edh'

/** The server store's filename inside {@link STORE_DIRECTORY}. */
export const STORE_FILE = 'mcp.json'

/**
 * Protocol revisions EDH offers, newest first.
 *
 * `initialize` carries the newest; a server that refuses it is asked again with
 * the next revision, which is what "protocol version negotiation" means here.
 * Whichever revision the server answers with is what the connection records and
 * what the HTTP transport then sends as `mcp-protocol-version`.
 */
export const SUPPORTED_PROTOCOL_VERSIONS = ['2026-07-28', '2025-06-18']

/** The revision advertised first by a fresh connection. */
export const DEFAULT_PROTOCOL_VERSION = SUPPORTED_PROTOCOL_VERSIONS[0]

/** How long a handshake, discovery or ping may take. */
export const CONNECT_TIMEOUT_MS = 20000

/** How long one `tools/call` may take before it is reported as a timeout. */
export const CALL_TIMEOUT_MS = 60000

/** How many `tools/list` pages one discovery follows before it gives up. */
const MAX_PAGES = 20

/** The DeepSeek function-name contract's length bound for a public tool name. */
const MAX_TOOL_NAME = 64

/** Characters a public tool name may contain. */
const INVALID_NAME_CHARS = /[^A-Za-z0-9_-]/gu

/** Hex characters of the identity hash appended when a name has to be repaired. */
const HASH_LENGTH = 12

/** A server id, which doubles as the tool namespace. */
const SERVER_ID = /^[A-Za-z0-9_-]{1,32}$/u

/** Longest text one MCP result may contribute to the model before it is clipped. */
const MAX_RESULT_TEXT = 24000

/** What this client calls itself in `initialize`. */
const CLIENT_INFO = { name: 'edh-mcp', title: 'EDH MCP client', version: '1.0.0' }

/** The JSON Schema types the ToolRuntime's enforced subset admits. */
const SCHEMA_TYPES = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']

/** The subsets of {@link SCHEMA_TYPES} that may carry `enum` and `const`. */
const SCALAR_TYPES = ['string', 'number', 'integer', 'boolean', 'null']

/** Annotations the ToolRuntime's subset accepts, preserved as documentation. */
const STRING_ANNOTATIONS = ['description', 'title']

/** Annotations copied when they survive a JSON round trip. */
const DATA_ANNOTATIONS = ['default', 'examples']

/**
 * The canonical output schema every bridged tool declares.
 *
 * It must be inside the ToolRuntime's enforced subset — that is the one part of
 * a registration the registry asserts — so it is built from `object`, `array`,
 * `items` and `required` only. `content` is the MCP content block array verbatim;
 * `structuredContent` rides along when the server sent it, for programmatic
 * callers, and never reaches the model on its own.
 */
export const TOOL_OUTPUT_SCHEMA = {
  type: 'object',
  properties: { content: { type: 'array', items: {} }, structuredContent: {} },
  required: ['content'],
  additionalProperties: false,
}

/** One error's text, whatever was thrown. */
function messageOf(error) {
  const message = error?.message ?? error
  return typeof message === 'string' ? message : String(message)
}

/** Whether a value is a plain JSON record: an object, not an array, not null. */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether a value survives `JSON.stringify`, which is the store's own boundary. */
function isJsonData(value) {
  try {
    return JSON.stringify(value) !== undefined
  } catch {
    return false
  }
}

/** A record of string values, or `undefined` when it carries none. */
function stringRecord(value) {
  if (!isRecord(value)) return undefined
  const out = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && key !== '') out[key] = entry
  }
  return Object.keys(out).length === 0 ? undefined : out
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * One MCP failure, carrying the classification the routes report.
 *
 * `code` is the vocabulary the browser half reads: `TIMEOUT`, `SERVER_EXIT`,
 * `TRANSPORT`, `PROTOCOL`, `RPC`, `ABORTED`, `HANDSHAKE`, `TOOL`.
 */
export class McpError extends Error {
  /**
   * @param code - the failure classification.
   * @param message - a sentence a person can read in the page's failure line.
   * @param options - the JSON-RPC error code and data, when there were any.
   */
  constructor(code, message, options = {}) {
    super(message)
    this.name = 'McpError'
    this.code = code
    if (options.rpcCode !== undefined) this.rpcCode = options.rpcCode
    if (options.data !== undefined) this.data = options.data
  }
}

/** The reason a report uses for one thrown value. */
function reasonOf(error) {
  return typeof error?.code === 'string' ? error.code : 'error'
}

// ---------------------------------------------------------------------------
// JSON-RPC 2.0 frames
// ---------------------------------------------------------------------------

/**
 * One JSON-RPC 2.0 request object.
 * @param id - the numeric correlation id.
 * @param method - the MCP method name.
 * @param params - the parameters, omitted when the method takes none.
 */
export function rpcRequest(id, method, params) {
  return { jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }
}

/**
 * One JSON-RPC 2.0 notification object: no id, so no response is owed.
 * @param method - the MCP method name.
 * @param params - the parameters, omitted when the method takes none.
 */
export function rpcNotification(method, params) {
  return { jsonrpc: '2.0', method, ...(params === undefined ? {} : { params }) }
}

/**
 * Encode one message for a stdio child.
 *
 * `newline` is what the MCP stdio transport actually delimitates on — the MCP
 * TypeScript SDK's `serializeMessage` is `JSON.stringify(message) + '\n'`, and a
 * real stdio server parses its stdin line by line. `content-length` is the
 * LSP-shaped framing the transport family grew out of; it is implemented here
 * because peers that speak it exist, and {@link decodeStdioChunk} negotiates
 * between the two by reading the peer's first frame rather than by assuming.
 * @param message - the JSON-RPC message.
 * @param framing - `newline` (the default) or `content-length`.
 * @returns the exact bytes to write, as a string.
 */
export function encodeStdioFrame(message, framing = 'newline') {
  const body = JSON.stringify(message)
  if (framing === 'content-length') return `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n${body}`
  return `${body}\n`
}

/** The index just past the blank line that ends a `Content-Length` header block. */
function headerEnd(text) {
  const crlf = text.indexOf('\r\n\r\n')
  const lf = text.indexOf('\n\n')
  if (crlf === -1) return lf === -1 ? -1 : lf + 2
  if (lf === -1) return crlf + 4
  return Math.min(crlf + 4, lf + 2)
}

/**
 * A decoder state for one stdio stream: a buffer plus the framing it settled on.
 * @returns the fresh state, handed to {@link decodeStdioChunk}.
 */
export function createStdioDecoder() {
  return { buffer: '', framing: undefined }
}

/**
 * Drain every complete message from one chunk of stdout.
 *
 * Framing is detected from the peer's first frame and then fixed: a block that
 * opens with `Content-Length:` is header-framed, anything else is newline-framed.
 * A partial frame stays in `state.buffer` for the next chunk. A line or body that
 * is not JSON is reported, not thrown — one bad write by a server must not lose
 * the messages around it.
 * @param state - the decoder state from {@link createStdioDecoder}.
 * @param chunk - the bytes just read, as a string or a Buffer.
 * @returns the decoded messages and the frames that could not be parsed.
 */
export function decodeStdioChunk(state, chunk) {
  const decoded = { messages: [], errors: [] }
  if (!isRecord(state)) return decoded
  if (typeof state.buffer !== 'string') state.buffer = ''
  state.buffer += typeof chunk === 'string' ? chunk : String(chunk ?? '')
  for (;;) {
    if (state.framing === undefined) {
      const leading = state.buffer.replace(/^[\r\n]+/u, '')
      if (leading === '') {
        state.buffer = ''
        return decoded
      }
      const header = /^content-length:/iu.test(leading)
      if (!header && !leading.startsWith('{') && !leading.includes('\n')) {
        // Not enough of the frame to tell yet.
        state.buffer = leading
        return decoded
      }
      state.framing = header ? 'content-length' : 'newline'
      state.buffer = leading
    }
    if (state.framing === 'newline') {
      const end = state.buffer.indexOf('\n')
      if (end === -1) return decoded
      const line = state.buffer.slice(0, end).replace(/\r$/u, '').trim()
      state.buffer = state.buffer.slice(end + 1)
      if (line === '') continue
      pushMessage(decoded, line)
      continue
    }
    const boundary = headerEnd(state.buffer)
    if (boundary === -1) return decoded
    const headers = state.buffer.slice(0, boundary)
    const length = Number(/content-length:\s*(\d+)/iu.exec(headers)?.[1])
    const consumed = Buffer.byteLength(state.buffer.slice(0, boundary), 'utf8')
    const bytes = Buffer.from(state.buffer, 'utf8')
    if (!Number.isInteger(length) || length <= 0) {
      decoded.errors.push({ reason: 'unparseable-frame', text: headers.slice(0, 200) })
      state.buffer = bytes.subarray(consumed).toString('utf8')
      continue
    }
    if (bytes.length < consumed + length) return decoded
    const body = bytes.subarray(consumed, consumed + length).toString('utf8')
    state.buffer = bytes.subarray(consumed + length).toString('utf8')
    pushMessage(decoded, body)
  }
}

/** Parse one frame body into the decoded result, reporting what is not JSON. */
function pushMessage(decoded, text) {
  try {
    const message = JSON.parse(text)
    if (isRecord(message)) decoded.messages.push(message)
    else decoded.errors.push({ reason: 'not-an-object', text: text.slice(0, 200) })
  } catch {
    decoded.errors.push({ reason: 'unparseable-frame', text: text.slice(0, 200) })
  }
}

/**
 * The JSON messages of one `text/event-stream` body.
 *
 * The Streamable HTTP transport may answer a POST with SSE. Every `data:` line
 * of a block is concatenated into one payload, and blocks whose payload is not
 * JSON are dropped — a keep-alive comment must not break the call.
 * @param text - the whole event stream, as received.
 * @returns the parsed messages, in order.
 */
export function parseSseBody(text) {
  const messages = []
  for (const block of String(text ?? '').split(/\r?\n\r?\n/u)) {
    const data = []
    for (const line of block.split(/\r?\n/u)) {
      if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /u, ''))
    }
    if (data.length === 0) continue
    const payload = data.join('\n').trim()
    if (payload === '') continue
    try {
      const message = JSON.parse(payload)
      if (isRecord(message)) messages.push(message)
    } catch {
      /* a keep-alive or a comment: nothing to deliver */
    }
  }
  return messages
}

// ---------------------------------------------------------------------------
// The channel: pending requests, deadlines, failure propagation
// ---------------------------------------------------------------------------

/**
 * One request/response channel over any transport.
 *
 * A pending map owns correlation, the per-call deadline and abort wiring; the
 * transport owns delivery. One terminal failure — a dead child, a refused POST —
 * fails every pending request and every later one, so a caller never waits for
 * an answer that cannot arrive.
 * @param options - the delivery function and the default timeout.
 * @returns the channel: `call`, `notify`, `accept`, `fail`, `isPending`, `close`.
 */
export function createChannel(options = {}) {
  const { deliver, timeoutMs = CALL_TIMEOUT_MS, onNotification } = options
  const pending = new Map()
  let nextId = 1
  let failure

  /** Reject every pending request once, and remember why. */
  function fail(reason, message) {
    if (failure !== undefined) return
    failure = { reason, message }
    for (const id of [...pending.keys()]) {
      settle(id, entry => entry.reject(new McpError(reason, message)))
    }
  }

  /** Remove one pending entry and run its settlement. */
  function settle(id, finish) {
    const entry = pending.get(id)
    if (entry === undefined) return
    pending.delete(id)
    clearTimeout(entry.timer)
    try {
      entry.signal?.removeEventListener?.('abort', entry.onAbort)
    } catch {
      /* a foreign signal implementation: nothing to unwind */
    }
    finish(entry)
  }

  /** Deliver one inbound message to its request, or to the notification sink. */
  function accept(message) {
    if (!isRecord(message)) return false
    const id = message.id
    if (typeof id !== 'number' || !pending.has(id)) {
      if (failure === undefined && typeof onNotification === 'function') {
        try {
          onNotification(message)
        } catch {
          /* an observer must not break the stream */
        }
      }
      return false
    }
    settle(id, entry => {
      const error = message.error
      if (isRecord(error)) {
        const text = typeof error.message === 'string' && error.message !== '' ? error.message : 'The server reported an error'
        entry.reject(new McpError('RPC', text, { rpcCode: error.code, data: error.data }))
        return
      }
      entry.resolve(message.result)
    })
    return true
  }

  /** One request, with a deadline and optional cancellation. */
  function call(method, params, callOptions = {}) {
    if (failure !== undefined) return Promise.reject(new McpError(failure.reason, failure.message))
    if (typeof deliver !== 'function') return Promise.reject(new McpError('TRANSPORT', 'No transport is attached'))
    const id = nextId
    nextId += 1
    const budget = Number.isFinite(callOptions?.timeoutMs) && callOptions.timeoutMs > 0 ? callOptions.timeoutMs : timeoutMs
    const message = rpcRequest(id, method, params)
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        settle(id, entry => entry.reject(new McpError('TIMEOUT', `No response from ${method} within ${budget} ms`)))
      }, budget)
      if (typeof timer?.unref === 'function') timer.unref()
      const signal = callOptions?.signal
      const onAbort = () => settle(id, entry => entry.reject(new McpError('ABORTED', `${method} was canceled`)))
      if (signal !== undefined && signal !== null) {
        if (signal.aborted === true) {
          clearTimeout(timer)
          reject(new McpError('ABORTED', `${method} was canceled`))
          return
        }
        signal.addEventListener?.('abort', onAbort, { once: true })
      }
      pending.set(id, { resolve, reject, timer, signal, onAbort })
      let outcome
      try {
        outcome = deliver(message, callOptions)
      } catch (error) {
        fail('TRANSPORT', `The request could not be sent: ${messageOf(error)}`)
        return
      }
      if (outcome !== undefined && typeof outcome.then === 'function') {
        outcome.then(undefined, error => fail('TRANSPORT', `The request could not be sent: ${messageOf(error)}`))
      }
    })
  }

  /** One notification: no answer is expected, and no answer is waited for. */
  function notify(method, params, notifyOptions = {}) {
    if (failure !== undefined || typeof deliver !== 'function') return Promise.resolve(false)
    try {
      const outcome = deliver(rpcNotification(method, params), notifyOptions)
      return Promise.resolve(outcome).then(
        () => true,
        error => {
          fail('TRANSPORT', `The request could not be sent: ${messageOf(error)}`)
          return false
        },
      )
    } catch (error) {
      fail('TRANSPORT', `The request could not be sent: ${messageOf(error)}`)
      return Promise.resolve(false)
    }
  }

  return {
    call,
    notify,
    accept,
    fail,
    isPending: id => pending.has(id),
    pendingCount: () => pending.size,
    failed: () => failure !== undefined,
  }
}

// ---------------------------------------------------------------------------
// stdio transport
// ---------------------------------------------------------------------------

/**
 * The child environment for one stdio server.
 *
 * The ambient environment is scrubbed the way the shipped bridge scrubs it —
 * names matching `/KEY|PASSWORD|SECRET|TOKEN/` and every `DSH_*` name are
 * dropped — and the server's own `env` merges on top, so an explicit override
 * survives and ambient credentials do not leak into a third-party program.
 * @param record - the stored server record.
 * @param base - the ambient environment, injectable for tests.
 * @returns the environment to spawn with.
 */
export function stdioEnvironment(record, base = process.env) {
  const env = {}
  for (const [key, value] of Object.entries(isRecord(base) ? base : {})) {
    if (typeof value !== 'string' || key === '') continue
    if (key.startsWith('DSH_') || /KEY|PASSWORD|SECRET|TOKEN/iu.test(key)) continue
    env[key] = value
  }
  return { ...env, ...(stringRecord(record?.env) ?? {}) }
}

/**
 * A JSON-RPC transport over a spawned child process.
 *
 * The child is spawned once, lazily. Its stdout is decoded with
 * {@link decodeStdioChunk}, which also negotiates the framing the peer answers
 * with; its exit is a terminal failure for every pending request, so a server
 * that dies mid-call is reported instead of hanging the caller.
 * @param options - the command, its arguments and environment, plus seams.
 * @returns the transport: `call`, `notify`, `close`, `framing`, `pid`.
 */
export function createStdioTransport(options = {}) {
  const {
    command,
    args = [],
    env,
    cwd,
    spawn = spawnChild,
    timeoutMs = CALL_TIMEOUT_MS,
    framing = 'newline',
    onProtocolError = () => {},
    onStderr = () => {},
  } = options
  const decoder = createStdioDecoder()
  let outbound = framing === 'content-length' ? 'content-length' : 'newline'
  let child
  let closed = false
  let exitText = ''

  const channel = createChannel({
    timeoutMs,
    deliver: (message, callOptions) => {
      if (closed) throw new Error(exitText === '' ? 'The connection is closed' : exitText)
      const target = start()
      target.stdin?.write?.(encodeStdioFrame(message, outbound))
      return undefined
    },
  })

  /** Spawn the child once and wire its streams. */
  function start() {
    if (child !== undefined) return child
    const spawnOptions = { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
    if (env !== undefined) spawnOptions.env = env
    if (cwd !== undefined) spawnOptions.cwd = cwd
    child = spawn(command, args, spawnOptions)
    child?.stdout?.on?.('data', onData)
    child?.stderr?.on?.('data', chunk => {
      try {
        onStderr(String(chunk))
      } catch {
        /* diagnostics only */
      }
    })
    // A pipe error is an `error` event, and an `error` event with no listener is
    // an uncaught exception — which would take the whole Host down. A server
    // that exits while EDH is writing to it raises EPIPE here, so every stream
    // gets a listener that reports instead.
    const onPipeError = error => {
      exitText = `The server could not be written to: ${messageOf(error)}`
      channel.fail('TRANSPORT', exitText)
    }
    child?.stdin?.on?.('error', onPipeError)
    child?.stdout?.on?.('error', onPipeError)
    child?.stderr?.on?.('error', onPipeError)
    child?.on?.('error', error => {
      exitText = `Server could not start: ${messageOf(error)}`
      channel.fail('TRANSPORT', exitText)
    })
    child?.on?.('exit', (code, signal) => {
      if (closed) return
      exitText =
        typeof code === 'number' && code !== 0
          ? `Server exited with code ${code}`
          : typeof signal === 'string' && signal !== ''
            ? `Server exited after ${signal}`
            : 'Server exited'
      channel.fail('SERVER_EXIT', exitText)
    })
    return child
  }

  /** Decode one stdout chunk and hand every frame to the channel. */
  function onData(chunk) {
    const decoded = decodeStdioChunk(decoder, chunk)
    if (decoder.framing !== undefined && decoder.framing !== outbound) outbound = decoder.framing
    for (const message of decoded.messages) channel.accept(message)
    for (const error of decoded.errors) {
      try {
        onProtocolError(`Could not parse ${error.reason} from the server: ${error.text}`)
      } catch {
        /* diagnostics only */
      }
    }
  }

  start()
  return {
    kind: 'stdio',
    call: channel.call,
    notify: channel.notify,
    framing: () => outbound,
    pid: () => child?.pid,
    close() {
      if (closed) return
      closed = true
      try {
        child?.stdin?.end?.()
      } catch {
        /* the pipe is already gone */
      }
      try {
        child?.kill?.()
      } catch {
        /* the process is already gone */
      }
      channel.fail('TRANSPORT', 'The connection was closed')
    },
  }
}

// ---------------------------------------------------------------------------
// Streamable HTTP transport
// ---------------------------------------------------------------------------

/**
 * A JSON-RPC transport over the Streamable HTTP transport.
 *
 * One POST per message. The response may be JSON or an event stream; a
 * `mcp-session-id` response header is remembered and sent back on every later
 * request, and the negotiated protocol revision rides along as
 * `mcp-protocol-version` once a handshake has happened.
 * @param options - the endpoint, its headers and token, plus seams.
 * @returns the transport: `call`, `notify`, `close`, `negotiated`, `sessionId`.
 */
export function createHttpTransport(options = {}) {
  const { url, headers, token, fetch = globalThis.fetch, timeoutMs = CALL_TIMEOUT_MS } = options
  let sessionId
  let protocolVersion
  let closed = false

  const channel = createChannel({
    timeoutMs,
    deliver: async (message, callOptions) => {
      if (closed) throw new Error('The connection is closed')
      if (typeof fetch !== 'function') throw new Error('No fetch implementation is available')
      const budget = Number.isFinite(callOptions?.timeoutMs) && callOptions.timeoutMs > 0 ? callOptions.timeoutMs : timeoutMs
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), budget)
      if (typeof timer?.unref === 'function') timer.unref()
      const relay = () => controller.abort()
      const signal = callOptions?.signal
      if (signal !== undefined && signal !== null) {
        if (signal.aborted === true) controller.abort()
        else signal.addEventListener?.('abort', relay, { once: true })
      }
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: requestHeaders(),
          body: JSON.stringify(message),
          signal: controller.signal,
        })
        const assigned = response?.headers?.get?.('mcp-session-id')
        if (typeof assigned === 'string' && assigned !== '') sessionId = assigned
        if (response?.status === 202 || response?.status === 204) return
        if (response?.ok !== true) throw new Error(`HTTP ${response?.status ?? 0} from server`)
        await consume(response, message)
      } finally {
        clearTimeout(timer)
        try {
          signal?.removeEventListener?.('abort', relay)
        } catch {
          /* a foreign signal implementation: nothing to unwind */
        }
      }
    },
  })

  /** The headers one request carries, including the negotiated state. */
  function requestHeaders() {
    const provider = typeof token === 'string' && token !== '' ? token : undefined
    return {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      ...(sessionId === undefined ? {} : { 'mcp-session-id': sessionId }),
      ...(protocolVersion === undefined ? {} : { 'mcp-protocol-version': protocolVersion }),
      ...(provider === undefined ? {} : { authorization: /\s/u.test(provider) ? provider : `Bearer ${provider}` }),
      ...(isRecord(headers) ? headers : {}),
    }
  }

  /**
   * Read one response body into the channel.
   *
   * A plain body is parsed whole. An event stream is read incrementally and
   * abandoned as soon as the request it answers has settled — the Streamable
   * HTTP transport may hold a stream open after writing the response, and a call
   * must not wait for a server that never closes it.
   */
  async function consume(response, message) {
    const contentType = String(response?.headers?.get?.('content-type') ?? '')
    const id = typeof message?.id === 'number' ? message.id : undefined
    if (!contentType.includes('text/event-stream') || response?.body === null || response?.body === undefined) {
      const text = await response.text()
      if (String(text).trim() === '') return
      for (const inbound of parseSseBody(text)) channel.accept(inbound)
      for (const inbound of messagesFromJson(text)) channel.accept(inbound)
      return
    }
    const reader = response.body.getReader?.()
    if (reader === undefined) return
    let buffer = ''
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done === true) break
        buffer += typeof value === 'string' ? value : Buffer.from(value).toString('utf8')
        const blocks = buffer.split(/\r?\n\r?\n/u)
        buffer = blocks.pop() ?? ''
        for (const block of blocks) {
          for (const inbound of parseSseBody(block)) channel.accept(inbound)
        }
        if (id === undefined || !channel.isPending(id)) break
      }
      for (const inbound of parseSseBody(buffer)) channel.accept(inbound)
    } finally {
      try {
        await reader.cancel?.()
      } catch {
        /* the stream is already closed */
      }
    }
  }

  return {
    kind: 'http',
    call: channel.call,
    notify: channel.notify,
    negotiated(version) {
      if (typeof version === 'string' && version !== '') protocolVersion = version
    },
    sessionId: () => sessionId,
    close() {
      closed = true
      channel.fail('TRANSPORT', 'The connection was closed')
    },
  }
}

/** The JSON-RPC messages of one plain JSON body. */
function messagesFromJson(text) {
  try {
    const message = JSON.parse(String(text ?? ''))
    return isRecord(message) ? [message] : []
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// The connection: handshake, discovery, calls
// ---------------------------------------------------------------------------

/**
 * Hand-shake with one transport and expose the MCP subset EDH uses.
 *
 * Implemented: `initialize` (with protocol revision negotiation),
 * `notifications/initialized`, `tools/list` (following pagination), `tools/call`
 * and `ping`. MCP prompt templates and resource subscriptions are out of scope;
 * `resources/read` has no route in this row's contract, so it is not exposed.
 * @param options - the transport, the client identity and the deadline.
 * @returns the negotiated connection.
 */
export async function openConnection(options = {}) {
  const { transport, clientInfo = CLIENT_INFO, versions = SUPPORTED_PROTOCOL_VERSIONS, timeoutMs = CONNECT_TIMEOUT_MS } = options
  if (transport === undefined || typeof transport.call !== 'function') throw new McpError('TRANSPORT', 'No transport is attached')
  let handshake
  let refused
  for (const version of versions) {
    try {
      handshake = await transport.call('initialize', { protocolVersion: version, capabilities: {}, clientInfo }, { timeoutMs })
      refused = undefined
      break
    } catch (error) {
      refused = error
      // Only a refusal is worth another revision; a dead transport is not.
      if (reasonOf(error) !== 'RPC') break
    }
  }
  if (handshake === undefined) {
    throw refused instanceof McpError ? refused : new McpError('HANDSHAKE', messageOf(refused ?? 'The server refused the handshake'))
  }
  const protocolVersion =
    typeof handshake?.protocolVersion === 'string' && handshake.protocolVersion !== ''
      ? handshake.protocolVersion
      : versions[versions.length - 1]
  transport.negotiated?.(protocolVersion)
  await transport.notify('notifications/initialized', undefined, { timeoutMs })
  const serverInfo = isRecord(handshake?.serverInfo)
    ? {
        ...(typeof handshake.serverInfo.name === 'string' ? { name: handshake.serverInfo.name } : {}),
        ...(typeof handshake.serverInfo.version === 'string' ? { version: handshake.serverInfo.version } : {}),
      }
    : undefined
  const capabilities = isRecord(handshake?.capabilities) ? handshake.capabilities : {}

  return {
    protocolVersion,
    serverInfo,
    capabilities,
    /**
     * Every tool the server publishes, following `nextCursor` for a bounded
     * number of pages. A name listed twice is an invalid list, and the whole
     * discovery is rejected rather than registered half-way.
     */
    async listTools(listOptions = {}) {
      if (capabilities.tools === undefined && listOptions.force !== true) return []
      const tools = []
      const seen = new Set()
      let cursor
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const result = await transport.call('tools/list', cursor === undefined ? undefined : { cursor }, { timeoutMs: listOptions.timeoutMs })
        const listed = Array.isArray(result?.tools) ? result.tools : []
        for (const tool of listed) {
          if (!isRecord(tool) || typeof tool.name !== 'string' || tool.name === '') {
            throw new McpError('PROTOCOL', 'The server listed a tool without a name')
          }
          if (seen.has(tool.name)) throw new McpError('PROTOCOL', `The server listed tool "${tool.name}" more than once`)
          seen.add(tool.name)
          tools.push(tool)
        }
        if (typeof result?.nextCursor !== 'string' || result.nextCursor === '') return tools
        cursor = result.nextCursor
      }
      throw new McpError('PROTOCOL', `The server kept paginating past ${MAX_PAGES} pages`)
    },
    /** One `tools/call`, with the raw MCP result and nothing mapped away. */
    async callTool(toolName, toolArguments, callOptions = {}) {
      const result = await transport.call(
        'tools/call',
        { name: toolName, arguments: isRecord(toolArguments) ? toolArguments : {} },
        { timeoutMs: callOptions?.timeoutMs, signal: callOptions?.signal },
      )
      if (!isRecord(result)) throw new McpError('PROTOCOL', `The server returned no result for "${toolName}"`)
      return {
        content: Array.isArray(result.content) ? result.content : [],
        isError: result.isError === true,
        ...(result.structuredContent === undefined ? {} : { structuredContent: result.structuredContent }),
      }
    },
    /** Liveness, exactly as the protocol defines it. */
    async ping(pingOptions = {}) {
      await transport.call('ping', undefined, { timeoutMs: pingOptions?.timeoutMs })
      return true
    },
  }
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

/**
 * The model-facing name of one MCP tool: `mcp__<server>__<rawName>`.
 *
 * Pure in `(serverId, rawName)`, so session history and permission rules survive
 * a re-sync. When normalisation or the 64-character bound changes the name, a
 * 12-hex-char SHA-256 suffix over both halves is appended so two distinct
 * identities can never collapse into one name.
 * @param serverId - the EDH-owned namespace.
 * @param rawName - the server's own tool name, which is the only wire name.
 * @returns the public tool name.
 */
export function toolNameFor(serverId, rawName) {
  const joined = `mcp__${String(serverId)}__${String(rawName)}`
  const normalized = joined.replace(INVALID_NAME_CHARS, '_')
  if (normalized === joined && normalized.length <= MAX_TOOL_NAME) return normalized
  const hash = createHash('sha256').update(`${serverId}\u0000${rawName}`).digest('hex').slice(0, HASH_LENGTH)
  return `${normalized.slice(0, MAX_TOOL_NAME - HASH_LENGTH - 1)}_${hash}`
}

/**
 * Project one MCP JSON Schema into the ToolRuntime's enforced subset.
 *
 * A server may send `anyOf`, `$ref`, `format`, `pattern`, a type array, a
 * schema-valued `additionalProperties` — none of which the registry admits. The
 * projection keeps what it can (`type`, `oneOf`, `properties`, `required`,
 * `additionalProperties`, `items`, `enum`, `const`, and the annotations) and
 * drops what it must, so a tool always registers and the model always sees a
 * schema the harness can actually enforce.
 * @param node - the untrusted schema node.
 * @param depth - the recursion depth, bounded so a hostile tree cannot spin.
 * @returns the projected schema; `{}` when nothing survives, meaning any JSON.
 */
export function sanitizeJsonSchema(node, depth = 0) {
  if (depth > 8 || !isRecord(node)) return {}
  const out = {}
  for (const key of STRING_ANNOTATIONS) {
    if (typeof node[key] === 'string' && node[key] !== '') out[key] = node[key]
  }
  for (const key of DATA_ANNOTATIONS) {
    if (node[key] !== undefined && isJsonData(node[key])) out[key] = node[key]
  }
  const arms = Array.isArray(node.oneOf) ? node.oneOf.filter(isRecord) : []
  if (node.type === undefined && arms.length >= 2) {
    out.oneOf = arms.map(arm => sanitizeJsonSchema(arm, depth + 1))
    return out
  }
  const declared = declaredType(node.type)
  if (declared === undefined) return out
  if (typeof declared !== 'string') {
    out.oneOf = declared.map(entry => ({ type: entry }))
    return out
  }
  out.type = declared
  if (declared === 'object') {
    const properties = {}
    let declaredProperties = 0
    if (isRecord(node.properties)) {
      for (const [key, child] of Object.entries(node.properties)) {
        properties[key] = sanitizeJsonSchema(child, depth + 1)
        declaredProperties += 1
      }
    }
    if (declaredProperties > 0) {
      out.properties = properties
      if (Array.isArray(node.required)) {
        const required = node.required.filter(entry => typeof entry === 'string' && Object.hasOwn(properties, entry))
        if (required.length > 0) out.required = required
      }
    }
    if (typeof node.additionalProperties === 'boolean') out.additionalProperties = node.additionalProperties
    return out
  }
  if (declared === 'array') {
    if (isRecord(node.items)) out.items = sanitizeJsonSchema(node.items, depth + 1)
    return out
  }
  if (!SCALAR_TYPES.includes(declared)) return out
  if (Array.isArray(node.enum)) {
    const allowed = node.enum.filter(entry => scalarMatches(declared, entry))
    if (allowed.length > 0 && allowed.length === node.enum.length) out.enum = allowed
  }
  if (Object.hasOwn(node, 'const') && scalarMatches(declared, node.const)) out.const = node.const
  return out
}

/**
 * The single type one `type` keyword declares, or its admissible members.
 * @returns the type string, the member list when several were declared, or
 * `undefined` when none is usable.
 */
function declaredType(type) {
  if (typeof type === 'string') return SCHEMA_TYPES.includes(type) ? type : undefined
  if (!Array.isArray(type)) return undefined
  const members = SCHEMA_TYPES.filter(entry => type.includes(entry))
  if (members.length === 1) return members[0]
  return members.length > 1 ? members : undefined
}

/** Whether one scalar value has the declared schema type. */
function scalarMatches(type, value) {
  switch (type) {
    case 'string':
      return typeof value === 'string'
    case 'number':
      return typeof value === 'number' && Number.isFinite(value)
    case 'integer':
      return typeof value === 'number' && Number.isInteger(value)
    case 'boolean':
      return typeof value === 'boolean'
    case 'null':
      return value === null
    default:
      return false
  }
}

/**
 * The parameters schema of one bridged tool: always object-rooted, so a caller
 * can always pass a record of named arguments.
 * @param inputSchema - the server's `inputSchema`, whatever it is.
 */
export function parameterSchemaOf(inputSchema) {
  const projected = sanitizeJsonSchema(inputSchema)
  if (projected.type === 'object') return projected
  if (projected.type === undefined && Array.isArray(projected.oneOf)) return projected
  return { type: 'object' }
}

/**
 * One MCP result's content blocks as the text the model reads.
 *
 * Text is passed through; everything the harness has no native bridge for —
 * images, audio, embedded resources, links — becomes a short diagnostic instead
 * of silence, and the whole body is bounded because a server chooses its size.
 * @param blocks - the MCP `content` array.
 * @param rawName - the tool name, used in the fallback wording.
 * @returns the text, or an empty string when there is nothing to say.
 */
export function contentText(blocks, rawName = 'tool') {
  const parts = []
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (!isRecord(block)) continue
    const mimeType = typeof block.mimeType === 'string' ? ` ${block.mimeType}` : ''
    switch (block.type) {
      case 'text':
        parts.push(typeof block.text === 'string' ? block.text : '')
        break
      case 'image':
        parts.push(`[image${mimeType}]`)
        break
      case 'audio':
        parts.push(`[audio${mimeType}]`)
        break
      case 'resource_link': {
        const name = typeof block.name === 'string' ? block.name : 'resource'
        const uri = typeof block.uri === 'string' ? block.uri : ''
        parts.push(`[resource link: ${name}${uri === '' ? '' : ` ${uri}`}]`)
        break
      }
      case 'resource': {
        const uri = typeof block.resource?.uri === 'string' ? block.resource.uri : 'resource'
        const text = typeof block.resource?.text === 'string' ? block.resource.text : ''
        parts.push(text === '' ? `[resource: ${uri}]` : `[resource: ${uri}]\n${text}`)
        break
      }
      default:
        parts.push(`[unsupported content${typeof block.type === 'string' ? `: ${block.type}` : ''}]`)
    }
  }
  const text = parts.filter(part => part !== '').join('\n')
  if (text.length <= MAX_RESULT_TEXT) return text
  return `${text.slice(0, MAX_RESULT_TEXT)}\n… (${text.length - MAX_RESULT_TEXT} characters not shown)`
}

/**
 * One ToolRuntime definition for one MCP tool.
 *
 * The raw tool name is never derived back out of the public name — the callback
 * closes over it — so a lossy normalisation can never change what is sent on the
 * wire. An MCP `isError` result throws here: the registry records a tool failure,
 * which is visible in the conversation, rather than a success with error text.
 * @param options - the server record, the discovered tool and its caller.
 * @returns the definition to hand to `ctx.tools.register()`.
 */
export function toolDefinition(options = {}) {
  const { server, tool, call } = options
  const rawName = tool?.name
  const publicName = toolNameFor(server?.id, rawName)
  const description = typeof tool?.description === 'string' ? tool.description : ''
  return {
    name: publicName,
    description,
    parameters: parameterSchemaOf(tool?.inputSchema),
    output: {
      schema: TOOL_OUTPUT_SCHEMA,
      render(_args, value) {
        const text = contentText(value?.content, rawName)
        // An empty text block is not a valid thing to hand a model, so a server
        // that answers with no content still says something.
        return [{ type: 'text', text: text === '' ? `The tool "${rawName}" returned no content` : text }]
      },
    },
    async execute(args, exec) {
      const result = await call(isRecord(args) ? args : {}, exec)
      const content = Array.isArray(result?.content) ? result.content : []
      if (result?.isError === true) {
        const text = contentText(content, rawName)
        throw new McpError('TOOL', text === '' ? `The server reported an error from "${rawName}"` : text)
      }
      return { content, ...(result?.structuredContent === undefined ? {} : { structuredContent: result.structuredContent }) }
    },
  }
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/**
 * The active profile's directory: the harness's own profile-scoped data area.
 *
 * An explicit `DSH_PROFILE_DIR` wins, because that is the variable the launcher
 * exports for the running profile. Otherwise the documented layout applies —
 * `$DSH_HOME/profiles/<name>` — and a deployment without a profile name falls
 * back to the home itself.
 * @param env - the environment to read.
 * @param home - the operating-system home, injectable for tests.
 * @returns the absolute profile directory.
 */
export function resolveProfileDir(env = process.env, home = homedir()) {
  const explicit = typeof env?.DSH_PROFILE_DIR === 'string' ? env.DSH_PROFILE_DIR.trim() : ''
  if (explicit !== '') return explicit
  const configured = typeof env?.DSH_HOME === 'string' ? env.DSH_HOME.trim() : ''
  const dshHome = configured !== '' ? configured : join(home, '.dsh')
  const profile = typeof env?.DSH_PROFILE === 'string' ? env.DSH_PROFILE.trim() : ''
  return profile !== '' ? join(dshHome, 'profiles', profile) : dshHome
}

/**
 * The absolute path of EDH's MCP server store.
 * @param env - the environment to read.
 * @param home - the operating-system home, injectable for tests.
 */
export function resolveStorePath(env = process.env, home = homedir()) {
  return join(resolveProfileDir(env, home), STORE_DIRECTORY, STORE_FILE)
}

/**
 * The file-backed server store.
 *
 * A read is tolerant by design: a missing file is an empty list, and a file that
 * cannot be parsed or holds records that fail normalisation is reported through
 * `error` while everything readable still loads. A write goes through a temporary
 * file and a rename, so a half-written store can never be observed.
 * @param path - the absolute path of the store file.
 * @returns the store: `read()` and `write(servers)`.
 */
export function createFileStore(path) {
  return {
    path,
    read() {
      let text
      try {
        text = readFileSync(path, 'utf8')
      } catch (error) {
        if (error?.code === 'ENOENT') return { servers: [] }
        return { servers: [], error: `The server store could not be read: ${messageOf(error)}` }
      }
      let parsed
      try {
        parsed = JSON.parse(text)
      } catch (error) {
        return { servers: [], error: `The server store is not valid JSON: ${messageOf(error)}` }
      }
      const listed = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.servers) ? parsed.servers : []
      const servers = []
      let rejected = 0
      for (const entry of listed) {
        const normalized = normalizeServer(entry)
        if (normalized.ok === true) servers.push(normalized.server)
        else rejected += 1
      }
      return rejected === 0 ? { servers } : { servers, error: `${rejected} stored server${rejected === 1 ? '' : 's'} could not be read` }
    },
    write(servers) {
      try {
        mkdirSync(dirname(path), { recursive: true })
        const temporary = `${path}.${process.pid}.tmp`
        writeFileSync(temporary, `${JSON.stringify({ version: 1, servers }, null, 2)}\n`, 'utf8')
        renameSync(temporary, path)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: `The server store could not be written: ${messageOf(error)}` }
      }
    },
  }
}

/**
 * Normalise one untrusted server record.
 *
 * The returned record is exactly the stored shape — `{ id, label, transport,
 * command?, args?, env?, url?, headers?, enabled }` — plus the private `token`
 * the browser half may write and never reads back. `streamable-http` is accepted
 * as a spelling of `http`, and `authorization` as a spelling of `token`, because
 * the two halves of EDH were written against the same protocol at once.
 * @param input - the record as sent by the browser half or read from disk.
 * @returns the normalised record, or the reason it was refused.
 */
export function normalizeServer(input) {
  if (!isRecord(input)) return { ok: false, reason: 'bad-input', message: 'A server must be a JSON object' }
  const label = typeof input.label === 'string' ? input.label.trim() : ''
  const declaredId = typeof input.id === 'string' ? input.id.trim() : ''
  const id = declaredId !== '' ? declaredId : slugOf(label)
  if (!SERVER_ID.test(id)) {
    return {
      ok: false,
      reason: 'bad-id',
      message: `A server id must use 1-32 characters of A-Z, a-z, 0-9, "_" or "-" (got ${JSON.stringify(id)})`,
    }
  }
  const transport = input.transport === 'streamable-http' ? 'http' : input.transport
  if (transport !== 'stdio' && transport !== 'http') {
    return { ok: false, reason: 'bad-transport', message: 'A server transport must be "stdio" or "http"' }
  }
  const server = { id, label: label === '' ? id : label, transport, enabled: input.enabled === undefined ? true : input.enabled === true }
  if (transport === 'stdio') {
    const command = typeof input.command === 'string' ? input.command.trim() : ''
    if (command === '') return { ok: false, reason: 'bad-command', message: 'A stdio server needs a command to spawn' }
    server.command = command
    server.args = Array.isArray(input.args) ? input.args.filter(entry => typeof entry === 'string') : []
    const env = stringRecord(input.env)
    if (env !== undefined) server.env = env
  } else {
    const url = typeof input.url === 'string' ? input.url.trim() : ''
    if (!/^https?:\/\/[^/\s]+/iu.test(url)) {
      return { ok: false, reason: 'bad-url', message: 'An http server needs an http(s) URL' }
    }
    server.url = url
    const headers = stringRecord(input.headers)
    if (headers !== undefined) server.headers = headers
  }
  const secret = typeof input.token === 'string' ? input.token : typeof input.authorization === 'string' ? input.authorization : undefined
  if (secret !== undefined) server.token = secret
  return { ok: true, server }
}

/** A server id derived from a label: lower-case, hyphenated, bounded. */
function slugOf(label) {
  return String(label ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 32)
}

/**
 * One server as the browser half may see it: no secret values, ever.
 *
 * Environment and header values never leave the Host; only their key names do,
 * beside `hasToken` for the private token itself. `lastError` is the plain
 * sentence the page shows as the last failure line.
 * @param server - the stored record.
 * @param state - the runtime state, when this server has been started.
 */
export function serverView(server, state) {
  const runtime = isRecord(state) ? state : {}
  const view = {
    id: server.id,
    label: server.label ?? server.id,
    transport: server.transport,
    enabled: server.enabled !== false,
    status: typeof runtime.status === 'string' ? runtime.status : 'stopped',
    lastError: typeof runtime.lastError === 'string' ? runtime.lastError : '',
    toolCount: 0,
    tools: [],
    toolsRegistered: runtime.toolsRegistered === true,
    hasToken: typeof server.token === 'string' && server.token !== '',
  }
  if (server.transport === 'http') {
    view.url = server.url ?? ''
    view.headerKeys = Object.keys(server.headers ?? {}).sort()
  } else {
    view.command = server.command ?? ''
    view.args = Array.isArray(server.args) ? [...server.args] : []
    view.envKeys = Object.keys(server.env ?? {}).sort()
  }
  if (typeof runtime.protocolVersion === 'string' && runtime.protocolVersion !== '') view.protocolVersion = runtime.protocolVersion
  if (isRecord(runtime.serverInfo) && (runtime.serverInfo.name !== undefined || runtime.serverInfo.version !== undefined)) {
    view.serverInfo = { ...runtime.serverInfo }
  }
  const tools = Array.isArray(runtime.tools) ? runtime.tools : []
  view.tools = [...tools]
  view.toolCount = tools.length
  return view
}

/**
 * The whole view: every server, its state, and how the Host is doing.
 * @param options - the store path, the records, their states and the seam flags.
 */
export function mcpView(options = {}) {
  const { storePath, servers, states, toolsAvailable, storeError } = options
  const list = (Array.isArray(servers) ? servers : []).map(server => serverView(server, states?.get?.(server.id)))
  return {
    ok: true,
    path: MCP_PATH,
    ...(typeof storePath === 'string' && storePath !== '' ? { storePath } : {}),
    toolsAvailable: toolsAvailable === true,
    protocolVersion: DEFAULT_PROTOCOL_VERSION,
    toolCount: list.reduce((total, server) => total + server.toolCount, 0),
    ...(typeof storeError === 'string' && storeError !== '' ? { storeError } : {}),
    servers: list,
  }
}

// ---------------------------------------------------------------------------
// The client: one manager over the store, the transports and the tool registry
// ---------------------------------------------------------------------------

/** The report one failed action answers. */
export function mcpFailure(reason, message, extra = {}) {
  return { ok: false, reason, message, ...extra }
}

/**
 * The reasons that mean the caller got the request wrong, so the route answers
 * 400. Everything else — a server that will not start, a call that timed out — is
 * an operational report and still answers 200, because the page asked and got an
 * answer it can render.
 */
const REJECTED_REASONS = new Set([
  'bad-input',
  'bad-id',
  'bad-transport',
  'bad-command',
  'bad-url',
  'unknown-action',
  'unknown-server',
  'unsupported-method',
])

/**
 * The MCP client: the server list, one live connection per started server, and
 * the tool registrations those connections own.
 *
 * Every seam is injectable — the store, the spawn function, fetch, the tool
 * registry and the clock — so the routes, both transports and the registration
 * path are all exercised by the test suite without a real server or a real Host.
 * @param options - the seams and the deadlines.
 * @returns the manager.
 */
export function createManager(options = {}) {
  const {
    storePath = resolveStorePath(),
    store,
    spawn = spawnChild,
    fetch = globalThis.fetch,
    getTools = () => undefined,
    logger,
    timeoutMs = CALL_TIMEOUT_MS,
    connectTimeoutMs = CONNECT_TIMEOUT_MS,
    clientInfo = CLIENT_INFO,
  } = options
  const io = store ?? createFileStore(storePath)
  const states = new Map()
  /** `${id}` -> the refresh already running for that server (single-flight). */
  const refreshing = new Map()
  let servers
  let storeError = ''
  let disposed = false

  /** One warning, never a throw: a broken server is reported, not fatal. */
  function warn(message) {
    try {
      logger?.warn?.(message)
    } catch {
      /* a logger that throws is worse than no logger */
    }
  }

  /** Load the store once, tolerantly. */
  function ensureLoaded() {
    if (servers !== undefined) return
    const read = typeof io?.read === 'function' ? io.read() : { servers: [] }
    servers = Array.isArray(read?.servers) ? read.servers : []
    storeError = typeof read?.error === 'string' ? read.error : ''
    if (storeError !== '') warn(`edh-mcp: ${storeError}`)
  }

  /** Persist the whole list, reporting a write failure through the view. */
  function persist() {
    if (typeof io?.write !== 'function') return true
    const written = io.write(servers)
    storeError = written?.ok === true ? '' : String(written?.error ?? 'The server store could not be written')
    if (storeError !== '') warn(`edh-mcp: ${storeError}`)
    return storeError === ''
  }

  /** One stored record by id. */
  function find(id) {
    ensureLoaded()
    return servers.find(server => server.id === id)
  }

  /** The transport for one record, wired to this manager's seams. */
  function transportFor(record) {
    const shared = {
      timeoutMs,
      onProtocolError: message => warn(`edh-mcp(${record.id}): ${message}`),
    }
    if (record.transport === 'http') {
      return createHttpTransport({
        url: record.url,
        headers: record.headers,
        token: record.token,
        fetch,
        ...shared,
      })
    }
    return createStdioTransport({
      command: record.command,
      args: record.args ?? [],
      env: stdioEnvironment(record),
      spawn,
      ...shared,
    })
  }

  /** Drop every tool registration this server owns. */
  function disposeTools(entry) {
    for (const dispose of entry.disposers ?? []) {
      try {
        dispose()
      } catch (error) {
        warn(`edh-mcp(${entry.id}): tool disposal failed: ${messageOf(error)}`)
      }
    }
    entry.disposers = []
    entry.tools = []
    entry.toolsRegistered = false
  }

  /**
   * Discover the server's tools and register the whole generation.
   *
   * Fetch first, swap second: a failed discovery leaves the previous generation
   * registered, and a registration conflict rolls the new one back entirely
   * rather than leaving a server with half a tool set.
   */
  async function syncTools(record, entry) {
    let tools
    try {
      tools = await entry.connection.listTools({ timeoutMs: connectTimeoutMs })
    } catch (error) {
      return mcpFailure(reasonOf(error), `Tool discovery failed: ${messageOf(error)}`)
    }
    // Discovery is awaited, so the row can be disposed while it runs. Registering
    // after that would leave a tool nobody owns — the exact leak a refresh has to
    // avoid — so the generation is abandoned instead.
    if (disposed) {
      disposeTools(entry)
      return mcpFailure('disposed', 'The MCP client is shutting down')
    }
    const service = getTools()
    if (service === undefined || typeof service.register !== 'function') {
      disposeTools(entry)
      warn(`edh-mcp(${record.id}): ${tools.length} tool(s) discovered but the tool registry is unavailable`)
      return mcpFailure('tools-unavailable', 'The tool registry is unavailable, so the discovered tools were not registered')
    }
    const definitions = tools.map(tool =>
      toolDefinition({
        server: record,
        tool,
        call: (args, exec) =>
          entry.connection.callTool(tool.name, args, {
            signal: exec?.signal,
            timeoutMs: exec?.timeoutMs !== undefined ? exec.timeoutMs : timeoutMs,
          }),
      }),
    )
    disposeTools(entry)
    const disposers = []
    const registered = []
    for (const definition of definitions) {
      try {
        const dispose = service.register(definition)
        disposers.push(typeof dispose === 'function' ? dispose : () => {})
        registered.push(definition.name)
      } catch (error) {
        for (const undo of disposers) {
          try {
            undo()
          } catch {
            /* the rollback of a rollback is not worth another failure */
          }
        }
        return mcpFailure('registration', `Tool registration was rejected, so no tools from this server are active: ${messageOf(error)}`)
      }
    }
    entry.disposers = disposers
    entry.tools = registered
    entry.toolsRegistered = true
    return { ok: true, action: 'sync', id: record.id, toolCount: registered.length, tools: [...registered] }
  }

  /** Start one server: connect, hand-shake, discover, register. */
  async function start(id) {
    ensureLoaded()
    if (disposed) return mcpFailure('disposed', 'The MCP client is shutting down')
    const record = find(id)
    if (record === undefined) return mcpFailure('unknown-server', `No MCP server is stored under "${id}"`)
    await stop(id)
    const entry = { id, status: 'connecting', lastError: '' }
    states.set(id, entry)
    let transport
    try {
      transport = transportFor(record)
      const connection = await openConnection({ transport, clientInfo, timeoutMs: connectTimeoutMs })
      // The connect is awaited and the row may have been disposed meanwhile; a
      // manager that is shutting down must not come back up holding a transport.
      if (disposed) {
        try {
          transport.close()
        } catch {
          /* already gone */
        }
        return mcpFailure('disposed', 'The MCP client is shutting down', { action: 'start', id })
      }
      entry.transport = transport
      entry.connection = connection
      entry.protocolVersion = connection.protocolVersion
      entry.serverInfo = connection.serverInfo
      entry.status = 'ready'
      const synced = await syncTools(record, entry)
      if (synced.ok !== true) entry.lastError = synced.message
      return { ...synced, ok: synced.ok === true, action: 'start', id, status: entry.status, toolCount: entry.tools.length }
    } catch (error) {
      try {
        transport?.close()
      } catch {
        /* the transport is already gone */
      }
      entry.status = 'error'
      entry.lastError = messageOf(error)
      entry.connection = undefined
      entry.transport = undefined
      warn(`edh-mcp(${id}): ${entry.lastError}`)
      return mcpFailure(reasonOf(error), entry.lastError, { action: 'start', id, status: entry.status })
    }
  }

  /** Stop one server: unregister its tools, close its transport. */
  async function stop(id) {    const entry = states.get(id)
    if (entry === undefined) return { ok: true, action: 'stop', id, status: 'stopped' }
    disposeTools(entry)
    try {
      entry.transport?.close?.()
    } catch (error) {
      warn(`edh-mcp(${id}): closing the transport failed: ${messageOf(error)}`)
    }
    entry.connection = undefined
    entry.transport = undefined
    entry.status = 'stopped'
    entry.lastError = ''
    entry.protocolVersion = undefined
    entry.serverInfo = undefined
    return { ok: true, action: 'stop', id, status: entry.status }
  }

  /**
   * Refresh one running server: dispose its tools, reconnect, rediscover, re-register.
   *
   * That is `start()`, which is the point — `start` calls `stop` (whose
   * `disposeTools` unregisters the whole previous generation) *before* it connects,
   * and `syncTools` fetches the new list before swapping, so **the old disposers
   * always run before any new registration**. There is no second refresh
   * implementation to drift from the start path.
   *
   * One server at a time: a second reload of the same id joins the in-flight one
   * instead of stacking a second reconnect on top of it.
   * @param id - the stored server id.
   * @returns `{ id, ok, tools?, reason?, message? }`.
   */
  function refreshOne(id) {
    const inflight = refreshing.get(id)
    if (inflight !== undefined) return inflight
    const run = (async () => {
      ensureLoaded()
      const record = find(id)
      if (record === undefined) return { id, ok: false, reason: 'unknown-server' }
      const entry = states.get(id)
      // Only a connected server is refreshed. A reload must never start something
      // the user turned off, or a server that is stopped because it failed.
      if (entry?.status !== 'ready' || entry.connection === undefined) return { id, ok: false, reason: 'not-running' }
      const restarted = await start(id)
      if (restarted.ok !== true) {
        // It did not come back: its tools are already gone (the stop half of the
        // restart unregistered them) and stale tools must not be resurrected.
        const after = states.get(id)
        const sentence = typeof restarted.message === 'string' && restarted.message !== '' ? restarted.message : 'The server did not come back'
        if (after !== undefined) {
          after.status = 'error'
          after.lastError = sentence
        }
        return { id, ok: false, reason: typeof restarted.reason === 'string' ? restarted.reason : 'error', message: sentence }
      }
      return { id, ok: true, tools: Array.isArray(restarted.tools) ? [...restarted.tools] : [] }
    })()
    const settled = run.finally(() => refreshing.delete(id))
    refreshing.set(id, settled)
    return settled
  }

  /**
   * Re-sync the served servers, so the tool registry is rebuilt from a fresh
   * `tools/list` — what `/reload` needs behind it, rather than a re-read of state.
   *
   * With an `id`, that one server (if it is running); without one, every enabled
   * server that is currently connected. Disabled and stopped servers are untouched.
   * @param input - `{ id? }` from the request body.
   * @returns `{ ok, action: 'refresh', refreshed: [{ id, ok, tools }], failed: [{ id, reason }] }`.
   */
  async function refresh(input) {
    ensureLoaded()
    if (disposed) return mcpFailure('disposed', 'The MCP client is shutting down', { action: 'refresh' })
    const id = typeof input?.id === 'string' && input.id.trim() !== '' ? input.id.trim() : undefined
    if (id !== undefined && find(id) === undefined) {
      return mcpFailure('unknown-server', `No MCP server is stored under "${id}"`, { action: 'refresh', id })
    }
    // Without an id the scope is "every enabled server that is actually running": a
    // server the user stopped is left alone, and is neither refreshed nor reported as
    // a failure — it was never in scope. Naming one explicitly is a request that could
    // not be honoured, so that one *is* reported (`not-running`).
    const targets =
      id !== undefined
        ? [id]
        : servers
            .filter(server => server.enabled === true && states.get(server.id)?.status === 'ready')
            .map(server => server.id)
    const settled = await Promise.all(targets.map(target => refreshOne(target)))
    const refreshed = []
    const failed = []
    for (const entry of settled) {
      if (entry.ok === true) refreshed.push({ id: entry.id, ok: true, tools: entry.tools ?? [] })
      else failed.push({ id: entry.id, reason: typeof entry.reason === 'string' ? entry.reason : 'error' })
    }
    return {
      ok: failed.length === 0,
      action: 'refresh',
      refreshed,
      failed,
      toolCount: refreshed.reduce((total, entry) => total + entry.tools.length, 0),
    }
  }

  /** Add or replace one server, then start it when it is enabled. */
  async function add(input) {
    ensureLoaded()
    if (disposed) return mcpFailure('disposed', 'The MCP client is shutting down')
    const normalized = normalizeServer(input)
    if (normalized.ok !== true) return mcpFailure(normalized.reason, normalized.message, { action: 'add' })
    const server = normalized.server
    const index = servers.findIndex(entry => entry.id === server.id)
    const previous = index === -1 ? undefined : servers[index]
    if (previous !== undefined) {
      // A re-save without the secret keeps the one already stored; `token: ''` clears it.
      if (server.token === undefined && previous.token !== undefined) server.token = previous.token
      await stop(server.id)
    }
    if (index === -1) servers.push(server)
    else servers[index] = server
    const saved = persist()
    const report = { ok: saved, action: 'add', id: server.id, replaced: previous !== undefined, saved }
    if (!saved) {
      report.reason = 'store'
      report.message = storeError
      return report
    }
    if (server.enabled !== true) {
      report.status = 'stopped'
      return report
    }
    const started = await start(server.id)
    report.status = started.status ?? (started.ok === true ? 'ready' : 'error')
    if (started.ok !== true) {
      report.ok = false
      report.reason = started.reason
      report.message = started.message
    }
    report.toolCount = started.toolCount ?? 0
    return report
  }

  /** Remove one server. */
  async function remove(id) {
    ensureLoaded()
    const index = servers.findIndex(entry => entry.id === id)
    if (index === -1) return mcpFailure('unknown-server', `No MCP server is stored under "${id}"`, { action: 'remove', id })
    await stop(id)
    servers.splice(index, 1)
    states.delete(id)
    const saved = persist()
    return saved
      ? { ok: true, action: 'remove', id, removed: true }
      : { ok: false, action: 'remove', id, reason: 'store', message: storeError }
  }

  /**
   * Connect, hand-shake and discover without keeping anything: the page's Test
   * button. A stored server is tested by id; an unsaved draft by its record.
   */
  async function test(input) {
    ensureLoaded()
    let record
    if (isRecord(input?.server)) {
      const normalized = normalizeServer(input.server)
      if (normalized.ok !== true) return mcpFailure(normalized.reason, normalized.message, { action: 'test' })
      record = normalized.server
      const stored = find(record.id)
      if (stored?.token !== undefined && record.token === undefined) record.token = stored.token
    } else if (typeof input?.id === 'string') {
      record = find(input.id)
    }
    if (record === undefined) return mcpFailure('unknown-server', 'No MCP server to test was named', { action: 'test' })
    let transport
    try {
      transport = transportFor(record)
      const connection = await openConnection({ transport, clientInfo, timeoutMs: connectTimeoutMs })
      const tools = await connection.listTools({ timeoutMs: connectTimeoutMs, force: true })
      await connection.ping({ timeoutMs: connectTimeoutMs })
      return {
        ok: true,
        action: 'test',
        id: record.id,
        protocolVersion: connection.protocolVersion,
        serverInfo: connection.serverInfo,
        toolCount: tools.length,
        tools: tools.map(tool => ({
          name: tool.name,
          publicName: toolNameFor(record.id, tool.name),
          description: typeof tool.description === 'string' ? tool.description : '',
        })),
      }
    } catch (error) {
      warn(`edh-mcp(${record.id}): test failed: ${messageOf(error)}`)
      return mcpFailure(reasonOf(error), messageOf(error), { action: 'test', id: record.id })
    } finally {
      try {
        transport?.close?.()
      } catch {
        /* the test transport is already gone */
      }
    }
  }

  /** Call one tool on one started server, for the page's own call box. */
  async function call(id, toolName, toolArguments) {
    ensureLoaded()
    const entry = states.get(id)
    if (entry === undefined || entry.status !== 'ready' || entry.connection === undefined) {
      return mcpFailure('not-ready', `The server "${id}" is not connected`, { action: 'call', id })
    }
    if (typeof toolName !== 'string' || toolName === '') {
      return mcpFailure('bad-input', 'A tool name is required', { action: 'call', id })
    }
    try {
      const result = await entry.connection.callTool(toolName, isRecord(toolArguments) ? toolArguments : {}, { timeoutMs })
      const text = contentText(result.content, toolName)
      if (result.isError === true) {
        return mcpFailure('tool-error', text === '' ? 'The server reported an error' : text, { action: 'call', id, tool: toolName })
      }
      return { ok: true, action: 'call', id, tool: toolName, text, content: result.content }
    } catch (error) {
      // A transport failure is also the last failure the page should show: the
      // server died, timed out or refused, and the next call will not be better.
      const message = messageOf(error)
      entry.lastError = message
      warn(`edh-mcp(${id}): ${message}`)
      return mcpFailure(reasonOf(error), message, { action: 'call', id, tool: toolName })
    }
  }

  /** Re-register every ready server, once the tool registry appears. */
  async function syncAll() {
    ensureLoaded()
    for (const record of servers) {
      const entry = states.get(record.id)
      if (entry?.status !== 'ready' || entry.connection === undefined) continue
      const synced = await syncTools(record, entry)
      entry.lastError = synced.ok === true ? '' : synced.message
      if (synced.ok !== true) warn(`edh-mcp(${record.id}): ${synced.message}`)
    }
    return view()
  }

  /** Start every enabled server, one failure at a time. */
  async function startEnabled() {
    ensureLoaded()
    for (const record of servers) {
      if (record.enabled !== true) continue
      const started = await start(record.id)
      if (started.ok !== true) warn(`edh-mcp(${record.id}): ${started.message}`)
    }
    return view()
  }

  /** The current view, which is what every route answers. */
  function view() {
    ensureLoaded()
    const service = getTools()
    return mcpView({
      storePath: io?.path ?? storePath,
      servers,
      states,
      toolsAvailable: typeof service?.register === 'function',
      storeError,
    })
  }

  /** Shut every connection down; safe to call twice. */
  async function dispose() {
    if (disposed) return
    disposed = true
    for (const id of [...states.keys()]) {
      try {
        await stop(id)
      } catch (error) {
        warn(`edh-mcp(${id}): stopping failed: ${messageOf(error)}`)
      }
    }
    states.clear()
  }

  return { view, add, remove, test, start, stop, call, refresh, syncAll, startEnabled, dispose, storePath: io?.path ?? storePath }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** One JSON answer. A report the user asked for is never an HTTP error status. */
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * Which route one incoming request addresses.
 * @returns `view` for `GET`, `action` for `POST`, `undefined` for anything else.
 */
export function mcpMethod(request) {
  if (request?.method === 'GET') return 'view'
  if (request?.method === 'POST') return 'action'
  return undefined
}

/** The request body as a record; anything that is not one is the empty record. */
async function readJsonBody(request) {
  try {
    const body = await request.json()
    return isRecord(body) ? body : {}
  } catch {
    return {}
  }
}

/**
 * Answer one request on `/api/edh.mcp`.
 *
 * `GET` is the view. `POST` performs one action and answers the same view with a
 * `report` beside it, so the page refreshes its state from either. Bad input is a
 * JSON report with a 4xx status — an unsupported method is 405 and everything the
 * caller got wrong is 400 — and an internal failure is still a JSON report, never
 * a 500: a page that asked a question always gets an answer it can render.
 * @param request - the incoming request.
 * @param options - the manager that owns the servers.
 * @returns the JSON response.
 */
export async function mcpResponse(request, options = {}) {
  const manager = options.manager
  if (manager === undefined || typeof manager.view !== 'function') {
    return jsonResponse(mcpFailure('unavailable', 'The MCP client is not available'), 200)
  }
  const method = mcpMethod(request)
  if (method === undefined) {
    return jsonResponse(
      mcpFailure('unsupported-method', `Unsupported method ${request?.method ?? 'without a method'}`),
      405,
    )
  }
  try {
    if (method === 'view') return jsonResponse(manager.view())
    const body = await readJsonBody(request)
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    let report
    switch (action) {
      case 'add':
        report = await manager.add(isRecord(body.server) ? body.server : body)
        break
      case 'remove':
        report = await manager.remove(body.id)
        break
      case 'test':
        report = await manager.test(body)
        break
      case 'start':
        report = await manager.start(body.id)
        break
      case 'stop':
        report = await manager.stop(body.id)
        break
      case 'call':
        report = await manager.call(body.id, body.tool, body.arguments)
        break
      case 'refresh':
        report = await manager.refresh(body)
        break
      default: {
        const reason = action === '' ? 'bad-input' : 'unknown-action'
        const message =
          action === ''
            ? 'A POST needs an "action": add, remove, test, start, stop, call or refresh'
            : `Unknown action ${JSON.stringify(action)}; expected add, remove, test, start, stop, call or refresh`
        // The page shows the report's own sentence, so both carry the same one.
        return jsonResponse({ ...manager.view(), ok: false, reason, message, report: mcpFailure(reason, message) }, 400)
      }
    }
    const view = manager.view()
    const status = report?.ok === true || !REJECTED_REASONS.has(report?.reason) ? 200 : 400
    return jsonResponse({ ...view, ok: report?.ok === true, report }, status)
  } catch (error) {
    const message = messageOf(error)
    return jsonResponse(
      { ...manager.view(), ok: false, reason: reasonOf(error), message, report: mcpFailure(reasonOf(error), message) },
      200,
    )
  }
}

// ---------------------------------------------------------------------------
// The row
// ---------------------------------------------------------------------------

/**
 * Register the MCP client on the Host.
 *
 * The route is registered inside `ctx.effect`, and so is the client's own
 * disposal: turning the `edh-mcp` row off closes every connection and calls the
 * disposer the ToolRuntime returned for every tool, so `mcp__…` tools disappear
 * with the row instead of lingering as registrations whose server is gone.
 *
 * The tool registry may mount after this row — a feature row is not ordered
 * against the agent's own services — so its appearance is what re-syncs the
 * servers that were already discovered. A deployment without it still answers
 * every route; it just has nothing to register the tools on, which the view
 * reports as `toolsAvailable: false`.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  const manager = createManager({
    logger: ctx.logger,
    getTools: () => ctx.get?.('tools'),
  })

  ctx.effect(
    () => () => {
      void manager.dispose()
    },
    'edh-mcp: client disposal',
  )

  ctx.effect(() => {
    try {
      const dispose = ctx.connection.fetch.register({
        path: MCP_PATH,
        methods: ['GET', 'POST'],
        requestBody: 'buffered',
        fetch: request => mcpResponse(request, { manager }),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-mcp: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      ctx.logger?.warn?.('edh-mcp: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-mcp: client route')

  try {
    ctx.inject?.(['tools'], () => {
      void manager.syncAll().catch(error => {
        ctx.logger?.warn?.('edh-mcp: re-registering tools failed: %o', error)
      })
    })
  } catch (error) {
    ctx.logger?.warn?.('edh-mcp: the tool registry is not injectable: %o', error)
  }

  void manager.startEnabled().catch(error => {
    ctx.logger?.warn?.('edh-mcp: starting the stored servers failed: %o', error)
  })
}

/** The route needs the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
