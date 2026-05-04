/**
 * Dynamic OG-image generator.
 *
 * Given a profile slug, produces a 1200×630 PNG suitable for the
 * `og:image` meta tag — the preview card that Discord/Twitter/iMessage
 * show when someone pastes the profile URL.
 *
 * Design intent:
 *   We do NOT try to faithfully replicate the full editor canvas inside
 *   1200×630. That approach surfaces every widget as an unreadable shape
 *   with its raw type label and ends up looking like a bug report.
 *   Instead this is a hand-tuned editorial preview card — identity first
 *   (avatar + handle + bio), profile features as small named chips, and
 *   the persn.me wordmark for brand recognition.
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
let fontsReady = null;

let DISPLAY_FONT = 'sans-serif';
let BODY_FONT = 'sans-serif';
let MONO_FONT = 'monospace';

const FONT_MIRRORS = {
  bold: [
    'https://rsms.me/inter/font-files/Inter-Black.otf',
    'https://rsms.me/inter/font-files/Inter-Bold.otf',
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-900-normal.woff',
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-700-normal.woff',
  ],
  regular: [
    'https://rsms.me/inter/font-files/Inter-Regular.otf',
    'https://cdn.jsdelivr.net/npm/@fontsource/inter@5.0.18/files/inter-latin-400-normal.woff',
  ],
  mono: [
    'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5.0.18/files/jetbrains-mono-latin-700-normal.woff',
    'https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5.0.18/files/jetbrains-mono-latin-500-normal.woff',
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

async function ensureFonts() {
  if (fontsReady) return fontsReady;
  fontsReady = (async () => {
    const [bold, regular, mono] = await Promise.all([
      fetchFirst(FONT_MIRRORS.bold),
      fetchFirst(FONT_MIRRORS.regular),
      fetchFirst(FONT_MIRRORS.mono),
    ]);
    if (bold) {
      try {
        GlobalFonts.register(bold, 'PersnDisplay');
        DISPLAY_FONT = 'PersnDisplay';
      } catch (err) {
        console.warn('[og] display font register failed:', err.message);
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
    if (mono) {
      try {
        GlobalFonts.register(mono, 'PersnMono');
        MONO_FONT = 'PersnMono';
      } catch (err) {
        console.warn('[og] mono font register failed:', err.message);
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

/* -------------------------------------------------------------------------- */
/* Widget meta — same vocabulary as the frontend                               */
/* -------------------------------------------------------------------------- */

const WIDGET_LABELS = {
  badges: { label: 'Badges', tint: '#ffb347' },
  socials: { label: 'Socials', tint: '#5865F2' },
  discordServers: { label: 'Discord', tint: '#5865F2' },
  discordPresence: { label: 'Status', tint: '#5865F2' },
  games: { label: 'Games', tint: '#ff2e88' },
  clock: { label: 'Clock', tint: '#c0ff3e' },
  weather: { label: 'Weather', tint: '#7dd3fc' },
  nowPlaying: { label: 'Music', tint: '#ff2e88' },
  musicProgress: { label: 'Player', tint: '#ff2e88' },
  visitorCounter: { label: 'Stats', tint: '#c0ff3e' },
  twitchStream: { label: 'Twitch', tint: '#a855f7' },
  guestbook: { label: 'Guestbook', tint: '#ffb347' },
  qa: { label: 'Q&A', tint: '#7dd3fc' },
  clickerGame: { label: 'Clicker', tint: '#c0ff3e' },
};

