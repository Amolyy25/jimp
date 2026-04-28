/**
 * Dynamic OG-image generator.
 *
 * Given a profile slug, produces a 1200×630 PNG suitable for the
 * `og:image` meta tag — the preview card that Discord/Twitter/iMessage
 * show when someone pastes the profile URL.
 *
 * Uses @napi-rs/canvas (native, prebuilt binaries on Linux for Railway).
 * Inter is fetched from a small list of mirrors at first use; if every
 * fetch fails we fall back to whatever sans-serif the canvas runtime ships
 * with so something legible always renders.
 *
 * Generated PNGs are cached in-memory per slug with a short TTL so we
 * don't re-render on every crawler hit.
 */

import { Buffer } from 'node:buffer';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { resolveAccentForCanvas, resolveAccentGradientForCanvas } from './accentServer.js';

const WIDTH = 1200;
const HEIGHT = 630;
const CACHE_TTL_MS = 5 * 60 * 1000;

const imageCache = new Map(); // slug → { png: Buffer, expiresAt }
let fontsReady = null;         // Promise<{ display: string, body: string }>

// Aliases used everywhere in the render. They resolve to Inter when the
// font file is registered, and to a generic system font otherwise.
let DISPLAY_FONT = 'sans-serif';
let BODY_FONT = 'sans-serif';

const FONT_MIRRORS = {
  bold: [
    'https://rsms.me/inter/font-files/Inter-Bold.otf',
    // jsdelivr-hosted Inter mirror — used as fallback if rsms is down.
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-700-normal.woff',
  ],
  regular: [
    'https://rsms.me/inter/font-files/Inter-Regular.otf',
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-400-normal.woff',
  ],
};

async function fetchFirst(urls) {
  for (const url of urls) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch {
      /* try next mirror */
    }
  }
  return null;
}

/**
 * Lazily register display + body fonts. Returns aliases to use in
 * `ctx.font = '... Display, sans-serif'` strings — the alias resolves to
 * 'sans-serif' if nothing could be loaded, which @napi-rs/canvas maps to
 * a built-in system font.
 */
async function ensureFonts() {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    const [bold, regular] = await Promise.all([
      fetchFirst(FONT_MIRRORS.bold),
      fetchFirst(FONT_MIRRORS.regular),
    ]);
    if (bold) {
      try {
        GlobalFonts.register(bold, 'PersnDisplay');
        DISPLAY_FONT = 'PersnDisplay';
      } catch (err) {
        console.warn('[og] bold font register failed:', err.message);
      }
    }
    if (regular) {
      try {
        GlobalFonts.register(regular, 'PersnBody');
        BODY_FONT = 'PersnBody';
      } catch (err) {
        console.warn('[og] body font register failed:', err.message);
      }
    }
    if (!bold && !regular) {
      console.warn('[og] no font mirror reachable — using system sans-serif');
    }
  })();
  return fontsReady;
}

/** Clear any cached render for a slug — call after a save so previews update. */
export function invalidateOgCache(slug) {
  imageCache.delete(slug);
}

/**
 * Render the OG PNG for a profile blob. `profileData` is the same JSON that
 * the /:slug route renders from the DB.
 */
