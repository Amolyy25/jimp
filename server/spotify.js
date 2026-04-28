/**
 * Spotify OAuth 2.0 (Authorization Code) + refresh + now-playing proxy.
 *
 * Flow:
 *   1. Logged-in user hits GET /api/spotify/connect → we redirect to Spotify
 *      with scope `user-read-currently-playing user-read-playback-state`.
 *   2. Spotify redirects back to GET /api/spotify/callback?code=… → we
 *      exchange the code for access + refresh tokens, store on User, then
 *      redirect back to /editor.
 *   3. Public GET /api/spotify/now-playing/:userId returns the current
 *      track for the given user, auto-refreshing the access token if
 *      expired. Profile pages poll this endpoint (every ~15s).
 *
 * Required env:
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REDIRECT_URI     e.g. https://persn.me/api/spotify/callback
 *   PUBLIC_APP_URL           used for the post-callback redirect (editor)
 */

import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';

const AUTH_BASE = 'https://accounts.spotify.com';
const API_BASE = 'https://api.spotify.com/v1';
const SCOPES = 'user-read-currently-playing user-read-playback-state';
const STATE_COOKIE = 'spotify_oauth_state';

export function registerSpotifyRoutes(app, prisma, authenticate) {
  app.get('/api/spotify/connect', authenticate, (req, res) => {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: 'Spotify is not configured on this server.',
      });
    }

    // A random state ties the callback to this browser; we stash it in a
    // short-lived httpOnly cookie and verify on return.
    const state = crypto.randomBytes(16).toString('hex');
    res.cookie(STATE_COOKIE, `${state}:${req.user.userId}`, {
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
    });
    res.redirect(`${AUTH_BASE}/authorize?${params.toString()}`);
  });

  app.get('/api/spotify/callback', async (req, res) => {
    const { code, state, error } = req.query;
    const rawCookie = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, { path: '/' });

    const appUrl = process.env.PUBLIC_APP_URL || '';
    if (error) return res.redirect(`${appUrl}/editor?spotify=denied`);
    if (!code || !state || !rawCookie) {
      return res.redirect(`${appUrl}/editor?spotify=error`);
    }
    const [expectedState, userId] = rawCookie.split(':');
    if (state !== expectedState || !userId) {
      return res.redirect(`${appUrl}/editor?spotify=state_mismatch`);
    }

    try {
      const tokens = await exchangeCodeForTokens(code);
      await prisma.user.update({
        where: { id: userId },
        data: {
          spotifyAccessToken: tokens.access_token,
          spotifyRefreshToken: tokens.refresh_token,
          spotifyExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      res.redirect(`${appUrl}/editor?spotify=connected`);
    } catch (err) {
      console.error('[spotify] token exchange failed:', err);
      res.redirect(`${appUrl}/editor?spotify=error`);
    }
  });

  /** Disconnect — clears the stored tokens. */
  app.post('/api/spotify/disconnect', authenticate, async (req, res) => {
    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        spotifyAccessToken: null,
        spotifyRefreshToken: null,
        spotifyExpiresAt: null,
      },
    });
    res.json({ ok: true });
  });

  /** Is the caller currently connected? */
  app.get('/api/spotify/status', authenticate, async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { spotifyRefreshToken: true },
    });
    res.json({ connected: !!user?.spotifyRefreshToken });
  });

  /**
   * Public now-playing endpoint. Returns:
   *   { is_playing, track, artist, album, albumArt, progressMs, durationMs, url }
   * or { is_playing: false } if nothing is playing / user isn't connected.
   */
  app.get('/api/spotify/now-playing/:userId', async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.params.userId },
        select: {
          spotifyAccessToken: true,
          spotifyRefreshToken: true,
          spotifyExpiresAt: true,
        },
      });
      if (!user?.spotifyRefreshToken) {
        return res.json({ is_playing: false, connected: false });
      }

      const access = await ensureAccessToken(prisma, req.params.userId, user);
      if (!access) return res.json({ is_playing: false, connected: true });

      const r = await fetch(`${API_BASE}/me/player/currently-playing`, {
        headers: { Authorization: `Bearer ${access}` },
      });
      if (r.status === 204) return res.json({ is_playing: false, connected: true });
      if (!r.ok) throw new Error(`Spotify ${r.status}`);
      const data = await r.json();
      if (!data?.item) return res.json({ is_playing: false, connected: true });

      const item = data.item;
      res.set('Cache-Control', 'no-store');
      res.json({
        is_playing: !!data.is_playing,
        connected: true,
        track: item.name,
        artist: item.artists?.map((a) => a.name).join(', ') || '',
        album: item.album?.name || '',
        albumArt: item.album?.images?.[0]?.url || '',
        progressMs: data.progress_ms ?? 0,
        durationMs: item.duration_ms ?? 0,
        url: item.external_urls?.spotify || '',
      });
    } catch (err) {
      console.error('[spotify] now-playing error:', err);
      res.status(502).json({ is_playing: false, error: 'spotify_error' });
    }
  });
}

/* -------------------------------------------------------------------------- */
/* OAuth + token helpers                                                       */
/* -------------------------------------------------------------------------- */

async function exchangeCodeForTokens(code) {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI,
  });
  const r = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!r.ok) throw new Error(`token exchange failed ${r.status}`);
  return r.json();
}

async function refreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const r = await fetch(`${AUTH_BASE}/api/token`, {
    method: 'POST',
    headers: {
      Authorization:
        'Basic ' +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
        ).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  if (!r.ok) throw new Error(`refresh failed ${r.status}`);
  return r.json(); // { access_token, expires_in, ... refresh_token? }
}

/**
 * Returns a valid Spotify access token for `userId`, refreshing if needed.
 * Updates the stored credentials atomically.
 */
async function ensureAccessToken(prisma, userId, user) {
  const expiresAt = user.spotifyExpiresAt ? new Date(user.spotifyExpiresAt) : null;
  const stillValid = expiresAt && expiresAt.getTime() > Date.now() + 60_000;
  if (stillValid && user.spotifyAccessToken) return user.spotifyAccessToken;

  try {
    const refreshed = await refreshAccessToken(user.spotifyRefreshToken);
    const data = {
      spotifyAccessToken: refreshed.access_token,
      spotifyExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
    };
    // Spotify sometimes issues a new refresh token on refresh.
    if (refreshed.refresh_token) data.spotifyRefreshToken = refreshed.refresh_token;
    await prisma.user.update({ where: { id: userId }, data });
    return refreshed.access_token;
  } catch (err) {
    console.error('[spotify] refresh failed:', err);
    return null;
  }
}
