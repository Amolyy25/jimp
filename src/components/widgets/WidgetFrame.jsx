/**
 * Visual container applied to every widget on both the editor canvas and
 * the /view page. It's where the per-widget style (bg, blur, border,
 * text colour) is turned into inline styles.
 *
 * - On the canvas it takes the full size of its absolutely-positioned
 *   parent; on mobile /view it's rendered inside a flex stack so its
 *   intrinsic height is preserved.
 * - Content is always left/top anchored — widgets manage their own
 *   alignment internally.
 */
export default function WidgetFrame({
  widget,
  children,
  mode = 'view',
  isMobile = false,
  index = 0,
}) {
  const s = widget.style || {};

  const backgroundColor =
    s.bgOpacity > 0 ? hexToRgba(s.bgColor || '#ffffff', s.bgOpacity) : 'transparent';
  const borderColor =
    (s.borderWidth ?? 0) > 0
      ? hexToRgba(s.borderColor || '#ffffff', s.borderOpacity ?? 0.08)
      : 'transparent';

  const style = {
    backgroundColor,
    border: `${s.borderWidth ?? 0}px solid ${borderColor}`,
    borderRadius: `${s.borderRadius ?? 16}px`,
    color: s.textColor || '#ffffff',
    fontFamily: s.fontFamily ? `'${s.fontFamily}', sans-serif` : 'inherit',
    // Only apply backdrop blur when there's some visible background — blur on
    // fully transparent backgrounds is wasted GPU work.
    backdropFilter:
      s.bgOpacity > 0 && (s.blur ?? 0) > 0
        ? `blur(${s.blur}px) saturate(180%)`
        : undefined,
    WebkitBackdropFilter:
      s.bgOpacity > 0 && (s.blur ?? 0) > 0
        ? `blur(${s.blur}px) saturate(180%)`
        : undefined,
  };

  return (
    <div
      data-widget-type={widget.type}
      className={[
        'relative h-full w-full overflow-hidden transition-all duration-300',
        isMobile ? 'min-h-[80px]' : '',
      ].join(' ')}
      style={style}
    >
      {children}
    </div>
  );
}

/** Convert `#rrggbb` or `#rgb` + alpha into an `rgba(...)` string. */
function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(255,255,255,${alpha})`;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
