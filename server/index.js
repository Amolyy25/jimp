/**
 * persn.me API + SPA host.
 *
 * In development this runs on its own port (3001 by default) and talks to
 * the Vite dev server through CORS. In production the same process serves
 * the built SPA out of `dist/`, so Railway (or any single-service host) can
 * run the whole app with one command.
 *
 * Routes:
 *   POST /api/auth/register
 *   POST /api/auth/login
 *   POST /api/auth/logout
 *   GET  /api/auth/me
 *   GET  /api/profiles/me          (authenticated)
 *   POST /api/profiles             (authenticated, slug cooldown: 7 days)
 *   GET  /api/profiles/:slug       (public)
 *   GET  /api/check-slug/:slug
 *   GET  /*                        (SPA fallback, production only)
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import pkg from '@prisma/client';
import { isSlugForbidden } from './forbiddenSlugs.js';
import { renderProfileOg, invalidateOgCache } from './og.js';
import { registerSpotifyRoutes } from './spotify.js';
import { registerDiscordAuthRoutes } from './discordAuth.js';
import { registerQuestionRoutes } from './questions.js';
import { registerClickerRoutes } from './clicker.js';
import { registerExploreRoutes } from './explore.js';
import { sanitizeCustomCss } from './sanitizeCss.js';
import { registerTwitchRoutes } from './twitch.js';
import { registerImportRoutes } from './importLinktree.js';
import { registerQrRoutes } from './qr.js';
import { registerAnalyticsRoutes } from './analytics.js';
import { registerVersionRoutes } from './versions.js';
import { registerSocialRoutes } from './social.js';
import { registerAdminRoutes } from './admin.js';
import { createRateLimiter } from './rateLimit.js';
import { securityHeaders } from './securityHeaders.js';
import { hasProfanity, findProfanityInObject } from './profanity.js';
import {
  isEmail,
  isUsername,
  isStrongEnoughPassword,
  approxJsonBytes,
} from './validate.js';
import { generateVerificationToken, sendVerificationEmail } from './mailer.js';
import { clientIp } from './rateLimit.js';
import { notifyNewUser, notifyReport } from './webhooks.js';

const { PrismaClient } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const SLUG_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const PROFILE_MAX_BYTES = 512 * 1024; // 512 KB cap per profile blob

/* -------------------------------------------------------------------------- */
/* Process-level diagnostics                                                   */
/* -------------------------------------------------------------------------- */
/*
 * Without these, an unhandled promise rejection silently kills Node with
 * exit code 0 under Node 22+ in some configurations — exactly the symptom
 * we've seen where `[server] listening…` prints immediately followed by
 * `exited with code 0` and no error at all. We log loud and keep the
 * process up so the actual error shows in the console.
 */
process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught exception:', err);
});
process.on('exit', (code) => {
  console.error(`[server] Process exiting with code ${code}`);
});

/* -------------------------------------------------------------------------- */
/* Required env sanity check                                                   */
/* -------------------------------------------------------------------------- */

if (!process.env.DATABASE_URL) {
  console.error(
    '[server] DATABASE_URL is not set. Create a .env file with a valid\n' +
      '         Postgres connection string before starting the server.\n' +
      '         Example: DATABASE_URL=postgresql://user:pass@host:port/db',
  );
  process.exit(1);
}

if (IS_PROD && JWT_SECRET === 'dev-secret-change-me') {
  console.warn(
    '[server] WARNING: JWT_SECRET is not set. Please define it in your environment.',
  );
}

const app = express();
const prisma = new PrismaClient();

// Behind Railway / Cloudflare we sit one hop deep. Trusting one proxy lets
// Express resolve req.ip from X-Forwarded-For correctly without opening us
// up to header spoofing from arbitrary clients.
app.set('trust proxy', 1);
// Hide the default "X-Powered-By: Express" fingerprint.
app.disable('x-powered-by');

/* -------------------------------------------------------------------------- */
/* Middleware                                                                 */
/* -------------------------------------------------------------------------- */

// Security headers — applied to every response (API + SPA shell).
app.use(securityHeaders);

