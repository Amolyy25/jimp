/**
 * Discord OAuth 2.0 — sign-in / sign-up flow.
 *
 * Flow:
 *   1. Anonymous visitor hits GET /api/auth/discord → 302 to Discord with
 *      scope `identify email`.
 *   2. Discord redirects back to GET /api/auth/discord/callback?code=… →
 *      we exchange the code, fetch the Discord profile, then either:
 *        - find an existing User by discordId or by email and link / log in
 *        - create a new User (no password) and log them in
 *      Then we 302 to /editor with `?discord=connected` (existing) or
 *      `?discord=registered` (new account, so the editor offers to import
 *      avatar + username).
 *   3. Authed GET /api/auth/discord/import returns the stored Discord avatar
 *      URL + username so the editor can fill the avatar widget.
 *
 * Bio is intentionally not imported: Discord's OAuth API does not expose a
 * user's "About me" bio — that field is private to the Discord client. We
 * surface what's actually available (avatar, display name, accent color).
 *
 * Required env:
 *   DISCORD_CLIENT_ID
 *   DISCORD_CLIENT_SECRET
 *   DISCORD_REDIRECT_URI    e.g. https://persn.me/api/auth/discord/callback
 *   PUBLIC_APP_URL          used for post-callback redirect to the editor
 */

import crypto from 'node:crypto';

const AUTH_BASE = 'https://discord.com/api/oauth2';
const API_BASE = 'https://discord.com/api';
const SCOPES = 'identify email';
const STATE_COOKIE = 'discord_oauth_state';

export function registerDiscordAuthRoutes(app, prisma, authenticate, helpers) {
  const { issueSession } = helpers;

  app.get('/api/auth/discord', (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: 'Discord auth is not configured on this server.',
      });
    }

    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/',
    });

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUri,
      state,
      prompt: 'none',
    });
    res.redirect(`${AUTH_BASE}/authorize?${params.toString()}`);
  });

  app.get('/api/auth/discord/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const expectedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });

    const appUrl = process.env.PUBLIC_APP_URL || '';

    if (error) return res.redirect(`${appUrl}/login?discord=denied`);
    if (!code || !state || !expectedState || state !== expectedState) {
      return res.redirect(`${appUrl}/login?discord=state_mismatch`);
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      const profile = await fetchDiscordUser(tokens.access_token);
      if (!profile?.id) {
        return res.redirect(`${appUrl}/login?discord=error`);
      }
      if (!profile.email || !profile.verified) {
        // We require an email to map the user — Discord returns it when the
        // `email` scope was granted AND the account has a verified email.
        return res.redirect(`${appUrl}/login?discord=no_email`);
      }

      const normalizedEmail = String(profile.email).trim().toLowerCase();
      const displayName = profile.global_name || profile.username || 'discord';

      // 1. Already linked? Just log in.
      let user = await prisma.user.findUnique({
        where: { discordId: profile.id },
      });

      let isNew = false;

      if (!user) {
        user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (user) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              discordId: profile.id,
              discordUsername: displayName,
              discordAvatar: profile.avatar || null,
              emailVerified: true, // Discord already verified this email
            },
          });
        } else {
          // 3. Brand new account. Pick a unique-ish base username from the
          //    Discord username and let the DB layer disambiguate with a
          //    short suffix on conflict.
          isNew = true;
          const baseUsername = sanitizeUsername(displayName) || 'user';
          user = await createUserWithUniqueUsername(prisma, baseUsername, {
            email: normalizedEmail,
            discordId: profile.id,
            discordUsername: displayName,
            discordAvatar: profile.avatar || null,
            emailVerified: true, // Discord already verified this email
          });
        }
      } else {
        // Refresh the cached avatar/name on every login.
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            discordUsername: displayName,
            discordAvatar: profile.avatar || null,
          },
        });
      }

      issueSession(res, user);
      const flag = isNew ? 'registered' : 'connected';
      return res.redirect(`${appUrl}/editor?discord=${flag}`);
    } catch (err) {
      console.error('[discord] callback failed:', err);
      return res.redirect(`${appUrl}/login?discord=error`);
    }
  });

  // Returns the linked Discord profile data the editor can pull into the
  // avatar widget. 404s if the caller hasn't linked Discord.
  app.get('/api/auth/discord/import', authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        discordId: true,
        discordUsername: true,
        discordAvatar: true,
        username: true,
      },
    });
    if (!user?.discordId) {
      return res.status(404).json({ error: 'No Discord account linked' });
    }
    res.json({
      discordId: user.discordId,
      username: user.discordUsername || user.username,
      avatarUrl: discordAvatarUrl(user.discordId, user.discordAvatar),
    });
  });
}

/* -------------------------------------------------------------------------- */
/* OAuth helpers                                                               */
/* -------------------------------------------------------------------------- */

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
  });
  const r = await fetch(`${AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!r.ok) throw new Error(`discord token exchange ${r.status}`);
  return r.json();
}

async function fetchDiscordUser(accessToken) {
  const r = await fetch(`${API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) throw new Error(`discord users/@me ${r.status}`);
  return r.json();
}

/** Build the public CDN URL for a Discord avatar. Falls back to default. */
function discordAvatarUrl(userId, avatarHash) {
  if (avatarHash) {
    const ext = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=256`;
  }
  // Default avatar — derived from the user ID per Discord's docs.
  const idx = (BigInt(userId) >> 22n) % 6n;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

/** Strip a Discord display name down to something we can use as a username. */
function sanitizeUsername(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 24);
}

/**
 * Create a User, retrying with a numeric suffix on username collision until
 * we land on a free slot (capped to keep the loop bounded).
 */
async function createUserWithUniqueUsername(prisma, baseUsername, fields) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate =
      attempt === 0 ? baseUsername : `${baseUsername}-${randSuffix()}`;
    try {
      return await prisma.user.create({
        data: { username: candidate, ...fields },
      });
    } catch (err) {
      if (err?.code !== 'P2002') throw err; // not a uniqueness violation
      // collision on username (or email/discordId, which also throw P2002 —
      // we let those bubble up after the first try since suffixing won't
      // help)
      if (!String(err?.meta?.target || '').includes('username')) throw err;
    }
  }
  throw new Error('Could not allocate a unique username for Discord user');
}

function randSuffix() {
  return crypto.randomBytes(2).toString('hex'); // 4 hex chars
}
