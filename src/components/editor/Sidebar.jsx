import { useState } from 'react';
import { WIDGET_CATALOG } from '../../utils/widgetDefaults.js';
import WidgetPanel from './WidgetPanel.jsx';
import StylePanel from './StylePanel.jsx';
import BackgroundPanel from './BackgroundPanel.jsx';
import MusicPanel from './MusicPanel.jsx';
import ColorInput from './controls/ColorInput.jsx';
import SliderInput from './controls/SliderInput.jsx';
import TextInput from './controls/TextInput.jsx';
import VanityUrlPanel from './VanityUrlPanel.jsx';
import TemplatesPanel from './TemplatesPanel.jsx';
import AnalyticsPanel from './AnalyticsPanel.jsx';
import { resolveAccent } from '../../utils/theme.js';

/**
 * Right-hand editor sidebar.
 *
 * Two modes:
 *   - nothing selected → global settings (theme, background, music) + the
 *     list of widgets with show/hide/delete and an "+ Add widget" picker.
 *   - a widget selected → its content panel + its style panel, plus a
 *     back button to return to the global view.
 */
export default function Sidebar({
  profile,
  selectedWidget,
  onSelectWidget,
  onToggleWidget,
  onAddWidget,
  onRemoveWidget,
  onUpdateTheme,
  onUpdateBackground,
  onUpdateMusic,
  onUpdateWidgetData,
  onUpdateWidgetStyle,
  activeSection,
  onSectionChange,
  me,
  onSlugClaimed,
  onApplyTemplate,
  serverSlug,
  onOpenHistory,
}) {
  return (
    <aside className="flex h-screen w-[380px] flex-col border-l border-white/5 bg-ink-900">
      {selectedWidget ? (
        <WidgetView
          profile={profile}
          widget={selectedWidget}
          onBack={() => onSelectWidget(null)}
          onRemove={() => onRemoveWidget(selectedWidget.id)}
          onUpdateData={(patch) => onUpdateWidgetData(selectedWidget.id, patch)}
          onUpdateStyle={(patch) => onUpdateWidgetStyle(selectedWidget.id, patch)}
        />
      ) : (
        <GlobalView
          profile={profile}
          section={activeSection}
          onSectionChange={onSectionChange}
          onSelectWidget={onSelectWidget}
          onToggleWidget={onToggleWidget}
          onAddWidget={onAddWidget}
          onRemoveWidget={onRemoveWidget}
          onUpdateTheme={onUpdateTheme}
          onUpdateBackground={onUpdateBackground}
          onUpdateMusic={onUpdateMusic}
          me={me}
          onSlugClaimed={onSlugClaimed}
          onApplyTemplate={onApplyTemplate}
          serverSlug={serverSlug}
          onOpenHistory={onOpenHistory}
        />
      )}
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Global view — no widget selected                                           */
/* -------------------------------------------------------------------------- */

function GlobalView({
  profile,
  section,
  onSectionChange,
  onSelectWidget,
  onToggleWidget,
  onAddWidget,
  onRemoveWidget,
  onUpdateTheme,
  onUpdateBackground,
  onUpdateMusic,
  me,
  onSlugClaimed,
  onApplyTemplate,
  serverSlug,
  onOpenHistory,
}) {

  return (
    <>
      <SidebarHeader title="Profile">
        <p className="mt-1 text-xs text-white/40">
          Pick a section. Click any widget on the canvas to edit it directly.
        </p>
      </SidebarHeader>

      <SectionTabs
        sections={[
          { id: 'widgets', label: 'Widgets' },
          { id: 'templates', label: 'Templates' },
          { id: 'background', label: 'Background' },
          { id: 'music', label: 'Music' },
          { id: 'theme', label: 'Theme' },
          { id: 'analytics', label: 'Analytics' },
          { id: 'share', label: 'Share' },
        ]}
        active={section}
        onChange={onSectionChange}
      />

      <div className="flex-1 space-y-5 overflow-y-auto thin-scroll px-5 py-5">
        {section === 'widgets' && (
          <WidgetListSection
            profile={profile}
            onSelectWidget={onSelectWidget}
            onToggleWidget={onToggleWidget}
            onAddWidget={onAddWidget}
            onRemoveWidget={onRemoveWidget}
          />
        )}
        {section === 'templates' && (
          <TemplatesPanel onApply={onApplyTemplate} />
        )}
        {section === 'background' && (
          <BackgroundPanel
            background={profile.background}
            onChange={onUpdateBackground}
          />
        )}
        {section === 'music' && (
          <MusicPanel music={profile.music} onChange={onUpdateMusic} me={me} />
        )}
        {section === 'theme' && (
          <ThemeSection theme={profile.theme} onChange={onUpdateTheme} />
        )}
        {section === 'analytics' && (
          <AnalyticsPanel slug={serverSlug} onOpenHistory={onOpenHistory} />
        )}
        {section === 'share' && (
          <VanityUrlPanel
            profile={profile}
            me={me}
            onSlugClaimed={onSlugClaimed}
          />
        )}
      </div>
    </>
  );
}

function ThemeSection({ theme, onChange }) {
  const cursor = theme?.cursor || 'default';

  const handleCursorUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    onChange({ cursor: 'custom', cursorUrl: dataUrl });
  };

  return (
    <div className="space-y-4">
      <AccentEditor accent={theme?.accent} onChange={(v) => onChange({ accent: v })} />
      <ColorInput
        label="Page background"
        value={theme?.pageBg}
        onChange={(v) => onChange({ pageBg: v })}
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Accent is used for pulses, hovers and highlights. Page background only
        shows through when no image/video background is set.
      </p>

      <div className="border-t border-white/5" />

      <TextInput
        label="Entry Animation"
        value={theme?.entryAnimation || 'none'}
        onChange={(v) => onChange({ entryAnimation: v })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'fade', label: 'Fade In' },
          { value: 'slide-up', label: 'Slide Up' },
          { value: 'scale', label: 'Scale In' },
          { value: 'blur', label: 'Blur In' },
        ]}
      />

      <div className="border-t border-white/5" />

      <TextInput
        label="Cursor"
        value={cursor}
        onChange={(v) => onChange({ cursor: v })}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'pointer', label: 'Pointer (hand)' },
          { value: 'crosshair', label: 'Crosshair' },
          { value: 'none', label: 'None (hidden)' },
          { value: 'custom', label: 'Custom image' },
        ]}
      />
      {cursor === 'custom' && (
        <>
          <TextInput
            label="Cursor image URL"
            value={theme?.cursorUrl}
            onChange={(v) => onChange({ cursorUrl: v })}
            placeholder="https://… (32×32 png ideal)"
          />
          <label className="block space-y-1.5">
            <span className="eyebrow">…or upload</span>
            <input
              type="file"
              accept="image/png, image/gif, image/svg+xml"
              onChange={handleCursorUpload}
              className="block w-full text-xs text-white/60 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
            />
          </label>
          <p className="text-[11px] leading-relaxed text-white/40">
            Browsers require small, square images (ideally 32×32 PNG). The hot
            spot is anchored near the top-left.
          </p>
        </>
      )}

      <div className="border-t border-white/5" />

      <TextInput
        label="Cursor trail"
        value={theme?.cursorTrail || 'none'}
        onChange={(v) => onChange({ cursorTrail: v })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'glow', label: 'Glow (accent)' },
          { value: 'stars', label: 'Stars (sparkle)' },
          { value: 'neon', label: 'Neon (laser line)' },
        ]}
      />

      <TextInput
        label="Particles"
        value={theme?.particles || 'none'}
        onChange={(v) => onChange({ particles: v })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'snow', label: 'Snow' },
          { value: 'stars', label: 'Stars' },
          { value: 'dust', label: 'Dust (accent)' },
          { value: 'confetti', label: 'Confetti' },
        ]}
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Ambient effects only run on desktop viewers and respect{' '}
        <code>prefers-reduced-motion</code>.
      </p>

      <div className="border-t border-white/5" />

      <h3 className="eyebrow">Splash / Enter screen</h3>
      <ToggleRow
        title="Enable splash gate"
        subtitle="Show a click-to-enter screen before revealing the profile. Also unlocks music autoplay."
        checked={!!theme?.splash?.enabled}
        onChange={(v) =>
          onChange({ splash: { ...(theme?.splash || {}), enabled: v } })
        }
      />
      <TextInput
        label="Splash text"
        value={theme?.splash?.text || ''}
        onChange={(v) =>
          onChange({ splash: { ...(theme?.splash || {}), text: v } })
        }
        placeholder="Click to enter"
        maxLength={40}
        filter
      />
      <TextInput
        label="Splash subtitle (optional)"
        value={theme?.splash?.subtitle || ''}
        onChange={(v) =>
          onChange({ splash: { ...(theme?.splash || {}), subtitle: v } })
        }
        placeholder="A tiny tagline, if you like"
        maxLength={80}
        filter
      />

      <div className="border-t border-white/5" />

      <CustomCssEditor
        value={theme?.customCss || ''}
        onChange={(v) => onChange({ customCss: v })}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Accent editor — solid or gradient                                          */
