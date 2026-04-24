import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MusicContext } from '../utils/MusicContext.jsx';
import { detectMusicSource, spotifyEmbedUrl, youtubeSearchUrl, spotifySearchUrl } from '../utils/music.js';

/**
 * Multi-source music player.
 *
 * - Wraps its children in a MusicContext so any widget (Now Playing, Music
 *   Progress…) can reflect playback state.
 * - Renders a discreet floating control pill in the bottom-right.
 * - Sources supported:
 *     audio     → native <audio>; full progress + seek
 *     youtube   → YouTube IFrame API; play/pause + progress + seek
 *     spotify   → Spotify embed iframe; no progress available
 *     soundcloud→ SoundCloud iframe; no progress
 *     search    → plain text → shows a button linking to YouTube/Spotify
 *                 search so the user can switch to a resolvable URL
 *
 * Browser autoplay policies are respected: if .play() is rejected, we wait
 * for an explicit user gesture (the "Play music" pill).
 */
export default function MusicPlayer({ music, accent, hideControls, children }) {
  const source = useMemo(() => detectMusicSource(music.src), [music.src]);
  const ringColor = accent || '#5865F2';

  const [playing, setPlaying] = useState(false);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(music.volume ?? 0.35);
  const [ytMeta, setYtMeta] = useState({ title: '', artist: '' });

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytContainerRef = useRef(null);
  const ytReadyRef = useRef(false);

  // ---------------- native audio ----------------
  useEffect(() => {
    if (!music.enabled) return;
    if (source.kind !== 'audio') return;
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('loadedmetadata', onLoadedMeta);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    if (music.autoplay && !hideControls) {
      el.play()
        .then(() => setNeedsGesture(false))
        .catch(() => setNeedsGesture(true));
    }

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('loadedmetadata', onLoadedMeta);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [source.kind, music.src, music.enabled, music.autoplay, volume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (ytPlayerRef.current?.setVolume) {
      try {
        ytPlayerRef.current.setVolume(Math.round(volume * 100));
      } catch { /* ignore */ }
    }
  }, [volume]);

  // ---------------- YouTube IFrame API ----------------
  useEffect(() => {
    if (!music.enabled) return;
    if (source.kind !== 'youtube') return;
    let cancelled = false;

    const ensureApi = () =>
      new Promise((resolve) => {
        if (window.YT?.Player) return resolve(window.YT);
        const existing = document.getElementById('yt-iframe-api');
        if (!existing) {
          const tag = document.createElement('script');
          tag.id = 'yt-iframe-api';
          tag.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(tag);
        }
        const check = setInterval(() => {
          if (window.YT?.Player) {
            clearInterval(check);
            resolve(window.YT);
          }
        }, 100);
      });

    ensureApi().then((YT) => {
      if (cancelled || !ytContainerRef.current) return;
      ytReadyRef.current = false;
      ytContainerRef.current.innerHTML = '';
      const host = document.createElement('div');
      host.id = `yt-host-${Math.random().toString(36).slice(2, 9)}`;
      ytContainerRef.current.appendChild(host);

      ytPlayerRef.current = new YT.Player(host.id, {
        videoId: source.id,
        playerVars: {
          autoplay: (music.autoplay && !hideControls) ? 1 : 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
          enablejsapi: 1,
          widget_referrer: window.location.origin
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            ytReadyRef.current = true;
            e.target.setVolume(Math.round(volume * 100));
            setDuration(e.target.getDuration() || 0);
            try {
              const data = e.target.getVideoData();
              if (data) setYtMeta({ title: data.title, artist: data.author });
            } catch (err) { }

            if (music.autoplay && !hideControls) {
              // YouTube's playVideo() doesn't return a promise.
              // We'll call it and then check if it's actually playing after a short delay.
              setTimeout(() => {
                try {
                  e.target.playVideo();
                } catch (err) {
                  setNeedsGesture(true);
                }
              }, 500);

              setTimeout(() => {
                if (!cancelled && !playing && ytReadyRef.current) {
                  const state = ytPlayerRef.current?.getPlayerState();
                  // state 1 = PLAYING
                  if (state !== 1) {
                    setNeedsGesture(true);
                  }
                }
              }, 2500);
            }
          },
          onStateChange: (e) => {
            if (cancelled) return;
            const YTStates = window.YT.PlayerState;
            if (e.data === YTStates.PLAYING) {
              setPlaying(true);
              setNeedsGesture(false);
              setDuration(e.target.getDuration() || 0);
              try {
                const data = e.target.getVideoData();
                if (data) setYtMeta({ title: data.title, artist: data.author });
              } catch (err) {}
            } else if (e.data === YTStates.PAUSED || e.data === YTStates.ENDED) {
              setPlaying(false);
            }
          },
          onError: (err) => {
            console.error('YouTube Player Error:', err.data);
            setNeedsGesture(true);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      try { ytPlayerRef.current?.destroy?.(); } catch { }
      ytPlayerRef.current = null;
      ytReadyRef.current = false;
    };
  }, [source.kind, source.id, music.enabled, music.autoplay]);

  useEffect(() => {
    if (source.kind !== 'youtube') return;
    const id = setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p || !ytReadyRef.current) return;
      try { setCurrentTime(p.getCurrentTime() || 0); } catch { }
    }, 500);
    return () => clearInterval(id);
  }, [source.kind]);

  // ---------------- Controls ----------------
  const play = useCallback(() => {
    if (source.kind === 'audio') {
      audioRef.current?.play().then(() => setNeedsGesture(false)).catch(() => setNeedsGesture(true));
    } else if (source.kind === 'youtube') {
      try {
        ytPlayerRef.current?.playVideo();
        setNeedsGesture(false);
      } catch { setNeedsGesture(true); }
    } else if (source.kind === 'spotify' || source.kind === 'soundcloud') {
      setPlaying(true);
    }
  }, [source.kind]);

  const pause = useCallback(() => {
    if (source.kind === 'audio') audioRef.current?.pause();
    else if (source.kind === 'youtube') {
      try { ytPlayerRef.current?.pauseVideo(); } catch { }
    } else setPlaying(false);
  }, [source.kind]);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);

  const seek = useCallback((sec) => {
    if (source.kind === 'audio' && audioRef.current) {
      audioRef.current.currentTime = sec;
      setCurrentTime(sec);
    } else if (source.kind === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(sec, true); setCurrentTime(sec); } catch { }
    }
  }, [source.kind]);

  const prev = useCallback(() => {
    if (source.kind === 'audio' && audioRef.current) audioRef.current.currentTime = 0;
    else if (source.kind === 'youtube' && ytPlayerRef.current) {
      try { ytPlayerRef.current.seekTo(0, true); } catch { }
    }
    setCurrentTime(0);
  }, [source.kind]);

  const next = useCallback(() => {}, []);

  // ---------------- Context value ----------------
  const ctxValue = useMemo(() => ({
    playing,
    currentTime,
    duration,
    canSeek: source.kind === 'audio' || source.kind === 'youtube',
    controls: { play, pause, toggle, seek, prev, next },
    meta: { 
      title: (source.kind === 'youtube' && ytMeta.title) || music.trackTitle || '', 
      artist: (source.kind === 'youtube' && ytMeta.artist) || music.artist || '' 
    },
  }), [playing, currentTime, duration, source.kind, play, pause, toggle, seek, prev, next, music.trackTitle, music.artist, ytMeta]);

  const showControlPill = 
    !hideControls && 
    music.enabled && 
    source.kind !== 'empty' && 
    source.kind !== 'search';

  return (
    <MusicContext.Provider value={ctxValue}>
      {children}

      {music.enabled && source.kind === 'audio' && (
        <audio ref={audioRef} src={source.src} loop preload="auto" className="hidden" />
      )}

      {music.enabled && source.kind === 'youtube' && (
        <div 
          ref={ytContainerRef} 
          aria-hidden 
          className="pointer-events-none fixed left-0 top-0 z-[100] h-[10px] w-[10px] overflow-hidden opacity-0"
          style={{ clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)' }}
        />
      )}

      {source.kind === 'spotify' && music.enabled && (
        <iframe title="spotify" src={spotifyEmbedUrl(source.entity, source.id)} width="0" height="80" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="origin" className="pointer-events-none fixed bottom-4 left-4 z-30 h-20 w-0 opacity-0" />
      )}

      {source.kind === 'soundcloud' && music.enabled && playing && (
        <iframe title="soundcloud" width="0" height="0" allow="autoplay" src={`${source.src}${source.src.includes('?') ? '&' : '?'}auto_play=true`} referrerPolicy="origin" className="pointer-events-none fixed opacity-0" />
      )}

      {music.enabled && source.kind === 'search' && <SearchFallbackPill query={source.query} />}

      {showControlPill && (
        <ControlPill
          playing={playing}
          needsGesture={needsGesture}
          volume={volume}
          onVolumeChange={setVolume}
          onToggle={toggle}
          kind={source.kind}
          accent={ringColor}
        />
      )}
    </MusicContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function ControlPill({ playing, needsGesture, volume, onVolumeChange, onToggle, kind, accent }) {
  return (
    <div className="pointer-events-auto fixed top-5 right-5 z-40 flex flex-col items-end gap-3">
      {needsGesture && !playing && (
        <button
          type="button"
          onClick={onToggle}
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/90 px-5 py-2.5 text-xs font-semibold text-white backdrop-blur-xl transition-all hover:bg-ink-700 hover:scale-105 active:scale-95 shadow-xl"
        >
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-ink-900" style={{ color: accent }}>
            <PlayIcon />
          </div>
          Play music
        </button>
      )}

      {(!needsGesture || playing) && (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-ink-800/80 p-2.5 backdrop-blur-2xl shadow-2xl transition-all duration-500">
          <button
            type="button"
            onClick={onToggle}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${
              playing ? 'bg-white text-ink-900' : 'bg-white/10 text-white hover:bg-white/20'
            } active:scale-90`}
            style={playing ? { backgroundColor: 'white', color: accent } : {}}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>

          {(kind === 'audio' || kind === 'youtube') && (
            <div className="relative flex h-32 w-10 items-center justify-center py-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="absolute h-1 w-24 cursor-pointer appearance-none bg-white/10 -rotate-90"
                style={{
                  width: '100px',
                  borderRadius: '2px',
                  accentColor: accent,
                }}
                aria-label="Volume"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchFallbackPill({ query }) {
  return (
    <div className="pointer-events-auto fixed top-5 right-5 z-40 flex items-center gap-2 rounded-full border border-white/10 bg-ink-800/80 px-4 py-2 text-xs text-white/80 backdrop-blur-md">
      <span className="opacity-70">Pick a URL for</span>
      <span className="max-w-[180px] truncate font-semibold">"{query}"</span>
      <a
        href={youtubeSearchUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-red-500/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-red-500"
      >
        YouTube
      </a>
      <a
        href={spotifySearchUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full bg-green-500/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-green-500"
      >
        Spotify
      </a>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}
