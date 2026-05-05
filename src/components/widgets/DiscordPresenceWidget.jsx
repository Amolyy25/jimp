import { useEffect, useState } from 'react';

/**
 * Live Discord presence card, powered by our own gateway bot.
 *
 * Backend pulls the presence from the bot's HTTP API on demand, with a
 * shared 30s in-memory cache + concurrent-request dedup. The widget on
 * the public profile (/:slug) hits the endpoint exactly ONCE on mount —
 * the editor's read-only status row is the only place that polls.
 *
 * Two render states:
 *   - inServer: true  → render the full status card
 *   - inServer: false → render a locked card with a "join the server" CTA
 *
 * The locked state means the bot can't see this user (they haven't joined
 * the persn.me Discord). Joining unlocks the live presence automatically.
 */

const STATUS_COLORS = {
  online: '#43b581',
  idle: '#faa61a',
  dnd: '#f04747',
  offline: '#747f8d',
};

const INVITE_URL = import.meta.env.VITE_DISCORD_INVITE || 'https://discord.gg/';

export default function DiscordPresenceWidget({ widget, accent }) {
  const { userId, showActivity, showSpotify } = widget.data;
  const { state, data } = useOwnPresence(userId);

  if (!userId) {
    return <EmptyState message="Set your Discord user ID in the editor." />;
  }

  if (state === 'loading' && !data) {
    return <EmptyState message="Loading…" />;
  }

  if (state === 'error') {
    return <EmptyState message="Couldn't load Discord presence." />;
  }

  if (data && data.inServer === false) {
    return <LockedCard accent={accent} />;
  }

  if (!data) {
    return <EmptyState message="Loading…" />;
  }

  return <PresenceCard data={data} accent={accent} showActivity={showActivity} showSpotify={showSpotify} />;
}

/* -------------------------------------------------------------------------- */
/* Polling hook                                                                */
/* -------------------------------------------------------------------------- */