/* -------------------------------------------------------------------------- */

function AccentEditor({ accent, onChange }) {
  const resolved = resolveAccent(accent);
  const isGradient = resolved.kind === 'gradient';

  const setSolid = (hex) => onChange({ kind: 'solid', value: hex });
  const setGradient = (patch) =>
    onChange({
      kind: 'gradient',
      from: resolved.from,
      to: resolved.to,
      angle: resolved.angle,
      ...patch,
    });

  return (
    <div className="space-y-2.5 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Accent</span>
        <div className="flex rounded-full border border-white/10 bg-black/30 p-0.5 text-[10px] font-bold uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setSolid(resolved.hex)}
            className={[
              'rounded-full px-3 py-1 transition',
              !isGradient ? 'bg-discord text-white' : 'text-white/40',
            ].join(' ')}
          >
            Solid
          </button>
          <button
            type="button"
            onClick={() =>
              setGradient({
                from: resolved.from,
                to: shiftHue(resolved.hex),
              })
            }
            className={[
              'rounded-full px-3 py-1 transition',
              isGradient ? 'bg-discord text-white' : 'text-white/40',
            ].join(' ')}
          >
            Gradient
          </button>
        </div>
      </div>

      <div
        className="h-10 w-full rounded-lg border border-white/10"
        style={{ background: resolved.css }}
        aria-hidden
      />

      {!isGradient ? (
        <ColorInput
          label="Color"
          value={resolved.hex}
          onChange={(v) => setSolid(v)}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <ColorInput
              label="From"
              value={resolved.from}
              onChange={(v) => setGradient({ from: v })}
            />
            <ColorInput
              label="To"
              value={resolved.to}
              onChange={(v) => setGradient({ to: v })}
            />
          </div>
          <SliderInput
            label="Angle"
            min={0}
            max={360}
            step={1}
            value={resolved.angle}
            onChange={(v) => setGradient({ angle: v })}
            unit="°"
          />
        </>
      )}
    </div>
  );
}