// In dev we allow localhost:5173. In prod we accept same-origin requests and
// any origins listed in CORS_ORIGINS (comma-separated) so custom domains work.
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const prodOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: IS_PROD ? (prodOrigins.length ? prodOrigins : true) : devOrigins,
    credentials: true,
  }),
);
// 1 MB is enough for any legitimate profile blob; the per-route check below
// enforces a tighter cap on the actual profile payload.
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

/* -------------------------------------------------------------------------- */
/* Rate limiters                                                               */
/* -------------------------------------------------------------------------- */
// Pre-built buckets — one strict for auth, one moderate for write endpoints,
// one relaxed for everything else. Applied per-route below.

const apiLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  bucket: 'api',
  message: 'Too many requests. Slow down.',
});
const authLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 20,
  bucket: 'auth',
  message: 'Too many auth attempts. Try again later.',
});
const writeLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  bucket: 'write',
  message: 'Too many write requests. Slow down.',
});
const ingestLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 200,
  bucket: 'ingest',
  message: 'Too many analytics events.',
});

// Apply the global limiter to /api/* (skips static assets + SPA fallback).
app.use('/api/', apiLimiter);

/**
 * JWT auth middleware — reads the `token` cookie set at login/register.
 * Responds with 401 on missing/invalid token; otherwise hydrates `req.user`.
 */
function authenticate(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function buildCookieOptions() {
  return {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'lax' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  };
}

function issueSession(res, user) {
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('token', token, buildCookieOptions());
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || 'USER',
    emailVerified: !!user.emailVerified,
  };
}

/* -------------------------------------------------------------------------- */
/* Health                                                                      */
/* -------------------------------------------------------------------------- */

