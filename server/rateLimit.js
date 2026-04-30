/**
 * Lightweight in-memory rate limiter (sliding-window token bucket).
 *
 * Designed to keep the surface area tiny — a single Express middleware
 * factory you can apply globally or to specific routes. All state lives in
 * a Map keyed by IP+route-bucket; entries are evicted lazily as they expire.
 *
 * Why not `express-rate-limit`? We don't ship it as a dep yet and our needs
 * are narrow (single-instance Node process behind Railway). When/if we
 * scale horizontally, swap this for a Redis-backed limiter.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, max: 60 });
 *   app.use('/api/', limiter);
 *
 *   // tighter on auth:
 *   app.post('/api/auth/login',
 *     createRateLimiter({ windowMs: 15 * 60_000, max: 10, bucket: 'auth' }),
 *     handler);
 */

const buckets = new Map(); // key → { count, resetAt }

/**
 * Returns the most plausible client IP. Honours `X-Forwarded-For` only when
 * the proxy is trusted (Railway sets x-forwarded-for; we still take only the
 * first hop). Falls back to req.ip / socket.remoteAddress.
 */
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Periodic eviction so the Map doesn't grow unbounded under sustained load.
 * Runs once per minute regardless of traffic.
 */
let lastSweep = Date.now();
function sweep() {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}

export function createRateLimiter({
  windowMs = 60_000,
  max = 60,
  bucket = 'default',
  message = 'Too many requests, please try again later.',
  skip,
} = {}) {
  return function rateLimiter(req, res, next) {
    if (typeof skip === 'function' && skip(req)) return next();
    sweep();

    const key = `${bucket}:${clientIp(req)}`;
    const now = Date.now();
    const entry = buckets.get(key);

    if (!entry || entry.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      res.set('X-RateLimit-Limit', String(max));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
      return res.status(429).json({ error: message, retryAfter: retryAfterSec });
    }

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    next();
  };
}