/* -------------------------------------------------------------------------- */
/* Main render                                                                  */
/* -------------------------------------------------------------------------- */

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

  // Pull identity from the avatar widget (the only widget guaranteed to
  // hold display copy). Everything else is derived.
  const widgets = Array.isArray(profileData.widgets) ? profileData.widgets : [];
  const avatarWidget = widgets.find((w) => w?.type === 'avatar');
  const data = avatarWidget?.data || {};
  const username = (data.username || slug || 'user').trim();
  const bio = (data.bio || '').trim();
  const avatarUrl = data.avatarUrl || '';

  // De-duped, friendly list of features the profile uses.
  const featureTypes = [];
  for (const w of widgets) {
    if (!w || !w.type) continue;
    if (w.type === 'avatar' || w.type === 'group') continue;
    if (!WIDGET_LABELS[w.type]) continue;
    if (!featureTypes.includes(w.type)) featureTypes.push(w.type);
  }

  /* ─────────────── Background ─────────────── */
  ctx.fillStyle = pageBg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Big radial bloom from the left, in the profile's accent. This is the
  // single biggest "vibe" lever — it makes every card feel personal and
  // instantly distinguishes it from the next one in a Discord channel.
  const bloom = ctx.createRadialGradient(280, 320, 40, 280, 320, 720);
  bloom.addColorStop(0, hexToRgba(accentGrad.from, 0.55));
  bloom.addColorStop(0.45, hexToRgba(accentGrad.to, 0.18));
  bloom.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // A second, smaller bloom on the right for depth — pulled from the
  // gradient's "to" colour, slightly cooler than the primary.
  const bloom2 = ctx.createRadialGradient(WIDTH - 180, HEIGHT + 40, 20, WIDTH - 180, HEIGHT + 40, 540);
  bloom2.addColorStop(0, hexToRgba(accentGrad.to, 0.32));
  bloom2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bloom2;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Crisp diagonal accent ribbon — small, signals "design product" without
  // overwhelming the identity block.
  ctx.save();
  ctx.translate(WIDTH - 60, HEIGHT - 60);
  ctx.rotate(-Math.PI / 4);
  const rib = ctx.createLinearGradient(-200, 0, 200, 0);
  rib.addColorStop(0, hexToRgba(accentGrad.from, 0.0));
  rib.addColorStop(0.5, hexToRgba(accentGrad.from, 0.25));
  rib.addColorStop(1, hexToRgba(accentGrad.to, 0.0));
  ctx.fillStyle = rib;
  ctx.fillRect(-260, -2, 520, 3);
  ctx.restore();

  // Background grid (very faint), masked to fade toward the right.
  const grid = ctx.createLinearGradient(0, 0, WIDTH, 0);
  grid.addColorStop(0, 'rgba(255,255,255,0.045)');
  grid.addColorStop(1, 'rgba(255,255,255,0.015)');
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  for (let x = 0; x < WIDTH; x += 56) {
    ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, HEIGHT); ctx.stroke();
  }
  for (let y = 0; y < HEIGHT; y += 56) {
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(WIDTH, y + 0.5); ctx.stroke();
  }

  // Top accent gradient hairline.
  const top = ctx.createLinearGradient(0, 0, WIDTH, 0);
  top.addColorStop(0, accentGrad.from);
  top.addColorStop(1, accentGrad.to);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, WIDTH, 3);

  /* ─────────────── Header (eyebrow + brand) ─────────────── */
  const M = 64; // outer margin
  const TOP = 56;

  // Live dot + "live profile" eyebrow
  ctx.fillStyle = '#c0ff3e';
  ctx.beginPath();
  ctx.arc(M + 5, TOP, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = '#c0ff3e';
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.arc(M + 5, TOP, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `700 16px ${MONO_FONT}, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('LIVE PROFILE  ·  PERSN.ME', M + 22, TOP);

  // Brand corner top-right
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `900 22px ${DISPLAY_FONT}, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('PERSN.ME', WIDTH - M, TOP);

  // Tiny accent square next to brand
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 14;
  ctx.fillRect(WIDTH - M + 12, TOP - 5, 10, 10);
  ctx.shadowBlur = 0;
  // Re-render the square sharply on top
  ctx.fillStyle = accent;
  ctx.fillRect(WIDTH - M + 12, TOP - 5, 10, 10);

  /* ─────────────── Identity block ─────────────── */
  const AV_SIZE = 220;
  const AV_X = M;
  const AV_Y = 150;

  // Soft accent halo behind avatar
  const halo = ctx.createRadialGradient(
    AV_X + AV_SIZE / 2,
    AV_Y + AV_SIZE / 2,
    AV_SIZE * 0.3,
    AV_X + AV_SIZE / 2,
    AV_Y + AV_SIZE / 2,
    AV_SIZE * 1.1,
  );
  halo.addColorStop(0, hexToRgba(accent, 0.55));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(AV_X - 80, AV_Y - 80, AV_SIZE + 160, AV_SIZE + 160);

  // Avatar — circle, with a 3px white inner ring + accent outer ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(AV_X + AV_SIZE / 2, AV_Y + AV_SIZE / 2, AV_SIZE / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  let avatarDrawn = false;
  if (avatarUrl && /^https?:/.test(avatarUrl)) {
    try {
      const img = await loadImage(avatarUrl);
      ctx.drawImage(img, AV_X, AV_Y, AV_SIZE, AV_SIZE);
      avatarDrawn = true;
    } catch {
      /* fall through to fallback */
    }
  }
  if (!avatarDrawn) {
    const grad = ctx.createLinearGradient(AV_X, AV_Y, AV_X + AV_SIZE, AV_Y + AV_SIZE);
    grad.addColorStop(0, accentGrad.from);
    grad.addColorStop(1, accentGrad.to);
    ctx.fillStyle = grad;
    ctx.fillRect(AV_X, AV_Y, AV_SIZE, AV_SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(AV_SIZE * 0.42)}px ${DISPLAY_FONT}, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      (username || '?').charAt(0).toUpperCase(),
      AV_X + AV_SIZE / 2,
      AV_Y + AV_SIZE / 2 + 6,
    );
  }
  ctx.restore();

  // Outer accent ring
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.beginPath();
  ctx.arc(AV_X + AV_SIZE / 2, AV_Y + AV_SIZE / 2, AV_SIZE / 2 + 6, 0, Math.PI * 2);
  ctx.stroke();
  // Inner white separator
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(AV_X + AV_SIZE / 2, AV_Y + AV_SIZE / 2, AV_SIZE / 2 + 1, 0, Math.PI * 2);
  ctx.stroke();

  /* ─────────────── Right column: name, bio, features ─────────────── */
  const TXT_X = AV_X + AV_SIZE + 48;
  const TXT_W = WIDTH - TXT_X - M;

  // @username — display-weight, gradient-tinted toward the accent.
  const handleText = `@${username}`;
  const handleSize = fitFontSize(ctx, handleText, TXT_W, 110, 56, DISPLAY_FONT, '900');
  ctx.font = `900 ${handleSize}px ${DISPLAY_FONT}, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const handleY = AV_Y + handleSize - 6;
  const nameGrad = ctx.createLinearGradient(TXT_X, handleY - handleSize, TXT_X + TXT_W, handleY);
  nameGrad.addColorStop(0, '#ffffff');
  nameGrad.addColorStop(1, hexToRgba(accent, 0.95));
  ctx.fillStyle = nameGrad;
  ctx.fillText(handleText, TXT_X, handleY);

  // Bio — wraps to 2 lines max, lighter weight.
  let cursorY = handleY + 16;
  if (bio) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `500 26px ${BODY_FONT}, sans-serif`;
    cursorY = wrapText(ctx, bio, TXT_X, cursorY + 28, TXT_W, 34, 2);
  } else {
    cursorY = handleY + 32;
  }

  // Feature pills — three biggest features at most, with their own tints.
  const PILL_GAP = 12;
  const PILL_PAD_X = 18;
  const PILL_H = 44;
  const PILL_TOP = Math.max(cursorY + 24, AV_Y + AV_SIZE - PILL_H - 4);

  let pillX = TXT_X;
  const featuresShown = featureTypes.slice(0, 4);
  for (const type of featuresShown) {
    const meta = WIDGET_LABELS[type];
    if (!meta) continue;
    ctx.font = `700 16px ${MONO_FONT}, monospace`;
    const labelW = ctx.measureText(meta.label.toUpperCase()).width;
    const pillW = labelW + PILL_PAD_X * 2 + 16; // +16 for the dot
    if (pillX + pillW > WIDTH - M) break;

    // Pill body
    ctx.beginPath();
    roundRect(ctx, pillX, PILL_TOP, pillW, PILL_H, 22);
    ctx.fillStyle = hexToRgba(meta.tint, 0.12);
    ctx.fill();
    ctx.strokeStyle = hexToRgba(meta.tint, 0.45);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dot
    ctx.fillStyle = meta.tint;
    ctx.beginPath();
    ctx.arc(pillX + PILL_PAD_X, PILL_TOP + PILL_H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Label
    ctx.fillStyle = meta.tint;
    ctx.font = `700 16px ${MONO_FONT}, monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillText(meta.label.toUpperCase(), pillX + PILL_PAD_X + 16, PILL_TOP + PILL_H / 2 + 1);

    pillX += pillW + PILL_GAP;
  }
  // If there were more, append a "+N" pill in white.
  if (featureTypes.length > featuresShown.length) {
    const more = `+${featureTypes.length - featuresShown.length}`;
    ctx.font = `700 16px ${MONO_FONT}, monospace`;
    const moreW = ctx.measureText(more).width + PILL_PAD_X * 2;
    if (pillX + moreW <= WIDTH - M) {
      ctx.beginPath();
      roundRect(ctx, pillX, PILL_TOP, moreW, PILL_H, 22);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textBaseline = 'middle';
      ctx.fillText(more, pillX + PILL_PAD_X, PILL_TOP + PILL_H / 2 + 1);
    }
  }

  /* ─────────────── Footer ─────────────── */
  const FOOT_Y = HEIGHT - 64;

  // URL chip on the left
  const url = `persn.me/${slug}`;
  ctx.font = `700 18px ${MONO_FONT}, monospace`;
  const urlW = ctx.measureText(url).width;
  const urlPadX = 18;
  const urlH = 38;
  ctx.beginPath();
  roundRect(ctx, M, FOOT_Y, urlW + urlPadX * 2 + 24, urlH, 19);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // tiny lock icon (rect + arc)
  ctx.fillStyle = accent;
  ctx.fillRect(M + urlPadX, FOOT_Y + urlH / 2 - 1, 6, 8);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(M + urlPadX + 3, FOOT_Y + urlH / 2 - 1, 4, Math.PI, 2 * Math.PI);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = `700 18px ${MONO_FONT}, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(url, M + urlPadX + 24, FOOT_Y + urlH / 2 + 1);

  // CTA on the right — "claim yours →"
  ctx.font = `900 18px ${DISPLAY_FONT}, sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const ctaText = 'CLAIM YOURS  →';
  ctx.fillText(ctaText, WIDTH - M, FOOT_Y + urlH / 2 + 1);

  const png = await canvas.encode('png');
  imageCache.set(slug, { png, expiresAt: Date.now() + CACHE_TTL_MS });
  return png;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
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

/** Returns the y coordinate after the last rendered line so callers can stack content. */
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = (text || '').split(/\s+/);
  let line = '';
  let cy = y;
  let lines = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines === maxLines - 1) {
        // last line — hard-truncate with ellipsis
        let truncated = line;
        while (ctx.measureText(`${truncated}…`).width > maxWidth && truncated.length) {
          truncated = truncated.slice(0, -1);
        }
        ctx.fillText(`${truncated}…`, x, cy);
        return cy;
      }
      ctx.fillText(line, x, cy);
      lines += 1;
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) {
    ctx.fillText(line, x, cy);
    return cy;
  }
  return cy;
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
