import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BackgroundLayer from '../BackgroundLayer.jsx';
import WidgetFrame from '../widgets/WidgetFrame.jsx';
import { WIDGET_REGISTRY } from '../widgets/index.js';

/**
 * Freeform editor canvas.
 *
 * Every widget carries its position/size as **percentages of the inner
 * aspect-ratio box** (the 16:9 surface that mirrors the published /slug
 * page exactly). The outer canvas fills the available space and may be
 * wider or taller than 16:9; the inner box is what actually frames the
 * profile.
 *
 * IMPORTANT — percent math is measured against the *inner* box, not the
 * outer canvas. A previous version used the outer div's rect, which made
 * Y-drag lag by ~20% on most screens and caused widgets to drift to a
 * different spot the moment the profile was opened on /:slug.
 *
 * Alignment guides snap a dragged widget's edges/centre to:
 *   - the inner box's edges + centre
 *   - every other visible widget's edges + centres
 */

const SNAP_THRESHOLD = 0.8;   // in %
const GUIDE_COLOR = 'rgba(88,101,242,0.9)';

export default function DragCanvas({
  profile,
  selectedId,
  onSelect,
  onWidgetMove,
  onWidgetResize,
}) {
  const canvasRef = useRef(null);   // full outer div — click-empty-to-deselect
  const gridRef = useRef(null);     // the 16:9 inner box — authoritative ref
  const dragState = useRef(null);
  const [, force] = useState(0);
  const redraw = useCallback(() => force((n) => n + 1), []);
  const [guides, setGuides] = useState([]);

  /* -------------------------------------------------------------------- */
  /* Pointer loop                                                          */
  /* -------------------------------------------------------------------- */

  useEffect(() => {
    function onMove(e) {
      const s = dragState.current;
      if (!s) return;
      const grid = gridRef.current;
      if (!grid) return;
      // The grid rect — NOT the outer canvas — defines the 100% reference
      // frame for both position and size percentages. Using the outer rect
      // was the source of the infamous "widget jumps to a different spot
      // after saving" bug.
      const rect = grid.getBoundingClientRect();
      const dxPct = ((e.clientX - s.startX) / rect.width) * 100;
      const dyPct = ((e.clientY - s.startY) / rect.height) * 100;

      if (s.mode === 'move') {
        const rawX = clamp(s.origin.x + dxPct, 0, 100 - s.widget.size.w);
        const rawY = clamp(s.origin.y + dyPct, 0, 100 - s.widget.size.h);
        const { x, y, activeGuides } = snapPosition(
          rawX,
          rawY,
          s.widget,
          profile.widgets,
        );
        onWidgetMove(s.widget.id, { x: round2(x), y: round2(y) });
        setGuides(activeGuides);
      } else if (s.mode === 'resize') {
        const nw = clamp(s.origin.w + dxPct, 6, 100 - s.widget.pos.x);
        const nh = clamp(s.origin.h + dyPct, 5, 100 - s.widget.pos.y);
        onWidgetResize(s.widget.id, { w: round2(nw), h: round2(nh) });
      }
      redraw();
    }

    function onUp() {
      if (!dragState.current) return;
      dragState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setGuides([]);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [onWidgetMove, onWidgetResize, profile.widgets, redraw]);

  const startDrag = useCallback(
    (e, widget, mode) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect(widget.id);
      dragState.current = {
        mode,
        widget,
        startX: e.clientX,
        startY: e.clientY,
        origin:
          mode === 'move'
            ? { x: widget.pos.x, y: widget.pos.y }
            : { w: widget.size.w, h: widget.size.h },
      };
      document.body.style.cursor = mode === 'resize' ? 'nwse-resize' : 'grabbing';
      document.body.style.userSelect = 'none';
    },
    [onSelect],
  );

  const visibleWidgets = useMemo(
    () => profile.widgets.filter((w) => w.visible !== false),
    [profile.widgets],
  );

  const accent = profile.theme?.accent || '#5865F2';

  /* -------------------------------------------------------------------- */
  /* Render                                                                */
  /* -------------------------------------------------------------------- */

  return (
    <div
      ref={canvasRef}
      onPointerDown={() => onSelect(null)}
      className="relative h-full w-full overflow-hidden bg-black"
      style={{ background: profile.theme?.pageBg || '#0a0a0a' }}
    >
      <BackgroundLayer background={profile.background} />

      {/* Aspect-ratio constrained widget layer — the 16:9 canvas that
          mirrors /:slug pixel-for-pixel. */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={gridRef}
          className="relative aspect-video h-full max-h-full w-auto max-w-full"
        >
          {visibleWidgets.map((widget, i) => {
            const isSelected = widget.id === selectedId;
            return (
              <div
                key={widget.id}
                className={[
                  'group absolute select-none transition-shadow',
                  isSelected ? 'z-30' : 'z-20',
                ].join(' ')}
                style={{
                  left: `${widget.pos.x}%`,
                  top: `${widget.pos.y}%`,
                  width: `${widget.size.w}%`,
                  height: `${widget.size.h}%`,
                  boxShadow: isSelected
                    ? '0 0 0 1.5px rgba(88,101,242,0.9), 0 0 30px rgba(88,101,242,0.25)'
                    : undefined,
                  borderRadius: `${widget.style?.borderRadius ?? 16}px`,
                }}
                onPointerDown={(e) => startDrag(e, widget, 'move')}
              >
                {(widget.style?.bgOpacity ?? 0) < 0.03 && !isSelected && (
                  <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-dashed border-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                )}

                <div className="pointer-events-none h-full w-full">
                  <WidgetFrame widget={widget} mode="edit" index={i}>
                    <WidgetPreview widget={widget} accent={accent} />
                  </WidgetFrame>
                </div>

                {isSelected && (
                  <div className="pointer-events-none absolute -top-7 left-0 flex items-center gap-1.5 rounded-md bg-discord px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
                    <DragDots /> {widget.type}
                  </div>
                )}

                {isSelected && (
                  <span
                    onPointerDown={(e) => startDrag(e, widget, 'resize')}
                    className="absolute -bottom-1.5 -right-1.5 z-40 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border-2 border-ink-950 bg-discord"
                    title="Resize"
                  />
                )}
              </div>
            );
          })}

          {/* Guides live inside the grid so their % coordinates match the
              widgets'. */}
          <GuideOverlay guides={guides} />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 left-6 z-40 flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/40">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-discord" />
        Live preview · 16:9 canvas · matches /:slug exactly
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Alignment & snapping                                                       */
/* -------------------------------------------------------------------------- */

function snapPosition(x, y, widget, allWidgets) {
  const { w, h } = widget.size;
  const activeGuides = [];

  const xAnchors = collectAnchors('x', widget, allWidgets);
  const yAnchors = collectAnchors('y', widget, allWidgets);

  const curX = [
    { value: x, kind: 'left' },
    { value: x + w / 2, kind: 'centre' },
    { value: x + w, kind: 'right' },
  ];
  const curY = [
    { value: y, kind: 'top' },
    { value: y + h / 2, kind: 'centre' },
    { value: y + h, kind: 'bottom' },
  ];

  let snappedX = x;
  let bestDx = SNAP_THRESHOLD;
  for (const cur of curX) {
    for (const anchor of xAnchors) {
      const d = Math.abs(cur.value - anchor);
      if (d < bestDx) {
        bestDx = d;
        snappedX = anchor - (cur.value - x);
      }
    }
  }
  if (bestDx < SNAP_THRESHOLD) {
    for (const anchor of xAnchors) {
      if (curX.some((cur) => Math.abs(cur.value - anchor + (snappedX - x)) < 0.01)) {
        activeGuides.push({ axis: 'x', at: anchor });
      }
    }
  }

  let snappedY = y;
  let bestDy = SNAP_THRESHOLD;
  for (const cur of curY) {
    for (const anchor of yAnchors) {
      const d = Math.abs(cur.value - anchor);
      if (d < bestDy) {
        bestDy = d;
        snappedY = anchor - (cur.value - y);
      }
    }
  }
  if (bestDy < SNAP_THRESHOLD) {
    for (const anchor of yAnchors) {
      if (curY.some((cur) => Math.abs(cur.value - anchor + (snappedY - y)) < 0.01)) {
        activeGuides.push({ axis: 'y', at: anchor });
      }
    }
  }

  return { x: snappedX, y: snappedY, activeGuides };
}

function collectAnchors(axis, widget, allWidgets) {
  const anchors = new Set([0, 50, 100]); // grid edges + centre
  for (const other of allWidgets) {
    if (other.id === widget.id || other.visible === false) continue;
    const p = axis === 'x' ? other.pos.x : other.pos.y;
    const s = axis === 'x' ? other.size.w : other.size.h;
    anchors.add(p);
    anchors.add(p + s / 2);
    anchors.add(p + s);
  }
  return Array.from(anchors);
}

function GuideOverlay({ guides }) {
  if (!guides.length) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      {guides.map((g, i) => (
        <span
          key={`${g.axis}-${g.at}-${i}`}
          className="absolute"
          style={
            g.axis === 'x'
              ? {
                  left: `${g.at}%`,
                  top: 0,
                  bottom: 0,
                  width: '1px',
                  background: GUIDE_COLOR,
                  boxShadow: `0 0 8px ${GUIDE_COLOR}`,
                }
              : {
                  top: `${g.at}%`,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: GUIDE_COLOR,
                  boxShadow: `0 0 8px ${GUIDE_COLOR}`,
                }
          }
        />
      ))}
    </div>
  );
}

/** Render a widget using the same accent as the published view. */
function WidgetPreview({ widget, accent }) {
  const Component = WIDGET_REGISTRY[widget.type]?.component;
  if (!Component) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
        Unknown widget
      </div>
    );
  }
  return <Component widget={widget} musicPlaying={false} accent={accent} />;
}

function DragDots() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
      <circle cx="2" cy="2" r="1" />
      <circle cx="8" cy="2" r="1" />
      <circle cx="2" cy="5" r="1" />
      <circle cx="8" cy="5" r="1" />
      <circle cx="2" cy="8" r="1" />
      <circle cx="8" cy="8" r="1" />
    </svg>
  );
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}
function round2(v) {
  return Math.round(v * 100) / 100;
}
