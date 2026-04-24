import { useMusic } from '../../utils/MusicContext.jsx';
import { formatTime } from '../../utils/music.js';

/**
 * Shows the playback progress of the profile music.
 *
 * - For native audio and YouTube (via IFrame API) we have a real currentTime
 *   and duration, so the bar is seekable.
 * - For Spotify / SoundCloud we can't read back position, so we render the
 *   widget in a disabled state with a friendly message.
 *
 * Prev/Next are visual — we don't have a playlist concept on client-side.
 * They feel right in a music widget and may be hooked to real actions later.
 */
export default function MusicProgressWidget({ widget, accent }) {
  const { playing, currentTime, duration, canSeek, controls, meta } = useMusic();
  const { showControls, showTime } = widget.data;

  const accentColor = accent || '#5865F2';
  const hasRealTime = duration > 0;
  const progressPct = hasRealTime ? (currentTime / duration) * 100 : 0;

  const onSeek = (e) => {
    if (!canSeek || !hasRealTime) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    controls.seek(Math.max(0, Math.min(1, pct)) * duration);
  };

  return (
    <div className="flex h-full w-full flex-col justify-center gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="eyebrow" style={{ color: 'currentColor' }}>
            {playing ? 'Now playing' : 'Paused'}
          </div>
          <div
            className="mt-0.5 truncate text-sm font-semibold tracking-tight"
            style={{ color: 'currentColor' }}
          >
            {meta.title || widget.data.trackTitle || '—'}
          </div>
          {(meta.artist || widget.data.artist) && (
            <div
              className="truncate text-[11px] font-light"
              style={{ color: 'currentColor', opacity: 0.55 }}
            >
              {meta.artist || widget.data.artist}
            </div>
          )}
        </div>

        {showControls && (
          <div className="flex items-center gap-2">
            <IconBtn
              onClick={(e) => {
                e.stopPropagation();
                controls.prev();
              }}
              label="Previous"
            >
              <PrevIcon />
            </IconBtn>
            <IconBtn
              onClick={(e) => {
                e.stopPropagation();
                controls.toggle();
              }}
              label={playing ? 'Pause' : 'Play'}
              primary
              color={accentColor}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </IconBtn>
            <IconBtn
              onClick={(e) => {
                e.stopPropagation();
                controls.next();
              }}
              label="Next"
            >
              <NextIcon />
            </IconBtn>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onSeek(e);
        }}
        className={[
          'relative h-1 w-full overflow-hidden rounded-full bg-white/10',
          canSeek ? 'cursor-pointer' : 'cursor-not-allowed opacity-70',
        ].join(' ')}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
          style={{
            width: `${progressPct}%`,
            background: accentColor,
          }}
        />
      </div>

      {showTime && (
        <div
          className="flex items-center justify-between text-[10px] font-medium tabular-nums"
          style={{ color: 'currentColor', opacity: 0.5 }}
        >
          <span>{hasRealTime ? formatTime(currentTime) : '—:—'}</span>
          <span>
            {hasRealTime ? `-${formatTime(Math.max(0, duration - currentTime))}` : '—:—'}
          </span>
        </div>
      )}
    </div>
  );
}

function IconBtn({ children, onClick, label, primary, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={label}
      className={[
        'flex items-center justify-center rounded-full transition',
        primary
          ? 'h-8 w-8 text-white shadow-[0_0_20px_rgba(88,101,242,0.35)]'
          : 'h-7 w-7 text-white/70 hover:bg-white/10 hover:text-white',
      ].join(' ')}
      style={primary ? { background: color } : undefined}
    >
      {children}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}
function PrevIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zM9.5 12l10-6v12z" />
    </svg>
  );
}
function NextIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6h2v12h-2zM14.5 12l-10-6v12z" />
    </svg>
  );
}
