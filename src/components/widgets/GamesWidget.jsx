import { useRef, useState } from 'react';

/**
 * Grid of game covers with name + optional rank / level.
 * Each card can carry:
 *   - `profileUrl`  clicking opens it in a new tab (Steam, RiotID, tracker…)
 *   - `clipUrl`     a short mp4 played on hover, replacing the cover
 * Cover images fall back to a gradient placeholder if they can't load.
 */
export default function GamesWidget({ widget }) {
  const games = widget.data.games || [];

  if (!games.length) {
    return (
      <Shell>
        <div className="flex h-full items-center justify-center px-4 pb-4 text-xs opacity-50">
          No games yet
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="grid h-full grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2.5 overflow-y-auto thin-scroll px-4 pb-4">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </Shell>
  );
}

function GameCard({ game }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const videoRef = useRef(null);

  const isYouTube = (url) => /youtube\.com|youtu\.be/.test(url);
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  };

  const onEnter = () => {
    setHovered(true);
    if (videoRef.current && !isYouTube(game.clipUrl)) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };
  const onLeave = () => {
    setHovered(false);
    if (videoRef.current && !isYouTube(game.clipUrl)) {
      videoRef.current.pause();
    }
  };

  const clickable = !!game.profileUrl;
  const hasClip = !!game.clipUrl;
  const Tag = clickable ? 'a' : 'div';
  const anchorProps = clickable
    ? {
        href: game.profileUrl,
        target: '_blank',
        rel: 'noopener noreferrer',
        onPointerDown: (e) => e.stopPropagation(),
      }
    : {};

  return (
    <Tag
      {...anchorProps}
      onMouseEnter={hasClip ? onEnter : undefined}
      onMouseLeave={hasClip ? onLeave : undefined}
      className={[
        'group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/5 bg-ink-700',
        'transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-white/15',
        clickable ? 'cursor-pointer' : '',
      ].join(' ')}
    >
      {/* Cover */}
      {game.cover && !coverFailed ? (
        <img
          src={game.cover}
          alt={game.name}
          onError={() => setCoverFailed(true)}
          className={[
            'h-full w-full object-cover transition-transform duration-500',
            hasClip && hovered ? 'opacity-0' : 'group-hover:scale-105',
          ].join(' ')}
          loading="lazy"
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-discord/40 via-indigo-600/30 to-fuchsia-500/20" />
      )}

      {/* Clip */}
      {hasClip && (
        <div
          className={[
            'absolute inset-0 h-full w-full transition-opacity duration-500',
            hovered ? 'opacity-100' : 'opacity-0 pointer-events-none',
          ].join(' ')}
        >
          {isYouTube(game.clipUrl) ? (
            <iframe
              src={`https://www.youtube.com/embed/${getYouTubeId(game.clipUrl)}?autoplay=${hovered ? 1 : 0}&mute=1&controls=0&loop=1&playlist=${getYouTubeId(game.clipUrl)}`}
              className="h-full w-full border-none"
              allow="autoplay; encrypted-media"
            />
          ) : (
            <video
              ref={videoRef}
              src={game.clipUrl}
              muted
              loop
              playsInline
              preload="none"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-2">
        <div className="flex items-center gap-1.5">
          <div className="truncate text-[12px] font-semibold tracking-tight text-white">
            {game.name || 'Game'}
          </div>
          {clickable && <ExternalArrow />}
        </div>
        {game.rank && <div className="eyebrow mt-0.5 text-white/50">{game.rank}</div>}
      </div>

      {hasClip && (
        <span className="absolute right-2 top-2 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">
          ▶ clip
        </span>
      )}
    </Tag>
  );
}

function ExternalArrow() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      className="text-white/60"
    >
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

function Shell({ children }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="eyebrow px-4 pb-2 pt-3" style={{ color: 'currentColor' }}>
        Playing
      </div>
      {children}
    </div>
  );
}
