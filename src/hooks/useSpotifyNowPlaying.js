import { useEffect, useRef, useState } from 'react';
import { getSpotifyNowPlaying } from '../utils/api.js';

/**
 * Polls `/api/spotify/now-playing/:userId` on a short cadence.
 *
 * Returns `{ state, data }` where state is:
 *   'idle'         — no userId
 *   'loading'      — first fetch in flight
 *   'disconnected' — user has not linked Spotify
 *   'idle-playback'— connected but nothing is playing right now
 *   'playing'      — a track is playing; `data` is the track info
 *
 * Polls every 15s, and briefly faster (2s) when a track is playing so the
 * progress bar stays tight.
 */
export function useSpotifyNowPlaying(userId) {
  const [state, setState] = useState(userId ? 'loading' : 'idle');
  const [data, setData] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!userId) {
      setState('idle');
      return;
    }
    let cancelled = false;

    const poll = async () => {
      const r = await getSpotifyNowPlaying(userId);
      if (cancelled) return;

      if (!r?.connected) {
        setData(null);
        setState('disconnected');
      } else if (!r.is_playing || !r.track) {
        setData(null);
        setState('idle-playback');
      } else {
        setData(r);
        setState('playing');
      }

      const nextDelay = r?.is_playing ? 2000 : 15_000;
      timerRef.current = setTimeout(poll, nextDelay);
    };

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [userId]);

  return { state, data };
}
