/**
 * EDH feature: `export` — download one Session as a Markdown document.
 *
 * The Session log is the only source of truth, so the export reads it back
 * through the persistence read handle and folds the surface the Harness shows:
 * user and assistant messages in log order, with a compaction checkpoint
 * replacing the range it shadows.
 *
 * The Host answers the document on an authenticated download route and the
 * browser hands that route to its own download manager, so nothing is written
 * to disk behind the user's back.
 */

export const name = 'edh-export'

/** Absolute pathname the Host registers; the browser addresses it document-relative. */
export const EXPORT_PATH = '/api/edh.export'

/** Session event types that carry a message the reader should see. */
const ROLE_BY_TYPE = new Map([
  ['user/message', 'user'],
  ['assistant/message', 'assistant'],
])

/** The message object of one message event: `data` for user, `data.message` for the rest. */
function messageOf(event) {
  const data = event?.data
  if (data === null || typeof data !== 'object') return undefined
  if (event.type === 'user/message') return data
  const message = data.message
  return message !== null && typeof message === 'object' ? message : undefined
}

/** The content blocks of one message event, or an empty list. */
function blocksOf(event) {
  const content = messageOf(event)?.content
  return Array.isArray(content) ? content : []
}

/**
 * Fold one message event into a reader-facing entry.
 * @returns the entry, or `undefined` when the message carries nothing readable.
 */
function entryOf(seq, role, time, blocks) {
  const texts = []
  const files = []
  let images = 0
  for (const block of blocks) {
    if (block === null || typeof block !== 'object') continue
    if (block.type === 'text' && typeof block.text === 'string') texts.push(block.text)
    else if (block.type === 'image') images += 1
    else if (block.type === 'file') files.push(typeof block.attachment?.name === 'string' ? block.attachment.name : 'file')
  }
  const text = texts.join('\n\n').trim()
  if (text === '' && images === 0 && files.length === 0) return undefined
  return { seq, role, time, text, images, files }
}

/**
 * The conversation one Session log shows, in order.
 *
 * An event whose `surfaceOp` replaces a sequence range drops everything it
 * shadows first — compaction prunes with a `system/message` as well as with a
 * checkpoint `user/message`, and the reader wants the surface, not the events
 * behind it.
 * @param events - the Session's committed events, in sequence order.
 * @returns the readable entries.
 */
export function conversationEntries(events) {
  const kept = new Map()
  for (const event of Array.isArray(events) ? events : []) {
    if (event === null || typeof event !== 'object') continue
    const op = event.surfaceOp
    if (op !== null && typeof op === 'object' && op.op === 'replace') {
      const { startSeq, endSeq } = op
      if (typeof startSeq === 'number' && typeof endSeq === 'number') {
        for (const key of [...kept.keys()]) if (key >= startSeq && key <= endSeq) kept.delete(key)
      }
    }
    const role = ROLE_BY_TYPE.get(event.type)
    if (role === undefined) continue
    const seq = event.seq
    if (typeof seq !== 'number' || !Number.isFinite(seq)) continue
    const entry = entryOf(seq, role, event.time, blocksOf(event))
    if (entry !== undefined) kept.set(seq, entry)
  }
  return [...kept.values()].sort((left, right) => left.seq - right.seq)
}

/** Longest title taken from the first prompt before it is clipped. */
const TITLE_LIMIT = 80

/**
 * `YYYY-MM-DD HH:MM UTC` for one epoch millisecond value.
 * @returns the stamp, or an empty string when the value is not a time.
 */
