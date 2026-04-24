import { useMusic } from '../../utils/MusicContext.jsx';

/**
 * "Now playing" widget. The bars animate while music is actually playing.
 * When `syncFromPlayer` is on, the title/artist are pulled from the
 * MusicContext (useful for the View page where the player knows the track).
 * Otherwise we fall back to the values typed in the editor.
 */
export default function NowPlayingWidget({ widget, musicPlaying, accent }) {
  const { meta, playing } = useMusic();
  const { trackTitle, artist, syncFromPlayer } = widget.data;
  const bar = accent || '#5865F2';

  // The two "playing" signals — prop and context — should agree in practice.
  const isPlaying = musicPlaying || playing;

  const displayTitle = syncFromPlayer && meta.title ? meta.title : trackTitle || 'Untitled';
  const displayArtist = syncFromPlayer && meta.artist ? meta.artist : artist || 'Unknown artist';

  return (
    <div className="flex h-full w-full items-center gap-3 px-4">
      <div className="flex items-end gap-0.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="block w-1 rounded-full"
            style={{
              height: '18px',
              background: bar,
              opacity: isPlaying ? 0.9 : 0.3,
              transform: isPlaying ? undefined : 'scaleY(0.45)',
              animation: isPlaying
                ? `eq-${i} 900ms ${i * 110}ms ease-in-out infinite alternate`
                : 'none',
              transformOrigin: 'bottom',
            }}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="eyebrow" style={{ color: 'currentColor' }}>
          {isPlaying ? 'Now playing' : 'Paused'}
        </div>
        <div
          className="truncate text-sm font-semibold tracking-tight"
          style={{ color: 'currentColor' }}
        >
          {displayTitle}
        </div>
        <div
          className="truncate text-[11px] font-light"
          style={{ color: 'currentColor', opacity: 0.55 }}
        >
          {displayArtist}
        </div>
      </div>

      {/*
        Inline keyframes for the equaliser bars.
        Scoped names so they don't clash with other animations.
      */}
      <style>{`
        @keyframes eq-0 { from { transform: scaleY(0.4);} to { transform: scaleY(1);} }
        @keyframes eq-1 { from { transform: scaleY(0.75);} to { transform: scaleY(0.3);} }
        @keyframes eq-2 { from { transform: scaleY(0.5);} to { transform: scaleY(0.9);} }
        @keyframes eq-3 { from { transform: scaleY(0.3);} to { transform: scaleY(0.75);} }
      `}</style>
    </div>
  );
}
