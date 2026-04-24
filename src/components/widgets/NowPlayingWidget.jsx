import { useMusic } from '../../utils/MusicContext.jsx';
import { useSpotifyNowPlaying } from '../../hooks/useSpotifyNowPlaying.js';

/**
 * "Now playing" widget.
 *
 * Source priority:
 *   1. If the profile owner linked Spotify *and* something is playing → show
 *      the live Spotify track with album art.
 *   2. Else if the MusicContext reports an active track (audio/YouTube) →
 *      show the MusicPlayer metadata.
 *   3. Else fall back to the track/artist typed into the editor.
 *
 * The widget receives `ownerId` through the View.jsx render context so it
 * can poll the public Spotify endpoint.
 */
export default function NowPlayingWidget({ widget, musicPlaying, accent, ownerId }) {
  const { meta, playing } = useMusic();
  const { trackTitle, artist, syncFromPlayer } = widget.data;
  const bar = accent || '#5865F2';

  const spotify = useSpotifyNowPlaying(ownerId || null);
  const spotifyPlaying = spotify.state === 'playing';

  const isPlaying = spotifyPlaying || musicPlaying || playing;

  let displayTitle;
  let displayArtist;
  let albumArt = null;

  if (spotifyPlaying && spotify.data) {
    displayTitle = spotify.data.track;
    displayArtist = spotify.data.artist;
    albumArt = spotify.data.albumArt;
  } else if (syncFromPlayer && meta.title) {
    displayTitle = meta.title;
    displayArtist = meta.artist;
  } else {
    displayTitle = trackTitle || 'Untitled';
    displayArtist = artist || 'Unknown artist';
  }

  return (
    <div className="flex h-full w-full items-center gap-3 px-4">
      {albumArt ? (
        <img
          src={albumArt}
          alt={displayTitle}
          className="h-12 w-12 flex-shrink-0 rounded-md object-cover"
        />
      ) : (
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
      )}

      <div className="min-w-0 flex-1">
        <div className="eyebrow" style={{ color: 'currentColor' }}>
          {spotifyPlaying
            ? 'Spotify · live'
            : isPlaying
              ? 'Now playing'
              : 'Paused'}
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

      <style>{`
        @keyframes eq-0 { from { transform: scaleY(0.4);} to { transform: scaleY(1);} }
        @keyframes eq-1 { from { transform: scaleY(0.75);} to { transform: scaleY(0.3);} }
        @keyframes eq-2 { from { transform: scaleY(0.5);} to { transform: scaleY(0.9);} }
        @keyframes eq-3 { from { transform: scaleY(0.3);} to { transform: scaleY(0.75);} }
      `}</style>
    </div>
  );
}
