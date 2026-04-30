/**
 * Anonymous Q&A endpoints — the most abuse-prone surface on persn.me.
 *
 * Threat model + mitigations:
 *  - **Spam / link-jacking** → reject any body containing http(s)/www/discord
 *    invite/telegram patterns. Profanity filter on body too.
 *  - **Targeted harassment** → owner soft-block on `askerHash`. New questions
 *    from a blocked hash are accepted silently and stored as BLOCKED so the
 *    attacker doesn't learn the block exists (no "you're blocked" leak).
 *  - **Mass flood** → IP-based rate limit + per-profile receive cap.
 *  - **De-anonymisation** → `askerHash = sha256(ip | slug | dailySalt)`.
 *    The salt rotates every UTC day and depends on JWT_SECRET, so:
 *      • identical hashes survive only ~24h (block expires automatically)
 *      • without the server's JWT_SECRET an attacker can't reverse a hash
 *      • we never persist IPs in clear, anywhere
 *  - **Bot fill-in** → hCaptcha invisible verification. Optional — only
 *    enforced when HCAPTCHA_SECRET is configured. Client passes a token in
 *    `X-Captcha-Token`; we verify against hcaptcha.com and reject 403 on
 *    failure. When not configured, we skip verification (dev/preview).
 *
 * Privacy:
 *  - No IP, no UA, no email persisted.
 *  - `askerHash` is not exposed to anyone except the profile owner (only
 *    used internally for the block button).
 *
 * Wire-up:
 *   registerQuestionRoutes(app, prisma, authenticate, { writeLimiter })
 */

import crypto from 'node:crypto';
import { hasProfanity } from './profanity.js';
import { createRateLimiter } from './rateLimit.js';

const BODY_MAX = 500;
const ANSWER_MAX = 1000;

// Anti-link / anti-promo patterns. We're aggressive here on purpose — Q&A
// is anonymous, so a real visitor never NEEDS a URL or invite to ask a
// question. False positives are acceptable: the user just rephrases.
const LINK_PATTERNS = [
  /https?:\/\//i,
  /www\.[a-z]/i,
  /discord\.gg\//i,
  /discord\.com\/invite/i,
  /t\.me\//i,
  /bit\.ly\//i,
  /\b[a-z0-9-]+\.(com|net|org|io|co|gg|xyz|me|tv|app|dev)\b/i,
];

function looksLikeLink(text) {
  return LINK_PATTERNS.some((p) => p.test(text));
}

/** Per-day salt — rotates at UTC midnight. Tied to JWT_SECRET so attackers
 *  with our DB but not our env can't reverse the hashes. */
function dailySalt() {
  const day = new Date().toISOString().slice(0, 10);
  const seed = process.env.JWT_SECRET || 'dev-secret-change-me';
  return crypto.createHash('sha256').update(`${seed}|qa-day|${day}`).digest('hex');
}

/** Derive the asker hash from request. NEVER persist anything else. */
function askerHashFor(req, slug) {
  const xff = req.headers['x-forwarded-for'];
  const ip =
    (typeof xff === 'string' && xff.length > 0
      ? xff.split(',')[0].trim()
      : req.ip || req.socket?.remoteAddress || 'unknown');
  return crypto
    .createHash('sha256')
    .update(`${ip}|${slug}|${dailySalt()}`)
    .digest('hex')
    .slice(0, 32); // 128 bits is plenty for collision resistance here
}

/** Verify an hCaptcha token. Returns true when the captcha layer is not
 *  configured (dev / preview), which is the documented behaviour. */
async function verifyCaptcha(token) {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) return true;
  if (!token || typeof token !== 'string') return false;
  try {
    const r = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!r.ok) return false;
    const data = await r.json();
    return !!data.success;
  } catch {
    return false;
  }
}