function shiftHue(hex) {
  // Cheap "give me a different color" — flip a couple of channels.
  if (!hex || !hex.startsWith('#')) return '#3BA9FF';
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const swap = (n) => Math.max(0, Math.min(255, 255 - n));
  return `#${[swap(r), swap(g), swap(b)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`;
}

/* -------------------------------------------------------------------------- */
/* Custom CSS editor                                                          */
/* -------------------------------------------------------------------------- */

const CUSTOM_CSS_LIMIT = 4096;

function CustomCssEditor({ value, onChange }) {
  const len = (value || '').length;
  const over = len > CUSTOM_CSS_LIMIT;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Custom CSS (advanced)</span>
        <span
          className={[
            'text-[10px] font-mono tabular-nums',
            over ? 'text-red-400' : 'text-white/30',
          ].join(' ')}
        >
          {len}/{CUSTOM_CSS_LIMIT}
        </span>
      </div>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value.slice(0, CUSTOM_CSS_LIMIT))}
        spellCheck={false}
        rows={8}
        placeholder={`/* scoped to your profile */\n.widget { letter-spacing: 0.04em; }\n[data-widget-type="games"] { transform: rotate(-1deg); }`}
        className="block w-full resize-y rounded-xl border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] leading-relaxed text-white/80 outline-none transition focus:border-discord/60"
      />
      <p className="text-[10px] leading-relaxed text-white/40">
        Scoped to <code className="text-white/60">#profile-root</code>. Available
        selectors: <code>.widget</code>,{' '}
        <code>[data-widget-type=&quot;games&quot;]</code>,{' '}
        <code>[data-widget-type=&quot;avatar&quot;]</code>, etc.{' '}
        <code>@import</code>, <code>expression()</code> and{' '}
        <code>url(javascript:…)</code> are stripped server-side.
      </p>
    </div>
  );
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* -------- toggle atoms (scoped to this file) -------- */

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative h-6 w-10 rounded-full border transition',
        checked ? 'border-discord bg-discord' : 'border-white/10 bg-white/10',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function ToggleRow({ title, subtitle, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div>
        <div className="text-xs font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-white/40">{subtitle}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </label>
  );
}

/* -------- widget list -------- */

