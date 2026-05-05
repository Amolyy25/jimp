import { useEffect, useRef } from 'react';

/**
 * Cursor trail overlay — renders a fading trail that follows the mouse.
 *
 * Canvas-based (draws circles/lines with alpha decay) for smooth 60fps
 * even when the cursor moves fast. Variants:
 *   - glow   soft accent-coloured dots, long fade
 *   - echo   expanding rings that pulse out from the cursor
 *   - stars  tiny star glyphs, quick fade
 *   - neon   continuous line with accent glow, like a laser
 *   - comet  bright head with a tapering accent tail
 *   - ghost  literal cursor clones trailing behind the real one
 *   - prism  RGB cursor splits with a digital drift
 *   - orbit  little accent satellites circling the cursor path
 *
 * Disabled automatically for users with `prefers-reduced-motion`.
 */
export default function CursorTrail({ variant = 'none', accent = '#5865F2', ghostCount = 6 }) {
  const canvasRef = useRef(null);
  const pointsRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (variant === 'none') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const onMove = (e) => {
      pointsRef.current.push({ x: e.clientX, y: e.clientY, life: 1, t: performance.now() });
      // Cap the buffer to keep drawing cheap.
      if (pointsRef.current.length > 80) pointsRef.current.shift();
    };
    window.addEventListener('pointermove', onMove);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const points = pointsRef.current;
      const now = performance.now();

      if (variant === 'neon') {
        drawNeon(ctx, points, accent, now);
      } else if (variant === 'echo') {
        drawEcho(ctx, points, accent, now);
      } else if (variant === 'comet') {
        drawComet(ctx, points, accent, now);
      } else if (variant === 'ghost') {
        drawGhost(ctx, points, accent, now, ghostCount);
      } else if (variant === 'prism') {
        drawPrism(ctx, points, accent, now);
      } else if (variant === 'orbit') {
        drawOrbit(ctx, points, accent, now);
      } else if (variant === 'stars') {
        drawStars(ctx, points, now);
      } else {
        drawGlow(ctx, points, accent, now);
      }

      // Age points; discard when fully faded.
      pointsRef.current = points.filter((p) => p.life > 0.02);
      for (const p of pointsRef.current) p.life *= 0.93;

      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [variant, accent, ghostCount]);

  if (variant === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[90]"
    />
  );
}

/* -------------------------------------------------------------------------- */

function drawGlow(ctx, points, accent, now) {
  const rgba = hexToRgba(accent);
  for (const p of points) {
    const r = 6 + (1 - p.life) * 16;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    grad.addColorStop(0, `rgba(${rgba},${p.life})`);
    grad.addColorStop(1, `rgba(${rgba},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
  }
}

function drawEcho(ctx, points, accent, now) {
  const rgba = hexToRgba(accent);
  for (let i = 0; i < points.length; i += 4) {
    const p = points[i];
    const age = Math.max(0, Math.min(1, 1 - p.life));
    const radius = 8 + (age * 28);
    ctx.beginPath();
    ctx.lineWidth = Math.max(1.2, 3 - (age * 2));
    ctx.strokeStyle = `rgba(${rgba},${p.life * 0.8})`;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14;
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
}

function drawStars(ctx, points, now) {
  ctx.fillStyle = '#ffffff';
  for (const p of points) {
    ctx.globalAlpha = p.life;
    const size = 1.5 + (1 - p.life) * 2;
    ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    // A tiny cross — makes it feel sparkly
    ctx.fillRect(p.x - 1, p.y - size, 2, size * 2);
    ctx.fillRect(p.x - size, p.y - 1, size * 2, 2);
  }
  ctx.globalAlpha = 1;
}

function drawNeon(ctx, points, accent, now) {
  if (points.length < 2) return;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer glow
  ctx.strokeStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 16;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    ctx.globalAlpha = p.life;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // Inner bright core
  ctx.strokeStyle = '#ffffff';
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    const p = points[i];
    ctx.globalAlpha = p.life;
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawComet(ctx, points, accent, now) {
  if (!points.length) return;
  const rgba = hexToRgba(accent);
  const tail = points.slice(-18);

  for (let i = 0; i < tail.length; i += 1) {
    const p = tail[i];
    const progress = (i + 1) / tail.length;
    const alpha = Math.max(0.04, p.life * progress * 0.85);
    const radius = 2 + (progress * 10);
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.3, `rgba(${rgba},${alpha})`);
    grad.addColorStop(1, `rgba(${rgba},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGhost(ctx, points, accent, now, ghostCount = 6) {
  if (!points.length) return;
  const count = Math.max(2, Math.min(20, Math.round(ghostCount || 6)));
  const stride = Math.max(2, Math.floor(14 - (count / 2)));
  const clones = points.filter((_, index) => index % stride === 0).slice(-count);
  for (let i = 0; i < clones.length; i += 1) {
    const p = clones[i];
    const fade = p.life * ((i + 1) / clones.length);
    const offset = (clones.length - i - 1) * 2;
    drawCursorGlyph(ctx, p.x - offset, p.y - offset, 1, `rgba(255,255,255,${fade})`, `rgba(${hexToRgba(accent)},${fade * 0.55})`);
  }
}

function drawPrism(ctx, points, accent, now) {
  if (!points.length) return;
  const p = points[points.length - 1];
  const wiggle = Math.sin(now / 120) * 5;
  drawCursorGlyph(ctx, p.x - 4 + wiggle, p.y - 2, 1, 'rgba(255,40,110,0.55)', 'rgba(255,40,110,0.18)');
  drawCursorGlyph(ctx, p.x + 4 - wiggle, p.y + 2, 1, 'rgba(0,220,255,0.55)', 'rgba(0,220,255,0.18)');
  drawCursorGlyph(ctx, p.x, p.y, 1, 'rgba(255,255,255,0.9)', `rgba(${hexToRgba(accent)},0.24)`);
}

function drawOrbit(ctx, points, accent, now) {
  if (!points.length) return;
  const p = points[points.length - 1];
  const rgba = hexToRgba(accent);
  const orbiters = 4;
  for (let i = 0; i < orbiters; i += 1) {
    const angle = (now / 260) + ((Math.PI * 2 * i) / orbiters);
    const radius = 10 + (i * 3);
    const x = p.x + Math.cos(angle) * radius;
    const y = p.y + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${rgba},${0.7 - (i * 0.1)})`;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.arc(x, y, Math.max(1.5, 3 - (i * 0.35)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

function drawCursorGlyph(ctx, x, y, scale = 1, fill = 'rgba(255,255,255,0.9)', shadow = 'rgba(88,101,242,0.18)') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.shadowColor = shadow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = fill;
  ctx.strokeStyle = 'rgba(10,10,10,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 18);
  ctx.lineTo(4.8, 13.7);
  ctx.lineTo(7.8, 20);
  ctx.lineTo(11, 18.6);
  ctx.lineTo(8.1, 12.3);
  ctx.lineTo(14, 12.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hexToRgba(hex) {
  if (!hex?.startsWith('#')) return '88,101,242';
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
