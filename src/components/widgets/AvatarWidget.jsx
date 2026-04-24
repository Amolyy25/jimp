import { useState, useMemo } from 'react';
import { useScrambleText } from '../../hooks/useScrambleText.js';

/**
 * Avatar + identity block.
 * Floating avatar with the pseudo in large weight-600 type and a small,
 * letter-spaced bio underneath. Optional Nitro badge sits next to the name.
 * A pulsing ring surrounds the avatar while music plays.
 */
export default function AvatarWidget({ widget, musicPlaying, accent }) {
  const { 
    layout = 'center', 
    textAlign = 'center',
    textEffect = 'none', 
    username, 
    bio, 
    avatarUrl, 
    hasNitro, 
    pulseWhenPlaying 
  } = widget.data;
  const [imgFailed, setImgFailed] = useState(false);
  const ringColor = accent || '#5865F2';
  
  const scrambledName = useScrambleText(username || 'yourname', textEffect === 'matrix');

  const containerClasses = {
    top: 'flex-col items-center text-center',
    bottom: 'flex-col-reverse items-center text-center',
    left: 'flex-row items-center text-left',
    right: 'flex-row-reverse items-center text-right',
  }[layout] || 'flex-col items-start text-left';

  const hexToRgba = (hex, alpha = 1) => {
    if (!hex || !hex.startsWith('#')) return `rgba(255,255,255,${alpha})`;
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const getTextStyle = () => {
    const styles = { 
      color: 'white',
      fontFamily: widget.style?.fontFamily || 'inherit',
    };

    if (textEffect === 'glow') {
      // Smoother, professional multi-layered glow
      styles.textShadow = `
        0 0 8px ${hexToRgba(ringColor, 0.8)},
        0 0 16px ${hexToRgba(ringColor, 0.4)},
        0 0 32px ${hexToRgba(ringColor, 0.2)}
      `;
    } else if (textEffect === 'neon') {
      styles.textShadow = `0 0 5px #fff, 0 0 10px #fff, 0 0 20px ${ringColor}, 0 0 40px ${ringColor}, 0 0 80px ${ringColor}`;
    } else if (textEffect === 'gradient') {
      styles.background = `linear-gradient(to bottom, #fff 30%, ${ringColor} 100%)`;
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.display = 'inline-block';
    } else if (textEffect === 'rainbow') {
      styles.background = 'linear-gradient(to right, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff)';
      styles.backgroundSize = '200% auto';
      styles.WebkitBackgroundClip = 'text';
      styles.WebkitTextFillColor = 'transparent';
      styles.animation = 'rainbow 3s linear infinite';
      styles.display = 'inline-block';
    } else if (textEffect === 'matrix') {
      styles.fontFamily = "'JetBrains Mono', monospace";
      styles.color = ringColor;
      styles.textShadow = `0 0 10px ${hexToRgba(ringColor, 0.5)}`;
    }
    
    return styles;
  };

  const textAlignClass = {
    start: 'text-left',
    center: 'text-center',
    end: 'text-right',
  }[textAlign] || 'text-left';

  const alignmentClass = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  }[textAlign] || 'items-start';

  return (
    <div className={`flex h-full w-full gap-4 p-6 ${containerClasses} ${textAlignClass} ${alignmentClass} justify-center`}>
      <div className="relative shrink-0">
        {pulseWhenPlaying && musicPlaying && (
          <span
            className="absolute inset-0 rounded-full border-2 animate-pulse-ring"
            style={{ borderColor: ringColor }}
          />
        )}
        <div
          className="relative h-20 w-20 overflow-hidden rounded-full border border-white/10 bg-ink-700"
          style={{ boxShadow: `0 0 40px ${hex(ringColor, 0.2)}` }}
        >
          {avatarUrl && !imgFailed ? (
            <img
              src={avatarUrl}
              alt={username}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white/40">
              {(username || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className={`min-w-0 flex flex-col ${alignmentClass}`}>
        <div className="flex items-center gap-2">
          <h1
            className={`truncate text-2xl font-black tracking-tighter ${textEffect === 'glitch' ? 'glitch-text' : ''}`}
            style={getTextStyle()}
            data-text={username || 'yourname'}
          >
            {scrambledName}
          </h1>
          {hasNitro && <NitroBadge accent={ringColor} />}
        </div>
        {bio && (
          <p
            className="mt-3 max-w-prose text-sm font-light leading-relaxed"
            style={{
              letterSpacing: '0.08em',
              color: 'currentColor',
              opacity: 0.6,
            }}
          >
            {bio}
          </p>
        )}
      </div>
    </div>
  );
}

/** Small Nitro-branded pill — gradient + lightning glyph. */
function NitroBadge({ accent }) {
  const accentColor = accent || '#5865F2';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-[0_0_14px_rgba(88,101,242,0.45)]"
      style={{
        background: `linear-gradient(135deg, #ff73fa 0%, ${accentColor} 50%, #3ba9ff 100%)`,
      }}
      title="Discord Nitro"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
      </svg>
      Nitro
    </span>
  );
}

function hex(color, alpha) {
  if (!color?.startsWith('#')) return color;
  let h = color.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
