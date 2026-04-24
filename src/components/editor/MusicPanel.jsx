import SliderInput from './controls/SliderInput.jsx';
import TextInput from './controls/TextInput.jsx';
import { detectMusicSource, youtubeSearchUrl, spotifySearchUrl } from '../../utils/music.js';

/**
 * Editor panel for auto-playing music.
 * Supports: direct audio URL, YouTube, Spotify, SoundCloud embed, or
 * plain-text search. We live-detect the input kind and surface either a
 * green "ready" badge or a search fallback with links out.
 */
export default function MusicPanel({ music, onChange }) {
  const source = detectMusicSource(music.src);

  return (
    <div className="space-y-4">
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
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}