// Lightweight, unauthenticated liveness probe for Railway's healthcheck.
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (!isUsername(username)) {
    return res.status(400).json({
      error: 'Username must be 2–30 characters (letters, digits, dot, dash, underscore).',
    });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }
  if (!isStrongEnoughPassword(password)) {
    return res.status(400).json({
      error: 'Password must be 8–128 characters',
    });
  }
  if (hasProfanity(username)) {
    return res.status(400).json({ error: 'Username contains forbidden words' });
  }
  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = generateVerificationToken();

    const user = await prisma.user.create({
      data: { 
        username: String(username).trim(), 
        email: normalizedEmail, 
        password: hashedPassword,
        emailVerifyToken: verifyToken,
      },
    });

    // Don't wait for email to send before responding to user.
    sendVerificationEmail(normalizedEmail, verifyToken).catch((err) => {
      console.error('[register] failed to send email:', err.message);
    });

    notifyNewUser(username, normalizedEmail).catch(() => {});

    issueSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    console.error('[register]', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/verify-email', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null },
    });

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('[verify-email]', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

app.post('/api/auth/resend-verification', authLimiter, authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ error: 'Email already verified' });

    const verifyToken = generateVerificationToken();
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken },
    });

    await sendVerificationEmail(user.email, verifyToken);
    res.json({ success: true, message: 'Verification email resent' });
  } catch (err) {
    console.error('[resend-verification]', err);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  if (!isEmail(email) || password.length > 128) {
    // Same generic error as a wrong password — don't leak that the email is malformed.
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      // No `password` is set on Discord-only accounts — treat the same as a
      // wrong password so we don't leak which accounts exist.
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    issueSession(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    // Typical suspects: Prisma schema drift (missing column), DB unreachable,
    // DB migrations not applied. We log the full error but keep the response
    // opaque to clients.
    console.error('[login] Prisma/DB error:', err.code, err.message);
    if (err.code === 'P2021' || err.code === 'P2022') {
      return res.status(500).json({
        error: 'Database schema is out of sync. Run `prisma migrate deploy`.',
        code: err.code,
      });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', buildCookieOptions());
  res.json({ ok: true });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error('[me] Prisma/DB error:', err.code, err.message);
    if (err.code === 'P2021' || err.code === 'P2022') {
      return res.status(500).json({
        error: 'Database schema is out of sync.',
        code: err.code,
      });
    }
    res.status(500).json({ error: 'Failed to load session' });
  }
});

/* -------------------------------------------------------------------------- */
/* Profiles                                                                    */
/* -------------------------------------------------------------------------- */

// Current user's profile + cooldown status.
app.get('/api/profiles/me', authenticate, async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { userId: req.user.userId },
      select: {
        id: true,
        slug: true,
        data: true,
        slugChangedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!profile) return res.json(null);
    res.json({ ...profile, ...cooldownFor(profile) });
  } catch (err) {
    console.error('[profiles/me]', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Optimization: In-memory cache for public profiles to survive viral traffic spikes.
const profileCache = new Map(); // slug -> { data, timestamp }
const PROFILE_CACHE_TTL = 60_000;

// Public profile fetch — returns the `data` blob plus the owner ID.
app.get('/api/profiles/:slug', async (req, res) => {
  const { slug } = req.params;
  const normalizedSlug = slug.toLowerCase();

  const now = Date.now();
  const cached = profileCache.get(normalizedSlug);
  if (cached && now - cached.timestamp < PROFILE_CACHE_TTL) {
    return res.json(cached.data);
  }

  const profile = await prisma.profile.findUnique({ where: { slug: normalizedSlug } });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  if (profile.isBanned) return res.status(403).json({ error: 'Ce profil a été suspendu pour non-respect des conditions d\'utilisation.' });

  const responseData = { ...profile.data, __ownerId: profile.userId };
  profileCache.set(normalizedSlug, { data: responseData, timestamp: now });

  // Simple cache cleanup
  if (profileCache.size > 5000) {
    const threshold = now - PROFILE_CACHE_TTL;
    for (const [s, entry] of profileCache.entries()) {
      if (entry.timestamp < threshold) profileCache.delete(s);
    }
  }

  res.json(responseData);
});

// Create or update the current user's profile.
// Slug changes are gated by a 7-day cooldown measured from `slugChangedAt`.
app.post('/api/profiles', writeLimiter, authenticate, async (req, res) => {
  const { slug, data } = req.body || {};
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user.emailVerified) {
      return res.status(403).json({ 
        error: 'Email non vérifié', 
        message: 'Veuillez vérifier votre adresse email pour pouvoir publier votre profil.' 
      });
    }

    if (!slug || typeof slug !== 'string') {
      return res.status(400).json({ error: 'Slug is required' });
    }
    const normalizedSlug = slug.toLowerCase().trim();
  // 4-30 enforcement on new claims and renames. Existing 2-3 char slugs
  // (grandfathered) keep working on routing/lookups but cannot be re-claimed
  // once released.
  if (!/^[a-z0-9][a-z0-9-]{3,29}$/.test(normalizedSlug)) {
    return res.status(400).json({
      error:
        'Slug must be 4–30 chars: lowercase letters, digits or dashes, and cannot start with a dash.',
    });
  }
  if (isSlugForbidden(normalizedSlug)) {
    return res.status(400).json({ error: 'This slug is reserved or not allowed' });
  }

  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Profile data is required' });
  }
  // Reject oversized blobs early — protects DB from runaway payloads.
  const size = approxJsonBytes(data);
  if (size > PROFILE_MAX_BYTES) {
    return res.status(413).json({
      error: `Profile is too large (${size} bytes; max ${PROFILE_MAX_BYTES})`,
    });
  }
  const offending = findProfanityInObject(data);
  if (offending) {
    return res.status(400).json({
      error: 'Your profile contains forbidden words. Please remove them and try again.',
    });
  }

  // Sanitize the optional power-user custom CSS before it touches the DB.
  // Done in-place so the snapshotted version we write to ProfileVersion
  // matches what /:slug eventually renders.
  if (data?.theme?.customCss != null) {
    data.theme.customCss = sanitizeCustomCss(data.theme.customCss);
  }

  const existing = await prisma.profile.findUnique({ where: { userId } });

    if (!existing) {
      // First-time claim: check the slug is free, then create.
      const taken = await prisma.profile.findUnique({ where: { slug: normalizedSlug } });
      if (taken) return res.status(409).json({ error: 'This URL is already taken' });

      const profile = await prisma.profile.create({
        data: { slug: normalizedSlug, data, userId, slugChangedAt: new Date() },
      });
      invalidateOgCache(normalizedSlug);
      profileCache.delete(normalizedSlug);
      // Snapshot the first save so the user has at least one entry in their
      // history timeline (Feature 13).
      await snapshotVersion(prisma, profile.id, data).catch((err) => {
        console.warn('[versions] snapshot failed:', err.message);
      });
      return res.json({ ...profile, ...cooldownFor(profile) });
    }

    const slugChanged = existing.slug !== normalizedSlug;

    if (slugChanged) {
      // 7-day cooldown enforcement.
      const { locked, unlocksAt, remainingMs } = cooldownFor(existing);
      if (locked) {
        return res.status(403).json({
          error: 'Slug is locked',
          reason: 'cooldown',
          unlocksAt,
          remainingMs,
        });
      }
      // Also prevent claiming a slug already used by someone else.
      const taken = await prisma.profile.findUnique({ where: { slug: normalizedSlug } });
      if (taken && taken.userId !== userId) {
        return res.status(409).json({ error: 'This URL is already taken' });
      }
    }

    const profile = await prisma.profile.update({
      where: { userId },
      data: {
        slug: normalizedSlug,
        data,
        ...(slugChanged ? { slugChangedAt: new Date() } : {}),
      },
    });
    // Any saved change means the OG preview is stale — drop the cache so
    // crawlers re-render next time they hit /:slug.
    invalidateOgCache(normalizedSlug);
    if (slugChanged) {
      invalidateOgCache(existing.slug);
      profileCache.delete(existing.slug);
    }
    profileCache.delete(normalizedSlug);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'This URL is already taken' });
    }
    console.error('[profiles save]', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

/* -------------------------------------------------------------------------- */
/* OG images                                                                   */
/* -------------------------------------------------------------------------- */

app.get('/api/og/:slug', async (req, res) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { slug: req.params.slug.toLowerCase() },
    });
    if (!profile) return res.status(404).send('Profile not found');

    const png = await renderProfileOg(req.params.slug, profile.data);
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.send(png);
  } catch (err) {
    console.error('[og] render error:', err);
    res.status(500).send('OG render failed');
  }
});

