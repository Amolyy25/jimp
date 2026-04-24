import { useEffect, useRef } from 'react';

/**
 * Cursor trail overlay — renders a fading trail that follows the mouse.
 *
 * Canvas-based (draws circles/lines with alpha decay) for smooth 60fps
 * even when the cursor moves fast. Variants:
 *   - glow   soft accent-coloured dots, long fade
 *   - stars  tiny star glyphs, quick fade
 *   - neon   continuous line with accent glow, like a laser
 *
 * Disabled automatically for users with `prefers-reduced-motion`.
 */
export default function CursorTrail({ variant = 'none', accent = '#5865F2' }) {
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
  }, [variant, accent]);

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

function hexToRgba(hex) {
  if (!hex?.startsWith('#')) return '88,101,242';
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}
