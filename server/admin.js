/**
 * Admin module — role-gated routes.
 *
 * The middleware re-loads the User from the DB on every call rather than
 * trusting the role from the JWT. That way: revoking admin from the DB
 * takes effect immediately, even on existing sessions, and the JWT itself
 * never carries authorization data.
 *
 * Routes:
 *   GET  /api/admin/stats        — dashboard aggregates
 *
 * Privacy: aggregates only. No emails, no IPs, no personally identifiable
 * data leaves the server. Recent signups are exposed by username (the
 * already-public handle) and createdAt — never by email.
 */

const RECENT_LIMIT = 20;
const DAILY_BUCKETS_DAYS = 30;
const TOP_PROFILES_LIMIT = 10;

/**
 * Loads the user fresh from the DB and ensures role === 'ADMIN'.
 * Must be chained AFTER `authenticate` so `req.user.userId` exists.
 *
 * Failure modes:
 *   - missing/expired session  → 401 (handled by `authenticate`)
 *   - authenticated, not admin → 403 (no role leak in the body)
 *   - user disappeared         → 401 (treat like a stale session)
 */
export function makeRequireAdmin(prisma) {
  return async function requireAdmin(req, res, next) {
    try {
      if (!req.user?.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { id: true, role: true },
      });
      if (!user) {
        return res.status(401).json({ error: 'Session no longer valid' });
      }
      if (user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' });
      }
      req.adminUser = user;
      next();
    } catch (err) {
      console.error('[admin] requireAdmin failed:', err);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

export function registerAdminRoutes(app, prisma, authenticate) {
  const requireAdmin = makeRequireAdmin(prisma);

  app.get('/api/admin/stats', authenticate, requireAdmin, async (_req, res) => {
    try {
      const now = Date.now();
      const since30d = new Date(now - DAILY_BUCKETS_DAYS * 24 * 60 * 60 * 1000);
      const since24h = new Date(now - 24 * 60 * 60 * 1000);
      const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

      const [
        totalUsers,
        totalProfiles,
        totalViews,
        totalClicks,
        totalFollows,
        totalGuestbook,
        totalVersions,
        spotifyConnected,
        usersLast24h,
        usersLast7d,
        profilesLast7d,
        viewsLast24h,
        viewsLast7d,
        clicksLast7d,
        recentSignups,
        signupsRaw,
        viewsRaw,
        topProfilesRaw,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.profile.count(),
        prisma.viewEvent.count(),
        prisma.clickEvent.count(),
        prisma.follow.count(),
        prisma.guestbookEntry.count(),
        prisma.profileVersion.count(),
        prisma.user.count({ where: { spotifyAccessToken: { not: null } } }),
        prisma.user.count({ where: { createdAt: { gte: since24h } } }),
        prisma.user.count({ where: { createdAt: { gte: since7d } } }),
        prisma.profile.count({ where: { createdAt: { gte: since7d } } }),
        prisma.viewEvent.count({ where: { createdAt: { gte: since24h } } }),
        prisma.viewEvent.count({ where: { createdAt: { gte: since7d } } }),
        prisma.clickEvent.count({ where: { createdAt: { gte: since7d } } }),
        // Username + createdAt only — no email exposed.
        prisma.user.findMany({
          orderBy: { createdAt: 'desc' },
          take: RECENT_LIMIT,
          select: {
            id: true,
            username: true,
            createdAt: true,
            role: true,
            profile: { select: { slug: true } },
          },
        }),
        prisma.user.findMany({
          where: { createdAt: { gte: since30d } },
          select: { createdAt: true },
        }),
        prisma.viewEvent.findMany({
          where: { createdAt: { gte: since30d } },
          select: { createdAt: true },
        }),
        prisma.viewEvent.groupBy({
          by: ['profileId'],
          where: { createdAt: { gte: since30d } },
          _count: { profileId: true },
          orderBy: { _count: { profileId: 'desc' } },
          take: TOP_PROFILES_LIMIT,
        }),
      ]);

      // Resolve profile slugs for the top profiles (one extra round-trip
      // rather than a join — Prisma doesn't support relation include on
      // groupBy yet).
      const topProfileIds = topProfilesRaw.map((r) => r.profileId);
      const topProfileRecords = topProfileIds.length
        ? await prisma.profile.findMany({
            where: { id: { in: topProfileIds } },
            select: { id: true, slug: true },
          })
        : [];
      const slugById = new Map(topProfileRecords.map((p) => [p.id, p.slug]));
      const topProfiles = topProfilesRaw.map((r) => ({
        slug: slugById.get(r.profileId) || null,
        views: r._count.profileId,
      }));

      // Bucket by UTC day for time series.
      const signupsPerDay = bucketByDay(signupsRaw, DAILY_BUCKETS_DAYS);
      const viewsPerDay = bucketByDay(viewsRaw, DAILY_BUCKETS_DAYS);

      res.json({
        generatedAt: new Date().toISOString(),
        totals: {
          users: totalUsers,
          profiles: totalProfiles,
          views: totalViews,
          clicks: totalClicks,
          follows: totalFollows,
          guestbookEntries: totalGuestbook,
          profileVersions: totalVersions,
          spotifyConnected,
        },
        recent: {
          usersLast24h,
          usersLast7d,
          profilesLast7d,
          viewsLast24h,
          viewsLast7d,
          clicksLast7d,
        },
        timeseries: {
          signupsPerDay,
          viewsPerDay,
        },
        topProfiles,
        recentSignups: recentSignups.map((u) => ({
          id: u.id,
          username: u.username,
          slug: u.profile?.slug || null,
          role: u.role,
          createdAt: u.createdAt,
        })),
      });
    } catch (err) {
      console.error('[admin/stats]', err);
      res.status(500).json({ error: 'Failed to compute stats' });
    }
  });
}

function bucketByDay(rows, days) {
  const map = new Map();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    map.set(toDayKey(d), 0);
  }
  for (const r of rows) {
    const k = toDayKey(r.createdAt);
    if (map.has(k)) map.set(k, map.get(k) + 1);
  }
  return Array.from(map.entries()).map(([day, count]) => ({ day, count }));
}

function toDayKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
function pad(n) {
  return String(n).padStart(2, '0');
}
