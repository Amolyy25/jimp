/**
 * Theme helpers — accent color resolution.
 *
 * `theme.accent` accepts two shapes:
 *   - legacy string  '#5865F2'
 *   - new object     { kind: 'solid',    value: '#5865F2' }
 *                    { kind: 'gradient', from: '#FF73FA', to: '#3BA9FF', angle: 135 }
 *
 * Use `accentHex(accent)` when you need a single color (RGB tints,
 * box-shadow glow, computed rgba). Use `accentBackground(accent)` when you
 * need a CSS `background:` value that can render either a solid swatch or a
 * gradient. `resolveAccent` returns both plus the underlying parts so
 * callers can mix them as needed.
 */

const DEFAULT_HEX = '#5865F2';

export function resolveAccent(accent) {
  if (!accent) {
    return { kind: 'solid', hex: DEFAULT_HEX, from: DEFAULT_HEX, to: DEFAULT_HEX, angle: 135, css: DEFAULT_HEX };
  }
  if (typeof accent === 'string') {
    return { kind: 'solid', hex: accent, from: accent, to: accent, angle: 135, css: accent };
  }
  if (accent.kind === 'gradient') {
    const from = accent.from || DEFAULT_HEX;
    const to = accent.to || from;
    const angle = Number.isFinite(accent.angle) ? accent.angle : 135;
    return {
      kind: 'gradient',
      hex: from, // dominant color → reuse for shadows, rgba math, OG, etc.
      from,
      to,
      angle,
      css: `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`,
    };
  }
  // 'solid' object form, or unknown
  const hex = accent.value || DEFAULT_HEX;
  return { kind: 'solid', hex, from: hex, to: hex, angle: 135, css: hex };
}

export function accentHex(accent) {
  return resolveAccent(accent).hex;
}

export function accentBackground(accent) {
  return resolveAccent(accent).css;
}

/** Convert a hex string + alpha into an rgba(...). Used for tints and shadows. */
export function hexToRgba(hex, alpha = 1) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(88, 101, 242, ${alpha})`;
  }
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function accentRgba(accent, alpha) {
  return hexToRgba(accentHex(accent), alpha);
}
