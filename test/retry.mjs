import assert from 'node:assert/strict'
import { apply, resolveBackoff } from '../retry.js'

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const failure = code => ({ message: `boom: ${code}`, code })
const payload = overrides => ({
  agent: { id: 'agent-1' },
  turn: 1,
  step: 2,
  provider: 'our-free-model',
  failure: failure('TRANSPORT'),
  retryPolicy: undefined,
  signal: new AbortController().signal,
  ...overrides,
})
// Tiny delays keep the suite fast; jitter is off so timings are predictable.
const FAST = { backoff: { initialDelayMs: 10, maxDelayMs: 100, jitterRatio: 0 } }

/** Minimal Cordis-shaped context: on(), effect(), and a waterfall dispatcher. */
function createContext() {
  const listeners = new Map()
  const disposers = []
  return {
    logger: { info() {}, warn() {} },
    on(name, listener) {
      const list = listeners.get(name) ?? []
      list.push(listener)
      listeners.set(name, list)
      return () => {
        const index = list.indexOf(listener)
        if (index >= 0) list.splice(index, 1)
      }
    },
    effect(callback) {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer)
    },
    waterfall(name, event) {
      const list = listeners.get(name) ?? []
      const dispatch = index =>
        index >= list.length
          ? Promise.resolve(undefined)
          : Promise.resolve(list[index](event, () => dispatch(index + 1)))
      return dispatch(0)
    },
    async dispose() {
      for (const disposer of disposers.reverse()) await disposer?.()
    },
  }
}

/** Mount the feature, then append a sentinel downstream recovery policy. */
function mount({ downstream = () => undefined } = {}) {
  const ctx = createContext()
  apply(ctx, FAST)
  const calls = { downstream: 0 }
  ctx.on('agent/request-error', async (event, next) => {
    calls.downstream += 1
    return downstream(event, next)
  })
  return { ctx, calls }
}

// 1 — configured limits and their defaults.
assert.deepEqual(resolveBackoff(), { initialDelayMs: 1000, maxDelayMs: 30000, jitterRatio: 0.2 })
assert.deepEqual(resolveBackoff({ initialDelayMs: 5 }), { initialDelayMs: 5, maxDelayMs: 30000, jitterRatio: 0.2 })
assert.deepEqual(
  resolveBackoff({ backoff: { initialDelayMs: 5, maxDelayMs: 2, jitterRatio: 0.5 } }),
  { initialDelayMs: 5, maxDelayMs: 5, jitterRatio: 0.5 },
  'maxDelayMs never undercuts initialDelayMs',
)
assert.deepEqual(resolveBackoff({ backoff: { initialDelayMs: 'x', jitterRatio: 9 } }), {
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  jitterRatio: 1,
})

// 2 — a structural failure delegates without retrying.
{
  const { ctx, calls } = mount()
  const started = Date.now()
  const answer = await ctx.waterfall('agent/request-error', payload({ failure: failure('NO_ADAPTER') }))
  assert.equal(answer, undefined)
  assert.equal(calls.downstream, 1, 'downstream recovery ran')
  assert.ok(Date.now() - started < 50, 'no backoff for a non-retryable code')
}

// 3 — a transient failure the built-ins declined is retried after backoff.
{
  const { ctx, calls } = mount()
  const started = Date.now()
  const answer = await ctx.waterfall('agent/request-error', payload())
  assert.deepEqual(answer, { kind: 'retry' })
  assert.equal(calls.downstream, 1, 'downstream had its say first')
  assert.ok(Date.now() - started >= 8, 'waited roughly initialDelayMs')
}

// 4 — a downstream retry decision is honored untouched.
{
  const { ctx, calls } = mount({ downstream: () => ({ kind: 'retry' }) })
  const started = Date.now()
  const answer = await ctx.waterfall('agent/request-error', payload())
  assert.deepEqual(answer, { kind: 'retry' })
  assert.equal(calls.downstream, 1)
  assert.ok(Date.now() - started < 15, 'no extra wait when a built-in already retried')
}

