import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Palette,
  Image as ImageIcon,
  Music as MusicIcon,
  Link2,
  ExternalLink,
  RotateCcw,
  History,
  LogOut,
  Settings2,
  Sliders,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { WIDGET_REGISTRY } from '../widgets/index.js';
import WidgetFrame from '../widgets/WidgetFrame.jsx';
import { WIDGET_CATALOG } from '../../utils/widgetDefaults.js';
import WidgetPanel from './WidgetPanel.jsx';
import StylePanel from './StylePanel.jsx';
import BackgroundPanel from './BackgroundPanel.jsx';
import MusicPanel from './MusicPanel.jsx';
import VanityUrlPanel from './VanityUrlPanel.jsx';
import logo from '../../image/logo.jpeg';

/**
 * Mobile editor.
 *
 * The desktop drag canvas does not translate well to touch, so this view
 * exposes a list-based editor that matches the public mobile renderer
 * exactly: visible widgets are stacked top-to-bottom in array order, and
 * tapping any one of them opens a bottom sheet to edit its data + style.
 *
 * Reordering is done with up/down arrows on each widget card. Widgets stay
 * positioned (in %) on the desktop canvas — we only move them within the
 * `profile.widgets` array, which is what controls the mobile stack order.
 */
export default function MobileEditor({
  profile,
  setProfile,
  me,
  serverSlug,
  saveStatus,
  lastSavedAt,
  onForceSave,
  onPreview,
  onReset,
  onLogout,
  onOpenHistory,
  onAddWidget,
  onRemoveWidget,
  onUpdateWidget,
  onUpdateWidgetData,
  onUpdateWidgetStyle,
  onUpdateTheme,
  onUpdateBackground,
  onUpdateMusic,
  onSlugClaimed,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState(null); // { type: 'section'|'widget'|'pickWidget', section?, widgetId? }

  const closeSheet = () => setSheet(null);
  const openSection = (section) => setSheet({ type: 'section', section });
  const openWidget = (widgetId) => setSheet({ type: 'widget', widgetId });
  const openPicker = () => setSheet({ type: 'pickWidget' });

  const visibleWidgets = profile.widgets.filter((w) => w.visible !== false);
  const selectedWidget = sheet?.type === 'widget'
    ? profile.widgets.find((w) => w.id === sheet.widgetId)
    : null;

  // Move a widget up/down in the array (drives mobile stack order).
  const moveWidget = (id, delta) => {
    setProfile((prev) => {
      const idx = prev.widgets.findIndex((w) => w.id === id);
      if (idx === -1) return prev;
      const next = idx + delta;
      if (next < 0 || next >= prev.widgets.length) return prev;
      const arr = [...prev.widgets];
      const [item] = arr.splice(idx, 1);
      arr.splice(next, 0, item);
      return { ...prev, widgets: arr };
    });
  };

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-ink-950 text-white">
      <MobileTopBar
        me={me}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        hasServerProfile={!!serverSlug}
        onForceSave={onForceSave}
        onMenuToggle={() => setMenuOpen((o) => !o)}
        menuOpen={menuOpen}
      />

      <AnimatePresence>
        {menuOpen && (
          <MobileMenu
            me={me}
            serverSlug={serverSlug}
            onClose={() => setMenuOpen(false)}
            onPreview={() => { setMenuOpen(false); onPreview(); }}
            onReset={() => { setMenuOpen(false); onReset(); }}
            onOpenHistory={() => { setMenuOpen(false); onOpenHistory(); }}
            onLogout={() => { setMenuOpen(false); onLogout(); }}
          />
        )}
      </AnimatePresence>

      {/* Preview area — vertical stack mirroring the public mobile view */}
      <main className="flex-1 overflow-y-auto pb-[88px]">
        <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-5">
          {visibleWidgets.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
              <div className="eyebrow mb-2 text-discord">empty</div>
              <h2 className="mb-2 text-lg font-semibold tracking-tight">
                No visible widgets
              </h2>
              <p className="text-sm text-white/50">
                Tap "+ Widget" below to add your first one.
              </p>
            </div>
          )}

          {visibleWidgets.map((widget, i) => {
            const arrayIndex = profile.widgets.findIndex((w) => w.id === widget.id);
            return (
              <WidgetCardMobile
                key={widget.id}
                widget={widget}
                theme={profile.theme}
                index={i}
                isFirst={arrayIndex === 0}
                isLast={arrayIndex === profile.widgets.length - 1}
                onSelect={() => openWidget(widget.id)}
                onMoveUp={() => moveWidget(widget.id, -1)}
                onMoveDown={() => moveWidget(widget.id, 1)}
                onToggleVisible={() => onUpdateWidget(widget.id, { visible: false })}
                onDelete={() => onRemoveWidget(widget.id)}
              />
            );
          })}

          {/* Hidden widgets section */}
          {profile.widgets.some((w) => w.visible === false) && (
            <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.015] p-3">
              <div className="eyebrow mb-2 px-1 text-white/35">Hidden</div>
              <ul className="space-y-1">
                {profile.widgets
                  .filter((w) => w.visible === false)
                  .map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-2"
                    >
                      <button
                        type="button"
                        onClick={() => openWidget(w.id)}
                        className="flex-1 truncate text-left text-xs font-medium text-white/60"
                      >
                        {WIDGET_REGISTRY[w.type]?.label || w.type}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateWidget(w.id, { visible: true })}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition hover:bg-white/5 hover:text-white"
                        aria-label="Show"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveWidget(w.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition hover:bg-red-500/10 hover:text-red-400"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      <MobileBottomNav onAdd={openPicker} onOpenSection={openSection} />

      <AnimatePresence>
        {sheet && (
          <BottomSheet onClose={closeSheet}>
            {sheet.type === 'section' && (
              <SectionSheetContent
                section={sheet.section}
                profile={profile}
                me={me}
                serverSlug={serverSlug}
                onUpdateTheme={onUpdateTheme}
                onUpdateBackground={onUpdateBackground}
                onUpdateMusic={onUpdateMusic}
                onSlugClaimed={onSlugClaimed}
                onClose={closeSheet}
              />
            )}
            {sheet.type === 'pickWidget' && (
              <WidgetPickerContent
                profile={profile}
                onPick={(type) => {
                  onAddWidget(type);
                  closeSheet();
                }}
                onClose={closeSheet}
              />
            )}
            {sheet.type === 'widget' && selectedWidget && (
              <WidgetEditContent
                profile={profile}
                widget={selectedWidget}
                onUpdateData={(patch) => onUpdateWidgetData(selectedWidget.id, patch)}
                onUpdateStyle={(patch) => onUpdateWidgetStyle(selectedWidget.id, patch)}
                onUpdateWidget={(patch) => onUpdateWidget(selectedWidget.id, patch)}
                onDelete={() => {
                  onRemoveWidget(selectedWidget.id);
                  closeSheet();
                }}
                onClose={closeSheet}
              />
            )}
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Top bar                                                                    */
/* -------------------------------------------------------------------------- */

function MobileTopBar({ me, saveStatus, lastSavedAt, hasServerProfile, onForceSave, onMenuToggle, menuOpen }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 bg-ink-950/95 px-4 py-3 backdrop-blur-md">
      <Link to="/" className="flex items-center gap-2.5">
        <img
          src={logo}
          alt="persn.me"
          className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10"
        />
        <div className="leading-none">
          <div className="text-sm font-semibold tracking-tight">persn.me</div>
          <div className="eyebrow mt-0.5">Editor</div>
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {me && (
          <SaveStatusChip
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            hasServerProfile={hasServerProfile}
            onForceSave={onForceSave}
          />
        )}
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-white/80 transition hover:bg-white/[0.08]"
        >
          {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SaveStatusChip({ status, lastSavedAt, hasServerProfile, onForceSave }) {
  if (!hasServerProfile) {
    return (
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/55">
        Local
      </span>
    );
  }

  const map = {
    idle: { label: 'Idle', cls: 'border-white/10 text-white/55' },
    saved: { label: 'Saved', cls: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
    dirty: { label: 'Unsaved', cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
    saving: { label: 'Saving…', cls: 'border-discord/30 bg-discord/10 text-white' },
    error: { label: 'Error', cls: 'border-red-500/30 bg-red-500/10 text-red-300' },
  };
  const v = map[status] || map.idle;

  const handleTap = () => {
    if (status === 'dirty' || status === 'error') onForceSave?.();
  };

  return (
    <button
      type="button"
      onClick={handleTap}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${v.cls}`}
    >
      {v.label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Burger menu                                                                */
/* -------------------------------------------------------------------------- */

function MobileMenu({ me, serverSlug, onClose, onPreview, onReset, onOpenHistory, onLogout }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="absolute right-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-l border-white/5 bg-ink-900"
      >
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <span className="eyebrow text-white/45">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {me && (
          <div className="border-b border-white/5 px-4 py-4">
            <div className="eyebrow text-white/40">Signed in</div>
            <div className="mt-0.5 truncate text-sm font-semibold">@{me.username}</div>
            {me.email && (
              <div className="truncate text-[11px] text-white/40">{me.email}</div>
            )}
          </div>
        )}

        <ul className="flex-1 space-y-1 p-3">
          <MenuButton icon={ExternalLink} label="Preview profile" onClick={onPreview} />
          {me && serverSlug && (
            <MenuButton icon={History} label="History" onClick={onOpenHistory} />
          )}
          <MenuButton icon={RotateCcw} label="Reset profile" onClick={onReset} />
          {me && (
            <MenuButton icon={LogOut} label="Sign out" onClick={onLogout} danger />
          )}
        </ul>
      </motion.div>
    </motion.div>
  );
}

function MenuButton({ icon: Icon, label, onClick, danger }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={[
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition',
          danger
            ? 'text-red-300 hover:bg-red-500/10'
            : 'text-white/85 hover:bg-white/5',
        ].join(' ')}
      >
        <Icon className="h-4 w-4 opacity-70" />
        <span className="flex-1 font-medium">{label}</span>
      </button>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Widget card in the preview stack                                           */
/* -------------------------------------------------------------------------- */

function WidgetCardMobile({
  widget,
  theme,
  index,
  isFirst,
  isLast,
  onSelect,
  onMoveUp,
  onMoveDown,
  onToggleVisible,
  onDelete,
}) {
  const Component = WIDGET_REGISTRY[widget.type]?.component;
  const label = WIDGET_REGISTRY[widget.type]?.label || widget.type;

  // For groups, we render an outline placeholder rather than the actual
  // group container — the canvas-only positioning makes a true group preview
  // impossible to mirror cleanly on a stack.
  if (widget.type === 'group') {
    return (
      <button
        type="button"
        onClick={onSelect}
        className="group flex w-full items-center justify-between rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/25 hover:bg-white/[0.04]"
      >
        <div className="flex items-center gap-3">
          <Layers className="h-4 w-4 text-white/55" />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white/90">
              {widget.data?.title || 'Group'}
            </div>
            <div className="eyebrow mt-0.5 text-white/40">Edit on desktop</div>
          </div>
        </div>
        <Settings2 className="h-4 w-4 text-white/35 transition group-hover:text-white" />
      </button>
    );
  }

  return (
    <div className="group relative">
      {/* The widget itself (read-only render, identical to public mobile view) */}
      <button
        type="button"
        onClick={onSelect}
        className="block w-full text-left transition active:scale-[0.99]"
      >
        <WidgetFrame widget={widget} theme={theme} mode="view" isMobile index={index}>
          {Component ? <Component widget={widget} accent="#5865F2" /> : null}
        </WidgetFrame>
      </button>

      {/* Action toolbar — appears as a faint footer on every card */}
      <div className="mt-1 flex items-center justify-between rounded-xl bg-white/[0.02] px-2 py-1.5">
        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronUp}
            label="Move up"
            disabled={isFirst}
            onClick={onMoveUp}
          />
          <IconButton
            icon={ChevronDown}
            label="Move down"
            disabled={isLast}
            onClick={onMoveDown}
          />
        </div>
        <span className="truncate px-2 text-[10px] uppercase tracking-[0.18em] text-white/30">
          {label}
        </span>
        <div className="flex items-center gap-1">
          <IconButton icon={Sliders} label="Edit" onClick={onSelect} />
          <IconButton icon={EyeOff} label="Hide" onClick={onToggleVisible} />
          <IconButton icon={Trash2} label="Delete" onClick={onDelete} danger />
        </div>
      </div>
    </div>
  );
}

function IconButton({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={[
        'flex h-7 w-7 items-center justify-center rounded-md transition',
        disabled
          ? 'text-white/15'
          : danger
          ? 'text-white/55 hover:bg-red-500/10 hover:text-red-400'
          : 'text-white/55 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Bottom nav                                                                 */
/* -------------------------------------------------------------------------- */

function MobileBottomNav({ onAdd, onOpenSection }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-ink-950/95 px-3 py-2 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-center justify-between gap-1">
        <NavBtn icon={Plus} label="Widget" onClick={onAdd} primary />
        <NavBtn icon={Palette} label="Theme" onClick={() => onOpenSection('theme')} />
        <NavBtn icon={ImageIcon} label="Background" onClick={() => onOpenSection('background')} />
        <NavBtn icon={MusicIcon} label="Music" onClick={() => onOpenSection('music')} />
        <NavBtn icon={Link2} label="Share" onClick={() => onOpenSection('share')} />
      </div>
    </nav>
  );
}

function NavBtn({ icon: Icon, label, onClick, primary }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition',
        primary
          ? 'bg-discord text-white shadow-[0_0_24px_rgba(88,101,242,0.3)]'
          : 'text-white/65 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
      <span className="text-[10px] font-semibold tracking-tight">{label}</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Bottom sheet                                                               */
/* -------------------------------------------------------------------------- */

function BottomSheet({ children, onClose }) {
  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.4 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 500) onClose();
        }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] min-h-[60vh] flex-col rounded-t-3xl border-t border-white/10 bg-ink-900 shadow-[0_-20px_60px_rgba(0,0,0,0.5)]"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-2.5 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/15" />
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function SheetHeader({ title, subtitle, onBack, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{title}</div>
          {subtitle && (
            <div className="truncate text-[11px] text-white/40">{subtitle}</div>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="flex h-8 w-8 items-center justify-center rounded-md text-white/55 hover:bg-white/5 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sheet contents                                                             */
/* -------------------------------------------------------------------------- */

function SectionSheetContent({
  section,
  profile,
  me,
  serverSlug,
  onUpdateTheme,
  onUpdateBackground,
  onUpdateMusic,
  onSlugClaimed,
  onClose,
}) {
  const titleMap = {
    theme: 'Theme',
    background: 'Background',
    music: 'Music',
    share: 'Share',
  };

  return (
    <>
      <SheetHeader title={titleMap[section] || section} onClose={onClose} />
      <div className="flex-1 overflow-y-auto thin-scroll p-4">
        {section === 'theme' && (
          <ThemeQuickPanel theme={profile.theme} onChange={onUpdateTheme} />
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

/**
 * A trimmed-down theme editor for mobile — the desktop ThemeSection includes
 * cursor uploads, custom CSS, and other knobs that are mostly desktop-only.
 * We surface accent + page background + entry animation here, which is
 * what 90% of users tweak on mobile.
 */
function ThemeQuickPanel({ theme, onChange }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="eyebrow mb-2 block text-white/55">Accent color</label>
        <div className="grid grid-cols-6 gap-2">
          {[
            '#5865F2',
            '#ff2e88',
            '#c0ff3e',
            '#7dd3fc',
            '#ffb347',
            '#a855f7',
            '#ef4444',
            '#22d3ee',
            '#fbbf24',
            '#10b981',
            '#f472b6',
            '#ffffff',
          ].map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => onChange({ accent: { kind: 'solid', value: hex } })}
              className="aspect-square rounded-lg ring-1 ring-white/10 transition active:scale-95"
              style={{ background: hex }}
              aria-label={`Set accent ${hex}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="eyebrow mb-2 block text-white/55">Page background</label>
        <input
          type="color"
          value={theme?.pageBg || '#0a0a0a'}
          onChange={(e) => onChange({ pageBg: e.target.value })}
          className="h-10 w-full cursor-pointer rounded-lg border border-white/10 bg-transparent"
        />
      </div>

      <div>
        <label className="eyebrow mb-2 block text-white/55">Entry animation</label>
        <select
          value={theme?.entryAnimation || 'none'}
          onChange={(e) => onChange({ entryAnimation: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
        >
          <option value="none">None</option>
          <option value="fade">Fade In</option>
          <option value="slide-up">Slide Up</option>
          <option value="scale">Scale In</option>
          <option value="blur">Blur In</option>
        </select>
      </div>

      <p className="text-[11px] leading-relaxed text-white/40">
        Cursors, particles, custom CSS and splash settings are available on
        the desktop editor.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Widget picker                                                              */
/* -------------------------------------------------------------------------- */

function WidgetPickerContent({ profile, onPick, onClose }) {
  // Same restriction as the desktop sidebar: avatar is a singleton.
  const hasAvatar = profile.widgets.some((w) => w.type === 'avatar');

  const items = Object.values(WIDGET_CATALOG).filter((cat) => {
    if (cat.type === 'avatar' && hasAvatar) return false;
    // Group widgets are canvas-only — hide from mobile picker to keep the
    // mobile editor focused on stack-friendly widgets.
    if (cat.type === 'group') return false;
    return true;
  });

  return (
    <>
      <SheetHeader
        title="Add widget"
        subtitle={`${items.length} available`}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto thin-scroll p-4">
        <ul className="grid grid-cols-2 gap-2">
          {items.map((cat) => (
            <li key={cat.type}>
              <button
                type="button"
                onClick={() => onPick(cat.type)}
                className="flex h-full w-full flex-col items-start gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:border-discord/40 hover:bg-discord/[0.06]"
              >
                <span className="text-sm font-semibold text-white">
                  {cat.label}
                </span>
                <span className="text-[11px] text-white/40">{cat.type}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Widget edit                                                                */
/* -------------------------------------------------------------------------- */

function WidgetEditContent({
  profile,
  widget,
  onUpdateData,
  onUpdateStyle,
  onUpdateWidget,
  onDelete,
  onClose,
}) {
  const [tab, setTab] = useState('data'); // 'data' | 'style'
  const label = WIDGET_REGISTRY[widget.type]?.label || widget.type;

  return (
    <>
      <SheetHeader title={label} subtitle="Edit widget" onClose={onClose} />

      <div className="flex border-b border-white/5 px-2">
        <TabButton active={tab === 'data'} onClick={() => setTab('data')}>
          Content
        </TabButton>
        <TabButton active={tab === 'style'} onClick={() => setTab('style')}>
          Style
        </TabButton>
      </div>

      <div className="flex-1 overflow-y-auto thin-scroll p-4">
        {tab === 'data' && (
          <WidgetPanel widget={widget} onUpdate={onUpdateData} />
        )}
        {tab === 'style' && (
          <StylePanel
            style={widget.style || {}}
            onUpdate={onUpdateStyle}
            profile={profile}
            widget={widget}
            onUpdateWidget={onUpdateWidget}
          />
        )}
      </div>

      <div className="border-t border-white/5 p-3">
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
          Delete widget
        </button>
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'relative flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-[0.15em] transition',
        active ? 'text-white' : 'text-white/45 hover:text-white/70',
      ].join(' ')}
    >
      {children}
      {active && (
        <span className="absolute inset-x-4 bottom-0 h-0.5 bg-discord" />
      )}
    </button>
  );
}
