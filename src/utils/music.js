/**
 * Music source detection & helpers.
 *
 * Supported input shapes:
 *  - direct audio file URL (.mp3 / .ogg / .wav / .m4a / .flac)
 *  - YouTube URL or bare 11-char video id
 *  - Spotify track / playlist / album URL
 *  - SoundCloud embed URL (the `w.soundcloud.com/player` variant)
 *  - Plain text → treated as "artist - song title" search intent
 *
 * The MusicPlayer uses `detectMusicSource` to decide how to render and
 * whether programmatic progress is available.
 */

const AUDIO_EXT = /\.(mp3|ogg|wav|m4a|flac|aac)(\?|#|$)/i;

export function detectMusicSource(input) {
  const raw = (input || '').trim();
  if (!raw) return { kind: 'empty', src: '' };

  // Bare YouTube id (11 chars alphanum + - + _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) {
    return { kind: 'youtube', id: raw, src: raw, progressAvailable: true };
  }

  // Obvious audio file by extension
  if (AUDIO_EXT.test(raw) && /^https?:\/\//i.test(raw)) {
    return { kind: 'audio', src: raw, progressAvailable: true };
  }

  // YouTube variants
  const ytMatch =
    raw.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    raw.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    raw.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/) ||
    raw.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return { kind: 'youtube', id: ytMatch[1], src: raw, progressAvailable: true };
  }

  // Spotify (track / playlist / album / episode)
  const spotifyMatch = raw.match(
    /open\.spotify\.com\/(track|playlist|album|episode)\/([a-zA-Z0-9]+)/,
  );
  if (spotifyMatch) {
    return {
      kind: 'spotify',
      entity: spotifyMatch[1],
      id: spotifyMatch[2],
      src: raw,
      progressAvailable: false,
    };
  }

  // SoundCloud embed URL
  if (/soundcloud\.com/.test(raw)) {
    return { kind: 'soundcloud', src: raw, progressAvailable: false };
  }

  // Any other URL — try as a direct audio stream (better than nothing)
  if (/^https?:\/\//i.test(raw)) {
    return { kind: 'audio', src: raw, progressAvailable: true };
  }

  // Plain text → treat as a search query (artist + title)
  return {
    kind: 'search',
    src: raw,
    query: raw,
    progressAvailable: false,
    searchUrl: youtubeSearchUrl(raw),
    spotifyUrl: spotifySearchUrl(raw),
  };
}

export function youtubeSearchUrl(q) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}

export function spotifySearchUrl(q) {
  return `https://open.spotify.com/search/${encodeURIComponent(q)}`;
}

export function spotifyEmbedUrl(entity, id) {
  // `utm_source=generator` is the pattern used by Spotify's share button.
  return `https://open.spotify.com/embed/${entity}/${id}?utm_source=generator`;
}

/** Format a seconds count as `mm:ss` (or `h:mm:ss` if ≥ 1h). */
export function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
