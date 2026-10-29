import assert from 'node:assert/strict'
import { apply, resolveBackoff } from '../retry.js'

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
// Delays small enough to read, jitter off so the computed delay is a number the
// test can state exactly. Nothing in this suite *waits* them: the clock is fake.
const BASE = 10
const FAST = { backoff: { initialDelayMs: BASE, maxDelayMs: 100, jitterRatio: 0 } }

/**
 * Run one block against a fake clock.
 *
 * The module sleeps between retries, and every assertion about "how long it
 * waited" used to be a wall-clock bound measured with `Date.now()` — `< 50 ms`,
 * `>= 8`, `< 15`. Under load (twelve suites back to back) those are coin flips,
 * which is what made this suite fail only in a chain. So the timer itself is
 * replaced: `setTimeout` records the delay the module asked for and resolves on
 * the microtask queue, and the test asserts the **recorded delay sequence**.
 * "waited about 10 ms" becomes "asked for exactly 10 ms", which is both a
 * stronger statement and a load-proof one.
 *
 * `auto: false` holds the timers instead: the module reaches its backoff and
 * stays there until `release()` (or an abort) fires it, so a test can act
 * *during* a wait instead of sleeping beside one.
 * @param operation - receives `{ delays, release }`.
 * @param options - `auto` (default true): resolve each timer immediately.
 * @returns whatever the operation returned.
 */
async function withFakeClock(operation, { auto = true } = {}) {
  const realSetTimeout = globalThis.setTimeout
  const realClearTimeout = globalThis.clearTimeout
  const delays = []
  const held = new Map()
  let nextId = 1

  globalThis.setTimeout = (callback, delayMs) => {
    const id = nextId
    nextId += 1
    delays.push(delayMs)
    if (auto === true) {
      // After the current turn, exactly like a real timer: `wait()` has already
      // stored its handle by then, so its `clearTimeout` finds it.
      queueMicrotask(() => {
        if (held.has(id)) return
        callback()
      })
    } else {
      held.set(id, callback)
    }
    return id
  }
  globalThis.clearTimeout = id => {
    held.delete(id)
    held.set(id, undefined)
    // A no-op for an auto timer that has already run.
    if (typeof id !== 'number') return
  }

  const clock = {
    delays,
    /** Fire every held timer, as if the waits had elapsed. */
    release() {
      for (const [id, callback] of [...held]) {
        held.delete(id)
        if (typeof callback === 'function') callback()
      }
    },
  }
  try {
    return await operation(clock)
  } finally {
    globalThis.setTimeout = realSetTimeout
    globalThis.clearTimeout = realClearTimeout
  }
}

/** Let the hook reach its backoff without depending on wall time. */
async function untilWaiting(clock) {
  for (let turn = 0; turn < 200 && clock.delays.length === 0; turn += 1) {
    await Promise.resolve()
  }
  assert.equal(clock.delays.length > 0, true, 'the retry reached its backoff')
}

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
function mount({ downstream = () => undefined, config = FAST } = {}) {
  const ctx = createContext()
  apply(ctx, config)
  const calls = { downstream: 0 }
  ctx.on('agent/request-error', async (event, next) => {
    calls.downstream += 1
    return downstream(event, next)
  })
  return { ctx, calls }
}

// ---------------------------------------------------------------------------
// 1 — configured limits and their defaults
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2 — a structural failure delegates without retrying: it never even sleeps
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx, calls } = mount()
  const answer = await ctx.waterfall('agent/request-error', payload({ failure: failure('NO_ADAPTER') }))
  assert.equal(answer, undefined)
  assert.equal(calls.downstream, 1, 'downstream recovery ran')
  assert.deepEqual(clock.delays, [], 'no backoff for a non-retryable code — not even a zero delay')
})

// ---------------------------------------------------------------------------
// 3 — a transient failure the built-ins declined is retried after one backoff
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx, calls } = mount()
  const answer = await ctx.waterfall('agent/request-error', payload())
  assert.deepEqual(answer, { kind: 'retry' })
  assert.equal(calls.downstream, 1, 'downstream had its say first')
  assert.deepEqual(clock.delays, [BASE], 'one wait, of exactly initialDelayMs')
})

// ---------------------------------------------------------------------------
// 4 — a downstream retry decision is honored untouched, with no extra wait
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx, calls } = mount({ downstream: () => ({ kind: 'retry' }) })
  const answer = await ctx.waterfall('agent/request-error', payload())
  assert.deepEqual(answer, { kind: 'retry' })
  assert.equal(calls.downstream, 1)
  assert.deepEqual(clock.delays, [], 'no extra wait when a built-in already retried')
})

// ---------------------------------------------------------------------------
// 5 — cancellation never retries
// ---------------------------------------------------------------------------
{
  const controller = new AbortController()
  controller.abort()
  const { ctx, calls } = mount()
  const answer = await ctx.waterfall('agent/request-error', payload({ signal: controller.signal }))
  assert.equal(answer, undefined)
  assert.equal(calls.downstream, 1, 'delegates so the loop can close the cancelled turn')
}

// ---------------------------------------------------------------------------
// 6 — a transient failure whose downstream threw is still retried
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx } = mount({
    downstream: () => {
      throw new Error('downstream broke')
    },
  })
  const answer = await ctx.waterfall('agent/request-error', payload())
  assert.deepEqual(answer, { kind: 'retry' })
  assert.deepEqual(clock.delays, [BASE], 'a broken downstream does not lose the backoff')
})

