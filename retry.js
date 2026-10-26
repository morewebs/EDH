/**
 * EDH feature: `retry` — keep an Agent turn alive across flaky provider APIs.
 *
 * Listens on the `agent/request-error` waterfall after the built-in recovery
 * policies (`dsh-llm-retry` normal mode, image offload) have had their say, and
 * answers the failures they decline with another attempt of the same step. The
 * agent loop re-runs that step over the same durable history, so the retry is
 * invisible to the model: no "continue" message, no error text, no partial
 * output ever enters derived messages.
 *
 * There is no attempt limit. The turn continues until the request succeeds, the
 * user cancels it, or this row is disabled.
 *
 * The feature has no dependencies and reads no Service; it only registers the
 * waterfall listener plus a status listener that forgets finished attempts.
 */

export const name = 'edh-retry'

const DEFAULTS = Object.freeze({
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  jitterRatio: 0.2,
})

/**
 * Failure codes that repeating the identical request cannot fix, or that an
 * earlier recovery policy owns. `IMAGE_OFFLOAD_REQUIRED` is handled by
 * `dsh-compaction-image-offload`, which runs upstream of this listener and
 * returns its own retry after offloading the oldest images.
 *
 * Everything else is retried, including RATE_LIMIT, QUOTA, AUTH, SERVER,
 * TIMEOUT, TRANSPORT, EMPTY_RESPONSE, and PROTOCOL — the shapes a flaky relay
 * produces while it is reconnecting or rotating an upstream account.
 */
const NEVER_RETRY = new Set([
  'ABORTED',
  'NO_ADAPTER',
  'MISSING_CREDENTIAL',
  'INVALID_CREDENTIAL',
  'INVALID_REQUEST',
  'IMAGE_OFFLOAD_REQUIRED',
  'CONTEXT_WINDOW_EXCEEDED',
])

function numberOr(value, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/** Resolve the optional row config into the limits this listener uses. */
export function resolveBackoff(config = {}) {
  const source = config?.backoff ?? config ?? {}
  const initialDelayMs = numberOr(source.initialDelayMs, DEFAULTS.initialDelayMs)
  const maxDelayMs = numberOr(source.maxDelayMs, DEFAULTS.maxDelayMs, { min: initialDelayMs })
  const jitterRatio = numberOr(source.jitterRatio, DEFAULTS.jitterRatio, { max: 1 })
  return { initialDelayMs, maxDelayMs, jitterRatio }
}

/** Sleep unless a signal aborts first; `false` means aborted. */
function wait(delayMs, signals) {
  const live = signals.filter(signal => signal !== undefined)
  if (live.some(signal => signal.aborted)) return Promise.resolve(false)
  return new Promise(resolve => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      for (const signal of live) signal.removeEventListener('abort', finish)
      resolve(!live.some(signal => signal.aborted))
    }
    const timer = setTimeout(finish, delayMs)
    for (const signal of live) signal.addEventListener('abort', finish, { once: true })
  })
}

/** Bounded exponential backoff with symmetric jitter, one step per retry. */
function delayFor(backoff, retry) {
  const exponent = Math.min(retry - 1, 16)
  const exponential = Math.min(backoff.initialDelayMs * 2 ** exponent, backoff.maxDelayMs)
  const jitter = 1 - backoff.jitterRatio + 2 * backoff.jitterRatio * Math.random()
  return Math.min(exponential * jitter, backoff.maxDelayMs)
}

/**
 * Prefer a provider's own `Retry-After` hint, bounded to the configured window,
 * so a rate limiter's instruction is honored without allowing it to stall the
 * turn for longer than `maxDelayMs`.
 */
function delayForFailure(backoff, retry, failure) {
  const hint = failure?.providerRetryAfterMs
  if (typeof hint === 'number' && Number.isFinite(hint) && hint > 0) {
    return Math.min(Math.max(hint, backoff.initialDelayMs), backoff.maxDelayMs)
  }
  return delayFor(backoff, retry)
}

export function apply(ctx, config = {}) {
  const backoff = resolveBackoff(config)
  const lifetime = new AbortController()
  const active = new Set()
  /** `${agentId}/${turn}/${step}` -> consecutive tail retries for that step. */
  const attempts = new Map()

  const track = operation => {
    const tracked = operation.finally(() => active.delete(tracked))
    active.add(tracked)
    return tracked
  }

  const keyOf = ({ agent, turn, step }) => `${agent?.id ?? ''}\u0000${turn}\u0000${step}`

  const forget = agentId => {
    const prefix = `${agentId ?? ''}\u0000`
    for (const key of attempts.keys()) if (key.startsWith(prefix)) attempts.delete(key)
  }

  async function recover(payload, next) {
    const { failure, signal } = payload
    if (failure === undefined || NEVER_RETRY.has(failure.code)) return next()
    if (signal?.aborted || lifetime.signal.aborted) return next()
    // Earlier recovery policies keep their say: a scheduled retry owns the attempt.
    let downstream
    try {
      downstream = await next()
    } catch (error) {
      ctx.logger?.warn?.('edh-retry: downstream recovery failed: %o', error)
    }
    if (downstream?.kind === 'retry') return downstream
    if (signal?.aborted || lifetime.signal.aborted) return undefined
    const key = keyOf(payload)
    const retry = (attempts.get(key) ?? 0) + 1
    attempts.set(key, retry)
    const delayMs = delayForFailure(backoff, retry, failure)
    ctx.logger?.info?.(
      'edh-retry: retry %s for %s in %sms (failure %s)',
      retry,
      payload.provider,
      Math.round(delayMs),
      failure.code,
    )
    if (!await wait(delayMs, [signal, lifetime.signal])) return undefined
    return { kind: 'retry' }
  }

  const disposeRequestError = ctx.on('agent/request-error', (payload, next) => {
    if (lifetime.signal.aborted) return undefined
    return track(recover(payload, next))
  })

  // A finished turn cannot be retried: drop its counters so long sessions stay small.
  const disposeStatus = ctx.on('agent/status', ({ agent, status }) => {
    if (status !== 'running') forget(agent?.id)
  })

  ctx.effect(() => async () => {
    disposeRequestError()
    disposeStatus()
    lifetime.abort(new Error('edh-retry feature disposed'))
    await Promise.allSettled([...active])
  }, 'edh-retry: abort and drain active retries')
}
