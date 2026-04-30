import { useState, useMemo } from 'react';
import { useScrambleText } from '../../hooks/useScrambleText.js';

/**
 * Avatar + identity block.
 * Floating avatar with the pseudo in large weight-600 type and a small,
 * letter-spaced bio underneath. Optional Nitro badge sits next to the name.
 * A pulsing ring surrounds the avatar while music plays.
 */
export default function AvatarWidget({ widget, musicPlaying, accent, accentCss }) {
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

  // Build the CSS the username <h1> needs for each effect.
  //
  // Two important quirks we work around:
  //   - WidgetFrame applies `overflow: hidden` (rounded corners) so any
  //     text-shadow that bleeds past the frame gets clipped to a hard
  //     rectangle. Glow/neon halos must therefore stay tight & soft enough
  //     not to fill the available padding, otherwise they read as a solid
  //     coloured background.
  //   - For gradient text we use `background-image` (NOT the `background`
  //     shorthand, which resets background-clip) and supply both the
  //     prefixed and unprefixed `background-clip: text` for cross-browser
  //     reliability. We also avoid `display: inline-block` because it
  //     interacts badly with the `truncate` utility on flex children.
  const getTextStyle = () => {
    const styles = {
      color: 'white',
      fontFamily: widget.style?.fontFamily || 'inherit',
    };

    if (textEffect === 'glow') {
      // Soft halo — single wide blur, low alpha. Stays well inside the
      // frame's overflow rect at typical widget sizes so it never reads as
      // a flat tint.
      styles.textShadow = `
        0 0 4px ${hexToRgba(ringColor, 0.45)},
        0 0 14px ${hexToRgba(ringColor, 0.22)}
      `;
    } else if (textEffect === 'neon') {
      // Tighter than before — the previous 80px outer layer was getting
      // clipped into a square by overflow-hidden.
      styles.textShadow = `
        0 0 3px #fff,
        0 0 7px #fff,
        0 0 14px ${hexToRgba(ringColor, 0.85)},
        0 0 24px ${hexToRgba(ringColor, 0.5)}
      `;
    } else if (textEffect === 'gradient') {
      // Honour the theme's full gradient when the user picked one in the
      // Theme panel; otherwise fade from white into the accent so the
      // effect still pops on a plain accent.
      const themeGradient =
        typeof accentCss === 'string' && accentCss.startsWith('linear-gradient(')
          ? accentCss
          : null;
      styles.backgroundImage =
        themeGradient ||
        `linear-gradient(180deg, #ffffff 0%, ${ringColor} 100%)`;
      styles.backgroundClip = 'text';
      styles.WebkitBackgroundClip = 'text';
      styles.color = 'transparent';
      styles.WebkitTextFillColor = 'transparent';
    } else if (textEffect === 'rainbow') {
      styles.backgroundImage =
        'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #8f00ff, #ff0000)';
      styles.backgroundSize = '200% 100%';
      styles.backgroundClip = 'text';
      styles.WebkitBackgroundClip = 'text';
      styles.color = 'transparent';
      styles.WebkitTextFillColor = 'transparent';
      styles.animation = 'rainbow 3s linear infinite';
    } else if (textEffect === 'matrix') {
      styles.fontFamily = "'JetBrains Mono', monospace";
      styles.color = ringColor;
      styles.textShadow = `0 0 8px ${hexToRgba(ringColor, 0.45)}`;
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