function formatStamp(milliseconds) {
  if (typeof milliseconds !== 'number' || !Number.isFinite(milliseconds)) return ''
  const iso = new Date(milliseconds).toISOString()
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

/**
 * The document title: the Session's own newest title, else the first readable
 * prompt line, else the Session id. A heading marker is stripped from the
 * prompt so a message that starts with `#` cannot swallow the document title.
 */
function titleOf(header, entries, events) {
  const list = Array.isArray(events) ? events : []
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const event = list[index]
    if (event?.type !== 'session/title') continue
    const title = event.data?.title
    if (typeof title === 'string' && title.trim() !== '') return clip(title.trim())
  }
  const prompt = entries.find(entry => entry.role === 'user' && entry.text !== '')
  if (prompt !== undefined) {
    const line = prompt.text.split('\n')[0].replace(/^[#>\s]+/u, '').trim()
    if (line !== '') return clip(line)
  }
  return `Session ${header?.id ?? 'unknown'}`
}

/** Cap one title line at the point a heading stops being a heading. */
function clip(line) {
  return line.length > TITLE_LIMIT ? `${line.slice(0, TITLE_LIMIT).trimEnd()}…` : line
}

/** One `## Role — stamp` block: the text when there is any, then its attachments. */
function messageBlock(entry) {
  const stamp = formatStamp(entry.time)
  const heading = `## ${entry.role === 'user' ? 'User' : 'Assistant'}${stamp === '' ? '' : ` — ${stamp}`}`
  const lines = [heading, '']
  if (entry.text !== '') lines.push(entry.text, '')
  const notes = []
  if (entry.images > 0) notes.push(`${entry.images} image${entry.images === 1 ? '' : 's'}`)
  for (const file of entry.files) notes.push(`file: ${file}`)
  if (notes.length > 0) lines.push(`_[${notes.join(', ')}]_`, '')
  return lines
}

/**
 * Render one Session as a Markdown document.
 * @param options - the Session header, its committed events, and the export time.
 * @returns the document, ending with a newline.
 */
export function renderSessionMarkdown({ header, events, exportedAt } = {}) {
  const entries = conversationEntries(events)
  const facts = []
  if (typeof header?.id === 'string' && header.id !== '') facts.push(`- **Session:** \`${header.id}\``)
  const created = formatStamp(header?.createdAt)
  if (created !== '') facts.push(`- **Created:** ${created}`)
  if (typeof header?.cwd === 'string' && header.cwd !== '') facts.push(`- **Working directory:** \`${header.cwd}\``)
  const exported = formatStamp(exportedAt)
  facts.push(`- **Exported:** ${exported === '' ? 'now' : exported} by EDH`)
  facts.push(`- **Messages:** ${entries.length}`)

  const lines = [`# ${titleOf(header, entries, events)}`, '', ...facts, '']
  for (const entry of entries) lines.push(...messageBlock(entry))
  return lines.join('\n')
}

/**
 * Flush one live Session through the store's durability barrier, so the stored
 * log the reader is about to open includes work still in memory. A cold id has
 * nothing to flush.
 */
async function flushLiveSession(ctx, sessionId) {
  const sessions = ctx.get('sessions')
  if (sessions === undefined || typeof sessions.get !== 'function') return
  const session = sessions.get(sessionId)
  if (session === undefined || typeof sessions.flush !== 'function') return
  try {
    await sessions.flush(session)
  } catch (error) {
    ctx.logger?.warn?.('edh-export: flush failed for %s: %o', sessionId, error)
  }
}

/**
 * Read one Session's header and committed events.
 *
 * The read goes through the persistence read handle, which observes the
 * committed log only — never a torn tail.
 * @param ctx - the Host context.
 * @param sessionId - the Session to read.
 * @returns the header and events, or the reason they are unavailable.
 */
export async function readSessionEvents(ctx, sessionId) {
  const persistence = ctx.get('sessionPersistence')
  if (persistence === undefined || typeof persistence.open !== 'function') return { ok: false, reason: 'unavailable' }
  await flushLiveSession(ctx, sessionId)
  let handle
  try {
    handle = await persistence.open(sessionId, 'read')
  } catch (error) {
    return { ok: false, reason: 'missing', message: String(error?.message ?? error) }
  }
  try {
    const read = await handle.read(0, undefined)
    return { ok: true, header: handle.header ?? {}, events: Array.isArray(read?.events) ? read.events : [] }
  } catch (error) {
    return { ok: false, reason: 'missing', message: String(error?.message ?? error) }
  } finally {
    try {
      await handle.close()
    } catch (error) {
      ctx.logger?.warn?.('edh-export: closing %s failed: %o', sessionId, error)
    }
  }
}

/** Collapse an untrusted Session id into one filename segment. */
function safeSessionId(sessionId) {
  return String(sessionId).replace(/[^A-Za-z0-9_-]/gu, '_')
}

/** The download filename for one Session document. */
export function exportFilename(sessionId) {
  return `dsh-session-${safeSessionId(sessionId)}.md`
}

/** One plain-text response with no caching. */
function textResponse(body, status) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/**
 * Answer one export request with the Session's Markdown document.
 * @param ctx - the Host context.
 * @param request - the incoming download request.
 */
export async function sessionMarkdownResponse(ctx, request) {
  const url = new URL(request.url)
  const sessionId = url.searchParams.get('sessionId')
  if (sessionId === null || sessionId === '') return textResponse('missing sessionId query parameter', 400)
  const read = await readSessionEvents(ctx, sessionId)
  if (!read.ok) {
    return read.reason === 'unavailable'
      ? textResponse('session export is unavailable: missing session-persistence service', 500)
      : textResponse(`session log unavailable: ${read.message}`, 404)
  }
  const document = renderSessionMarkdown({ header: read.header, events: read.events, exportedAt: Date.now() })
  return new Response(document, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${exportFilename(sessionId)}"`,
      'cache-control': 'no-store',
    },
  })
}

/**
 * Register the download route on the Host connection.
 * @param ctx - the Host context.
 */
export function apply(ctx) {
  ctx.effect(() => {
    try {
      const connection = ctx.get('connection')
      if (connection === undefined || typeof connection.fetch?.register !== 'function') {
        ctx.logger?.warn?.('edh-export: no connection.fetch registry; the Markdown route is not served')
        return () => {}
      }
      const dispose = connection.fetch.register({
        path: EXPORT_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: request => sessionMarkdownResponse(ctx, request),
      })
      return () => {
        try {
          dispose?.()
        } catch (error) {
          ctx.logger?.warn?.('edh-export: route disposal failed: %o', error)
        }
      }
    } catch (error) {
      // A route this deployment refuses must never take the whole bundle down.
      ctx.logger?.warn?.('edh-export: route registration failed: %o', error)
      return () => {}
    }
  }, 'edh-export: markdown route')
}

/** The route needs the Host connection; without it the feature stays unloaded. */
export const inject = ['connection']
