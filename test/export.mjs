import assert from 'node:assert/strict'
import {
  conversationEntries,
  exportFilename,
  EXPORT_PATH,
  readSessionEvents,
  renderSessionMarkdown,
  sessionMarkdownResponse,
} from '../export.js'

const AT = Date.UTC(2026, 9, 26, 12, 7, 29)
const text = value => [{ type: 'text', text: value }]

/** One user/message event shaped the way the canonical log writes it. */
const userEvent = (seq, value, extra = {}) => ({
  type: 'user/message',
  seq,
  time: AT + seq * 1000,
  data: { id: `u${seq}`, role: 'user', source: { kind: 'user' }, content: text(value) },
  ...extra,
})

/** One assistant/message event; the message lives under `data.message`. */
const assistantEvent = (seq, value, extra = {}) => ({
  type: 'assistant/message',
  seq,
  time: AT + seq * 1000,
  data: {
    message: {
      id: `a${seq}`,
      role: 'assistant',
      source: { kind: 'model', provider: 'deepseek', model: 'deepseek-v4.1' },
      content: text(value),
    },
  },
  ...extra,
})

// 1 — the two message types become one ordered conversation.
{
  assert.deepEqual(conversationEntries([userEvent(3, 'hello'), assistantEvent(4, 'hi there')]), [
    { seq: 3, role: 'user', time: AT + 3000, text: 'hello', images: 0, files: [] },
    { seq: 4, role: 'assistant', time: AT + 4000, text: 'hi there', images: 0, files: [] },
  ])
}

// 2 — a compaction checkpoint replaces the range it shadows.
{
  const checkpoint = userEvent(5, 'summary of the first two turns', {
    surfaceOp: { op: 'replace', startSeq: 1, endSeq: 2 },
  })
  assert.deepEqual(
    conversationEntries([userEvent(1, 'first'), assistantEvent(2, 'answer'), checkpoint]).map(entry => entry.text),
    ['summary of the first two turns'],
  )
}

// 3 — only text blocks reach the reader, and a message with none is dropped.
{
  const reasoningOnly = {
    type: 'assistant/message',
    seq: 2,
    time: AT + 2000,
    data: { message: { content: [{ type: 'reasoning', text: 'thinking' }] } },
  }
  const twoBlocks = {
    type: 'assistant/message',
    seq: 3,
    time: AT + 3000,
    data: { message: { content: [...text('first'), { type: 'reasoning', text: 'x' }, ...text('second')] } },
  }
  assert.deepEqual(conversationEntries([reasoningOnly, twoBlocks]).map(entry => entry.text), ['first\n\nsecond'])
}

// 4 — attachments are counted, and files keep their name.
{
  const withAttachments = userEvent(1, 'look', {
    data: {
      id: 'u1',
      role: 'user',
      source: { kind: 'user' },
      content: [
        { type: 'image', attachment: { attachmentId: 'sha256:aa', mediaType: 'image/png' } },
        { type: 'file', attachment: { attachmentId: 'sha256:bb', name: 'report.pdf' } },
        ...text('look'),
      ],
    },
  })
  assert.deepEqual(conversationEntries([withAttachments]), [
    { seq: 1, role: 'user', time: AT + 1000, text: 'look', images: 1, files: ['report.pdf'] },
  ])
}

// 5 — the document: a titled header, then each message under its own heading.
{
  const doc = renderSessionMarkdown({
    header: { id: 'session-abc', createdAt: AT, cwd: 'C:\\work' },
    events: [userEvent(3, 'hello'), assistantEvent(4, 'hi there')],
    exportedAt: AT + 120000,
  })
  assert.equal(doc, [
    '# hello',
    '',
    '- **Session:** `session-abc`',
    '- **Created:** 2026-10-26 12:07 UTC',
    '- **Working directory:** `C:\\work`',
    '- **Exported:** 2026-10-26 12:09 UTC by EDH',
    '- **Messages:** 2',
    '',
    '## User — 2026-10-26 12:07 UTC',
    '',
    'hello',
    '',
    '## Assistant — 2026-10-26 12:07 UTC',
    '',
    'hi there',
    '',
  ].join('\n'))
}

// 6 — a Session with no readable prompt is titled by its id, and attachments
// are named under the message that carried them.
{
  const attachmentOnly = userEvent(1, '', {
    data: {
      id: 'u1',
      role: 'user',
      source: { kind: 'user' },
      content: [
        { type: 'image', attachment: { attachmentId: 'sha256:aa', mediaType: 'image/png' } },
        { type: 'file', attachment: { attachmentId: 'sha256:bb', name: 'report.pdf' } },
      ],
    },
  })
  const doc = renderSessionMarkdown({
    header: { id: 'session-abc', createdAt: AT },
    events: [attachmentOnly],
    exportedAt: AT,
  })
  assert.ok(doc.startsWith('# Session session-abc\n'), 'falls back to the Session id')
  assert.ok(!doc.includes('Working directory'), 'an unknown working directory is left out')
  assert.ok(doc.includes('_[1 image, file: report.pdf]_'), 'attachments are named')

  const empty = renderSessionMarkdown({ header: { id: 'session-empty' }, events: [], exportedAt: AT })
  assert.ok(empty.includes('- **Messages:** 0'))
}

