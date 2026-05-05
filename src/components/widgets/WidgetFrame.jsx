import { resolveAccent } from '../../utils/theme.js';

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
  theme,
  mode = 'view',
  isMobile = false,
  index = 0,
}) {
  const s = widget.style || {};
  const accentResolved = resolveAccent(theme?.accent);
  const accent = accentResolved.hex;
  const accentCss = accentResolved.css;
  const hover = theme?.widgetHover || 'none';
  const float = theme?.widgetFloat || 'none';
  const surface = theme?.widgetSurface || 'none';
  const particles = theme?.widgetParticles || 'none';
  const accentBar = theme?.widgetAccentBar || 'none';
  const glowIntensity = Math.max(0, Math.min(1, theme?.widgetGlowIntensity ?? 0.35));

  const backgroundColor =
    s.bgOpacity > 0 ? hexToRgba(s.bgColor || '#ffffff', s.bgOpacity) : 'transparent';
  const borderColor =
    (s.borderWidth ?? 0) > 0
      ? hexToRgba(s.borderColor || '#ffffff', s.borderOpacity ?? 0.08)
      : 'transparent';

  const shadowColor = s.shadowOpacity > 0 ? hexToRgba(s.shadowColor || '#ffffff', s.shadowOpacity) : 'transparent';
  const boxShadow = s.shadowOpacity > 0 ? `0px 8px ${s.shadowBlur ?? 32}px ${s.shadowSpread ?? 0}px ${shadowColor}` : undefined;
  const themeGlow =
    glowIntensity > 0
      ? `0 0 ${18 + Math.round(glowIntensity * 38)}px ${hexToRgba(accent, glowIntensity * 0.22)}`
      : undefined;

  const style = {
    backgroundColor,
    border: `${s.borderWidth ?? 0}px solid ${borderColor}`,
    borderRadius: `${s.borderRadius ?? 16}px`,
    color: s.textColor || '#ffffff',
    fontFamily: s.fontFamily ? `'${s.fontFamily}', sans-serif` : 'inherit',
    boxShadow: [boxShadow, themeGlow].filter(Boolean).join(', ') || undefined,
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
    transformStyle: 'preserve-3d',
  };

  const accentBarStyle =
    accentBar === 'top'
      ? { inset: '0 0 auto 0', height: '2px', background: accentCss }
      : accentBar === 'bottom'
        ? { inset: 'auto 0 0 0', height: '2px', background: accentCss }
        : accentBar === 'left'
          ? { inset: '0 auto 0 0', width: '2px', background: accentCss }
          : accentBar === 'right'
            ? { inset: '0 0 0 auto', width: '2px', background: accentCss }
            : null;

  return (
    <div
      data-widget-type={widget.type}
      className={[
        'relative h-full w-full overflow-hidden transition-all duration-300',
        hover !== 'none' ? `persn-widget-hover-${hover}` : '',
        float !== 'none' ? `persn-widget-float-${float}` : '',
        isMobile ? 'min-h-[80px]' : '',
      ].join(' ')}
      style={style}
    >
      {surface === 'aurora' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 persn-widget-surface-aurora"
          style={{
            background: `radial-gradient(90% 70% at 0% 0%, ${hexToRgba(accent, 0.22)} 0%, transparent 55%), radial-gradient(90% 70% at 100% 100%, ${hexToRgba(accent, 0.15)} 0%, transparent 48%)`,
          }}
        />
      )}
      {surface === 'scanlines' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 persn-widget-surface-scanlines"
          style={{
            backgroundImage: 'repeating-linear-gradient(180deg, rgba(255,255,255,0.08) 0 1px, transparent 1px 4px)',
          }}
        />
      )}
      {surface === 'spotlight' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${hexToRgba(accent, 0.2)} 0%, transparent 58%)`,
          }}
        />
      )}
      {surface === 'glass' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 persn-widget-surface-glass"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 35%, transparent 100%)',
          }}
        />
      )}
      {accentBarStyle && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-[1]"
          style={accentBarStyle}
        />
      )}
      {particles !== 'none' && (
        <span className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: particles === 'sparkles' ? 7 : 5 }).map((_, idx) => (
            <span
              key={`${particles}-${idx}`}
              className={particles === 'sparkles' ? 'persn-widget-particle-sparkle' : 'persn-widget-particle-orb'}
              style={{
                left: `${12 + ((idx * 13) % 74)}%`,
                top: `${10 + ((idx * 17) % 68)}%`,
                animationDelay: `${idx * 0.45}s`,
                animationDuration: `${particles === 'sparkles' ? 2.8 + (idx * 0.22) : 4.8 + (idx * 0.35)}s`,
                background: particles === 'sparkles' ? accent : hexToRgba(accent, 0.28),
                boxShadow: `0 0 14px ${hexToRgba(accent, 0.42)}`,
              }}
            />
          ))}
        </span>
      )}
      <div className="relative z-[2] h-full w-full">
        {children}
      </div>
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
