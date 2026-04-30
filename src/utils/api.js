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

/* -------- Discord OAuth -------- */

/** Absolute URL to kick off Discord sign-in / sign-up. */
export function discordConnectUrl() {
  const base = api.defaults.baseURL.startsWith('http')
    ? api.defaults.baseURL
    : window.location.origin + api.defaults.baseURL;
  return `${base}/auth/discord`;
}

/**
 * Returns { discordId, username, avatarUrl } for the linked Discord account,
 * or `null` if the caller hasn't linked Discord (or isn't authenticated).
 */
export async function getDiscordImport() {
  try {
    const { data } = await api.get('/auth/discord/import');
    return data;
  } catch {
    return null;
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

/* -------- Analytics -------- */

/** Fire-and-forget — never throws. */
export function recordView(slug) {
  api.post('/views', { slug }).catch(() => {});
}

export function recordClick(slug, { kind, target }) {
  api.post('/clicks', { slug, kind, target }).catch(() => {});
}

export async function getMyAnalytics(days = 7) {
  try {
    const { data } = await api.get(`/profiles/me/analytics?days=${days}`);
    return data;
  } catch {
    return null;
  }
}

/* -------- Admin -------- */

/**
 * Fetches the admin dashboard payload. Returns null on 401/403 so the
 * caller (a route guard) can redirect without rendering data.
 */
export async function getAdminStats() {
  try {
    const { data } = await api.get('/admin/stats');
    return data;
  } catch (err) {
    const status = err.response?.status;
    if (status === 401 || status === 403) return null;
    throw err;
  }
}

/* -------- Versions -------- */

export async function listMyVersions() {
  try {
    const { data } = await api.get('/profiles/me/versions');
    return data?.versions || [];
  } catch {
    return [];
  }
}

export async function restoreVersion(id) {
  const { data } = await api.post(`/profiles/me/versions/${id}/restore`);
  return data;
}

/* -------- Import -------- */

export async function importLinktree(url) {
  const { data } = await api.post('/import', { source: 'linktree', url });
  return data;
}

/* -------- Q&A (anonymous) -------- */

/** Submit an anonymous question to a profile. Pass an hCaptcha token when
 *  available. Returns true on accepted/silently-accepted, throws on real
 *  validation errors so the UI can show them. */
export async function sendQuestion(slug, body, captchaToken) {
  const { data } = await api.post(
    `/questions/${slug}`,
    { body, captcha: captchaToken },
    { headers: captchaToken ? { 'X-Captcha-Token': captchaToken } : undefined },
  );
  return !!data?.ok;
}

/** Public list of answered questions for a profile. Cursor-paginated. */
export async function listAnsweredQuestions(slug, { limit = 20, cursor } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const { data } = await api.get(`/questions/${slug}?${params.toString()}`);
    return data || { items: [], nextCursor: null };
  } catch {
    return { items: [], nextCursor: null };
  }
}

/** Authenticated owner inbox. */
export async function listMyQuestions({ status = 'PENDING', limit = 20, cursor } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('status', status);
    params.set('limit', String(limit));
    if (cursor) params.set('cursor', cursor);
    const { data } = await api.get(`/profiles/me/questions?${params.toString()}`);
    return data || { items: [], nextCursor: null, counts: { pending: 0 } };
  } catch {
    return { items: [], nextCursor: null, counts: { pending: 0 } };
  }
}

export async function answerQuestion(id, answer) {
  const { data } = await api.post(`/questions/${id}/answer`, { answer });
  return data;
}
export async function hideQuestion(id) {
  await api.post(`/questions/${id}/hide`);
}
export async function deleteQuestion(id) {
  await api.delete(`/questions/${id}`);
}
export async function blockAsker(id) {
  await api.post(`/questions/${id}/block-asker`);
}

/* -------- Social: follows + guestbook -------- */

export async function follow(slug) {
  const { data } = await api.post(`/follow/${slug}`);
  return data;
}
export async function unfollow(slug) {
  const { data } = await api.delete(`/follow/${slug}`);
  return data;
}
export async function getFollowState(slug) {
  try {
    const { data } = await api.get(`/follow/${slug}`);
    return data; // { following, count }
  } catch {
    return { following: false, count: 0 };
  }
}
export async function getMyFollowing() {
  try {
    const { data } = await api.get('/profiles/me/following');
    return data?.following || [];
  } catch {
    return [];
  }
}

export async function listGuestbook(slug) {
  try {
    const { data } = await api.get(`/guestbook/${slug}`);
    return data?.entries || [];
  } catch {
    return [];
  }
}
export async function postGuestbook(slug, message) {
  const { data } = await api.post(`/guestbook/${slug}`, { message });
  return data;
}
export async function deleteGuestbookEntry(slug, entryId) {
  const { data } = await api.delete(`/guestbook/${slug}/${entryId}`);
  return data;
}

export default api;
