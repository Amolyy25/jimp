/**
 * Version timeline endpoints.
 *
 *   GET  /api/profiles/me/versions
 *     → { versions: [{ id, createdAt, summary }, ...] }
 *
 *   POST /api/profiles/me/versions/:id/restore
 *     → { ok: true, data }
 *
 * The snapshot itself is appended on every successful save by
 * `snapshotVersion(...)` in server/index.js. Restoring writes the historical
 * blob back into Profile.data and immediately appends a fresh "post-restore"
 * snapshot so the user can keep undo-ing if they regret the restore.
 */

export function registerVersionRoutes(app, prisma, authenticate) {
  app.get('/api/profiles/me/versions', authenticate, async (req, res) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true },
    });
    if (!profile) return res.json({ versions: [] });

    const rows = await prisma.profileVersion.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, createdAt: true, data: true },
    });

    const versions = rows.map((v) => ({
      id: v.id,
      createdAt: v.createdAt,
      summary: summarize(v.data),
    }));

    res.json({ versions });
  });

  app.post('/api/profiles/me/versions/:id/restore', authenticate, async (req, res) => {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, slug: true },
    });
    if (!profile) return res.status(404).json({ error: 'No profile' });

    const version = await prisma.profileVersion.findUnique({
      where: { id: req.params.id },
      select: { profileId: true, data: true },
    });
    if (!version || version.profileId !== profile.id) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const updated = await prisma.profile.update({
      where: { id: profile.id },
      data: { data: version.data },
    });

    // Append a fresh snapshot so "Undo restore" is itself a click in the
    // history drawer.
    await prisma.profileVersion.create({
      data: { profileId: profile.id, data: version.data },
    });

    res.json({ ok: true, data: updated.data });
  });
}

function summarize(data) {
  const widgets = data?.widgets?.length ?? 0;
  const accent = data?.theme?.accent;
  const accentLabel = accent
    ? typeof accent === 'string'
      ? accent
      : accent.kind === 'gradient'
      ? `${accent.from}→${accent.to}`
      : accent.value || ''
    : '';
  return { widgets, accent: accentLabel };
}
