import { useEffect, useState } from 'react';

/**
 * Fullscreen background layer used on both /view and the editor canvas.
 *
 * Supports: image, direct-video file, or YouTube embed. A colour overlay
 * (with adjustable opacity) sits on top, so profile text stays readable on
 * bright backgrounds.
 */
export default function BackgroundLayer({ background, viewportFixed = false }) {
  const [imageFailed, setImageFailed] = useState(false);

  const overlayStyle = {
    backgroundColor: background?.overlayColor || '#000',
    opacity: background?.overlayOpacity ?? 0.4,
  };

  // When `viewportFixed` is true (used on /view), the layer is pinned to the
  // viewport so it stays full-screen even when the profile stack scrolls past
  // the fold on mobile. In the desktop editor canvas it stays `absolute` so
  // the bg lives inside the 16:9 canvas frame.
  // Inline `objectFit` is also required because Safari mobile occasionally
  // drops Tailwind's `object-cover` on `<video>`.
  const positionClass = viewportFixed ? 'fixed' : 'absolute';

  return (
    <div className={`pointer-events-none ${positionClass} inset-0 z-0 overflow-hidden`}>
      {background?.type === 'image' && background.image && !imageFailed && (
        <img
          src={background.image}
          alt=""
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      )}

      {background?.type === 'video' && background.video && (
        <video
          src={background.video}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      )}

      {background?.type === 'youtube' && background.youtubeId && (
        <div className="absolute inset-0">
          {/* Crop the iframe to fully cover portrait viewports: on a phone the
              16:9 iframe is letter-boxed unless we scale it up to match the
              container's aspect-ratio. We scale by max(viewport-w/9, viewport-h/16). */}
          <YoutubeCover youtubeId={background.youtubeId} />
        </div>
      )}

      {/* Subtle radial vignette — keeps widgets readable no matter the bg */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />

      <div className="absolute inset-0" style={overlayStyle} />
    </div>
  );
}

/**
 * YouTube background — covers the parent like `object-fit: cover` would, by
 * sizing the iframe to whichever of (parent-width × 16:9) or
 * (parent-height × 16:9) is larger, then centring it. Works for portrait
 * mobile (where a 16:9 iframe would otherwise letter-box).
 *
 * Tracks the parent's bounding box (not the viewport) so this also behaves
 * correctly inside the desktop editor canvas where the BG is `absolute`.
 */
function YoutubeCover({ youtubeId }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
  }, [youtubeId]);

  // We use 100% of the parent and let CSS aspect-ratio do the cover math via
  // `min-w` / `min-h` based on the viewport. To support both cases (fixed to
  // viewport, or scoped to a smaller parent), we set the iframe to fill the
  // parent and let an outer container CSS handle the cropping.
  return (
    <iframe
      title="background"
      src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&iv_load_policy=3&cc_load_policy=0&loop=1&playlist=${youtubeId}&modestbranding=1&playsinline=1&rel=0&showinfo=0`}
      allow="autoplay; encrypted-media"
      referrerPolicy="origin"
      frameBorder="0"
      onLoad={() => {
        window.setTimeout(() => setReady(true), 700);
      }}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500"
      style={{
        // Pick the larger of the viewport-derived covers so the 16:9 iframe
        // always fills the screen on both landscape and portrait. The 130%
        // bonus crops out YouTube's own UI bands at the iframe edges.
        width: 'max(130vw, calc(130vh * 16 / 9))',
        height: 'max(130vh, calc(130vw * 9 / 16))',
        opacity: ready ? 1 : 0,
      }}
    />
  );
}
