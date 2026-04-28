/**
 * Twitch stream-status proxy.
 *
 * GET /api/twitch/status/:channel
 *   → { live: boolean, title?, game?, viewers?, thumbnail?, startedAt?,
 *       login?, displayName?, avatar?, error? }
 *
 * Auth model: server-to-server "App Access Token" (client_credentials), so
 * no per-user OAuth is needed. Tokens are cached in memory and refreshed on
 * 401. Channel responses are cached for 60s — Twitch's API rate-limits at
 * 800 requests / minute and stream-status doesn't change often.
 *
 * Required env:
 *   TWITCH_CLIENT_ID
 *   TWITCH_CLIENT_SECRET
 *
 * If neither is set, the route responds with `{ live: false, error:
 * 'unconfigured' }` so the widget can render an offline state instead of
 * blowing up.
 */

const HELIX = 'https://api.twitch.tv/helix';
const OAUTH = 'https://id.twitch.tv/oauth2/token';
const STATUS_CACHE_MS = 60_000;

let appToken = null; // { token, expiresAt }
const statusCache = new Map(); // channel → { payload, expiresAt }

export function registerTwitchRoutes(app) {
  app.get('/api/twitch/status/:channel', async (req, res) => {
    const channel = (req.params.channel || '').toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!channel) return res.status(400).json({ live: false, error: 'bad_channel' });

    const hit = statusCache.get(channel);
    if (hit && hit.expiresAt > Date.now()) {
      res.set('Cache-Control', 'public, max-age=30');
      return res.json(hit.payload);
    }

    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
      const payload = { live: false, error: 'unconfigured' };
      statusCache.set(channel, { payload, expiresAt: Date.now() + STATUS_CACHE_MS });
      return res.json(payload);
    }

    try {
      const token = await ensureAppToken();
      const headers = {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
      };

      // Fetch the user (so we can show avatar + display_name even when offline)
      // and the live stream in parallel.
      const [userRes, streamRes] = await Promise.all([
        fetch(`${HELIX}/users?login=${encodeURIComponent(channel)}`, { headers }),
        fetch(`${HELIX}/streams?user_login=${encodeURIComponent(channel)}`, { headers }),
      ]);

      // Token expired between cache hit and request — clear and bail with a
      // friendly response. Caller will retry on next render.
      if (userRes.status === 401 || streamRes.status === 401) {
        appToken = null;
        const payload = { live: false, error: 'auth' };
        statusCache.set(channel, { payload, expiresAt: Date.now() + 5_000 });
        return res.json(payload);
      }

      if (!userRes.ok) throw new Error(`users ${userRes.status}`);
      if (!streamRes.ok) throw new Error(`streams ${streamRes.status}`);

      const userData = (await userRes.json()).data?.[0];
      const streamData = (await streamRes.json()).data?.[0];

      const payload = streamData
        ? {
            live: true,
            title: streamData.title,
            game: streamData.game_name,
            viewers: streamData.viewer_count,
            thumbnail: (streamData.thumbnail_url || '')
              .replace('{width}', '320')
              .replace('{height}', '180'),
            startedAt: streamData.started_at,
            login: userData?.login || channel,
            displayName: userData?.display_name || channel,
            avatar: userData?.profile_image_url || '',
          }
        : {
            live: false,
            login: userData?.login || channel,
            displayName: userData?.display_name || channel,
            avatar: userData?.profile_image_url || '',
          };

      statusCache.set(channel, { payload, expiresAt: Date.now() + STATUS_CACHE_MS });
      res.set('Cache-Control', 'public, max-age=30');
      res.json(payload);
    } catch (err) {
      console.error('[twitch] status fetch failed:', err.message);
      const payload = { live: false, error: 'fetch_failed' };
      // Short cache on errors so we don't keep hammering Twitch but recover
      // quickly once they're back.
      statusCache.set(channel, { payload, expiresAt: Date.now() + 15_000 });
      res.json(payload);
    }
  });
}

async function ensureAppToken() {
  if (appToken && appToken.expiresAt > Date.now() + 60_000) return appToken.token;

  const body = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: 'client_credentials',
  });
  const r = await fetch(OAUTH, { method: 'POST', body });
  if (!r.ok) throw new Error(`twitch oauth ${r.status}`);
  const json = await r.json();
  appToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in || 3600) * 1000,
  };
  return appToken.token;
}