function WidgetListSection({
  profile,
  onSelectWidget,
  onToggleWidget,
  onAddWidget,
  onRemoveWidget,
}) {
  const [adderOpen, setAdderOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Active widgets</span>
        <button
          type="button"
          onClick={() => setAdderOpen((v) => !v)}
          className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          {adderOpen ? 'Close' : '+ Add'}
        </button>
      </div>

      {adderOpen && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-2">
          {Object.values(WIDGET_CATALOG).map((def) => (
            <button
              key={def.type}
              type="button"
              onClick={() => {
                onAddWidget(def.type);
                setAdderOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-left text-[11px] font-medium text-white/80 transition hover:border-discord/40 hover:bg-discord/10"
            >
              <span className="text-base">{widgetEmoji(def.type)}</span>
              <span className="truncate">{def.label}</span>
            </button>
          ))}
        </div>
      )}

      <ul className="space-y-1.5">
        {profile.widgets.map((w) => (
          <li key={w.id}>
            <div
              className={[
                'group flex items-center gap-2 rounded-xl border border-transparent bg-white/[0.02] px-3 py-2.5 transition',
                'hover:border-white/10 hover:bg-white/[0.05]',
                w.visible === false ? 'opacity-40' : '',
              ].join(' ')}
            >
              <button
                type="button"
                onClick={() => onSelectWidget(w.id)}
                className="flex flex-1 items-center gap-2 text-left"
              >
                <span className="text-base">{widgetEmoji(w.type)}</span>
                <span className="truncate text-xs font-medium text-white/90">
                  {WIDGET_CATALOG[w.type]?.label || w.type}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onToggleWidget(w.id)}
                className="rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
                title={w.visible === false ? 'Show' : 'Hide'}
              >
                {w.visible === false ? <EyeOff /> : <Eye />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Delete this widget?')) onRemoveWidget(w.id);
                }}
                className="rounded-full p-1.5 text-white/40 transition hover:bg-red-500/20 hover:text-red-300"
                title="Delete"
              >
                <Trash />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Widget view — one widget selected                                          */
/* -------------------------------------------------------------------------- */

function WidgetView({ widget, onBack, onRemove, onUpdateData, onUpdateStyle }) {
  const [section, setSection] = useState('content');

  return (
    <>
      <div className="border-b border-white/5 px-5 pb-4 pt-5">
        <button
          type="button"
          onClick={onBack}
          className="eyebrow mb-2 flex items-center gap-1.5 text-white/50 transition hover:text-white"
        >
          <BackArrow />
          Back to profile
        </button>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            {WIDGET_CATALOG[widget.type]?.label || widget.type}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (confirm('Delete this widget?')) onRemove();
            }}
            className="rounded-full p-2 text-white/40 transition hover:bg-red-500/20 hover:text-red-300"
          >
            <Trash />
          </button>
        </div>
      </div>

      <SectionTabs
        sections={[
          { id: 'content', label: 'Content' },
          { id: 'style', label: 'Style' },
        ]}
        active={section}
        onChange={setSection}
      />

      <div className="flex-1 space-y-5 overflow-y-auto thin-scroll px-5 py-5">
        {section === 'content' && (
          <WidgetPanel widget={widget} onUpdate={onUpdateData} />
        )}
        {section === 'style' && (
          <StylePanel style={widget.style} onUpdate={onUpdateStyle} />
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Atoms                                                                      */
/* -------------------------------------------------------------------------- */

function SidebarHeader({ title, children }) {
  return (
    <div className="border-b border-white/5 px-5 pb-4 pt-5">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function SectionTabs({ sections, active, onChange }) {
  return (
    <div className="flex border-b border-white/5 bg-ink-900 px-2">
      {sections.map((s) => {
        const isActive = s.id === active;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={[
              'relative flex-1 px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] transition',
              isActive ? 'text-white' : 'text-white/40 hover:text-white/70',
            ].join(' ')}
          >
            {s.label}
            {isActive && (
              <span className="absolute -bottom-px left-1/2 h-[2px] w-8 -translate-x-1/2 rounded-full bg-discord" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------- icons -------- */

function Eye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.4 3.4M2 12s3.5-7 10-7c1.8 0 3.4.35 4.8.95M22 12s-3.5 7-10 7c-1.5 0-2.9-.27-4.2-.75" />
    </svg>
  );
}
function Trash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4h6v3" />
    </svg>
  );
}
function BackArrow() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function widgetEmoji(type) {
  return (
    {
      avatar: '👤',
      badges: '✨',
      socials: '🔗',
      discordServers: '💬',
      games: '🎮',
      clock: '🕒',
      weather: '⛅',
      nowPlaying: '🎵',
      musicProgress: '🎚️',
      visitorCounter: '👀',
      discordPresence: '🟣',
      twitchStream: '🟪',
      guestbook: '📝',
    }[type] || '▫️'
  );
}
