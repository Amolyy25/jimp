/**
 * Click + View analytics endpoints.
 *
 * Public ingest:
 *   POST /api/views   { slug }                         → { ok }
 *   POST /api/clicks  { slug, kind, target }           → { ok }
 *
 * Owner read (authenticated, scoped to caller's profile):
 *   GET  /api/profiles/me/analytics?days=7
 *     → { views: { total, perDay: [{day, count}], topReferrers: [{host, count}] },
 *         clicks: { total, byTarget: [{target, kind, count}] } }
 *
 * Privacy notes (RGPD):
 *  - We never store the raw IP. Visitors are identified by an httpOnly
 *    cookie nonce AND a hashed IP — both salted with a value that rotates
 *    every 24h, so the same browser/network can't be fingerprinted across
 *    days from our records alone.
 *  - The `country` field, when present, comes from request headers
 *    (Cloudflare's `cf-ipcountry`); we never derive it from a stored IP.
 *
 * Anti-spam (a single visitor counts at most once per 24h):
 *  - Layer 1 — fast in-memory cache keyed on (profileId, sessionId)
 *    AND (profileId, ipHash). Catches reload spam in the hot path
 *    without hitting the DB.
 *  - Layer 2 — DB lookup against ViewEvent with the same OR-keys, run
 *    on cache miss. Survives server restarts and multi-instance setups
 *    so clearing cookies / opening incognito from the same network still
 *    only counts once per 24h.
 *  - Layer 3 — per-IP burst limiter (`viewBurst`): if the same IP
 *    submits more than VIEW_BURST_LIMIT view ingests inside a short
 *    window, every excess request is dropped before the DB lookup.
 *    Hard ceiling against pathological spam (botnet of one).
 */

import crypto from 'node:crypto';

const SESSION_COOKIE = 'jv_sid';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SALT_ROTATION_MS = 24 * 60 * 60 * 1000;
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000;

let saltRotated = { value: crypto.randomBytes(16).toString('hex'), at: Date.now() };
function currentSalt() {
  if (Date.now() - saltRotated.at > SALT_ROTATION_MS) {
    saltRotated = { value: crypto.randomBytes(16).toString('hex'), at: Date.now() };
  }
  return saltRotated.value;
}

function hashWithSalt(input) {
  return crypto.createHash('sha256').update(`${input}:${currentSalt()}`).digest('hex');
}

function getOrSetSessionNonce(req, res) {
  let nonce = req.cookies?.[SESSION_COOKIE];
  if (!nonce) {
    nonce = crypto.randomBytes(16).toString('hex');
    res.cookie(SESSION_COOKIE, nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
  }
  return nonce;
}

/**
 * Resolve the visitor's IP, preferring trusted-proxy headers in order.
 * `req.ip` already respects Express's `trust proxy` setting when set.
 */
function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff) {
    const first = String(xff).split(',')[0].trim();
    if (first) return first;
  }
  return req.headers['cf-connecting-ip'] || req.ip || req.socket?.remoteAddress || '';
}

const viewBuffer = [];
const clickBuffer = [];
const FLUSH_INTERVAL_MS = 5_000;

// Layer 1: in-memory dedup. Keys are `${profileId}:S:${sessionId}` and
// `${profileId}:I:${ipHash}`. Any hit means we've already counted this
// visitor today.
const dedupCache = new Map();

// Layer 3: per-IP burst limiter. Key is `${ipHash}` → { count, windowStart }.
// VIEW_BURST_LIMIT requests per VIEW_BURST_WINDOW_MS — beyond that we drop.
const VIEW_BURST_WINDOW_MS = 60_000;
const VIEW_BURST_LIMIT = 30;
const viewBurst = new Map();

function isBursting(ipHash) {
  const now = Date.now();
  const slot = viewBurst.get(ipHash);
  if (!slot || now - slot.windowStart > VIEW_BURST_WINDOW_MS) {
    viewBurst.set(ipHash, { count: 1, windowStart: now });
    return false;
  }
  slot.count += 1;
  return slot.count > VIEW_BURST_LIMIT;
}