// ---------------------------------------------------------------------------
// 7 — consecutive failures on one step back off exponentially, exactly
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx } = mount()
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    assert.deepEqual(await ctx.waterfall('agent/request-error', payload()), { kind: 'retry' })
  }
  // initialDelayMs × 2^(retry-1), capped at maxDelayMs — computed, not measured.
  assert.deepEqual(clock.delays, [BASE, BASE * 2, BASE * 4, Math.min(BASE * 8, 100)])
  assert.equal(clock.delays[1] > clock.delays[0], true, 'each retry waits strictly longer than the last')
})

// ---------------------------------------------------------------------------
// 8 — every non-excluded code retries; the excluded set stays excluded
// ---------------------------------------------------------------------------
for (const code of ['RATE_LIMIT', 'QUOTA', 'AUTH', 'SERVER', 'TIMEOUT', 'EMPTY_RESPONSE', 'PROTOCOL']) {
  await withFakeClock(async clock => {
    const { ctx } = mount()
    assert.deepEqual(await ctx.waterfall('agent/request-error', payload({ failure: failure(code) })), { kind: 'retry' }, code)
    assert.deepEqual(clock.delays, [BASE], `${code} waits before retrying`)
  })
}
for (const code of ['ABORTED', 'MISSING_CREDENTIAL', 'INVALID_CREDENTIAL', 'INVALID_REQUEST', 'IMAGE_OFFLOAD_REQUIRED', 'CONTEXT_WINDOW_EXCEEDED']) {
  await withFakeClock(async clock => {
    const { ctx } = mount()
    assert.equal(await ctx.waterfall('agent/request-error', payload({ failure: failure(code) })), undefined, code)
    assert.deepEqual(clock.delays, [], `${code} is never retried, so it never sleeps`)
  })
}

// ---------------------------------------------------------------------------
// 9 — disposal aborts an in-flight backoff and drains without retrying
// ---------------------------------------------------------------------------
await withFakeClock(
  async clock => {
    const { ctx } = mount()
    const pending = ctx.waterfall('agent/request-error', payload())
    // Act *during* the wait rather than sleeping beside it: the clock is held, so
    // the hook cannot finish on its own before the dispose lands.
    await untilWaiting(clock)
    await ctx.dispose()
    assert.equal(await pending, undefined, 'disposed feature does not retry')
    clock.release()
    assert.equal(await pending, undefined, 'a released timer after disposal still does not retry')
  },
  { auto: false },
)

// ---------------------------------------------------------------------------
// 10 — a finished turn forgets its counters, so a later failure starts fresh
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx } = mount()
  await ctx.waterfall('agent/request-error', payload())
  await ctx.waterfall('agent/request-error', payload())
  assert.deepEqual(clock.delays, [BASE, BASE * 2], 'the step is backing off')
  ctx.waterfall('agent/status', { agent: { id: 'agent-1' }, status: 'idle' })
  assert.deepEqual(await ctx.waterfall('agent/request-error', payload({ turn: 2, step: 1 })), { kind: 'retry' })
  assert.deepEqual(clock.delays, [BASE, BASE * 2, BASE], 'new turn/step starts at the base delay')
})

// ---------------------------------------------------------------------------
// 11 — a provider Retry-After hint replaces the local delay
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx } = mount()
  const answer = await ctx.waterfall(
    'agent/request-error',
    payload({ failure: { ...failure('RATE_LIMIT'), providerRetryAfterMs: 20 } }),
  )
  assert.deepEqual(answer, { kind: 'retry' })
  assert.deepEqual(clock.delays, [20], 'honored the hint exactly, instead of the computed backoff')
})

// ---------------------------------------------------------------------------
// 12 — a hint larger than maxDelayMs is capped, never stalling the turn
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx } = mount()
  await ctx.waterfall(
    'agent/request-error',
    payload({ failure: { ...failure('RATE_LIMIT'), providerRetryAfterMs: 60000 } }),
  )
  assert.deepEqual(clock.delays, [100], 'capped to maxDelayMs')
})

// ---------------------------------------------------------------------------
// 13 — a hint below initialDelayMs is lifted to it, so a retry never spins
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx } = mount()
  await ctx.waterfall('agent/request-error', payload({ failure: { ...failure('RATE_LIMIT'), providerRetryAfterMs: 1 } }))
  assert.deepEqual(clock.delays, [BASE], 'a 1 ms hint is raised to initialDelayMs')
})

// ---------------------------------------------------------------------------
// 14 — jitter spreads the computed delay, and the spread is asserted on the
//      number the module computed (a property, not an elapsed time)
// ---------------------------------------------------------------------------
await withFakeClock(async clock => {
  const { ctx } = mount({ config: { backoff: { initialDelayMs: BASE, maxDelayMs: 100, jitterRatio: 0.2 } } })
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await ctx.waterfall('agent/request-error', payload({ turn: attempt + 1, step: 1 }))
  }
  assert.equal(clock.delays.length, 40)
  for (const delayMs of clock.delays) {
    assert.equal(delayMs >= BASE * 0.8 && delayMs <= BASE * 1.2, true, `jittered delay ${delayMs} stays within ±20%`)
  }
  assert.equal(new Set(clock.delays).size > 1, true, 'jitter is actually applied')
})

// ---------------------------------------------------------------------------
// 15 — an abort during the backoff ends the hook with no retry
// ---------------------------------------------------------------------------
await withFakeClock(
  async clock => {
    const controller = new AbortController()
    const { ctx } = mount()
    const pending = ctx.waterfall('agent/request-error', payload({ signal: controller.signal }))
    await untilWaiting(clock)
    assert.equal(clock.delays.length, 1, 'the backoff started')
    controller.abort()
    assert.equal(await pending, undefined, 'aborting the wait cancels the retry')
    clock.release()
    assert.equal(await pending, undefined, 'and releasing the timer changes nothing')
  },
  { auto: false },
)

console.log('edh retry: all checks passed')
