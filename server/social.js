/**
 * Social graph + guestbook routes.
 *
 *   POST   /api/follow/:slug                follow profile (auth)
 *   DELETE /api/follow/:slug                unfollow (auth)
 *   GET    /api/follow/:slug                public count + caller's state
 *   GET    /api/profiles/me/following       authed list
 *
 *   GET    /api/guestbook/:slug             public list
 *   POST   /api/guestbook/:slug             auth, 1 entry per author
 *   DELETE /api/guestbook/:slug/:entryId    auth — author OR profile owner
 *
 * Profanity filtering: server-side mirror of the lightweight client filter.
 * We strip offending tokens from the message body rather than rejecting,
 * so the user gets immediate feedback without losing their typing.
 */

const GUESTBOOK_MAX_LEN = 240;

const BLOCKED_WORDS = [
  'negro','negre','nigger','nigga','bougnoule','bicot','rebeu','chink','jap',
  'faggot','pd','pede','tapette',
  'pute','putain','salope','connard','enculé','encule','fdp',
  'bitch','whore','slut','cunt','motherfucker',
  'viol','rape',
];

function normalize(s) {
  return s.toLowerCase()
    .replace(/[0]/g, 'o')
    .replace(/[1!]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4@]/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't');
}

function maskProfanity(message) {
  let out = String(message).slice(0, GUESTBOOK_MAX_LEN);
  const norm = normalize(out);
  for (const word of BLOCKED_WORDS) {
    if (new RegExp(`(?:^|[^a-z])${word}(?:$|[^a-z])`, 'i').test(norm)) {
      // Replace any character span that normalizes to the banned token.
      // Simple substring replace works for our small list.
      const re = new RegExp(word, 'gi');
      out = out.replace(re, '*'.repeat(word.length));
    }
  }
  return out.trim();
}

export function registerSocialRoutes(app, prisma, authenticate) {
  /* -------- Follows -------- */

  app.post('/api/follow/:slug', authenticate, async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const target = await prisma.profile.findUnique({
      where: { slug },
      select: { id: true, userId: true },
    });
    if (!target?.userId) return res.status(404).json({ error: 'Profile not found' });
    if (target.userId === req.user.userId) {
      return res.status(400).json({ error: "Can't follow yourself" });
    }
    try {
      await prisma.follow.create({
        data: {
          followerId: req.user.userId,
          followeeId: target.userId,
          profileId: target.id,
        },
      });
    } catch (err) {
      if (err.code !== 'P2002') {
        console.error('[follow]', err);
        return res.status(500).json({ error: 'Follow failed' });
      }
      // Already following — fall through and return current count.
    }
    const count = await prisma.follow.count({ where: { followeeId: target.userId } });
    res.json({ ok: true, following: true, count });
  });

  app.delete('/api/follow/:slug', authenticate, async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const target = await prisma.profile.findUnique({
      where: { slug },
      select: { userId: true },
    });
    if (!target?.userId) return res.status(404).json({ error: 'Profile not found' });
    await prisma.follow.deleteMany({
      where: { followerId: req.user.userId, followeeId: target.userId },
    });
    const count = await prisma.follow.count({ where: { followeeId: target.userId } });
    res.json({ ok: true, following: false, count });
  });

  // Public — count + the *caller's* follow state if they're logged in.
  app.get('/api/follow/:slug', async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const target = await prisma.profile.findUnique({
      where: { slug },
      select: { userId: true },
    });
    if (!target?.userId) return res.json({ count: 0, following: false });
    const count = await prisma.follow.count({ where: { followeeId: target.userId } });

    // We can't reach the auth helper from here, but the cookie carries the
    // JWT so we re-decode quickly for the optional `following` flag.
    let following = false;
    try {
      const token = req.cookies?.token;
      if (token) {
        const jwt = (await import('jsonwebtoken')).default;
        const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
        if (payload?.userId) {
          const exists = await prisma.follow.findFirst({
            where: { followerId: payload.userId, followeeId: target.userId },
            select: { id: true },
          });
          following = !!exists;
        }
      }
    } catch {
      // Anonymous viewer — leave following=false.
    }
    res.json({ count, following });
  });

  app.get('/api/profiles/me/following', authenticate, async (req, res) => {
    const rows = await prisma.follow.findMany({
      where: { followerId: req.user.userId },
      include: {
        profile: { select: { slug: true, data: true, updatedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const following = rows
      .filter((f) => f.profile?.slug)
      .map((f) => {
        const avatar = f.profile.data?.widgets?.find?.((w) => w.type === 'avatar');
        return {
          slug: f.profile.slug,
          username: avatar?.data?.username || f.profile.slug,
          avatarUrl: avatar?.data?.avatarUrl || '',
          updatedAt: f.profile.updatedAt,
          since: f.createdAt,
        };
      });
    res.json({ following });
  });

  /* -------- Guestbook -------- */

  app.get('/api/guestbook/:slug', async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const profile = await prisma.profile.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!profile) return res.json({ entries: [] });

    const rows = await prisma.guestbookEntry.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { author: { select: { id: true, username: true } } },
    });
    res.json({
      entries: rows.map((e) => ({
        id: e.id,
        message: e.message,
        author: { id: e.author.id, username: e.author.username },
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    });
  });

  app.post('/api/guestbook/:slug', authenticate, async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const message = maskProfanity(req.body?.message || '');
    if (!message) return res.status(400).json({ error: 'Empty message' });

    const profile = await prisma.profile.findUnique({
      where: { slug },
      select: { id: true, userId: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    // upsert to honour the (profileId, authorId) uniqueness — a returning
    // visitor can edit their previous note instead of stacking duplicates.
    const entry = await prisma.guestbookEntry.upsert({
      where: {
        profileId_authorId: { profileId: profile.id, authorId: req.user.userId },
      },
      update: { message },
      create: { profileId: profile.id, authorId: req.user.userId, message },
      include: { author: { select: { id: true, username: true } } },
    });

    res.json({
      ok: true,
      entry: {
        id: entry.id,
        message: entry.message,
        author: { id: entry.author.id, username: entry.author.username },
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  });

  app.delete('/api/guestbook/:slug/:entryId', authenticate, async (req, res) => {
    const slug = req.params.slug.toLowerCase();
    const profile = await prisma.profile.findUnique({
      where: { slug },
      select: { id: true, userId: true },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    const entry = await prisma.guestbookEntry.findUnique({
      where: { id: req.params.entryId },
      select: { profileId: true, authorId: true },
    });
    if (!entry || entry.profileId !== profile.id) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    // Author OR profile owner can delete.
    const isOwner = profile.userId === req.user.userId;
    const isAuthor = entry.authorId === req.user.userId;
    if (!isOwner && !isAuthor) return res.status(403).json({ error: 'Forbidden' });

    await prisma.guestbookEntry.delete({ where: { id: req.params.entryId } });
    res.json({ ok: true });
  });
}
