import {
  ChevronLeft,
  ChevronDown,
  Trash2,
  Layers,
  LayoutTemplate,
  Palette,
  Image as ImageIcon,
  Music2,
  Inbox as InboxIcon,
  BarChart3,
  Share2,
  Sparkles,
  Plus,
  X,
  Compass,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { listMyQuestions } from '../../utils/api.js';
import { resolveAccent } from '../../utils/theme.js';
import { WIDGET_CATALOG } from '../../utils/widgetDefaults.js';
import AnalyticsPanel from './AnalyticsPanel.jsx';
import BackgroundPanel from './BackgroundPanel.jsx';
import ColorInput from './controls/ColorInput.jsx';
import SliderInput from './controls/SliderInput.jsx';
import TextInput from './controls/TextInput.jsx';
import InboxPanel from './InboxPanel.jsx';
import MusicPanel from './MusicPanel.jsx';
import StylePanel from './StylePanel.jsx';
import TemplatesPanel from './TemplatesPanel.jsx';
import VanityUrlPanel from './VanityUrlPanel.jsx';
import WidgetPanel from './WidgetPanel.jsx';

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
  selectedIds,
  onSelectWidget,
  onToggleWidget,
  onAddWidget,
  onRemoveWidget,
  onUpdateTheme,
  onUpdateBackground,
  onUpdateMusic,
  onUpdateWidgetData,
  onUpdateWidgetStyle,
  onUpdateWidget,
  onGroupWidgets,
  onUngroupWidget,
  activeSection,
  onSectionChange,
  me,
  onSlugClaimed,
  onApplyTemplate,
  serverSlug,
  onOpenHistory,
  onStartTour,
}) {
  return (
    <aside className="flex h-screen w-[380px] flex-col border-l border-white/5 bg-ink-900">
      {selectedIds && selectedIds.length > 1 ? (
        <MultiSelectView
          profile={profile}
          selectedIds={selectedIds}
          onGroup={() => onGroupWidgets(selectedIds)}
          onBack={() => onSelectWidget(null)}
        />
      ) : selectedWidget ? (
        <WidgetView
          profile={profile}
          widget={selectedWidget}
          onBack={() => onSelectWidget(null)}
          onRemove={() => onRemoveWidget(selectedWidget.id)}
          onUpdateData={(patch) => onUpdateWidgetData(selectedWidget.id, patch)}
          onUpdateStyle={(patch) => onUpdateWidgetStyle(selectedWidget.id, patch)}
          onUpdateWidget={(patch) => onUpdateWidget(selectedWidget.id, patch)}
          onUngroup={() => onUngroupWidget(selectedWidget.id)}
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
          onStartTour={onStartTour}
        />
      )}
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Multi-select view                                                          */
/* -------------------------------------------------------------------------- */

function MultiSelectView({ profile, selectedIds, onGroup, onBack }) {
  const selectedWidgets = profile.widgets.filter(w => selectedIds.includes(w.id));
  const hasGroup = selectedWidgets.some(w => w.type === 'group');

  return (
    <>
      <div className="flex items-center justify-between border-b border-white/5 p-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-sm font-semibold text-white">Sélection multiple</h2>
            <div className="text-[11px] text-white/40">{selectedIds.length} widgets sélectionnés</div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <button
          onClick={onGroup}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-discord px-4 py-3 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
        >
          {hasGroup ? 'Ajouter au groupe' : 'Créer un groupe'}
        </button>
        <p className="mt-4 text-[11px] leading-relaxed text-white/40">
          {hasGroup
            ? 'Les widgets sélectionnés seront ajoutés au groupe existant et le conteneur s\'adaptera à leur taille.'
            : 'Grouper ces widgets les fusionnera dans un conteneur déplaçable. Vous pourrez ensuite activer l\'effet 3D ou définir une bordure globale.'}
        </p>
      </div>
    </>
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
  onStartTour,
}) {
  const hasQAWidget = !!profile?.widgets?.some((w) => w.type === 'qa');

  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!me || !serverSlug) return;
    let cancelled = false;
    const tick = async () => {
      const data = await listMyQuestions({ status: 'PENDING', limit: 1 });
      if (!cancelled) setPendingCount(data.counts?.pending || 0);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [me, serverSlug]);

  const sectionMeta = SECTION_META[section] || SECTION_META.widgets;

  return (
    <>
      <SidebarHeader title={sectionMeta.title}>
        <p className="mt-1 text-xs text-white/45">{sectionMeta.subtitle}</p>
      </SidebarHeader>

      <SectionTabs
        sections={[
          { id: 'widgets', label: 'Widgets', icon: Layers },
          { id: 'templates', label: 'Modèles', icon: LayoutTemplate },
          { id: 'theme', label: 'Thème', icon: Palette },
          { id: 'background', label: 'Décor', icon: ImageIcon },
          { id: 'music', label: 'Musique', icon: Music2 },
          { id: 'inbox', label: 'Messages', icon: InboxIcon, badge: pendingCount },
          { id: 'analytics', label: 'Stats', icon: BarChart3 },
          { id: 'share', label: 'Publier', icon: Share2 },
        ]}
        active={section}
        onChange={onSectionChange}
      />

      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto thin-scroll px-5 py-5">
        {section === 'widgets' && (
          <WidgetListSection
            profile={profile}
            me={me}
            onSelectWidget={onSelectWidget}
            onToggleWidget={onToggleWidget}
            onAddWidget={onAddWidget}
            onRemoveWidget={onRemoveWidget}
            onSectionChange={onSectionChange}
            onStartTour={onStartTour}
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
        {section === 'inbox' && (
          <InboxPanel hasQAWidget={hasQAWidget} />
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

const SECTION_META = {
  widgets: {
    title: 'Widgets',
    subtitle: 'Ajoute, ordonne et masque les éléments de ton profil.',
  },
  templates: {
    title: 'Modèles',
    subtitle: 'Pars d\'un design pré-fait. Tu pourras tout personnaliser ensuite.',
  },
  theme: {
    title: 'Thème',
    subtitle: 'Couleur d\'accent, animations, curseur, particules.',
  },
  background: {
    title: 'Décor',
    subtitle: 'Image, vidéo ou couleur en arrière-plan de la page.',
  },
  music: {
    title: 'Musique',
    subtitle: 'Spotify, lien direct ou fichier. Lecteur visible côté visiteur.',
  },
  inbox: {
    title: 'Messages',
    subtitle: 'Questions reçues sur le widget Q&R. À répondre ou masquer.',
  },
  analytics: {
    title: 'Statistiques',
    subtitle: 'Visites, sources et widgets les plus cliqués.',
  },
  share: {
    title: 'Publier',
    subtitle: 'Réserve ton URL persn.me/ton-nom et partage ton profil.',
  },
};

/**
 * Theme settings are organised as collapsible groups, each with a master
 * toggle (when applicable) that drives the underlying values to a sensible
 * default or zeroes them out.
 *
 * The "active" state of every group is derived from the current theme blob
 * — never stored separately — so applying a template (which patches theme
 * directly) automatically lights up the matching toggles without extra
 * bookkeeping.
 */
function ThemeSection({ theme, onChange }) {
  return (
    <div className="space-y-3">
      <ColorsGroup theme={theme} onChange={onChange} />
      <EntryAnimsGroup theme={theme} onChange={onChange} />
      <HoverFloatGroup theme={theme} onChange={onChange} />
      <VisualEffectsGroup theme={theme} onChange={onChange} />
      <CursorGroup theme={theme} onChange={onChange} />
      <PageParticlesGroup theme={theme} onChange={onChange} />
      <ParallaxGroup theme={theme} onChange={onChange} />
      <SplashGroup theme={theme} onChange={onChange} />
      <AdvancedGroup theme={theme} onChange={onChange} />
    </div>
  );
}

/* -------------------------------------------------------------------- */
/* Group shell — collapsible card with optional master toggle           */
/* -------------------------------------------------------------------- */

function GroupShell({
  title,
  subtitle,
  active,
  onToggleActive,
  alwaysOn = false,
  defaultOpen = false,
  children,
}) {
  const [open, setOpen] = useState(active || defaultOpen);
  // When the group becomes active (e.g. via a template), auto-expand. We
  // never auto-collapse on deactivation so the user keeps visibility into
  // their settings while toggling on/off.
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  return (
    <section className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02]">
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 min-w-0 items-start gap-2 px-4 py-3 text-left transition hover:bg-white/[0.03]"
        >
          <ChevronDown
            className={[
              'mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40 transition-transform',
              open ? 'rotate-0' : '-rotate-90',
            ].join(' ')}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">{title}</span>
              {!alwaysOn && active && (
                <span className="rounded-full bg-discord/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-discord">
                  Actif
                </span>
              )}
            </div>
            {subtitle && (
              <div className="mt-0.5 text-[10px] leading-snug text-white/40">
                {subtitle}
              </div>
            )}
          </div>
        </button>
        {!alwaysOn && (
          <div className="flex items-center pr-3">
            <Toggle checked={!!active} onChange={onToggleActive} />
          </div>
        )}
      </div>
      {open && (
        <div className="space-y-3 border-t border-white/5 px-4 pb-4 pt-3">
          {children}
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------- */
/* Individual groups                                                     */
/* -------------------------------------------------------------------- */

function ColorsGroup({ theme, onChange }) {
  return (
    <GroupShell
      title="Couleurs"
      subtitle="Accent et arrière-plan de page"
      alwaysOn
      defaultOpen
    >
      <AccentEditor
        accent={theme?.accent}
        onChange={(v) => onChange({ accent: v })}
      />
      <ColorInput
        label="Couleur de fond"
        value={theme?.pageBg}
        onChange={(v) => onChange({ pageBg: v })}
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        L'accent pilote pulses, halos et highlights. La couleur de fond ne
        s'affiche que sans image/vidéo de fond.
      </p>
    </GroupShell>
  );
}

function EntryAnimsGroup({ theme, onChange }) {
  const active =
    (theme?.entryAnimation && theme.entryAnimation !== 'none') ||
    (theme?.widgetEntryAnimation && theme.widgetEntryAnimation !== 'none');
  const setActive = (v) => {
    if (v) onChange({ entryAnimation: 'fade', widgetEntryAnimation: 'fade-up' });
    else onChange({ entryAnimation: 'none', widgetEntryAnimation: 'none' });
  };
  return (
    <GroupShell
      title="Animations d'entrée"
      subtitle="Comment la page et les widgets apparaissent"
      active={active}
      onToggleActive={setActive}
    >
      <TextInput
        label="Page"
        value={theme?.entryAnimation || 'none'}
        onChange={(v) => onChange({ entryAnimation: v })}
        options={[
          { value: 'none', label: 'Aucune' },
          { value: 'fade', label: 'Fondu' },
          { value: 'slide-up', label: 'Glissement haut' },
          { value: 'scale', label: 'Zoom' },
          { value: 'blur', label: 'Flou' },
        ]}
      />
      <TextInput
        label="Widgets"
        value={theme?.widgetEntryAnimation || 'fade-up'}
        onChange={(v) => onChange({ widgetEntryAnimation: v })}
        options={[
          { value: 'none', label: 'Aucune' },
          { value: 'fade-up', label: 'Fondu haut' },
          { value: 'fade-in', label: 'Fondu' },
          { value: 'zoom-in', label: 'Zoom' },
          { value: 'slide-right', label: 'Glissement droite' },
          { value: 'slide-left', label: 'Glissement gauche' },
          { value: 'flip-in', label: 'Flip' },
          { value: 'bounce', label: 'Rebond' },
        ]}
      />
    </GroupShell>
  );
}

function HoverFloatGroup({ theme, onChange }) {
  const active =
    (theme?.widgetHover && theme.widgetHover !== 'none') ||
    (theme?.widgetFloat && theme.widgetFloat !== 'none');
  const setActive = (v) => {
    if (v) onChange({ widgetHover: 'lift', widgetFloat: 'bob' });
    else onChange({ widgetHover: 'none', widgetFloat: 'none' });
  };
  return (
    <GroupShell
      title="Survol & flottement"
      subtitle="Réactions aux mouvements et drift continu"
      active={active}
      onToggleActive={setActive}
    >
      <TextInput
        label="Au survol"
        value={theme?.widgetHover || 'none'}
        onChange={(v) => onChange({ widgetHover: v })}
        options={[
          { value: 'none', label: 'Aucun' },
          { value: 'lift', label: 'Soulèvement' },
          { value: 'tilt', label: 'Inclinaison' },
          { value: 'pulse', label: 'Pulsation' },
          { value: 'glow', label: 'Halo' },
        ]}
      />
      <TextInput
        label="Flottement continu"
        value={theme?.widgetFloat || 'none'}
        onChange={(v) => onChange({ widgetFloat: v })}
        options={[
          { value: 'none', label: 'Aucun' },
          { value: 'bob', label: 'Oscillation' },
          { value: 'drift', label: 'Dérive' },
        ]}
      />
    </GroupShell>
  );
}

function VisualEffectsGroup({ theme, onChange }) {
  const active =
    (theme?.widgetSurface && theme.widgetSurface !== 'none') ||
    (theme?.widgetParticles && theme.widgetParticles !== 'none') ||
    (theme?.widgetAccentBar && theme.widgetAccentBar !== 'none') ||
    (theme?.widgetGlowIntensity ?? 0) > 0;
  const setActive = (v) => {
    if (v)
      onChange({
        widgetSurface: 'aurora',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.5,
      });
    else
      onChange({
        widgetSurface: 'none',
        widgetParticles: 'none',
        widgetAccentBar: 'none',
        widgetGlowIntensity: 0,
      });
  };
  return (
    <GroupShell
      title="Effets visuels widgets"
      subtitle="Halo, surface, liserés, particules"
      active={active}
      onToggleActive={setActive}
    >
      <TextInput
        label="Surface"
        value={theme?.widgetSurface || 'none'}
        onChange={(v) => onChange({ widgetSurface: v })}
        options={[
          { value: 'none', label: 'Aucune' },
          { value: 'aurora', label: 'Aurora' },
          { value: 'scanlines', label: 'Scanlines' },
          { value: 'spotlight', label: 'Spotlight' },
          { value: 'glass', label: 'Glass glare' },
        ]}
      />
      <TextInput
        label="Particules"
        value={theme?.widgetParticles || 'none'}
        onChange={(v) => onChange({ widgetParticles: v })}
        options={[
          { value: 'none', label: 'Aucune' },
          { value: 'sparkles', label: 'Étincelles' },
          { value: 'orbs', label: 'Orbes' },
        ]}
      />
      <TextInput
        label="Liseré accent"
        value={theme?.widgetAccentBar || 'none'}
        onChange={(v) => onChange({ widgetAccentBar: v })}
        options={[
          { value: 'none', label: 'Aucun' },
          { value: 'top', label: 'Haut' },
          { value: 'bottom', label: 'Bas' },
          { value: 'left', label: 'Gauche' },
          { value: 'right', label: 'Droite' },
        ]}
      />
      <SliderInput
        label="Intensité du halo"
        min={0}
        max={1}
        step={0.01}
        value={theme?.widgetGlowIntensity ?? 0}
        onChange={(v) => onChange({ widgetGlowIntensity: v })}
        format={(v) => `${Math.round(v * 100)}%`}
      />
    </GroupShell>
  );
}

function CursorGroup({ theme, onChange }) {
  const cursor = theme?.cursor || 'default';
  const active =
    cursor !== 'default' ||
    (theme?.cursorTrail && theme.cursorTrail !== 'none');
  const setActive = (v) => {
    if (v) onChange({ cursorTrail: 'glow' });
    else
      onChange({
        cursor: 'default',
        cursorUrl: '',
        cursorTrail: 'none',
      });
  };
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    onChange({ cursor: 'custom', cursorUrl: dataUrl });
  };
  return (
    <GroupShell
      title="Curseur"
      subtitle="Style du curseur et traînée"
      active={active}
      onToggleActive={setActive}
    >
      <TextInput
        label="Curseur"
        value={cursor}
        onChange={(v) => onChange({ cursor: v })}
        options={[
          { value: 'default', label: 'Par défaut' },
          { value: 'pointer', label: 'Main' },
          { value: 'crosshair', label: 'Croix' },
          { value: 'none', label: 'Caché' },
          { value: 'custom', label: 'Image personnalisée' },
        ]}
      />
      {cursor === 'custom' && (
        <>
          <TextInput
            label="URL de l'image"
            value={theme?.cursorUrl}
            onChange={(v) => onChange({ cursorUrl: v })}
            placeholder="https://… (32×32 png idéal)"
          />
          <label className="block space-y-1.5">
            <span className="eyebrow">…ou upload</span>
            <input
              type="file"
              accept="image/png, image/gif, image/svg+xml"
              onChange={handleUpload}
              className="block w-full text-xs text-white/60 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
            />
          </label>
        </>
      )}
      <TextInput
        label="Traînée"
        value={theme?.cursorTrail || 'none'}
        onChange={(v) => onChange({ cursorTrail: v })}
        options={[
          { value: 'none', label: 'Aucune' },
          { value: 'glow', label: 'Halo (accent)' },
          { value: 'echo', label: 'Echo' },
          { value: 'stars', label: 'Étoiles' },
          { value: 'neon', label: 'Néon' },
          { value: 'comet', label: 'Comète' },
          { value: 'ghost', label: 'Fantômes' },
          { value: 'prism', label: 'Prisme RGB' },
          { value: 'orbit', label: 'Orbite' },
        ]}
      />
      {theme?.cursorTrail === 'ghost' && (
        <SliderInput
          label="Nombre de fantômes"
          min={2}
          max={20}
          step={1}
          value={theme?.cursorTrailCount ?? 6}
          onChange={(v) =>
            onChange({ cursorTrailCount: Math.round(v) })
          }
        />
      )}
    </GroupShell>
  );
}

function PageParticlesGroup({ theme, onChange }) {
  const active = theme?.particles && theme.particles !== 'none';
  const setActive = (v) => onChange({ particles: v ? 'dust' : 'none' });
  return (
    <GroupShell
      title="Particules de page"
      subtitle="Ambient flottant en arrière-plan"
      active={!!active}
      onToggleActive={setActive}
    >
      <TextInput
        label="Type"
        value={theme?.particles || 'none'}
        onChange={(v) => onChange({ particles: v })}
        options={[
          { value: 'none', label: 'Aucune' },
          { value: 'snow', label: 'Neige' },
          { value: 'stars', label: 'Étoiles' },
          { value: 'dust', label: 'Poussière (accent)' },
          { value: 'confetti', label: 'Confetti' },
        ]}
      />
      <p className="text-[10px] leading-relaxed text-white/40">
        Désactivé sur mobile et si le visiteur a{' '}
        <code>prefers-reduced-motion</code>.
      </p>
    </GroupShell>
  );
}

function ParallaxGroup({ theme, onChange }) {
  const active = !!theme?.parallaxEnabled;
  const setActive = (v) => onChange({ parallaxEnabled: v });
  return (
    <GroupShell
      title="Parallaxe 3D"
      subtitle="La page suit le curseur du visiteur"
      active={active}
      onToggleActive={setActive}
    >
      <p className="text-[11px] leading-relaxed text-white/45">
        Active une légère inclinaison des widgets selon la position de la
        souris. Effet désactivé sur mobile.
      </p>
    </GroupShell>
  );
}

function SplashGroup({ theme, onChange }) {
  const splash = theme?.splash || {};
  const active = !!splash.enabled;
  const setActive = (v) => onChange({ splash: { ...splash, enabled: v } });
  const patch = (p) => onChange({ splash: { ...splash, ...p } });
  return (
    <GroupShell
      title="Écran d'entrée"
      subtitle="Click-to-enter avant la révélation du profil"
      active={active}
      onToggleActive={setActive}
    >
      <TextInput
        label="Modèle"
        value={splash.template || 'classic'}
        onChange={(v) => patch({ template: v })}
        options={[
          { value: 'classic', label: 'Classique' },
          { value: 'terminal', label: 'Terminal' },
          { value: 'spotlight', label: 'Spotlight' },
          { value: 'arcade', label: 'Arcade' },
        ]}
      />
      <TextInput
        label="Texte principal"
        value={splash.text || ''}
        onChange={(v) => patch({ text: v })}
        placeholder="Click to enter"
        maxLength={40}
        filter
      />
      <TextInput
        label="Badge"
        value={splash.badge || ''}
        onChange={(v) => patch({ badge: v })}
        placeholder="Enter profile"
        maxLength={40}
        filter
      />
      <TextInput
        label="Sous-titre (optionnel)"
        value={splash.subtitle || ''}
        onChange={(v) => patch({ subtitle: v })}
        placeholder="A tiny tagline, if you like"
        maxLength={80}
        filter
      />
      <TextInput
        label="Indication"
        value={splash.hint || ''}
        onChange={(v) => patch({ hint: v })}
        placeholder="Click anywhere"
        maxLength={40}
        filter
      />
      <SliderInput
        label="Intensité"
        min={0}
        max={100}
        step={1}
        value={splash.intensity ?? 60}
        onChange={(v) => patch({ intensity: Math.round(v) })}
        unit="%"
      />
      <ToggleRow
        title="Grille de fond"
        subtitle="Texture quadrillée derrière le contenu"
        checked={splash.showGrid ?? true}
        onChange={(v) => patch({ showGrid: v })}
      />
      <ToggleRow
        title="Footer persn.me"
        subtitle="Affiche le petit footer en bas"
        checked={splash.showFooter ?? true}
        onChange={(v) => patch({ showFooter: v })}
      />
    </GroupShell>
  );
}

function AdvancedGroup({ theme, onChange }) {
  return (
    <GroupShell
      title="Avancé"
      subtitle="CSS personnalisé scoped au profil"
      alwaysOn
    >
      <CustomCssEditor
        value={theme?.customCss || ''}
        onChange={(v) => onChange({ customCss: v })}
      />
    </GroupShell>
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
          'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
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

function WidgetListSection({
  profile,
  me,
  onSelectWidget,
  onToggleWidget,
  onAddWidget,
  onRemoveWidget,
  onSectionChange,
  onStartTour,
}) {
  const [adderOpen, setAdderOpen] = useState(false);
  const widgetCount = profile.widgets.length;
  const isEmpty = widgetCount === 0;

  return (
    <div className="space-y-4">
      <WelcomeCard
        me={me}
        onChooseTemplate={() => onSectionChange?.('templates')}
        onAddWidget={() => setAdderOpen(true)}
        onStartTour={onStartTour}
      />

      <div className="flex items-center justify-between">
        <span className="eyebrow">
          {isEmpty ? 'Aucun widget' : `${widgetCount} widget${widgetCount > 1 ? 's' : ''}`}
        </span>
        <button
          type="button"
          onClick={() => setAdderOpen((v) => !v)}
          data-coachmark="add-widget"
          className={[
            'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition',
            adderOpen
              ? 'border border-white/15 bg-white/10 text-white'
              : 'bg-discord text-white shadow-[0_0_18px_rgba(88,101,242,0.3)] hover:brightness-110',
          ].join(' ')}
        >
          {adderOpen ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {adderOpen ? 'Fermer' : 'Ajouter'}
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

      {isEmpty && !adderOpen ? (
        <EmptyWidgetState
          onAdd={() => setAdderOpen(true)}
          onChooseTemplate={() => onSectionChange?.('templates')}
        />
      ) : (
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
                  title={w.visible === false ? 'Afficher' : 'Masquer'}
                  aria-label={w.visible === false ? 'Afficher' : 'Masquer'}
                >
                  {w.visible === false ? <EyeOff /> : <Eye />}
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveWidget(w.id)}
                  className="rounded-full p-1.5 text-white/40 transition hover:bg-red-500/20 hover:text-red-300"
                  title="Supprimer"
                  aria-label="Supprimer"
                >
                  <Trash />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EmptyWidgetState({ onAdd, onChooseTemplate }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-discord/15">
        <Layers className="h-4 w-4 text-discord" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-white">Aucun widget pour l'instant</h4>
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">
          Démarre avec un modèle prêt à l'emploi ou ajoute tes premiers widgets.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={onChooseTemplate}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
        >
          Voir les modèles
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-full bg-discord px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-[0_0_18px_rgba(88,101,242,0.3)] transition hover:brightness-110"
        >
          <Plus className="h-3 w-3" />
          Ajouter un widget
        </button>
      </div>
    </div>
  );
}

function WelcomeCard({ me, onChooseTemplate, onAddWidget, onStartTour }) {
  const storageKey = me ? `persn:welcome:dismissed:${me.id}` : 'persn:welcome:dismissed:anon';
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!window.localStorage.getItem(storageKey);
  });
  if (dismissed) return null;

  const dismiss = () => {
    window.localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-discord/30 bg-gradient-to-br from-discord/15 via-discord/5 to-transparent p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Masquer ce panneau"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-white/30 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-discord/25">
          <Sparkles className="h-4 w-4 text-discord" />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <h3 className="text-sm font-bold text-white">Bienvenue !</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/65">
            Lance-toi avec un modèle, ajoute tes propres widgets, ou suis le tour rapide.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={onChooseTemplate}
              className="rounded-full bg-discord px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-[0_0_18px_rgba(88,101,242,0.3)] transition hover:brightness-110"
            >
              Choisir un modèle
            </button>
            <button
              type="button"
              onClick={onAddWidget}
              className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/85 transition hover:bg-white/10"
            >
              <Plus className="h-3 w-3" />
              Widget
            </button>
            {onStartTour && (
              <button
                type="button"
                onClick={onStartTour}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/85 transition hover:bg-white/10"
              >
                <Compass className="h-3 w-3" />
                Tour guidé
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WidgetView({ profile, widget, onBack, onRemove, onUpdateData, onUpdateStyle, onUpdateWidget, onUngroup }) {
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
          <div className="flex gap-1.5">
            {widget.type === 'group' && (
              <button
                onClick={onUngroup}
                className="flex h-7 px-3 items-center justify-center rounded-lg bg-white/5 text-[10px] font-bold uppercase tracking-widest text-white/40 transition hover:bg-white/10 hover:text-white"
              >
                Dégrouper
              </button>
            )}
            <button
              type="button"
              onClick={onRemove}
              title="Supprimer ce widget"
              aria-label="Supprimer ce widget"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500/40 transition hover:bg-red-500 hover:text-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
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

      <div className="flex-1 min-h-0 space-y-5 overflow-y-auto thin-scroll px-5 py-5">
        {section === 'content' && (
          <WidgetPanel widget={widget} onUpdate={onUpdateData} />
        )}
        {section === 'style' && (
          <StylePanel style={widget.style} onUpdate={onUpdateStyle} profile={profile} widget={widget} onUpdateWidget={onUpdateWidget} />
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
    <div
      data-coachmark="sidebar-tabs"
      className="grid grid-cols-4 gap-1 border-b border-white/5 bg-ink-900 p-2"
    >
      {sections.map((s) => {
        const isActive = s.id === active;
        const hasBadge = Number.isFinite(s.badge) && s.badge > 0;
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            title={s.label}
            className={[
              'relative flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold transition',
              isActive
                ? 'bg-discord/15 text-white ring-1 ring-discord/40'
                : 'text-white/45 hover:bg-white/5 hover:text-white/80',
            ].join(' ')}
          >
            {Icon && (
              <Icon
                className={[
                  'h-4 w-4 transition',
                  isActive ? 'text-discord' : 'text-white/50',
                ].join(' ')}
              />
            )}
            <span className="tracking-tight">{s.label}</span>
            {hasBadge && (
              <span
                className="absolute right-1 top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-discord px-1 font-mono text-[8px] tabular-nums text-white"
                aria-label={`${s.badge} pending`}
              >
                {s.badge > 9 ? '9+' : s.badge}
              </span>
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
      avatar: '🧑',
      badges: '⭐',
      socials: '🌐',
      discordServers: '💬',
      games: '🎮',
      clock: '⏰',
      weather: '☀️',
      nowPlaying: '🎵',
      musicProgress: '🎧',
      visitorCounter: '👀',
      discordPresence: '🟢',
      twitchStream: '📺',
      guestbook: '📖',
      qa: '💌',
      clickerGame: '🍪',
      group: '🗂️',
    }[type] || '🧩'
  );
}
