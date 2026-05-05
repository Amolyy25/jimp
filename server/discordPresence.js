/**
 * Discord presence proxy — pulls presence on demand from our bot's HTTP API.
 *
 * Strategy:
 *   - Bot keeps an in-process map of guild members' presence (fed by the
 *     Discord Gateway PRESENCE_UPDATE events).
 *   - Backend asks the bot via HTTP only when the in-memory cache below is
 *     stale, and dedupes concurrent requests with a pending-promise map.
 *   - Browsers see a stable rate limit + 30s freshness, regardless of how
 *     many tabs land on the same profile.
 *
 * Env:
 *   BOT_API_URL — base URL of the bot's HTTP server (e.g. http://bot:8787)
 *   BOT_SECRET  — shared secret sent as `x-bot-secret`
 *
 * When BOT_API_URL or BOT_SECRET is unset we treat every user as
 * `inServer: false` so the SPA renders the join CTA in dev.
 *
 * Wire-up:
 *   registerDiscordPresenceRoutes(app, prisma, { createRateLimiter })
 */

const TTL_FOUND_MS = 30 * 1000;       // 30s — matches widget refresh cadence
const TTL_NOT_FOUND_MS = 5 * 60 * 1000; // 5m — joining the server is rare
const TTL_ERROR_MS = 15 * 1000;       // 15s — back off from a flapping bot
const BOT_TIMEOUT_MS = 4000;
const CACHE_MAX = 5000;

// Module-scoped — survives across requests, not across process restarts.
const cache = new Map(); // discordId -> { data, expires, kind }
const pending = new Map(); // discordId -> Promise<data>

function pruneCache() {
  if (cache.size <= CACHE_MAX) return;
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expires <= now) cache.delete(k);
  }
}

async function fetchFromBot(discordId) {
  const baseUrl = (process.env.BOT_API_URL || '').replace(/\/$/, '');
  const secret = process.env.BOT_SECRET;
  if (!baseUrl || !secret) {
    // Bot not configured — render the locked CTA everywhere.
    return { data: { inServer: false }, kind: 'not_found' };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BOT_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/presence/${discordId}`, {
      headers: { 'x-bot-secret': secret },
      signal: ctrl.signal,
    });
    if (res.status === 404) {
      return { data: { inServer: false }, kind: 'not_found' };
    }
    if (!res.ok) {
      throw new Error(`bot HTTP ${res.status}`);
    }
    const payload = await res.json();
    return { data: { inServer: true, ...payload }, kind: 'found' };
  } catch (err) {
    console.warn('[discord-presence] bot fetch failed:', err.message);
    // Fail soft: render locked card, but with a short TTL so we retry soon.
    return { data: { inServer: false }, kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

async function getPresence(discordId) {
  const now = Date.now();
  const cached = cache.get(discordId);
  if (cached && cached.expires > now) return cached.data;

  const inflight = pending.get(discordId);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const { data, kind } = await fetchFromBot(discordId);
      const ttl =
        kind === 'found'
          ? TTL_FOUND_MS
          : kind === 'not_found'
            ? TTL_NOT_FOUND_MS
            : TTL_ERROR_MS;
      cache.set(discordId, { data, expires: Date.now() + ttl, kind });
      pruneCache();
      return data;
    } finally {
      pending.delete(discordId);
    }
  })();
  pending.set(discordId, promise);
  return promise;
}

export function registerDiscordPresenceRoutes(app, _prisma, helpers = {}) {
  const { createRateLimiter } = helpers;

  // 60 GETs/min per IP — generous for editor polling + a few open tabs,
  // tight enough to deny scrapers. Cache + dedup means almost no upstream
  // load even at the rate limit.
  const presenceGetLimiter = createRateLimiter
    ? createRateLimiter({
        windowMs: 60_000,
        max: 60,
        bucket: 'discord-presence',
        message: 'Too many presence requests.',
      })
    : (_req, _res, next) => next();

  app.get('/api/discord/presence/:discordId', presenceGetLimiter, async (req, res) => {
    const discordId = String(req.params.discordId || '').trim();
    if (!/^\d{15,22}$/.test(discordId)) {
      return res.status(400).json({ error: 'Invalid Discord ID.' });
    }

    try {
      const data = await getPresence(discordId);
      // Browsers cache for the same window the server does — clients that
      // poll are still bounded by their own setInterval; this just helps
      // back/forward nav and double-renders.
      res.set('Cache-Control', 'public, max-age=15');
      res.json(data);
    } catch (err) {
      console.error('[discord-presence] read failed:', err);
      res.status(500).json({ error: 'Could not load presence.' });
    }
  });
}