// 7 — reading a Session log flushes a live Session first, then closes the handle.
{
  const calls = []
  const events = [userEvent(1, 'hello')]
  const ctx = {
    get(name) {
      if (name === 'sessions') {
        return {
          get: id => (id === 'session-live' ? { id } : undefined),
          async flush(session) {
            calls.push(['flush', session.id])
          },
        }
      }
      if (name === 'sessionPersistence') {
        return {
          async open(id, mode) {
            calls.push(['open', id, mode])
            return {
              header: { id },
              async read(from, to) {
                calls.push(['read', from, to])
                return { events }
              },
              async close() {
                calls.push(['close'])
              },
            }
          },
        }
      }
      return undefined
    },
  }

  assert.deepEqual(await readSessionEvents(ctx, 'session-live'), { ok: true, header: { id: 'session-live' }, events })
  assert.deepEqual(calls, [
    ['flush', 'session-live'],
    ['open', 'session-live', 'read'],
    ['read', 0, undefined],
    ['close'],
  ])

  // A cold Session has nothing in memory to flush, and the handle closes even
  // when the read itself fails.
  calls.length = 0
  const failing = {
    get(name) {
      if (name === 'sessions') return { get: () => undefined, flush() { throw new Error('unused') } }
      return {
        async open() {
          calls.push(['open'])
          return {
            header: {},
            async read() {
              calls.push(['read'])
              throw new Error('torn log')
            },
            async close() {
              calls.push(['close'])
            },
          }
        },
      }
    },
  }
  assert.deepEqual(await readSessionEvents(failing, 'session-cold'), { ok: false, reason: 'missing', message: 'torn log' })
  assert.deepEqual(calls, [['open'], ['read'], ['close']])

  // No persistence backend means the feature cannot answer at all.
  assert.deepEqual(await readSessionEvents({ get: () => undefined }, 'session-abc'), { ok: false, reason: 'unavailable' })
}

// 8 — a replacement carried by an event that is not a message still drops the
// range it shadows: compaction prunes with `system/message` too.
{
  const pruning = {
    type: 'system/message',
    seq: 3,
    time: AT + 3000,
    surfaceOp: { op: 'replace', startSeq: 1, endSeq: 2 },
    data: { message: { content: [] } },
  }
  assert.deepEqual(
    conversationEntries([userEvent(1, 'gone'), assistantEvent(2, 'gone too'), pruning, userEvent(4, 'kept')]).map(
      entry => entry.text,
    ),
    ['kept'],
  )
}

// 9 — the document takes the Session's own title, newest first, and falls back
// to the prompt when the title is missing or blank.
{
  const titled = (...titles) =>
    titles.map((title, index) => ({ type: 'session/title', seq: 10 + index, time: AT, data: { title } }))
  const withTitle = renderSessionMarkdown({
    header: { id: 'session-abc' },
    events: [userEvent(1, 'draft prompt'), ...titled('first guess', 'Retry failed API calls automatically')],
    exportedAt: AT,
  })
  assert.ok(withTitle.startsWith('# Retry failed API calls automatically\n'), 'the newest title wins')

  const blankTitle = renderSessionMarkdown({
    header: { id: 'session-abc' },
    events: [userEvent(1, 'draft prompt'), ...titled('   ')],
    exportedAt: AT,
  })
  assert.ok(blankTitle.startsWith('# draft prompt\n'), 'a blank title falls back to the prompt')
}

// 10 — the download filename is one safe segment, whatever the Session id holds.
{
  assert.equal(exportFilename('session-decbf27c-0ef3'), 'dsh-session-session-decbf27c-0ef3.md')
  assert.equal(exportFilename('../../etc/passwd'), 'dsh-session-______etc_passwd.md')
  assert.equal(exportFilename('a b\tc'), 'dsh-session-a_b_c.md')
}

// 11 — the route answers a Markdown download, and refuses without a Session id.
{
  const ctx = {
    logger: { warn() {} },
    get(name) {
      if (name !== 'sessionPersistence') return undefined
      return {
        async open(id) {
          return {
            header: { id, createdAt: AT, cwd: 'C:\\work' },
            async read() {
              return { events: [userEvent(1, 'hello'), assistantEvent(2, 'hi there')] }
            },
            async close() {},
          }
        },
      }
    },
  }
  const response = await sessionMarkdownResponse(ctx, new Request('http://host/api/edh.export?sessionId=session-abc'))
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('content-type'), 'text/markdown; charset=utf-8')
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="dsh-session-session-abc.md"')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const document = await response.text()
  assert.ok(document.startsWith('# hello\n'), 'the document is the body')
  assert.ok(document.includes('## Assistant — 2026-10-26 12:07 UTC'))

  const missing = await sessionMarkdownResponse(ctx, new Request('http://host/api/edh.export'))
  assert.equal(missing.status, 400)

  const absentBackend = {
    logger: { warn() {} },
    get: () => undefined,
  }
  const unavailable = await sessionMarkdownResponse(
    absentBackend,
    new Request('http://host/api/edh.export?sessionId=session-abc'),
  )
  assert.equal(unavailable.status, 500)
  assert.equal(EXPORT_PATH, '/api/edh.export')
}

console.log('edh export: all checks passed')
