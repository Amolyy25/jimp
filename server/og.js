/**
 * Dynamic OG-image generator.
 *
 * Given a profile slug, produces a 1200×630 PNG suitable for the
 * `og:image` meta tag — the preview card that Discord/Twitter/iMessage
 * show when someone pastes the profile URL.
 *
 * Uses @napi-rs/canvas (native, prebuilt binaries on Linux for Railway).
 * We fetch the Inter font once at first use and cache the buffer in
 * memory; subsequent renders reuse it.
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
let fontsReady = null;         // Promise — resolves once fonts registered

/**
 * Lazily register display + body fonts so they're available to the canvas.
 * We use Inter (bold + regular) pulled from rsms.me, which ships OTF files
 * compatible with @napi-rs/canvas. Silent on failure — falls back to
 * system sans-serif.
 */
async function ensureFonts() {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    try {
      const [bold, regular] = await Promise.all([
        fetch('https://rsms.me/inter/font-files/Inter-Bold.otf').then((r) => r.arrayBuffer()),
        fetch('https://rsms.me/inter/font-files/Inter-Regular.otf').then((r) => r.arrayBuffer()),
      ]);
      GlobalFonts.register(Buffer.from(bold), 'Inter-Bold');
      GlobalFonts.register(Buffer.from(regular), 'Inter');
    } catch (err) {
      console.warn('[og] font fetch failed, falling back to system fonts:', err.message);
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
  const accent = resolveAccentForCanvas(theme.accent); // dominant hex
  const accentGrad = resolveAccentGradientForCanvas(theme.accent);
  const pageBg = theme.pageBg || '#0a0a0a';

  // -------- Background --------
  ctx.fillStyle = pageBg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Radial accent glow, top-left
  const glow = ctx.createRadialGradient(200, 200, 0, 200, 200, 700);
  glow.addColorStop(0, hexToRgba(accent, 0.35));
  glow.addColorStop(1, hexToRgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.035)';
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

  // -------- Wordmark --------
  // The brand square uses the gradient when the user picked one — gives a
  // visible cue in social previews without redesigning the OG layout.
  if (accentGrad.kind === 'gradient') {
    const g = ctx.createLinearGradient(60, 60, 108, 108);
    g.addColorStop(0, accentGrad.from);
    g.addColorStop(1, accentGrad.to);
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = accent;
  }
  ctx.fillRect(60, 60, 48, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Inter-Bold, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', 76, 85);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Inter-Bold, sans-serif';
  ctx.fillText('JIMP', 126, 85);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText('v2.4', 208, 88);

  // -------- Profile identity --------
  const avatarWidget = profileData.widgets?.find((w) => w.type === 'avatar');
  const username = avatarWidget?.data?.username || slug || 'profile';
  const bio = avatarWidget?.data?.bio || '';
  const avatarUrl = avatarWidget?.data?.avatarUrl;
  const hasNitro = !!avatarWidget?.data?.hasNitro;

  // Avatar circle, right side
  const avatarCx = WIDTH - 220;
  const avatarCy = HEIGHT / 2 + 10;
  const avatarR = 130;
  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarR + 10, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(accent, 0.15);
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
      // Thin ring
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(avatarCx, avatarCy, avatarR, 0, Math.PI * 2);
      ctx.stroke();
    } catch {
      drawAvatarFallback(ctx, avatarCx, avatarCy, avatarR, username, accent);
    }
  } else {
    drawAvatarFallback(ctx, avatarCx, avatarCy, avatarR, username, accent);
  }

  // -------- Pseudo (huge) --------
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 90px Inter-Bold, sans-serif';
  ctx.textBaseline = 'alphabetic';
  const displayName = clamp(username, 18);
  ctx.fillText(displayName, 60, 320);

  // Nitro pill
  if (hasNitro) {
    const x = 60 + ctx.measureText(displayName).width + 18;
    drawPill(ctx, x, 290, 'NITRO', accent);
  }

  // -------- Bio --------
  if (bio) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '26px Inter, sans-serif';
    wrapText(ctx, clamp(bio, 140), 60, 370, 700, 38);
  }

  // -------- Slug URL --------
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = 'bold 22px Inter-Bold, sans-serif';
  ctx.fillText(`jimp.app/${slug || 'your-link'}`, 60, HEIGHT - 60);

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
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 120px Inter-Bold, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, cx, cy);
  ctx.restore();
}

function drawPill(ctx, x, y, text, accent) {
  const padX = 18;
  const h = 40;
  ctx.font = 'bold 20px Inter-Bold, sans-serif';
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

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
      if (cy > y + lineHeight * 2.2) {
        // Don't let the bio take over the card.
        ctx.fillText(line + '…', x, cy);
        return;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}

function clamp(str, n) {
  if (!str) return '';
  return str.length <= n ? str : str.slice(0, n - 1) + '…';
}

function hexToRgba(hex, alpha) {
  if (!hex?.startsWith('#')) return `rgba(88,101,242,${alpha})`;
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
