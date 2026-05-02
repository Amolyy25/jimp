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

  // Atmospheric accent wash — low alpha for premium depth
  const wash = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  wash.addColorStop(0, hexToRgba(accentGrad.from, 0.15));
  wash.addColorStop(1, hexToRgba(accentGrad.to, 0.05));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }

  /* ─────────────── Layout Mapping ─────────────── */
  // The editor uses a 16:9 inner box. On 1200x630 (40:21), this box
  // will be limited by height and centered horizontally.
  const contentH = HEIGHT;
  const contentW = HEIGHT * (16 / 9); // 1120px
  const offsetX = (WIDTH - contentW) / 2; // 40px margin

  const toAbsX = (pct) => offsetX + (pct / 100) * contentW;
  const toAbsY = (pct) => (pct / 100) * contentH;
  const toAbsW = (pct) => (pct / 100) * contentW;
  const toAbsH = (pct) => (pct / 100) * contentH;

  /* ─────────────── Widgets ─────────────── */
  const widgets = profileData.widgets || [];
  
  for (const widget of widgets) {
    if (widget.visible === false) continue;

    const isAuto = !!widget.style?.autoSize && widget.type !== 'group';
    let x = toAbsX(widget.pos.x);
    let y = toAbsY(widget.pos.y);
    let w = toAbsW(widget.size.w);
    let h = toAbsH(widget.size.h);

    if (isAuto) {
      // Auto-size widgets in the editor use center-point positioning
      x = x - w / 2;
      y = y - h / 2;
    }

    const radius = widget.style?.borderRadius ?? 16;

    // 1. Draw Glassmorphism Frame
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, radius);
    
    // Fill with slight translucency
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    
    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Clipping for internal content
    ctx.clip();

    // 2. Widget-specific content
    if (widget.type === 'avatar') {
      await drawAvatarContent(ctx, x, y, w, h, widget.data, accent);
    } else if (widget.type === 'now-playing' || widget.type === 'music-progress') {
      drawSpotifyIcon(ctx, x, y, w, h, accent);
    } else {
      drawWidgetPlaceholder(ctx, x, y, w, h, widget.type);
    }
    
    ctx.restore();
  }

  /* ─────────────── Branding Overlay ─────────────── */
  // Top accent stripe
  const strip = ctx.createLinearGradient(0, 0, WIDTH, 0);
  strip.addColorStop(0, accentGrad.from);
  strip.addColorStop(1, accentGrad.to);
  ctx.fillStyle = strip;
  ctx.fillRect(0, 0, WIDTH, 4);

  // Logo wordmark (bottom-left)
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = `900 20px ${DISPLAY_FONT}, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('PERSN.ME', 60, HEIGHT - 40);

  const png = await canvas.encode('png');
  imageCache.set(slug, { png, expiresAt: Date.now() + CACHE_TTL_MS });
  return png;
}


/* -------------------------------------------------------------------------- */
/* Sub-renderers                                                               */
/* -------------------------------------------------------------------------- */

async function drawAvatarContent(ctx, x, y, w, h, data, accent) {
  const { avatarUrl, username, bio, avatarShape = 'circle' } = data || {};
  const padding = 24;
  
  // Avatar sizing: attempt to be responsive to the block size
  const avSize = Math.min(w * 0.35, h * 0.7);
  const avX = x + padding;
  const avY = y + (h - avSize) / 2;

  if (avatarUrl) {
    try {
      const img = await loadImage(avatarUrl);
      ctx.save();
      ctx.beginPath();
      if (avatarShape === 'circle') {
        ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2);
      } else {
        roundRect(ctx, avX, avY, avSize, avSize, 12);
      }
      ctx.clip();
      ctx.drawImage(img, avX, avY, avSize, avSize);
      ctx.restore();
    } catch {
      drawAvatarFallbackMini(ctx, avX, avY, avSize, username, accent, avatarShape);
    }
  } else {
    drawAvatarFallbackMini(ctx, avX, avY, avSize, username, accent, avatarShape);
  }

  // Identity text
  const textX = avX + avSize + 20;
  const textW = w - (avSize + 20) - padding * 2;
  
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Username
  ctx.fillStyle = '#ffffff';
  const nameFontSize = fitFontSize(ctx, username || 'user', textW, 32, 18, DISPLAY_FONT, '900');
  ctx.font = `900 ${nameFontSize}px ${DISPLAY_FONT}, sans-serif`;
  ctx.fillText(username || 'user', textX, avY + 4);

  // Bio (multi-line)
  if (bio) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `500 16px ${BODY_FONT}, sans-serif`;
    wrapText(ctx, bio, textX, avY + 4 + nameFontSize + 10, textW, 22, 2);
  }
}

function drawAvatarFallbackMini(ctx, x, y, size, name, accent, shape) {
  ctx.save();
  ctx.beginPath();
  if (shape === 'circle') {
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  } else {
    roundRect(ctx, x, y, size, size, 12);
  }
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.5)}px ${DISPLAY_FONT}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((name || '?').charAt(0).toUpperCase(), x + size / 2, y + size / 2);
  ctx.restore();
}

function drawSpotifyIcon(ctx, x, y, w, h, accent) {
  const size = Math.min(w, h) * 0.35;
  const cx = x + w / 2;
  const cy = y + h / 2;
  
  ctx.save();
  ctx.fillStyle = '#1DB954';
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  
  for (let i = 0; i < 3; i++) {
    const r = (size / 2) * (0.8 - i * 0.2);
    ctx.beginPath();
    ctx.arc(cx, cy + size * 0.2, r, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWidgetPlaceholder(ctx, x, y, w, h, type) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.font = `700 10px ${DISPLAY_FONT}, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Avoid rendering very small text if widget is tiny
  if (w > 40 && h > 20) {
    ctx.fillText(type.toUpperCase(), x + w / 2, y + h / 2);
  }
}

/* -------------------------------------------------------------------------- */
/* General Helpers                                                             */
/* -------------------------------------------------------------------------- */

function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitFontSize(ctx, text, maxWidth, maxPx, minPx, font, weight = '700') {
  let size = maxPx;
  while (size > minPx) {
    ctx.font = `${weight} ${size}px ${font}, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 2;
  }
  return minPx;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = (text || '').split(' ');
  let line = '';
  let cy = y;
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      lines += 1;
      if (lines >= maxLines) return;
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, cy);
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

