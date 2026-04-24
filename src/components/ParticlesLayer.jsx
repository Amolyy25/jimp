import { useEffect, useRef } from 'react';

/**
 * Canvas-based particles overlay. Rendered once above the background, below
 * widgets. Doesn't block pointer events.
 *
 * Variants (each with its own look):
 *   - snow       slow, downward, soft flakes
 *   - stars      static twinkling
 *   - dust       drifting slow dots, airy
 *   - confetti   colourful rectangles falling & rotating
 *
 * ~80–140 particles on a 1080p screen — plenty of density without trashing
 * the GPU. We respect prefers-reduced-motion and auto-disable.
 */
export default function ParticlesLayer({ variant = 'none', accent = '#5865F2' }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    if (variant === 'none') return;

    // Respect accessibility preference.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particlesRef.current = createParticles(variant, canvas.width, canvas.height, accent);
    };
    resize();
    window.addEventListener('resize', resize);

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particlesRef.current) {
        updateParticle(p, canvas.width, canvas.height);
        drawParticle(ctx, p);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [variant, accent]);

  if (variant === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[5]"
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Particle presets                                                            */
/* -------------------------------------------------------------------------- */

function createParticles(variant, w, h, accent) {
  const spec = SPECS[variant] || SPECS.snow;
  const count = Math.min(spec.count, Math.round((w * h) / 12_000));
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(makeParticle(spec, w, h, accent));
  }
  return out;
}

const SPECS = {
  snow: {
    count: 120,
    size: [1.4, 3.2],
    speedY: [0.25, 0.9],
    speedX: [-0.25, 0.25],
    opacity: [0.25, 0.75],
    colors: ['#ffffff'],
    shape: 'circle',
    wobble: true,
  },
  stars: {
    count: 140,
    size: [0.6, 1.8],
    speedY: [0, 0],
    speedX: [0, 0],
    opacity: [0.2, 1],
    colors: ['#ffffff', '#cbd5ff'],
    shape: 'circle',
    twinkle: true,
  },
  dust: {
    count: 80,
    size: [0.8, 1.8],
    speedY: [-0.08, 0.08],
    speedX: [-0.15, 0.15],
    opacity: [0.1, 0.4],
    colors: ['accent'],
    shape: 'circle',
  },
  confetti: {
    count: 90,
    size: [4, 9],
    speedY: [1.0, 2.4],
    speedX: [-0.6, 0.6],
    opacity: [0.7, 1],
    colors: ['#ff73fa', '#5865F2', '#ffd93d', '#00e5ff', '#ff5f6d'],
    shape: 'rect',
    spin: true,
  },
};

function makeParticle(spec, w, h, accent) {
  const colors = spec.colors.map((c) => (c === 'accent' ? accent : c));
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: rand(spec.size[0], spec.size[1]),
    vy: rand(spec.speedY[0], spec.speedY[1]),
    vx: rand(spec.speedX[0], spec.speedX[1]),
    alpha: rand(spec.opacity[0], spec.opacity[1]),
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: spec.shape,
    spin: spec.spin,
    angle: Math.random() * Math.PI * 2,
    va: spec.spin ? rand(-0.05, 0.05) : 0,
    wobble: spec.wobble,
    wobbleSeed: Math.random() * 1000,
    twinkle: spec.twinkle,
    twinkleSeed: Math.random() * 1000,
  };
}

function updateParticle(p, w, h) {
  p.y += p.vy;
  p.x += p.vx;
  if (p.wobble) p.x += Math.sin((performance.now() + p.wobbleSeed) / 800) * 0.2;
  if (p.spin) p.angle += p.va;
  if (p.twinkle) {
    // Smoothly modulate alpha between ~30% and 100% of its base.
    const t = (performance.now() + p.twinkleSeed) / 1400;
    p.renderAlpha = p.alpha * (0.4 + 0.6 * (Math.sin(t) + 1) / 2);
  } else {
    p.renderAlpha = p.alpha;
  }

  // Wrap around the viewport.
  if (p.y > h + 10) {
    p.y = -10;
    p.x = Math.random() * w;
  }
  if (p.y < -20) p.y = h + 10;
  if (p.x > w + 20) p.x = -20;
  if (p.x < -20) p.x = w + 20;
}

function drawParticle(ctx, p) {
  ctx.save();
  ctx.globalAlpha = p.renderAlpha;
  ctx.fillStyle = p.color;

  if (p.shape === 'rect') {
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
  } else {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}
