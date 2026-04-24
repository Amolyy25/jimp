import { useEffect, useState } from 'react';
import { useLanyard } from '../../hooks/useLanyard.js';

/**
 * Live Discord presence card, powered by Lanyard.
 *
 * Shows:
 *   - Avatar + global name + username with status dot (green/yellow/red/gray)
 *   - Custom status (first CUSTOM activity)
 *   - Current game activity (type 0) with elapsed timer
 *   - Spotify now playing (type 2) with album art + progress bar
 *
 * When the Lanyard user ID isn't set or the user isn't in the Lanyard
 * server, we render a friendly onboarding state.
 */

const STATUS_COLORS = {
  online: '#43b581',
  idle: '#faa61a',
  dnd: '#f04747',
  offline: '#747f8d',
};

export default function DiscordPresenceWidget({ widget, accent }) {
  const { userId, showActivity, showSpotify } = widget.data;
  const { state, data } = useLanyard(userId);

  if (!userId) {
    return <EmptyState message="Set your Discord user ID in the editor." />;
  }

  if (state === 'connecting' || !data) {
    return <EmptyState message="Connecting to Lanyard…" />;
  }

  if (state === 'error') {
    return <EmptyState message="Join the Lanyard Discord to enable presence." />;
  }

  const { discord_user, discord_status, activities, spotify, listening_to_spotify } = data;

  // Lanyard occasionally ships partial payloads (e.g. user not yet fully
  // indexed). Bail out defensively rather than crashing downstream
  // `avatarUrl(discord_user)` / BigInt coercion.
  if (!discord_user || !discord_user.id) {
    return <EmptyState message="Presence unavailable — is this user in the Lanyard server?" />;
  }

  // Lanyard's activity list contains games, custom status and Spotify. Pick
  // the first "rich presence" activity that isn't the custom status or
  // Spotify (type 4 and 2 respectively).
  const game = activities?.find((a) => a.type === 0);
  const customStatus = activities?.find((a) => a.type === 4);

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden px-4 py-3">
      {/* Header: avatar + user + status */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <img
            src={avatarUrl(discord_user)}
            alt={discord_user.username}
            className="h-10 w-10 rounded-full border border-white/10 object-cover"
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-black"
            style={{ background: STATUS_COLORS[discord_status] || STATUS_COLORS.offline }}
            title={discord_status}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="truncate text-sm font-semibold tracking-tight"
            style={{ color: 'currentColor' }}
          >
            {discord_user.global_name || discord_user.username}
          </div>
          <div
            className="truncate font-mono text-[10px] uppercase tracking-[0.18em]"
            style={{ color: 'currentColor', opacity: 0.45 }}
          >
            {customStatus?.state || `@${discord_user.username}`}
          </div>
        </div>
      </div>

      {/* Spotify */}
      {showSpotify && listening_to_spotify && spotify && (
        <SpotifyRow spotify={spotify} accent={accent} />
      )}

      {/* Game */}
      {showActivity && game && <ActivityRow activity={game} accent={accent} />}

      {/* Nothing happening — small placeholder so the box doesn't feel empty */}
      {!customStatus && !game && !(showSpotify && listening_to_spotify) && (
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
/* Assets + timers                                                             */
/* -------------------------------------------------------------------------- */

function avatarUrl(user) {
  if (!user?.id) return 'https://cdn.discordapp.com/embed/avatars/0.png';
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  try {
    const idx = (BigInt(user.id) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  } catch {
    return 'https://cdn.discordapp.com/embed/avatars/0.png';
  }
}

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

/** Returns elapsed time as `mm:ss` since `startMs`. Ticks every second. */
function useElapsed(startMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startMs) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startMs]);
  if (!startMs) return null;
  const secs = Math.max(0, Math.floor((now - startMs) / 1000));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Returns Spotify progress as a 0-100 percentage. Ticks every second. */
function useProgress(timestamps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timestamps?.start || !timestamps?.end) return;
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
