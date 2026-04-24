/**
 * Jimp Builder API + SPA host.
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
import { existsSync } from 'node:fs';
import pkg from '@prisma/client';
import { isSlugForbidden } from './forbiddenSlugs.js';

const { PrismaClient } = pkg;

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const SLUG_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

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

/* -------------------------------------------------------------------------- */
/* Middleware                                                                 */
/* -------------------------------------------------------------------------- */

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
app.use(express.json({ limit: '10mb' })); // profile JSON can get chunky
app.use(cookieParser());

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
  return { id: user.id, username: user.username, email: user.email };
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

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword },
    });
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

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  issueSession(res, user);
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', buildCookieOptions());
  res.json({ ok: true });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
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

// Public profile fetch — only returns the `data` blob.
app.get('/api/profiles/:slug', async (req, res) => {
  const { slug } = req.params;
  const profile = await prisma.profile.findUnique({ where: { slug } });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile.data);
});

// Create or update the current user's profile.
// Slug changes are gated by a 7-day cooldown measured from `slugChangedAt`.
app.post('/api/profiles', authenticate, async (req, res) => {
  const { slug, data } = req.body || {};
  const userId = req.user.userId;

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'Slug is required' });
  }
  const normalizedSlug = slug.toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(normalizedSlug)) {
    return res.status(400).json({
      error:
        'Slug must be 2–30 chars, lowercase letters, digits or dashes, and cannot start with a dash',
    });
  }
  if (isSlugForbidden(normalizedSlug)) {
    return res.status(400).json({ error: 'This slug is reserved or not allowed' });
  }

  try {
    const existing = await prisma.profile.findUnique({ where: { userId } });

    if (!existing) {
      // First-time claim: check the slug is free, then create.
      const taken = await prisma.profile.findUnique({ where: { slug: normalizedSlug } });
      if (taken) return res.status(409).json({ error: 'This URL is already taken' });

      const profile = await prisma.profile.create({
        data: { slug: normalizedSlug, data, userId, slugChangedAt: new Date() },
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
    res.json({ ...profile, ...cooldownFor(profile) });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'This URL is already taken' });
    }
    console.error('[profiles save]', err);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

app.get('/api/check-slug/:slug', async (req, res) => {
  const slug = (req.params.slug || '').toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{1,29}$/.test(slug) || isSlugForbidden(slug)) {
    return res.json({ available: false });
  }
  const profile = await prisma.profile.findUnique({ where: { slug } });
  res.json({ available: !profile });
});

/* -------------------------------------------------------------------------- */
/* Static SPA (production only)                                                */
/* -------------------------------------------------------------------------- */

if (IS_PROD) {
  const distPath = path.resolve(__dirname, '..', 'dist');
  if (existsSync(distPath)) {
    app.use(express.static(distPath));
    // Any non-API GET falls through to the SPA shell — React Router handles it.
    // We use a regex instead of "*" because Express 5's router rejects bare "*".
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
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

  const server = app.listen(PORT, () => {
    console.log(
      `[server] listening on http://localhost:${PORT} (prod=${IS_PROD})`,
    );
  });

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