export async function renderProfileOg(slug, profileData) {
  const cached = imageCache.get(slug);
  if (cached && cached.expiresAt > Date.now()) return cached.png;

  await ensureFonts();

  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  const theme = profileData.theme || {};
  const accent = resolveAccentForCanvas(theme.accent);
  const accentGrad = resolveAccentGradientForCanvas(theme.accent);
  const pageBg = theme.pageBg || '#0a0a0a';

  /* ─────────────── Background ─────────────── */
  ctx.fillStyle = pageBg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Diagonal accent gradient wash — very low alpha so it stays atmospheric.
  const wash = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  wash.addColorStop(0, hexToRgba(accentGrad.from, 0.18));
  wash.addColorStop(1, hexToRgba(accentGrad.to, 0.05));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Spotlight glow under the username area.
  const glow = ctx.createRadialGradient(360, 380, 0, 360, 380, 720);
  glow.addColorStop(0, hexToRgba(accent, 0.35));
  glow.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle grid (kept very faint).
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y);
    ctx.stroke();
  }

  /* ─────────────── Top accent stripe ─────────────── */
  // Thin gradient bar across the top — gives the card a defined edge in
  // Discord's tight preview crop.
  const strip = ctx.createLinearGradient(0, 0, WIDTH, 0);
  strip.addColorStop(0, accentGrad.from);
  strip.addColorStop(1, accentGrad.to);
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, WIDTH, 6);

  /* ─────────────── Wordmark (top-left) ─────────────── */
  // Logo square uses the gradient when the user picked one.
  if (accentGrad.kind === 'gradient') {
    const g = ctx.createLinearGradient(56, 56, 116, 116);
    g.addColorStop(0, accentGrad.from);
    g.addColorStop(1, accentGrad.to);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = accent;
  }
  roundRect(ctx, 56, 56, 60, 60, 14);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.font = `900 42px ${DISPLAY_FONT}, sans-serif`;
  ctx.fillText('P', 86, 88);

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `900 36px ${DISPLAY_FONT}, sans-serif`;
  ctx.fillText('PERSN.ME', 134, 80);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `500 18px ${BODY_FONT}, sans-serif`;
  ctx.fillText('Your freeform profile', 134, 108);

  /* ─────────────── Profile identity ─────────────── */
  const avatarWidget = profileData.widgets?.find((w) => w.type === 'avatar');
  const username = avatarWidget?.data?.username || slug || 'profile';
  const bio = avatarWidget?.data?.bio || '';
  const avatarUrl = avatarWidget?.data?.avatarUrl;
  const hasNitro = !!avatarWidget?.data?.hasNitro;

  // Avatar — anchored on the right with a coloured halo.
  const avatarCx = WIDTH - 230;
  const avatarCy = HEIGHT / 2 + 30;
  const avatarR = 170;

  // Outer halo
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 24, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(accent, 0.18);
  ctx.fill();
  ctx.restore();

  if (avatarUrl && /^https?:/.test(avatarUrl)) {
    try {
      const img = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        img,
        avatarCx - avatarR,
        avatarCy - avatarR,
        avatarR * 2,
        avatarR * 2,
      );
      ctx.restore();
    } catch {
      drawAvatarFallback(ctx, avatarCx, avatarCy, avatarR, username, accent);
    }
  } else {
    drawAvatarFallback(ctx, avatarCx, avatarCy, avatarR, username, accent);
  }

  // Accent ring around the avatar.
  ctx.lineWidth = 4;
  ctx.strokeStyle = hexToRgba(accent, 0.6);
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 8, 0, Math.PI * 2);
  ctx.stroke();

  /* ─────────────── @username — the hero element ─────────────── */
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // Auto-shrink the display name so very long handles still fit on one line.
  const displayName = `@${clamp(username, 22)}`;
  const nameMaxWidth = WIDTH - 180 - (avatarR * 2 + 80);
  const nameFontSize = fitFontSize(ctx, displayName, nameMaxWidth, 110, 64, DISPLAY_FONT, '900');
  ctx.font = `900 ${nameFontSize}px ${DISPLAY_FONT}, sans-serif`;
  ctx.fillText(displayName, 64, 320);

  // Underline accent — same gradient as the top strip.
  const nameWidth = ctx.measureText(displayName).width;
  const underline = ctx.createLinearGradient(64, 0, 64 + Math.min(nameWidth, 360), 0);
  underline.addColorStop(0, accentGrad.from);
  underline.addColorStop(1, accentGrad.to);
  ctx.fillStyle = underline;
  ctx.fillRect(64, 340, Math.min(nameWidth, 360), 6);

  // Nitro pill, sitting next to the username.
  if (hasNitro) {
    drawPill(ctx, 64 + Math.min(nameWidth, 720) + 18, 270, 'NITRO', accent, DISPLAY_FONT);
  }

  /* ─────────────── Bio (wrapped, max 2 lines) ─────────────── */
  if (bio) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `500 28px ${BODY_FONT}, sans-serif`;
    wrapText(ctx, clamp(bio, 160), 64, 392, nameMaxWidth, 40, 2);
  }

  /* ─────────────── URL pill (bottom-left) ─────────────── */
  ctx.font = `700 24px ${DISPLAY_FONT}, sans-serif`;
  const urlText = `persn.me/${slug || 'your-link'}`;
  const urlW = ctx.measureText(urlText).width + 56;
  const urlY = HEIGHT - 86;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, 56, urlY, urlW, 50, 25);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = hexToRgba(accent, 0.4);
  roundRect(ctx, 56, urlY, urlW, 50, 25);
  ctx.stroke();

  // Accent dot
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(80, urlY + 25, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textBaseline = 'middle';
  ctx.fillText(urlText, 100, urlY + 25);

  /* ─────────────── "Tap to visit" hint (bottom-right) ─────────────── */
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `500 18px ${BODY_FONT}, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('TAP TO VISIT  >', WIDTH - 56, urlY + 25);
  ctx.textAlign = 'left';

  const png = await canvas.encode('png');
  imageCache.set(slug, { png, expiresAt: Date.now() + CACHE_TTL_MS });
  return png;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function drawAvatarFallback(ctx, cx, cy, r, name, accent) {
  const initial = (name || '?').charAt(0).toUpperCase();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  g.addColorStop(0, accent);
  g.addColorStop(1, '#1a1a1a');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `900 ${Math.round(r * 1.1)}px ${DISPLAY_FONT}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, cx, cy);
  ctx.restore();
}

function drawPill(ctx, x, y, text, accent, font) {
  const padX = 18;
  const h = 40;
  ctx.font = `900 20px ${font}, sans-serif`;
  const w = ctx.measureText(text).width + padX * 2;
  const r = h / 2;
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#ff73fa');
  g.addColorStop(0.5, accent);
  g.addColorStop(1, '#3ba9ff');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Pick the largest font size in [minPx, maxPx] that lets `text` fit within
 * `maxWidth`. Avoids the "username gets cropped" problem on long handles.
 */
function fitFontSize(ctx, text, maxWidth, maxPx, minPx, font, weight = '700') {
  let size = maxPx;
  while (size > minPx) {
    ctx.font = `${weight} ${size}px ${font}, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 4;
  }
  return minPx;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      lines += 1;
      if (lines >= maxLines) {
        return; // hard cut — bio shouldn't take over the card
      }
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, cy);
}

function clamp(str, n) {
  if (!str) return '';
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

function hexToRgba(hex, alpha) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return `rgba(88,101,242,${alpha})`;
  }
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
