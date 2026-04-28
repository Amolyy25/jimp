/**
 * Server-side mirror of `src/utils/theme.js#accentHex`.
 *
 * We can't import the frontend module from the server (different tsconfig
 * + no JSX setup), so this duplicates the small bit of logic needed by
 * canvas-based renderers (OG image, QR code) — those need a single hex
 * even when the user's accent is a gradient.
 */

const DEFAULT_HEX = '#5865F2';

export function resolveAccentForCanvas(accent) {
  if (!accent) return DEFAULT_HEX;
  if (typeof accent === 'string') return accent;
  if (accent.kind === 'gradient') return accent.from || DEFAULT_HEX;
  return accent.value || DEFAULT_HEX;
}

export function resolveAccentGradientForCanvas(accent) {
  if (!accent || typeof accent === 'string') {
    const hex = typeof accent === 'string' ? accent : DEFAULT_HEX;
    return { kind: 'solid', from: hex, to: hex, angle: 135 };
  }
  if (accent.kind === 'gradient') {
    return {
      kind: 'gradient',
      from: accent.from || DEFAULT_HEX,
      to: accent.to || accent.from || DEFAULT_HEX,
      angle: Number.isFinite(accent.angle) ? accent.angle : 135,
    };
  }
  const hex = accent.value || DEFAULT_HEX;
  return { kind: 'solid', from: hex, to: hex, angle: 135 };
}
