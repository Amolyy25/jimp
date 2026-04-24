import axios from 'axios';

/**
 * API client.
 *
 * We always hit `/api/*` on the same origin as the SPA:
 *   - in dev, Vite proxies `/api` to http://localhost:3001 (see vite.config.js)
 *   - in prod, Express serves the built SPA and mounts the API at /api
 *
 * `VITE_API_URL` is a manual override — set it at build time only when the
 * frontend and backend are on different origins (e.g. split Railway services).
 */
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

/* -------- Auth -------- */

export async function getMe() {
  try {
    const { data } = await api.get('/auth/me');
    return data.user;
  } catch {
    return null;
  }
}

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function register(username, email, password) {
  const { data } = await api.post('/auth/register', { username, email, password });
  return data;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    // Even if the server rejects (expired session), the cookie is cleared.
  }
}

/* -------- Profiles -------- */

export async function getProfileBySlug(slug) {
  try {
    const { data } = await api.get(`/profiles/${slug}`);
    return data;
  } catch {
    return null;
  }
}

/**
 * Returns the caller's profile + cooldown metadata, or `null` if they
 * haven't claimed a slug yet.
 *
 *   { id, slug, data, slugChangedAt, unlocksAt, remainingMs, locked, ... }
 */
export async function getMyProfile() {
  try {
    const { data } = await api.get('/profiles/me');
    return data;
  } catch {
    return null;
  }
}

export async function isSlugTaken(slug) {
  try {
    const { data } = await api.get(`/check-slug/${slug}`);
    return !data.available;
  } catch {
    return false;
  }
}

/**
 * Claims or updates the caller's profile.
 * Throws an error object enriched with `.cooldown` when the backend rejects
 * a slug change because the 7-day lock hasn't elapsed.
 */
export async function saveProfile(slug, profileData) {
  try {
    const { data } = await api.post('/profiles', { slug, data: profileData });
    return data;
  } catch (err) {
    const payload = err.response?.data;
    if (payload?.reason === 'cooldown') {
      const e = new Error(payload.error || 'Slug locked');
      e.cooldown = {
        unlocksAt: payload.unlocksAt,
        remainingMs: payload.remainingMs,
      };
      throw e;
    }
    throw new Error(payload?.error || 'Failed to save profile');
  }
}

/* -------- Spotify -------- */

export async function getSpotifyStatus() {
  try {
    const { data } = await api.get('/spotify/status');
    return data;
  } catch {
    return { connected: false };
  }
}

/** Returns the absolute URL to kick off Spotify OAuth. */
export function spotifyConnectUrl() {
  // Axios baseURL is relative (/api) in dev+prod — reconstruct an absolute
  // URL so the browser can actually navigate.
  const base = api.defaults.baseURL.startsWith('http')
    ? api.defaults.baseURL
    : window.location.origin + api.defaults.baseURL;
  return `${base}/spotify/connect`;
}

export async function disconnectSpotify() {
  await api.post('/spotify/disconnect');
}

export async function getSpotifyNowPlaying(userId) {
  try {
    const { data } = await api.get(`/spotify/now-playing/${userId}`);
    return data;
  } catch {
    return { is_playing: false };
  }
}

export default api;
