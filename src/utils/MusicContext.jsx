import { createContext, useContext } from 'react';

/**
 * Shared playback state, so any widget (e.g. the Now Playing bars or the
 * progress widget) can react to what the MusicPlayer is actually doing.
 *
 * Shape:
 *  - playing      boolean
 *  - currentTime  seconds elapsed (0 when unknown)
 *  - duration     total seconds (0 when unknown)
 *  - canSeek      whether the player supports seeking
 *  - controls     { play(), pause(), toggle(), seek(seconds), next(), prev() }
 *  - meta         { title, artist } — best-effort metadata about the track
 */
export const MusicContext = createContext({
  playing: false,
  currentTime: 0,
  duration: 0,
  canSeek: false,
  controls: {
    play: () => {},
    pause: () => {},
    toggle: () => {},
    seek: () => {},
    next: () => {},
    prev: () => {},
  },
  meta: { title: '', artist: '' },
});

export function useMusic() {
  return useContext(MusicContext);
}
