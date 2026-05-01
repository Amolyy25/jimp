import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionValue } from 'framer-motion';
import BackgroundLayer from '../BackgroundLayer.jsx';
import WidgetFrame from '../widgets/WidgetFrame.jsx';
import { WIDGET_REGISTRY } from '../widgets/index.js';
import { resolveAccent } from '../../utils/theme.js';

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
  selectedIds,
  onSelect,
  onSelectMultiple,
  onWidgetsMove,
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
        const auto = !!s.widget.style?.autoSize && s.widget.type !== 'group';
        const rawX = auto
          ? clamp(s.origin.x + dxPct, 0, 100)
          : clamp(s.origin.x + dxPct, 0, 100 - s.widget.size.w);
        const rawY = auto
          ? clamp(s.origin.y + dyPct, 0, 100)
          : clamp(s.origin.y + dyPct, 0, 100 - s.widget.size.h);
        const { x, y, activeGuides } = snapPosition(
          rawX,
          rawY,
          s.widget,
          profile.widgets,
          auto,
        );
        
        const updates = [];
        if (s.groupOrigins && s.groupOrigins.length > 0) {
            const actualDx = x - s.origin.x;
            const actualDy = y - s.origin.y;
            s.groupOrigins.forEach(go => {
                updates.push({ id: go.id, patch: { pos: { x: round2(go.x + actualDx), y: round2(go.y + actualDy) } } });
            });
        } else {
            updates.push({ id: s.widget.id, patch: { pos: { x: round2(x), y: round2(y) } } });
        }
        onWidgetsMove(updates);
        setGuides(activeGuides);
      } else if (s.mode === 'resize') {
        const nw = clamp(s.origin.w + dxPct, 6, 100 - s.widget.pos.x);
        const nh = clamp(s.origin.h + dyPct, 5, 100 - s.widget.pos.y);
        
        const updates = [{ id: s.widget.id, patch: { size: { w: round2(nw), h: round2(nh) } } }];
        
        if (s.widget.type === 'group' && s.groupOrigins && s.groupOrigins.length > 0) {
            const groupRight = s.widget.pos.x + nw;
            const groupBottom = s.widget.pos.y + nh;

            s.groupOrigins.forEach(go => {
                if (go.id === s.widget.id) return;
                
                // "Clamping" resize: children stay fixed until group bounds squeeze them.
                let newW = go.w;
                let newH = go.h;
                let newX = go.x;
                let newY = go.y;

                // Horizontal clamping
                if (newX + newW > groupRight) {
                    newW = Math.max(2, groupRight - newX);
                    // If group shrinks past the child's left edge, push the child left.
                    if (newX + 2 > groupRight) {
                        newX = Math.max(s.widget.pos.x, groupRight - 2);
                        newW = 2;
                    }
                }

                // Vertical clamping
                if (newY + newH > groupBottom) {
                    newH = Math.max(2, groupBottom - newY);
                    if (newY + 2 > groupBottom) {
                        newY = Math.max(s.widget.pos.y, groupBottom - 2);
                        newH = 2;
                    }
                }
                
                updates.push({ 
                    id: go.id, 
                    patch: { 
                        pos: { x: round2(newX), y: round2(newY) }, 
                        size: { w: round2(newW), h: round2(newH) } 
                    } 
                });
            });
        }
        
        onWidgetsMove(updates);
      }
      redraw();
    }

    function onUp() {
      if (!dragState.current) return;
      const s = dragState.current;
      dragState.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setGuides([]);

      // Auto-parenting: if we moved widgets, check if their new center is inside a group
      if (s.mode === 'move' && s.widget.type !== 'group') {
         const draggedIds = s.groupOrigins && s.groupOrigins.length > 0 
             ? s.groupOrigins.map(go => go.id) 
             : [s.widget.id];
             
         const groups = profile.widgets.filter(w => w.type === 'group' && !draggedIds.includes(w.id));
         const updates = [];
         
         draggedIds.forEach(id => {
            const w = profile.widgets.find(widget => widget.id === id);
            if (!w || w.type === 'group') return;
            
            const el = document.getElementById(`widget-${id}`);
            if (!el) return;
            
            const finalX = parseFloat(el.style.left);
            const finalY = parseFloat(el.style.top);
            if (isNaN(finalX) || isNaN(finalY)) return;
            
            const auto = !!w.style?.autoSize;
            const cx = auto ? finalX : finalX + w.size.w / 2;
            const cy = auto ? finalY : finalY + w.size.h / 2;
            
            const targetGroup = [...groups].reverse().find(g => {
                return cx >= g.pos.x && cx <= g.pos.x + g.size.w &&
                       cy >= g.pos.y && cy <= g.pos.y + g.size.h;
            });
            
            const newGroupId = targetGroup ? targetGroup.id : null;
            if (w.groupId !== newGroupId) {
                updates.push({ id: w.id, patch: { groupId: newGroupId } });
            }
         });
         
         if (updates.length > 0) {
             onWidgetsMove(updates);
         }
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [onWidgetsMove, onWidgetResize, profile.widgets, redraw]);

  const startDrag = useCallback(
    (e, widget, mode) => {
      e.stopPropagation();
      e.preventDefault();

      if (e.altKey && mode === 'move') {
        onSelectMultiple(widget.id);
        return;
      }

      let draggingIds = [widget.id];
      if (selectedIds && selectedIds.includes(widget.id) && mode === 'move') {
         draggingIds = selectedIds;
      } else {
         onSelect(widget.id);
      }

      const draggedWidgets = profile.widgets.filter(w => draggingIds.includes(w.id));
      const groupIds = draggedWidgets.filter(w => w.type === 'group').map(w => w.id);
      const children = profile.widgets.filter(w => groupIds.includes(w.groupId));
      const allDraggedWidgets = [...new Set([...draggedWidgets, ...children])];

      dragState.current = {
        mode,
        widget,
        startX: e.clientX,
        startY: e.clientY,
        origin:
          mode === 'move'
            ? { x: widget.pos.x, y: widget.pos.y }
            : { w: widget.size.w, h: widget.size.h, x: widget.pos.x, y: widget.pos.y },
        groupOrigins: (mode === 'move' || (mode === 'resize' && widget.type === 'group'))
            ? allDraggedWidgets.map(w => ({ id: w.id, x: w.pos.x, y: w.pos.y, w: w.size.w, h: w.size.h })) 
            : [],
      };
      document.body.style.cursor = mode === 'resize' ? 'nwse-resize' : 'grabbing';
      document.body.style.userSelect = 'none';
    },
    [onSelect, onSelectMultiple, selectedIds, profile.widgets],
  );

  const visibleWidgets = useMemo(
    () => profile.widgets.filter((w) => w.visible !== false),
    [profile.widgets],
  );

  const accentResolved = resolveAccent(profile.theme?.accent);
  const accent = accentResolved.hex;
  const accentCss = accentResolved.css;

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
          {(() => {
            const groupIds = visibleWidgets.filter((w) => w.type === 'group').map(g => g.id);
            const rootWidgets = visibleWidgets.filter((w) => !w.groupId || !groupIds.includes(w.groupId));

            return rootWidgets.map((widget, i) => {
               if (widget.type === 'group') {
                  const children = visibleWidgets.filter(w => w.groupId === widget.id);
                  return (
                    <GroupLayer 
                      key={widget.id}
                      groupWidget={widget}
                      childWidgets={children}
                      isSelected={selectedIds?.includes(widget.id)}
                      selectedIds={selectedIds}
                      startDrag={startDrag}
                      accent={accent}
                      accentCss={accentCss}
                      index={i}
                      visibleWidgets={visibleWidgets}
                    />
                  );
               }
               
               return (
                 <WidgetNode 
                   key={widget.id}
                   widget={widget}
                   isSelected={selectedIds?.includes(widget.id)}
                   startDrag={startDrag}
                   accent={accent}
                   accentCss={accentCss}
                   index={i}
                 />
               );
            });
          })()}

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

function GroupLayer({ groupWidget, childWidgets, isSelected, selectedIds, startDrag, accent, accentCss, index, visibleWidgets }) {
  const auto = !!groupWidget.style?.autoSize;
  const enable3D = groupWidget.data?.enable3D;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['15deg', '-15deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-15deg', '15deg']);

  useEffect(() => {
    if (!enable3D) {
      x.set(0);
      y.set(0);
      return;
    }

    const handleMouseMove = (e) => {
      const groupEl = document.getElementById(`widget-${groupWidget.id}`);
      if (!groupEl) return;
      
      const rect = groupEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      
      const deltaX = e.clientX - cx;
      const deltaY = e.clientY - cy;
      
      const pctX = Math.max(-1, Math.min(1, deltaX / (window.innerWidth / 2)));
      const pctY = Math.max(-1, Math.min(1, deltaY / (window.innerHeight / 2)));
      
      x.set(pctX * 0.5);
      y.set(pctY * 0.5);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enable3D, groupWidget.id, x, y]);

  const cx = groupWidget.pos.x + groupWidget.size.w / 2;
  const cy = groupWidget.pos.y + groupWidget.size.h / 2;

  const isChildSelected = childWidgets.some(w => selectedIds?.includes(w.id));

  return (
    <motion.div 
      className="absolute inset-0 pointer-events-none"
      style={{
        transformOrigin: `${cx}% ${cy}%`,
        perspective: enable3D ? 1000 : 'none',
        rotateX: enable3D ? rotateX : 0,
        rotateY: enable3D ? rotateY : 0,
        zIndex: isSelected || isChildSelected ? 30 : 20,
      }}
    >
      <WidgetNode 
        key={groupWidget.id}
        widget={groupWidget}
        isSelected={isSelected}
        startDrag={startDrag}
        accent={accent}
        accentCss={accentCss}
        index={index}
      />
      {childWidgets.map((w, j) => {
        if (w.type === 'group') {
          const subChildren = visibleWidgets.filter(sw => sw.groupId === w.id);
          return (
            <GroupLayer 
              key={w.id}
              groupWidget={w}
              childWidgets={subChildren}
              isSelected={selectedIds?.includes(w.id)}
              selectedIds={selectedIds}
              startDrag={startDrag}
              accent={accent}
              accentCss={accentCss}
              index={index + 1 + j}
              visibleWidgets={visibleWidgets}
            />
          );
        }
        return (
          <WidgetNode 
            key={w.id} 
            widget={w} 
            isSelected={selectedIds?.includes(w.id)} 
            startDrag={startDrag} 
            accent={accent} 
            accentCss={accentCss} 
            index={index + 1 + j}
          />
        );
      })}
    </motion.div>
  );
}

function WidgetNode({ widget, isSelected, startDrag, accent, accentCss, index }) {
  const auto = !!widget.style?.autoSize && widget.type !== 'group';
  const wrapperStyle = auto
    ? {
        left: `${widget.pos.x}%`,
        top: `${widget.pos.y}%`,
        transform: 'translate(-50%, -50%)',
        maxWidth: `${widget.size.w}%`,
        maxHeight: `${widget.size.h}%`,
        boxShadow: isSelected
          ? '0 0 0 1.5px rgba(88,101,242,0.9), 0 0 30px rgba(88,101,242,0.25)'
          : undefined,
        borderRadius: `${widget.style?.borderRadius ?? 16}px`,
      }
    : {
        left: `${widget.pos.x}%`,
        top: `${widget.pos.y}%`,
        width: `${widget.size.w}%`,
        height: `${widget.size.h}%`,
        boxShadow: isSelected
          ? '0 0 0 1.5px rgba(88,101,242,0.9), 0 0 30px rgba(88,101,242,0.25)'
          : undefined,
        borderRadius: `${widget.style?.borderRadius ?? 16}px`,
      };

  return (
    <div
      id={`widget-${widget.id}`}
      className={['group absolute select-none transition-shadow pointer-events-auto', isSelected ? 'z-30' : 'z-20'].join(' ')}
      style={wrapperStyle}
      onPointerDown={(e) => startDrag(e, widget, 'move')}
    >
      {(widget.style?.bgOpacity ?? 0) < 0.03 && !isSelected && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-dashed border-white/10 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      )}

      <div className="pointer-events-none h-full w-full">
        <WidgetFrame widget={widget} mode="edit" index={index}>
          <WidgetPreview widget={widget} accent={accent} accentCss={accentCss} />
        </WidgetFrame>
      </div>

      {isSelected && (
        <div className="pointer-events-none absolute -top-7 left-0 flex items-center gap-1.5 rounded-md bg-discord px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-md">
          <DragDots /> {widget.type}
          {auto && <span className="opacity-70">· auto</span>}
        </div>
      )}

      {isSelected && !auto && (
        <span
          onPointerDown={(e) => startDrag(e, widget, 'resize')}
          className="absolute -bottom-1.5 -right-1.5 z-40 flex h-5 w-5 cursor-nwse-resize items-center justify-center rounded-full border-2 border-ink-950 bg-discord"
          title="Resize"
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Alignment & snapping                                                       */
/* -------------------------------------------------------------------------- */

function snapPosition(x, y, widget, allWidgets, autoSize) {
  const { w, h } = widget.size;
  const activeGuides = [];

  const xAnchors = collectAnchors('x', widget, allWidgets);
  const yAnchors = collectAnchors('y', widget, allWidgets);

  // For autoSize widgets, `pos` is already the centre — only the centre
  // is a meaningful snap target. For fixed-size widgets, edges + centre
  // give richer alignment (left-aligned columns, etc.).
  const curX = autoSize
    ? [{ value: x, kind: 'centre' }]
    : [
        { value: x, kind: 'left' },
        { value: x + w / 2, kind: 'centre' },
        { value: x + w, kind: 'right' },
      ];
  const curY = autoSize
    ? [{ value: y, kind: 'centre' }]
    : [
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
    const auto = !!other.style?.autoSize && other.type !== 'group';
    const p = axis === 'x' ? other.pos.x : other.pos.y;
    const s = axis === 'x' ? other.size.w : other.size.h;

    if (auto) {
      anchors.add(p - s / 2); // left/top
      anchors.add(p);         // centre
      anchors.add(p + s / 2); // right/bottom
    } else {
      anchors.add(p);         // left/top
      anchors.add(p + s / 2); // centre
      anchors.add(p + s);     // right/bottom
    }
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
function WidgetPreview({ widget, accent, accentCss }) {
  const Component = WIDGET_REGISTRY[widget.type]?.component;
  if (!Component) {
    return (
      <div className="flex h-full w-full items-center justify-center text-xs opacity-50">
        Unknown widget
      </div>
    );
  }
  return <Component widget={widget} musicPlaying={false} accent={accent} accentCss={accentCss} />;
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
