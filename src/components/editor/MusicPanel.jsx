import { useEffect, useState } from 'react';
import SliderInput from './controls/SliderInput.jsx';
import TextInput from './controls/TextInput.jsx';
import { detectMusicSource, youtubeSearchUrl, spotifySearchUrl } from '../../utils/music.js';
import {
  disconnectSpotify,
  getSpotifyStatus,
  spotifyConnectUrl,
} from '../../utils/api.js';

/**
 * Editor panel for auto-playing music.
 * Supports: direct audio URL, YouTube, Spotify, SoundCloud embed, or
 * plain-text search. We live-detect the input kind and surface either a
 * green "ready" badge or a search fallback with links out.
 */
export default function MusicPanel({ music, onChange, me }) {
  const source = detectMusicSource(music.src);

  return (
    <div className="space-y-4">
      <SpotifyConnectSection me={me} />

      <ToggleRow
        title="Enable music"
        subtitle="Plays on profile load (with autoplay fallback)."
        checked={!!music.enabled}
        onChange={(v) => onChange({ enabled: v })}
      />

      <TextInput
        label="Track URL or name"
        value={music.src}
        onChange={(v) => onChange({ src: v })}
        placeholder="https://… or 'Artist - Song title'"
      />

      <SourceStatus source={source} />

      <TextInput
        label="Track title"
        value={music.trackTitle}
        onChange={(v) => onChange({ trackTitle: v })}
        placeholder="Filled auto-magically for plain text input"
        filter
      />
      <TextInput
        label="Artist"
        value={music.artist}
        onChange={(v) => onChange({ artist: v })}
        placeholder="Artist name"
        filter
      />

      <ToggleRow
        title="Autoplay"
        subtitle="Falls back to a small 'play' pill if the browser blocks it."
        checked={!!music.autoplay}
        onChange={(v) => onChange({ autoplay: v })}
      />

      <SliderInput
        label="Default volume"
        min={0}
        max={1}
        step={0.01}
        value={music.volume ?? 0.35}
        onChange={(v) => onChange({ volume: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Spotify connect / disconnect                                                */
/* -------------------------------------------------------------------------- */

function SpotifyConnectSection({ me }) {
  const [status, setStatus] = useState({ connected: false, loading: true });

  useEffect(() => {
    if (!me) {
      setStatus({ connected: false, loading: false });
      return;
    }
    let cancelled = false;
    getSpotifyStatus().then((s) => {
      if (!cancelled) setStatus({ ...s, loading: false });
    });
    // Detect ?spotify=connected flag set by the OAuth callback redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.get('spotify')) {
      // Clean up the URL so the flag doesn't stick around.
      window.history.replaceState({}, '', window.location.pathname);
    }
    return () => {
      cancelled = true;
    };
  }, [me]);

  if (!me) return null;

  const onDisconnect = async () => {
    await disconnectSpotify();
    setStatus({ connected: false, loading: false });
  };

  return (
    <div className="rounded-xl border border-[#1db95433] bg-[#1db95410] p-3">
      <div className="mb-2 flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#1db954">
          <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.31-1.76-8.8-.97a.62.62 0 1 1-.28-1.22c3.82-.87 7.09-.5 9.73 1.12.3.18.39.57.21.86Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.66-6.78-2.13-9.96-1.16a.78.78 0 1 1-.45-1.5c3.63-1.1 8.14-.57 11.23 1.33.36.22.48.7.25 1.07Zm.1-2.83c-3.23-1.92-8.55-2.09-11.63-1.15a.94.94 0 1 1-.55-1.8c3.53-1.08 9.4-.88 13.13 1.33a.94.94 0 1 1-.95 1.62Z" />
        </svg>
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#1db954]">
          Live Spotify
        </span>
      </div>

      {status.loading ? (
        <p className="text-[11px] text-white/40">Checking…</p>
      ) : status.connected ? (
        <div className="space-y-2">
          <p className="text-[11px] text-white/60">
            Connected. Your profile will show what you're listening to in
            real time.
          </p>
          <button
            type="button"
            onClick={onDisconnect}
            className="rounded-md border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-white/60">
            Connect Spotify to show your current track live on your profile —
            album art, progress, direct link to the song.
          </p>
          <a
            href={spotifyConnectUrl()}
            className="inline-flex items-center gap-2 rounded-md bg-[#1db954] px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-black transition hover:brightness-110"
          >
            Connect Spotify →
          </a>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SourceStatus({ source }) {
  if (source.kind === 'empty') {
    return (
      <p className="text-[11px] leading-relaxed text-white/40">
        Paste a YouTube, Spotify, SoundCloud or direct audio URL — or just
        type <code>"Artist – Song title"</code> to look it up.
      </p>
    );
  }

  if (source.kind === 'search') {
    return (
      <div className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-5 items-center rounded-full bg-amber-500/20 px-2 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            Search needed
          </span>
          <span className="truncate text-[11px] text-white/60">"{source.query}"</span>
        </div>
        <p className="text-[11px] leading-relaxed text-white/40">
          Plain text can't be auto-resolved to a playable stream from the
          browser — open one of the services below, pick the track, then paste
          its share URL back into the field above.
        </p>
        <div className="flex gap-2">
          <a
            href={youtubeSearchUrl(source.query)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-red-500/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-red-500"
          >
            Search YouTube
          </a>
          <a
            href={spotifySearchUrl(source.query)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green-500/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-green-500"
          >
            Search Spotify
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-green-400/20 bg-green-400/5 px-3 py-2 text-[11px] text-green-200">
      <span className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-300" />
        Source detected:{' '}
        <span className="font-semibold uppercase tracking-wider">
          {labelFor(source.kind)}
        </span>
      </span>
      {!source.progressAvailable && (
        <span className="text-white/50">no progress/seek</span>
      )}
    </div>
  );
}

function labelFor(kind) {
  return (
    {
      audio: 'Audio',
      youtube: 'YouTube',
      spotify: 'Spotify',
      soundcloud: 'SoundCloud',
    }[kind] || kind
  );
}

/* -------------------------------------------------------------------------- */

function ToggleRow({ title, subtitle, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div>
        <div className="text-xs font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-white/40">{subtitle}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </label>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative h-6 w-10 rounded-full border transition',
        checked ? 'border-discord bg-discord' : 'border-white/10 bg-white/10',
      ].join(' ')}
    >
      <span
        className={[
          'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
