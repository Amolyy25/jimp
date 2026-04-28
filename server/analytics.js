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
 *  - We never store the raw IP. Sessions are identified by an httpOnly
 *    cookie that holds a hash of (anonymous nonce + daily salt). The salt
 *    rotates every 24h so the same browser can't be fingerprinted across
 *    days from our records alone.
 *  - The `country` field, when present, comes from request headers
 *    (Cloudflare's `cf-ipcountry`); we never derive it from a stored IP.
 *  - View ingest is throttled to 1/profile/session — repeat visits from
 *    the same browser within the salt window count as one view.
 */

import crypto from 'node:crypto';

const SESSION_COOKIE = 'jv_sid';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SALT_ROTATION_MS = 24 * 60 * 60 * 1000;

let saltRotated = { value: crypto.randomBytes(16).toString('hex'), at: Date.now() };
function currentSalt() {
  if (Date.now() - saltRotated.at > SALT_ROTATION_MS) {
    saltRotated = { value: crypto.randomBytes(16).toString('hex'), at: Date.now() };
  }
  return saltRotated.value;
}

function hashSession(nonce) {
  return crypto.createHash('sha256').update(`${nonce}:${currentSalt()}`).digest('hex');
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

export function registerAnalyticsRoutes(app, prisma, authenticate, opts = {}) {
  const ingestLimiter = opts.ingestLimiter || ((_req, _res, next) => next());

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
      const sessionId = hashSession(nonce);

      // Throttle: skip if this session already viewed this profile within
      // the current salt window. Cheap by index lookup.
      const recent = await prisma.viewEvent.findFirst({
        where: { profileId: profile.id, sessionId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (recent && Date.now() - new Date(recent.createdAt).getTime() < SALT_ROTATION_MS) {
        return res.json({ ok: true, deduped: true });
      }

      await prisma.viewEvent.create({
        data: {
          profileId: profile.id,
          sessionId,
          referer: clip(req.headers.referer, 200),
          country: clip(req.headers['cf-ipcountry'], 4),
          userAgent: clip(req.headers['user-agent'], 200),
        },
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
    // Reject obviously dangerous click targets — even though this is just
    // analytics, we don't want to store javascript:/data: URIs that could
    // get reflected back to the owner's dashboard.
    if (!/^(https?:\/\/|\/|#)/i.test(target)) return res.json({ ok: false });
    try {
      const profile = await prisma.profile.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!profile) return res.json({ ok: false });

      await prisma.clickEvent.create({
        data: { profileId: profile.id, kind, target },
      });
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
