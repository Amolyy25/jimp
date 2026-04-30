/**
 * Cookie-clicker style global counter per profile.
 *
 *   POST /api/clicker/:slug          batched increment (body: { count })
 *   GET  /api/clicker/:slug          returns { score, rank, total }
 *   GET  /api/clicker/leaderboard    top N profiles by score
 *
 * The counter lives in `Profile.clickerScore` (separate column, not in the
 * Json blob) so we can do atomic increments and ORDER BY without scanning
 * the whole table.
 *
 * Anti-abuse: the route sits behind the global ingest rate limiter and we
 * cap each request at MAX_CLICKS_PER_REQ. Determined cheaters with rotating
 * IPs can still farm — the score is purely cosmetic, so we trade absolute
 * integrity for a frictionless visitor experience (no captcha).
 */

const MAX_CLICKS_PER_REQ = 50;
const LEADERBOARD_DEFAULT = 50;
const LEADERBOARD_MAX = 100;

export function registerClickerRoutes(app, prisma, opts = {}) {
  const ingestLimiter = opts.ingestLimiter || ((_req, _res, next) => next());

  // Public leaderboard. Only profiles that have actually been clicked at
  // least once show up — otherwise every brand-new profile would land on
  // the board with 0 and dilute the page.
  app.get('/api/clicker/leaderboard', async (req, res) => {
    const requested = parseInt(req.query?.limit, 10);
    const limit = Number.isFinite(requested)
      ? Math.max(1, Math.min(LEADERBOARD_MAX, requested))
      : LEADERBOARD_DEFAULT;

    const rows = await prisma.profile.findMany({
      where: { clickerScore: { gt: 0 } },
      select: { slug: true, clickerScore: true, data: true },
      orderBy: { clickerScore: 'desc' },
      take: limit,
    });

    const total = await prisma.profile.count({ where: { clickerScore: { gt: 0 } } });

    const entries = rows.map((row, i) => {
      const avatar = row.data?.widgets?.find?.((w) => w?.type === 'avatar');
      return {
        rank: i + 1,
        slug: row.slug,
        username: avatar?.data?.username || row.slug,
        avatarUrl: avatar?.data?.avatarUrl || '',
        score: row.clickerScore,
      };
    });

    res.json({ entries, total });
  });

  // POST: increment the counter for :slug by `count` (default 1, max 50).
  app.post('/api/clicker/:slug', ingestLimiter, async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const requested = parseInt(req.body?.count, 10);
    const count = Number.isFinite(requested)
      ? Math.max(1, Math.min(MAX_CLICKS_PER_REQ, requested))
      : 1;

    try {
      const updated = await prisma.profile.update({
        where: { slug },
        data: { clickerScore: { increment: count } },
        select: { clickerScore: true },
      });
      const rankInfo = await computeRank(prisma, updated.clickerScore);
      res.json({
        score: updated.clickerScore,
        added: count,
        ...rankInfo,
      });
    } catch (err) {
      // P2025 = record not found
      if (err.code === 'P2025') {
        return res.status(404).json({ error: 'Profile not found' });
      }
      console.error('[clicker] increment error:', err);
      res.status(500).json({ error: 'Click failed' });
    }
  });

  // Read-only: score + rank, no side effect.
  app.get('/api/clicker/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const profile = await prisma.profile.findUnique({
      where: { slug },
      select: { clickerScore: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const rankInfo = await computeRank(prisma, profile.clickerScore);
    res.json({ score: profile.clickerScore, ...rankInfo });
  });
}

/**
 * Given a score, return { rank, total } where:
 *  - total  = number of profiles that have been clicked at least once
 *  - rank   = 1-based position (1 + how many profiles have a strictly higher
 *             score). A profile with score 0 returns rank=null — it isn't on
 *             the board yet.
 */
async function computeRank(prisma, score) {
  const total = await prisma.profile.count({ where: { clickerScore: { gt: 0 } } });
  if (score <= 0) return { rank: null, total };
  const ahead = await prisma.profile.count({
    where: { clickerScore: { gt: score } },
  });
  return { rank: ahead + 1, total };
}