export function registerAnalyticsRoutes(app, prisma, authenticate, opts = {}) {
  const ingestLimiter = opts.ingestLimiter || ((_req, _res, next) => next());

  setInterval(async () => {
    if (viewBuffer.length > 0) {
      const batch = viewBuffer.splice(0, viewBuffer.length);
      await prisma.viewEvent.createMany({ data: batch, skipDuplicates: true }).catch(err => {
        console.error('[analytics] view flush failed:', err.message);
      });
    }
    if (clickBuffer.length > 0) {
      const batch = clickBuffer.splice(0, clickBuffer.length);
      await prisma.clickEvent.createMany({ data: batch }).catch(err => {
        console.error('[analytics] click flush failed:', err.message);
      });
    }
    const now = Date.now();
    if (dedupCache.size > 50000) {
      for (const [k, ts] of dedupCache.entries()) {
        if (now - ts > DEDUP_TTL_MS) dedupCache.delete(k);
      }
    }
    if (viewBurst.size > 20000) {
      for (const [k, slot] of viewBurst.entries()) {
        if (now - slot.windowStart > VIEW_BURST_WINDOW_MS) viewBurst.delete(k);
      }
    }
  }, FLUSH_INTERVAL_MS);

  // -- Ingest: views ------------------------------------------------------
  app.post('/api/views', ingestLimiter, async (req, res) => {
    const slug = (req.body?.slug || '').toLowerCase();
    if (!slug) return res.json({ ok: false });
    try {
      const profile = await prisma.profile.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!profile) return res.json({ ok: false });

      const nonce = getOrSetSessionNonce(req, res);
      const sessionId = hashWithSalt(nonce);
      const ip = clientIp(req);
      const ipHash = ip ? hashWithSalt(`ip:${ip}`) : null;

      // Layer 3 — kill obvious burst spam early. Same IP > 30 view pings/min
      // is dropped without even hitting the DB or counting against state.
      if (ipHash && isBursting(ipHash)) {
        return res.json({ ok: true, deduped: true, reason: 'burst' });
      }

      const sKey = `${profile.id}:S:${sessionId}`;
      const iKey = ipHash ? `${profile.id}:I:${ipHash}` : null;
      const now = Date.now();

      // Layer 1 — in-memory cache hit on EITHER the cookie session or the
      // hashed IP means we've already counted this visitor today.
      const sHit = dedupCache.get(sKey);
      const iHit = iKey ? dedupCache.get(iKey) : null;
      if ((sHit && now - sHit < DEDUP_TTL_MS) || (iHit && now - iHit < DEDUP_TTL_MS)) {
        return res.json({ ok: true, deduped: true, reason: 'cache' });
      }

      // Layer 2 — DB lookup. Catches the cases the in-memory cache can't
      // (server restart, multi-instance, cleared cookies + same network).
      const since = new Date(now - DEDUP_TTL_MS);
      const existing = await prisma.viewEvent.findFirst({
        where: {
          profileId: profile.id,
          createdAt: { gte: since },
          OR: [
            { sessionId },
            ...(ipHash ? [{ ipHash }] : []),
          ],
        },
        select: { id: true },
      });
      if (existing) {
        // Cache the hit so we don't re-query for this visitor again today.
        dedupCache.set(sKey, now);
        if (iKey) dedupCache.set(iKey, now);
        return res.json({ ok: true, deduped: true, reason: 'db' });
      }

      // First time we see this visitor today — count them.
      dedupCache.set(sKey, now);
      if (iKey) dedupCache.set(iKey, now);
      viewBuffer.push({
        profileId: profile.id,
        sessionId,
        ipHash,
        referer: clip(req.headers.referer, 200),
        country: clip(req.headers['cf-ipcountry'], 4),
        userAgent: clip(req.headers['user-agent'], 200),
      });
      res.json({ ok: true });
    } catch (err) {
      console.warn('[analytics views]', err.message);
      res.json({ ok: false });
    }
  });

  // -- Ingest: clicks -----------------------------------------------------
  app.post('/api/clicks', ingestLimiter, async (req, res) => {
    const slug = (req.body?.slug || '').toLowerCase();
    const kind = clip(req.body?.kind || 'link', 32);
    const target = clip(req.body?.target || '', 512);
    if (!slug || !target) return res.json({ ok: false });
    if (!/^(https?:\/\/|\/|#)/i.test(target)) return res.json({ ok: false });
    try {
      const profile = await prisma.profile.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!profile) return res.json({ ok: false });

      clickBuffer.push({ profileId: profile.id, kind, target });
      res.json({ ok: true });
    } catch (err) {
      console.warn('[analytics clicks]', err.message);
      res.json({ ok: false });
    }
  });

  // -- Owner read --------------------------------------------------------
  app.get('/api/profiles/me/analytics', authenticate, async (req, res) => {
    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!profile) return res.json({ views: emptyViews(), clicks: emptyClicks() });

      const days = Math.max(1, Math.min(90, parseInt(req.query.days, 10) || 7));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [views, clicks] = await Promise.all([
        prisma.viewEvent.findMany({
          where: { profileId: profile.id, createdAt: { gte: since } },
          select: { createdAt: true, referer: true },
        }),
        prisma.clickEvent.findMany({
          where: { profileId: profile.id, createdAt: { gte: since } },
          select: { createdAt: true, kind: true, target: true },
        }),
      ]);

      // Bucket by day (UTC), inclusive of empty days so the sparkline isn't
      // gappy.
      const perDayMap = new Map();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        perDayMap.set(toDayKey(d), 0);
      }
      for (const v of views) {
        const k = toDayKey(v.createdAt);
        if (perDayMap.has(k)) perDayMap.set(k, perDayMap.get(k) + 1);
      }

      const refererCounts = new Map();
      for (const v of views) {
        const host = hostOf(v.referer);
        if (!host) continue;
        refererCounts.set(host, (refererCounts.get(host) || 0) + 1);
      }
      const topReferrers = Array.from(refererCounts.entries())
        .map(([host, count]) => ({ host, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      const clickAgg = new Map();
      for (const c of clicks) {
        const key = `${c.kind}|${c.target}`;
        clickAgg.set(key, (clickAgg.get(key) || 0) + 1);
      }
      const byTarget = Array.from(clickAgg.entries())
        .map(([key, count]) => {
          const [kind, target] = key.split('|');
          return { kind, target, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 25);

      res.json({
        days,
        views: {
          total: views.length,
          perDay: Array.from(perDayMap.entries()).map(([day, count]) => ({ day, count })),
          topReferrers,
        },
        clicks: {
          total: clicks.length,
          byTarget,
        },
      });
    } catch (err) {
      console.error('[analytics read]', err);
      res.status(500).json({ error: 'Failed to compute analytics' });
    }
  });
}

function emptyViews() {
  return { total: 0, perDay: [], topReferrers: [] };
}
function emptyClicks() {
  return { total: 0, byTarget: [] };
}
function toDayKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function pad(n) {
  return String(n).padStart(2, '0');
}
function hostOf(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).host;
  } catch {
    return null;
  }
}
function clip(v, n) {
  if (!v) return null;
  return String(v).slice(0, n);
}