/* -------------------------------------------------------------------------- */
/* Spotify                                                                     */
/* -------------------------------------------------------------------------- */

registerSpotifyRoutes(app, prisma, authenticate);
registerDiscordAuthRoutes(app, prisma, authenticate, { issueSession });

/* -------------------------------------------------------------------------- */
/* Other feature routes                                                        */
/* -------------------------------------------------------------------------- */

registerTwitchRoutes(app);
registerImportRoutes(app, authenticate, { writeLimiter });
registerQrRoutes(app, prisma);

app.post('/api/reports', async (req, res) => {
  const { slug, reason, details } = req.body || {};
  if (!slug || !reason) {
    return res.status(400).json({ error: 'Slug and reason are required' });
  }

  try {
    const profile = await prisma.profile.findUnique({
      where: { slug: slug.toLowerCase().trim() },
    });
    if (!profile) return res.status(404).json({ error: 'Profile not found' });

    await prisma.report.create({
      data: {
        profileId: profile.id,
        reason: String(reason).slice(0, 100),
        details: details ? String(details).slice(0, 1000) : null,
        reporterIp: clientIp(req),
      },
    });

    notifyReport(slug, reason, details, clientIp(req)).catch(() => {});

    res.json({ success: true, message: 'Report submitted successfully' });
  } catch (err) {
    console.error('[reports]', err);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});
registerAnalyticsRoutes(app, prisma, authenticate, { ingestLimiter });
registerVersionRoutes(app, prisma, authenticate, { writeLimiter });
registerSocialRoutes(app, prisma, authenticate, { writeLimiter });
registerAdminRoutes(app, prisma, authenticate);
registerQuestionRoutes(app, prisma, authenticate, { writeLimiter });
registerClickerRoutes(app, prisma, { ingestLimiter });
registerExploreRoutes(app, prisma);

app.get('/api/check-slug/:slug', async (req, res) => {
  const slug = (req.params.slug || '').toLowerCase();
  // Mirror the claim-side rule (4-30) so the editor never says "available"
  // for a slug the POST will then reject.
  if (!/^[a-z0-9][a-z0-9-]{3,29}$/.test(slug) || isSlugForbidden(slug)) {
    return res.json({ available: false });
  }
  const profile = await prisma.profile.findUnique({ where: { slug } });
  res.json({ available: !profile });
});

/* -------------------------------------------------------------------------- */
/* SEO: sitemap.xml — must sit before the SPA fallback                        */
/* -------------------------------------------------------------------------- */

// Cap: stay well under search engines' 50k-URLs / 50MB limit per sitemap.
// If/when we cross 5k profiles we should split into a sitemap index instead.
const SITEMAP_MAX_URLS = 5000;
let sitemapCache = null; // { xml, expiresAt }
const SITEMAP_TTL_MS = 60 * 60 * 1000;

app.get('/sitemap.xml', async (req, res) => {
  try {
    const now = Date.now();
    if (sitemapCache && sitemapCache.expiresAt > now) {
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
      return res.send(sitemapCache.xml);
    }

    const origin = publicOrigin(req);
    const profiles = await prisma.profile.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: SITEMAP_MAX_URLS,
    });

    const entries = [
      `  <url><loc>${origin}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>`,
      ...profiles.map((p) => {
        const lastmod = p.updatedAt ? new Date(p.updatedAt).toISOString() : '';
        return `  <url><loc>${origin}/${escapeHtml(p.slug)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
      }),
    ].join('\n');

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;

    sitemapCache = { xml, expiresAt: now + SITEMAP_TTL_MS };
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.send(xml);
  } catch (err) {
    console.error('[sitemap] error:', err);
    res.status(500).send('Sitemap generation failed');
  }
});

/* -------------------------------------------------------------------------- */
/* Static SPA (production only)                                                */
/* -------------------------------------------------------------------------- */

if (IS_PROD) {
  const distPath = path.resolve(__dirname, '..', 'dist');
  if (existsSync(distPath)) {
    const indexPath = path.join(distPath, 'index.html');
    // Read the SPA shell ONCE at boot — meta-tag injection then works as
    // a string replace per-request, which is dirt cheap.
    const indexHtml = readFileSync(indexPath, 'utf8');

    app.use(express.static(distPath, { index: false }));

    // SPA fallback. For root-level one-segment paths (potentially vanity
    // slugs) we try to look the profile up and rewrite meta tags so
    // Discord/Twitter/iMessage show a rich preview when the link is
    // pasted. Everything else gets the untouched shell.
    app.get(/^(?!\/api\/|\/assets\/).*/, async (req, res) => {
      try {
        const match = req.path.match(/^\/([a-z0-9][a-z0-9-]{1,29})$/i);
        if (match) {
          const slug = match[1].toLowerCase();
          const profile = await prisma.profile.findUnique({ where: { slug } });
          if (profile) {
            const html = injectProfileMeta(indexHtml, slug, profile.data, req);
            res.set('Content-Type', 'text/html; charset=utf-8');
            return res.send(html);
          }
        }
      } catch (err) {
        // Fall through to unmodified shell — never block the SPA on meta
        // injection errors.
        console.warn('[meta] injection failed:', err.message);
      }
      res.sendFile(indexPath);
    });
  } else {
    console.warn(
      `[server] Production mode but no build found at ${distPath}. Run \`npm run build\` first.`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Error handler — keep it last                                                */
/* -------------------------------------------------------------------------- */

app.use((err, _req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Unexpected server error' });
});

/* -------------------------------------------------------------------------- */
/* Boot                                                                        */
/* -------------------------------------------------------------------------- */

async function boot() {
  // Verify we can actually talk to the database before accepting traffic.
  // Fails loudly if the DB is unreachable or the schema hasn't been migrated.
  try {
    await prisma.$connect();
    console.log('[server] connected to database');
  } catch (err) {
    console.error('[server] Failed to connect to database:', err.message);
    console.error(
      '         Make sure DATABASE_URL points to a reachable Postgres instance\n' +
        '         and that migrations have been applied:  npx prisma migrate dev',
    );
    process.exit(1);
  }

  const PORT = process.env.PORT || 3001
  const server = app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

  // Anything that could silently stop the process now gets logged.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `[server] Port ${PORT} is already in use. A previous dev server is\n` +
          '         probably still running. Kill it with:\n' +
          `           lsof -ti tcp:${PORT} | xargs kill -9\n` +
          '         then restart `npm run dev`.',
      );
    } else {
      console.error('[server] HTTP server error:', err);
    }
    process.exit(1);
  });
  server.on('close', () => {
    console.warn('[server] HTTP server closed');
  });

  // Graceful shutdown — clean up Prisma's pool so deploys don't leak
  // connections.
  const shutdown = async (signal) => {
    console.log(`[server] ${signal} received, closing connections…`);
    server.close();
    await prisma.$disconnect().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

boot().catch((err) => {
  console.error('[server] Boot failed:', err);
  process.exit(1);
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Compute cooldown metadata for a profile. The unlock time is 7 days after
 * the last slug change; before that, slug edits are refused by the API.
 */
/**
 * Inject Open Graph + Twitter meta tags into the SPA shell HTML for a
 * specific profile. Crawlers (Discord, Twitter, iMessage…) don't run JS,
 * so the tags MUST live in the initial HTML response.
 */
function injectProfileMeta(html, slug, data, req) {
  const avatar = data.widgets?.find((w) => w.type === 'avatar');
  const username = avatar?.data?.username || slug;
  const bio = avatar?.data?.bio || `${username} on persn.me.`;

  const origin = publicOrigin(req);
  const url = `${origin}/${slug}`;
  const ogImage = `${origin}/api/og/${slug}`;

  // JSON-LD Person schema — tells Google this page is a person's profile.
  // Material help for "search by pseudonym → find persn.me/<pseudo>": the
  // engine can attach the user's name + bio to the URL as a structured entity.
  const personLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: username,
    alternateName: `@${username}`,
    description: bio,
    url,
    image: ogImage,
    mainEntityOfPage: url,
  };

  const tags = [
    `<title>@${escapeHtml(username)} — persn.me</title>`,
    `<meta name="description" content="${escapeHtml(bio)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta name="robots" content="index,follow" />`,
    `<meta property="og:type" content="profile" />`,
    `<meta property="og:site_name" content="persn.me" />`,
    `<meta property="og:title" content="@${escapeHtml(username)}" />`,
    `<meta property="og:description" content="${escapeHtml(bio)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${ogImage}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="profile:username" content="${escapeHtml(username)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="@${escapeHtml(username)} — persn.me" />`,
    `<meta name="twitter:description" content="${escapeHtml(bio)}" />`,
    `<meta name="twitter:image" content="${ogImage}" />`,
    // Discord uses og:image but also respects a theme colour hint.
    `<meta name="theme-color" content="${escapeHtml(data.theme?.accent || '#5865F2')}" />`,
    `<script type="application/ld+json">${escapeJsonLd(JSON.stringify(personLd))}</script>`,
  ].join('\n    ');

  // Replace the first <title> tag (and a couple of static meta tags) with
  // our bundle. Falls back to injecting just after <head> if no <title>.
  if (/<title>[^<]*<\/title>/.test(html)) {
    return html
      .replace(/<title>[^<]*<\/title>\s*/i, '')
      .replace(/(<meta name="description"[^>]*>\s*)/i, '')
      .replace(/<head>/i, `<head>\n    ${tags}`);
  }
  return html.replace(/<head>/i, `<head>\n    ${tags}`);
}

/** Best-effort request → "https://host" origin — honours X-Forwarded-* on Railway. */
function publicOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

/**
 * Escape a JSON string for safe embedding inside a <script> tag.
 * Specifically neutralises </script> and HTML-comment sequences which
 * would otherwise let an injected bio break out of the script element.
 */
function escapeJsonLd(json) {
  return String(json)
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<!--/g, '<\\!--');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function cooldownFor(profile) {
  const unlocksAt = new Date(
    new Date(profile.slugChangedAt).getTime() + SLUG_COOLDOWN_MS,
  );
  const remainingMs = Math.max(0, unlocksAt.getTime() - Date.now());
  return {
    unlocksAt: unlocksAt.toISOString(),
    remainingMs,
    locked: remainingMs > 0,
  };
}

const VERSIONS_PER_PROFILE = 20;

/**
 * Append a snapshot of `data` for `profileId`, then trim the oldest entries
 * so each profile keeps at most VERSIONS_PER_PROFILE rows. Skipping the
 * insert when nothing changed is the caller's job — we deliberately do
 * nothing fancy here so the on-save path stays fast.
 */
async function snapshotVersion(prisma, profileId, data) {
  await prisma.profileVersion.create({
    data: { profileId, data },
  });
  const ids = await prisma.profileVersion.findMany({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
    skip: VERSIONS_PER_PROFILE,
  });
  if (ids.length) {
    await prisma.profileVersion.deleteMany({
      where: { id: { in: ids.map((v) => v.id) } },
    });
  }
}
