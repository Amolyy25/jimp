import { useEffect, useRef } from 'react';
import { useMusic } from '../utils/MusicContext.jsx';

/**
 * Real audio-reactive visualizer for the profile music.
 *
 * - When the active music source is a native <audio> (mp3/wav), MusicPlayer
 *   exposes an AnalyserNode through MusicContext and we sample its
 *   frequency data each frame.
 * - When the source is YouTube/Spotify/SoundCloud the stream is sandboxed,
 *   we can't tap it, so we fall back to a deterministic "fake" animation
 *   that still feels musical (sine waves with phase offsets per bar).
 *
 * Variants:
 *   bars   — classic equaliser bars (default)
 *   wave   — single connected wave drawn as a polyline
 *   circle — radial bars around an empty centre
 *
 * Caller controls colour via `accent` (CSS background string — supports
 * gradients) and a small set of geometry props.
 */
export default function AudioVisualizer({
  variant = 'bars',
  bars = 32,
  height = 24,
  width = '100%',
  accent = '#5865F2',
  active = true,
}) {
  const { analyser, playing } = useMusic();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const buffer = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    let raf;
    const start = performance.now();

    const sample = (i, n, ts) => {
      if (analyser && buffer && playing) {
        analyser.getByteFrequencyData(buffer);
        // Map bar index → frequency bin. Lower bins (bass) drive the left
        // bars; we skew towards the lower half because vocals + kick live
        // there and that's what a casual listener "feels".
        const bin = Math.min(buffer.length - 1, Math.floor((i / n) * (buffer.length * 0.7)));
        return buffer[bin] / 255; // 0..1
      }
      // Fallback "fake" bars: phased sines, gated by play state so the
      // visualizer freezes when paused.
      if (!playing && !active) return 0.1;
      const t = (ts - start) / 600;
      return playing
        ? 0.3 + 0.5 * Math.abs(Math.sin(t + i * 0.45))
        : 0.15;
    };

    const draw = (ts) => {
      const dpr = window.devicePixelRatio || 1;
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      // Single horizontal gradient — supports both solid (single stop) and
      // gradient accents transparently because the parent passes accent as
      // a CSS string OR a hex.
      ctx.fillStyle = accent.startsWith('linear-gradient')
        ? buildGradient(ctx, accent, cssW, cssH)
        : accent;
      ctx.strokeStyle = ctx.fillStyle;

      if (variant === 'wave') {
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < bars; i++) {
          const v = sample(i, bars, ts);
          const x = (i / (bars - 1)) * cssW;
          const y = cssH / 2 + (0.5 - v) * cssH * 0.9;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (variant === 'circle') {
        const cx = cssW / 2;
        const cy = cssH / 2;
        const r0 = Math.min(cssW, cssH) * 0.25;
        for (let i = 0; i < bars; i++) {
          const v = sample(i, bars, ts);
          const a = (i / bars) * Math.PI * 2;
          const r1 = r0 + v * Math.min(cssW, cssH) * 0.3;
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
          ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
          ctx.stroke();
        }
      } else {
        const gap = 2;
        const barW = Math.max(1, (cssW - gap * (bars - 1)) / bars);
        for (let i = 0; i < bars; i++) {
          const v = sample(i, bars, ts);
          const h = Math.max(2, v * cssH);
          const x = i * (barW + gap);
          ctx.fillRect(x, cssH - h, barW, h);
        }
      }
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [analyser, playing, variant, bars, accent, active]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: 'block' }}
      aria-hidden
    />
  );
}

/** Parse `linear-gradient(..., #from 0%, #to 100%)` into a canvas gradient.
 *  Best-effort — falls back to plain white if parsing fails. */
function buildGradient(ctx, css, w, h) {
  const m = css.match(/#([0-9a-f]{3,6})/gi);
  if (!m || m.length < 2) {
    ctx.fillStyle = '#ffffff';
    return '#ffffff';
  }
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, m[0]);
  g.addColorStop(1, m[1]);
  return g;
}
