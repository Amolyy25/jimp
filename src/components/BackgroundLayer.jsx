import { useState } from 'react';

/**
 * Fullscreen background layer used on both /view and the editor canvas.
 *
 * Supports: image, direct-video file, or YouTube embed. A colour overlay
 * (with adjustable opacity) sits on top, so profile text stays readable on
 * bright backgrounds.
 */
export default function BackgroundLayer({ background }) {
  const [imageFailed, setImageFailed] = useState(false);

  const overlayStyle = {
    backgroundColor: background?.overlayColor || '#000',
    opacity: background?.overlayOpacity ?? 0.4,
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {background?.type === 'image' && background.image && !imageFailed && (
        <img
          src={background.image}
          alt=""
          onError={() => setImageFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {background?.type === 'video' && background.video && (
        <video
          src={background.video}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {background?.type === 'youtube' && background.youtubeId && (
        <div className="absolute inset-0">
          <iframe
            title="background"
            src={`https://www.youtube.com/embed/${background.youtubeId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${background.youtubeId}&modestbranding=1&playsinline=1&rel=0&showinfo=0`}
            allow="autoplay; encrypted-media"
            referrerPolicy="origin"
            frameBorder="0"
            className="absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 min-h-full min-w-full"
          />
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
