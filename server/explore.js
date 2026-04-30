/**
 * Public profile discovery endpoint.
 *
 *   GET /api/explore?page=1&limit=24&sort=recent|clicker
 *
 * Returns a small public projection of each profile (slug, username, bio,
 * avatar, accent, clicker score) — never the full Json blob. Caps the page
 * size so a single request can't pull the whole table.
 *
 * Profiles without a userId (system / orphan) and brand-new profiles whose
 * owner never saved anything still show up — the projection just falls back
 * to the slug as a username, which is the same experience as visiting the
 * page directly.
 */

const PAGE_SIZE_DEFAULT = 24;
const PAGE_SIZE_MAX = 60;

export function registerExploreRoutes(app, prisma) {
  app.get('/api/explore', async (req, res) => {
    const requestedLimit = parseInt(req.query?.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.max(1, Math.min(PAGE_SIZE_MAX, requestedLimit))
      : PAGE_SIZE_DEFAULT;
    const requestedPage = parseInt(req.query?.page, 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const sort = req.query?.sort === 'clicker' ? 'clicker' : 'recent';

    const orderBy =
      sort === 'clicker'
        ? [{ clickerScore: 'desc' }, { updatedAt: 'desc' }]
        : [{ updatedAt: 'desc' }];

    const where = {
      isBanned: false,
      isNsfw: false,
    };

    const [rows, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        select: {
          slug: true,
          data: true,
          updatedAt: true,
          clickerScore: true,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.profile.count({ where }),
    ]);

    const entries = rows.map((row) => {
      const avatar = row.data?.widgets?.find?.((w) => w?.type === 'avatar');
      const accent = row.data?.theme?.accent;
      return {
        slug: row.slug,
        username: avatar?.data?.username || row.slug,
        bio: avatar?.data?.bio || '',
        avatarUrl: avatar?.data?.avatarUrl || '',
        accent: typeof accent === 'string' ? accent : accent?.value || accent?.from || '#5865F2',
        clickerScore: row.clickerScore,
        updatedAt: row.updatedAt,
      };
    });

    res.json({
      entries,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    });
  });
}