export function registerQuestionRoutes(app, prisma, authenticate, helpers = {}) {
  const writeLimiter = helpers.writeLimiter;

  // Per-IP create rate: 3/min — keeps drive-by spam in check without making
  // a real conversation feel locked. The per-profile cap below catches
  // distributed attacks against a single target.
  const askLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 3,
    bucket: 'qa-ask',
    message: 'Slow down — try again in a minute.',
  });

  /* ----------------------------- public POST ----------------------------- */

  app.post('/api/questions/:slug', askLimiter, async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const body = String(req.body?.body || '').trim();
    const captcha = req.body?.captcha || req.headers['x-captcha-token'];

    if (!body) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (body.length > BODY_MAX) {
      return res.status(400).json({ error: `Keep it under ${BODY_MAX} characters.` });
    }
    if (looksLikeLink(body)) {
      return res.status(400).json({ error: "Couldn't send. Try rephrasing without links." });
    }
    if (hasProfanity(body)) {
      // Generic message — never reveal which words tripped the filter.
      return res.status(400).json({ error: "Couldn't send. Try rephrasing." });
    }
    if (!(await verifyCaptcha(captcha))) {
      return res.status(403).json({ error: 'Captcha check failed. Refresh and try again.' });
    }

    try {
      const profile = await prisma.profile.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!profile) return res.status(404).json({ error: 'Profile not found.' });

      const hash = askerHashFor(req, slug);

      // Soft-block: blocked hashes still get a 200 so the attacker has zero
      // signal that they're blocked. We persist the message as BLOCKED so
      // the owner can audit and so we maintain the per-profile receive
      // counter.
      const blocked = await prisma.askerBlock.findUnique({
        where: { profileId_askerHash: { profileId: profile.id, askerHash: hash } },
      });

      // Per-profile receive cap: max 50 questions/profile/hour. Stops
      // distributed flood while letting a normal viral profile breathe.
      const oneHourAgo = new Date(Date.now() - 60 * 60_000);
      const recentCount = await prisma.question.count({
        where: { profileId: profile.id, createdAt: { gte: oneHourAgo } },
      });
      if (recentCount >= 50 && !blocked) {
        // Pretend success to defeat amplification probing.
        return res.json({ ok: true });
      }

      // Per-asker per-day cap: 20/day from a single asker hash.
      const dayAgo = new Date(Date.now() - 24 * 60 * 60_000);
      const askerCount = await prisma.question.count({
        where: {
          profileId: profile.id,
          askerHash: hash,
          createdAt: { gte: dayAgo },
        },
      });
      if (askerCount >= 20) {
        return res.json({ ok: true });
      }

      await prisma.question.create({
        data: {
          profileId: profile.id,
          body,
          askerHash: hash,
          status: blocked ? 'BLOCKED' : 'PENDING',
        },
      });

      return res.json({ ok: true });
    } catch (err) {
      console.error('[qa] create failed:', err);
      return res.status(500).json({ error: 'Could not send message.' });
    }
  });

  /* ----------------------------- public GET ----------------------------- */

  // Returns answered questions only, paginated by cursor. Public; cached at
  // CDN-friendly Cache-Control 30s — tolerable lag for a Q&A feed.
  app.get('/api/questions/:slug', async (req, res) => {
    const slug = String(req.params.slug || '').toLowerCase();
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

    try {
      const profile = await prisma.profile.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (!profile) return res.status(404).json({ error: 'Profile not found.' });

      const items = await prisma.question.findMany({
        where: { profileId: profile.id, status: 'ANSWERED' },
        orderBy: { answeredAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          body: true,
          answer: true,
          answeredAt: true,
        },
      });

      const hasMore = items.length > limit;
      const trimmed = hasMore ? items.slice(0, limit) : items;
      res.set('Cache-Control', 'public, max-age=30');
      res.json({
        items: trimmed,
        nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null,
      });
    } catch (err) {
      console.error('[qa] list failed:', err);
      res.status(500).json({ error: 'Failed to load.' });
    }
  });

  /* ------------------------------ owner inbox ----------------------------- */

  // Returns the owner's full inbox (PENDING + ANSWERED + HIDDEN). BLOCKED
  // entries stay invisible — the owner doesn't need to see them, and
  // showing them would make the soft-block leak its purpose if they ever
  // share screens.
  app.get('/api/profiles/me/questions', authenticate, async (req, res) => {
    const status = String(req.query.status || 'PENDING').toUpperCase();
    const valid = ['PENDING', 'ANSWERED', 'HIDDEN', 'ALL'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

    try {
      const profile = await prisma.profile.findUnique({
        where: { userId: req.user.userId },
        select: { id: true },
      });
      if (!profile) return res.json({ items: [], nextCursor: null, counts: { pending: 0 } });

      const where = {
        profileId: profile.id,
        ...(status === 'ALL'
          ? { status: { not: 'BLOCKED' } }
          : { status }),
      };
      const items = await prisma.question.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: {
          id: true,
          body: true,
          answer: true,
          answeredAt: true,
          status: true,
          createdAt: true,
          askerHash: true, // owner uses this for the block button
        },
      });

      const hasMore = items.length > limit;
      const trimmed = hasMore ? items.slice(0, limit) : items;

      // Pending count for the editor inbox badge.
      const pending = await prisma.question.count({
        where: { profileId: profile.id, status: 'PENDING' },
      });

      res.json({
        items: trimmed,
        nextCursor: hasMore ? trimmed[trimmed.length - 1].id : null,
        counts: { pending },
      });
    } catch (err) {
      console.error('[qa] inbox failed:', err);
      res.status(500).json({ error: 'Failed to load.' });
    }
  });

  /* ------------------------------ owner actions --------------------------- */

  app.post('/api/questions/:id/answer', writeLimiter, authenticate, async (req, res) => {
    const id = String(req.params.id || '');
    const answer = String(req.body?.answer || '').trim();
    if (!answer) return res.status(400).json({ error: 'Answer is required.' });
    if (answer.length > ANSWER_MAX) {
      return res.status(400).json({ error: `Answer must be under ${ANSWER_MAX} characters.` });
    }
    if (hasProfanity(answer)) {
      return res.status(400).json({ error: "Couldn't post answer. Try rephrasing." });
    }

    try {
      // Ownership gate — only the profile owner can answer.
      const q = await prisma.question.findUnique({
        where: { id },
        select: { profile: { select: { userId: true } } },
      });
      if (!q) return res.status(404).json({ error: 'Question not found.' });
      if (q.profile?.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Not your question.' });
      }

      const updated = await prisma.question.update({
        where: { id },
        data: {
          answer,
          answeredAt: new Date(),
          status: 'ANSWERED',
        },
        select: { id: true, answer: true, answeredAt: true, body: true, status: true },
      });
      res.json(updated);
    } catch (err) {
      console.error('[qa] answer failed:', err);
      res.status(500).json({ error: 'Failed to answer.' });
    }
  });

  // Soft-delete: flip to HIDDEN so the audit trail stays. Use DELETE for
  // real removal if you ever need it.
  app.post('/api/questions/:id/hide', writeLimiter, authenticate, async (req, res) => {
    const id = String(req.params.id || '');
    try {
      const q = await prisma.question.findUnique({
        where: { id },
        select: { profile: { select: { userId: true } } },
      });
      if (!q) return res.status(404).json({ error: 'Question not found.' });
      if (q.profile?.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Not your question.' });
      }
      await prisma.question.update({ where: { id }, data: { status: 'HIDDEN' } });
      res.json({ ok: true });
    } catch (err) {
      console.error('[qa] hide failed:', err);
      res.status(500).json({ error: 'Failed.' });
    }
  });

  app.delete('/api/questions/:id', writeLimiter, authenticate, async (req, res) => {
    const id = String(req.params.id || '');
    try {
      const q = await prisma.question.findUnique({
        where: { id },
        select: { profile: { select: { userId: true } } },
      });
      if (!q) return res.status(404).json({ error: 'Question not found.' });
      if (q.profile?.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Not your question.' });
      }
      await prisma.question.delete({ where: { id } });
      res.json({ ok: true });
    } catch (err) {
      console.error('[qa] delete failed:', err);
      res.status(500).json({ error: 'Failed.' });
    }
  });

  // Soft-block the asker via their daily-rotated hash. Persists per profile
  // only — the block expires naturally with the salt (~24h), which is the
  // intentional tradeoff against trying to permaban anonymous traffic.
  app.post('/api/questions/:id/block-asker', writeLimiter, authenticate, async (req, res) => {
    const id = String(req.params.id || '');
    try {
      const q = await prisma.question.findUnique({
        where: { id },
        select: {
          askerHash: true,
          profile: { select: { id: true, userId: true } },
        },
      });
      if (!q) return res.status(404).json({ error: 'Question not found.' });
      if (q.profile?.userId !== req.user.userId) {
        return res.status(403).json({ error: 'Not your question.' });
      }

      await prisma.askerBlock.upsert({
        where: {
          profileId_askerHash: {
            profileId: q.profile.id,
            askerHash: q.askerHash,
          },
        },
        update: {},
        create: { profileId: q.profile.id, askerHash: q.askerHash },
      });

      // Also hide the offending question while we're at it.
      await prisma.question.update({
        where: { id },
        data: { status: 'BLOCKED' },
      });

      res.json({ ok: true });
    } catch (err) {
      console.error('[qa] block failed:', err);
      res.status(500).json({ error: 'Failed.' });
    }
  });
}