function useOwnPresence(userId) {
  const [state, setState] = useState(userId ? 'loading' : 'idle');
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(null);
    if (!userId || !/^\d{15,22}$/.test(userId)) {
      setState('idle');
      return undefined;
    }
    setState('loading');

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/discord/presence/${userId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        if (cancelled) return;
        setData(payload);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        console.warn('[discord-presence] fetch failed:', err);
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { state, data };
}

/* -------------------------------------------------------------------------- */
/* Full card (inServer: true)                                                  */
/* -------------------------------------------------------------------------- */

function PresenceCard({ data, accent, showActivity, showSpotify }) {
  const { status, activities = [], spotify, avatar, username, display_name } = data;

  const game = activities.find((a) => a.type === 0);
  const customStatus = activities.find((a) => a.type === 4);

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
            alt={username || 'Discord user'}
            className="h-10 w-10 rounded-full border border-white/10 object-cover"
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black"
            style={{ background: STATUS_COLORS[status] || STATUS_COLORS.offline }}
            title={status || 'offline'}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-semibold tracking-tight"
            style={{ color: 'currentColor' }}
          >
            {display_name || username || 'Discord user'}
          </div>
          <div
            className="truncate font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'currentColor', opacity: 0.45 }}
          >
            {customStatus?.state || (username ? `@${username}` : '')}
          </div>
        </div>
      </div>

      {showSpotify && spotify && <SpotifyRow spotify={spotify} accent={accent} />}
      {showActivity && game && <ActivityRow activity={game} accent={accent} />}

      {!customStatus && !game && !(showSpotify && spotify) && (
        <div
          className="rounded-lg border border-dashed border-white/10 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{ color: 'currentColor', opacity: 0.35 }}
        >
          — not doing much right now —
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Locked card (inServer: false) — join CTA                                    */
/* -------------------------------------------------------------------------- */

function LockedCard({ accent }) {
  return (
    <div className="relative flex h-full w-full flex-col gap-3 overflow-hidden px-4 py-3">
      {/* Blurred placeholder */}
      <div className="flex items-center gap-3 blur-sm opacity-50 select-none pointer-events-none">
        <div className="relative">
          <div className="h-10 w-10 rounded-full border border-white/10 bg-white/[0.06]" />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black"
            style={{ background: STATUS_COLORS.offline }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="h-3 w-24 rounded bg-white/10" />
          <div className="mt-1.5 h-2 w-16 rounded bg-white/5" />
        </div>
      </div>

      {/* Centered overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center backdrop-blur-[2px]">
        <p
          className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: 'currentColor' }}
        >
          Active ton Discord Presence
        </p>
        <p
          className="text-[10px] leading-snug"
          style={{ color: 'currentColor', opacity: 0.55 }}
        >
          Rejoins le serveur persn.me pour afficher ton statut en temps réel
        </p>
        <a
          href={INVITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:brightness-110 active:scale-95"
          style={{ background: accent && accent.startsWith('linear-gradient(') ? accent : '#5865f2' }}
        >
          Rejoindre le serveur
          <span aria-hidden>→</span>
        </a>
        <a
          href="/help/discord-presence"
          className="font-mono text-[9px] uppercase tracking-[0.2em] underline-offset-2 transition hover:underline"
          style={{ color: 'currentColor', opacity: 0.45 }}
        >
          En savoir plus
        </a>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function EmptyState({ message }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="text-lg">🟣</span>
      <span
        className="font-mono text-[10px] uppercase tracking-[0.2em]"
        style={{ color: 'currentColor', opacity: 0.5 }}
      >
        {message}
      </span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SpotifyRow({ spotify, accent }) {
  const { track_id, song, artist, album_art_url, timestamps } = spotify;
  const progress = useProgress(timestamps);

  return (
    <a
      href={track_id ? `https://open.spotify.com/track/${track_id}` : '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg bg-[#1db95422] px-2 py-2 transition hover:bg-[#1db95433]"
    >
      {album_art_url && (
        <img
          src={album_art_url}
          alt={song}
          className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <SpotifyIcon />
          <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-[#1db954]">
            Spotify
          </span>
        </div>
        <div
          className="truncate text-[12px] font-semibold"
          style={{ color: 'currentColor' }}
        >
          {song}
        </div>
        <div
          className="truncate text-[10px]"
          style={{ color: 'currentColor', opacity: 0.55 }}
        >
          {artist}
        </div>
        {progress && (
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${progress}%`, background: accent || '#1db954' }}
            />
          </div>
        )}
      </div>
    </a>
  );
}

function ActivityRow({ activity, accent }) {
  const elapsed = useElapsed(activity.timestamps?.start);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-2 py-2">
      {activity.assets?.large_image ? (
        <img
          src={activityImageUrl(activity.application_id, activity.assets.large_image)}
          alt={activity.name}
          className="h-10 w-10 flex-shrink-0 rounded-md object-cover"
        />
      ) : (
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-base"
          style={{ background: `${accent || '#5865F2'}33` }}
        >
          🎮
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] uppercase tracking-[0.22em]" style={{ color: 'currentColor', opacity: 0.5 }}>
          Playing
        </div>
        <div className="truncate text-[12px] font-semibold" style={{ color: 'currentColor' }}>
          {activity.name}
        </div>
        {activity.details && (
          <div
            className="truncate text-[10px]"
            style={{ color: 'currentColor', opacity: 0.55 }}
          >
            {activity.details}
          </div>
        )}
        {elapsed && (
          <div
            className="mt-0.5 font-mono text-[9px] tabular-nums uppercase tracking-[0.18em]"
            style={{ color: 'currentColor', opacity: 0.4 }}
          >
            {elapsed} elapsed
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function activityImageUrl(appId, key) {
  if (!key) return '';
  if (key.startsWith('mp:')) {
    return `https://media.discordapp.net/${key.slice(3)}`;
  }
  if (key.startsWith('spotify:')) {
    return `https://i.scdn.co/image/${key.slice(8)}`;
  }
  return `https://cdn.discordapp.com/app-assets/${appId}/${key}.png`;
}

function useElapsed(startMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startMs) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startMs]);
  if (!startMs) return null;
  const secs = Math.max(0, Math.floor((now - startMs) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function useProgress(timestamps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timestamps?.start || !timestamps?.end) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [timestamps?.start, timestamps?.end]);
  if (!timestamps?.start || !timestamps?.end) return null;
  const total = timestamps.end - timestamps.start;
  const elapsed = now - timestamps.start;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

function SpotifyIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="#1db954">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.59 14.42a.62.62 0 0 1-.86.21c-2.35-1.44-5.31-1.76-8.8-.97a.62.62 0 1 1-.28-1.22c3.82-.87 7.09-.5 9.73 1.12.3.18.39.57.21.86Zm1.22-2.72a.78.78 0 0 1-1.07.26c-2.69-1.66-6.78-2.13-9.96-1.16a.78.78 0 1 1-.45-1.5c3.63-1.1 8.14-.57 11.23 1.33.36.22.48.7.25 1.07Zm.1-2.83c-3.23-1.92-8.55-2.09-11.63-1.15a.94.94 0 1 1-.55-1.8c3.53-1.08 9.4-.88 13.13 1.33a.94.94 0 1 1-.95 1.62Z" />
    </svg>
  );
}