// 5 — cancellation never retries.
{
  const controller = new AbortController()
  controller.abort()
  const { ctx, calls } = mount()
  const answer = await ctx.waterfall('agent/request-error', payload({ signal: controller.signal }))
  assert.equal(answer, undefined)
  assert.equal(calls.downstream, 1, 'delegates so the loop can close the cancelled turn')
}

// 6 — a transient failure whose code arrives after downstream threw is still retried.
{
  const { ctx } = mount({
    downstream: () => {
      throw new Error('downstream broke')
    },
  })
  const answer = await ctx.waterfall('agent/request-error', payload())
  assert.deepEqual(answer, { kind: 'retry' })
}

// 7 — consecutive failures on one step back off further than the previous wait.
{
  const { ctx } = mount()
  const measure = async () => {
    const started = Date.now()
    assert.deepEqual(await ctx.waterfall('agent/request-error', payload()), { kind: 'retry' })
    return Date.now() - started
  }
  const first = await measure()
  const second = await measure()
  assert.ok(second >= first + 5, `second wait ${second}ms outlasted first ${first}ms`)
}

// 8 — every non-excluded code retries; the excluded set stays excluded.
for (const code of ['RATE_LIMIT', 'QUOTA', 'AUTH', 'SERVER', 'TIMEOUT', 'EMPTY_RESPONSE', 'PROTOCOL']) {
  const { ctx } = mount()
  assert.deepEqual(await ctx.waterfall('agent/request-error', payload({ failure: failure(code) })), { kind: 'retry' }, code)
}
for (const code of ['ABORTED', 'MISSING_CREDENTIAL', 'INVALID_CREDENTIAL', 'INVALID_REQUEST', 'IMAGE_OFFLOAD_REQUIRED', 'CONTEXT_WINDOW_EXCEEDED']) {
  const { ctx } = mount()
  assert.equal(await ctx.waterfall('agent/request-error', payload({ failure: failure(code) })), undefined, code)
}

// 9 — disposal aborts an in-flight backoff and drains without retrying.
{
  const { ctx } = mount()
  const pending = ctx.waterfall('agent/request-error', payload())
  await sleep(2)
  await ctx.dispose()
  assert.equal(await pending, undefined, 'disposed feature does not retry')
}

// 10 — a finished turn forgets its counters, so a later failure starts fresh.
{
  const { ctx } = mount()
  await ctx.waterfall('agent/request-error', payload())
  await ctx.waterfall('agent/request-error', payload())
  ctx.waterfall('agent/status', { agent: { id: 'agent-1' }, status: 'idle' })
  const started = Date.now()
  assert.deepEqual(await ctx.waterfall('agent/request-error', payload({ turn: 2, step: 1 })), { kind: 'retry' })
  assert.ok(Date.now() - started < 25, 'new turn/step starts at the base delay')
}

// 11 — a provider Retry-After hint replaces the local delay, within bounds.
{
  const { ctx } = mount()
  const started = Date.now()
  const answer = await ctx.waterfall(
    'agent/request-error',
    payload({ failure: { ...failure('RATE_LIMIT'), providerRetryAfterMs: 20 } }),
  )
  assert.deepEqual(answer, { kind: 'retry' })
  const elapsed = Date.now() - started
  assert.ok(elapsed >= 17 && elapsed < 45, `honored the hint (waited ${elapsed}ms)`)
}

// 12 — a hint larger than maxDelayMs is capped, never stalling the turn.
{
  const { ctx } = mount()
  const started = Date.now()
  await ctx.waterfall(
    'agent/request-error',
    payload({ failure: { ...failure('RATE_LIMIT'), providerRetryAfterMs: 60000 } }),
  )
  const elapsed = Date.now() - started
  assert.ok(elapsed >= 90 && elapsed < 160, `capped to maxDelayMs (waited ${elapsed}ms)`)
}

console.log('edh retry: all checks passed')
