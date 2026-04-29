import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DragCanvas from '../components/editor/DragCanvas.jsx';
import MusicPlayer from '../components/MusicPlayer.jsx';
import Sidebar from '../components/editor/Sidebar.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import {
  makeDefaultProfile,
  makeWidgetInstance,
} from '../utils/widgetDefaults.js';
import { encodeProfile } from '../utils/encode.js';
import { getDiscordImport, getMe, getMyProfile, logout, saveProfile } from '../utils/api.js';
import { resolveAccent } from '../utils/theme.js';
import HistoryDrawer from '../components/editor/HistoryDrawer.jsx';
import TemplateConfirmModal from '../components/editor/TemplateConfirmModal.jsx';

const STORAGE_KEY = 'persn:profile';
const AUTOSAVE_DEBOUNCE_MS = 5000;

/**
 * Editor page.
 *
 * State model:
 *   - `profile` is the single source of truth for the canvas + sidebar. It
 *     contains every widget (with pos/size/style/data), plus the page
 *     background, music config, and theme. Persisted to localStorage so
 *     anonymous users don't lose their work.
 *   - When the viewer is authenticated we additionally fetch their saved
 *     profile from the server and hydrate the editor with it. Every change
 *     is then auto-saved to the DB with a 5s debounce — the full profile
 *     blob (NOT a partial patch) so nothing can drift out of sync.
 *   - Save status is surfaced in the TopBar so the user always knows if
 *     their work has reached the database yet.
 */
export default function Editor() {
  const navigate = useNavigate();
  const [profile, setProfile] = useLocalStorage(STORAGE_KEY, makeDefaultProfile());
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarSection, setSidebarSection] = useState('widgets');

  // Auth + server sync
  const [me, setMe] = useState(null);
  const [serverSlug, setServerSlug] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saved | dirty | saving | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const lastSavedSnapshotRef = useRef(null);

  const selectedWidget = useMemo(
    () => profile.widgets.find((w) => w.id === selectedId) || null,
    [profile.widgets, selectedId],
  );

  // Templates apply confirmation + history drawer state.
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const accentHex = useMemo(
    () => resolveAccent(profile.theme?.accent).hex,
    [profile.theme?.accent],
  );

  // Listen for the import flow's CustomEvent — the modal lives inside
  // VanityUrlPanel which doesn't have direct access to setProfile, so it
  // dispatches the imported blob and we handle it here behind the same
  // confirmation flow as templates.
  useEffect(() => {
    const handler = (e) => {
      const imported = e.detail;
      if (!imported) return;
      setPendingTemplate({
        id: 'import',
        name: 'Imported profile',
        thumbnailGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        profile: imported,
      });
    };
    window.addEventListener('persn:profile-import', handler);
    return () => window.removeEventListener('persn:profile-import', handler);
  }, []);

  /* -------------------------------------------------------------------- */
  /* Hydration — pull the server profile when the user is logged in        */
  /* -------------------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getMe();
      if (cancelled) return;
      setMe(user);

      if (user) {
        const sp = await getMyProfile();
        if (cancelled) return;
        if (sp?.data && sp?.slug) {
          // Server wins — we pull the full blob so positions/sizes/styles
          // for every widget match exactly what the /:slug page will render.
          setProfile(sp.data);
          setServerSlug(sp.slug);
          lastSavedSnapshotRef.current = JSON.stringify(sp.data);
          setLastSavedAt(sp.updatedAt ? new Date(sp.updatedAt) : new Date());
          setSaveStatus('saved');
        }
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------------------------- */
  /* Discord OAuth post-callback — auto-import avatar on first sign-up,    */
  /* offer to refresh on subsequent connect.                                */
  /* -------------------------------------------------------------------- */
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('discord');
    if (flag !== 'registered' && flag !== 'connected') return;

    let cancelled = false;
    (async () => {
      const data = await getDiscordImport();
      if (cancelled || !data?.avatarUrl) return;

      setProfile((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) => {
          if (w.type !== 'avatar') return w;
          // On first sign-up: replace the placeholder avatar + username.
          // On reconnect of an existing account: only fill fields that still
          // hold the catalog default, so we don't blow away custom edits.
          const isPlaceholderAvatar =
            !w.data?.avatarUrl ||
            String(w.data.avatarUrl).includes('api.dicebear.com');
          const isPlaceholderUsername =
            !w.data?.username || w.data.username === 'yourname';
          const shouldOverwrite = flag === 'registered';
          return {
            ...w,
            data: {
              ...w.data,
              avatarUrl:
                shouldOverwrite || isPlaceholderAvatar
                  ? data.avatarUrl
                  : w.data.avatarUrl,
              username:
                shouldOverwrite || isPlaceholderUsername
                  ? data.username
                  : w.data.username,
            },
          };
        }),
      }));
      setToast({
        kind: 'success',
        message:
          flag === 'registered'
            ? 'Welcome! Your Discord avatar was imported.'
            : 'Discord avatar refreshed.',
      });
      setTimeout(() => {
        if (!cancelled) setToast(null);
      }, 4000);
    })();

    // Clean the query so a refresh doesn't re-import.
    const url = new URL(window.location.href);
    url.searchParams.delete('discord');
    window.history.replaceState({}, '', url.pathname + url.search);

    return () => {
      cancelled = true;
    };
  }, [hydrated, setProfile]);

  /* -------------------------------------------------------------------- */
  /* Auto-save — debounced, full-profile POST                              */
  /* -------------------------------------------------------------------- */

  useEffect(() => {
    if (!hydrated) return;
    if (!me || !serverSlug) return;

    const snapshot = JSON.stringify(profile);
    if (snapshot === lastSavedSnapshotRef.current) return;

    // As soon as a change is detected, show "Unsaved changes" — the actual
    // write happens after the debounce window.
    setSaveStatus((s) => (s === 'saving' ? s : 'dirty'));

    const id = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await saveProfile(serverSlug, profile);
        lastSavedSnapshotRef.current = snapshot;
        setLastSavedAt(new Date());
        setSaveStatus('saved');
      } catch (err) {
        console.error('[autosave]', err);
        setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(id);
  }, [profile, me, serverSlug, hydrated]);

  /* -------------------------------------------------------------------- */
  /* Warn before leaving with unsaved changes                              */
  /* -------------------------------------------------------------------- */

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (saveStatus === 'dirty' || saveStatus === 'saving') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveStatus]);

  /* -------------------------------------------------------------------- */
  /* Mutators                                                              */
  /* -------------------------------------------------------------------- */

  const updateBackground = useCallback(
    (patch) =>
      setProfile((prev) => ({
        ...prev,
        background: { ...prev.background, ...patch },
      })),
    [setProfile],
  );

  const updateMusic = useCallback(
    (patch) =>
      setProfile((prev) => ({ ...prev, music: { ...prev.music, ...patch } })),
    [setProfile],
  );

  const updateTheme = useCallback(
    (patch) =>
      setProfile((prev) => ({ ...prev, theme: { ...prev.theme, ...patch } })),
    [setProfile],
  );

  const updateWidget = useCallback(
    (id, patch) =>
      setProfile((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
      })),
    [setProfile],
  );

  const updateWidgetStyle = useCallback(
    (id, patch) =>
      setProfile((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.id === id ? { ...w, style: { ...w.style, ...patch } } : w,
        ),
      })),
    [setProfile],
  );

  const updateWidgetData = useCallback(
    (id, patch) =>
      setProfile((prev) => ({
        ...prev,
        widgets: prev.widgets.map((w) =>
          w.id === id ? { ...w, data: { ...w.data, ...patch } } : w,
        ),
      })),
    [setProfile],
  );

  const addWidget = useCallback(
    (type) => {
      const instance = makeWidgetInstance(type);
      setProfile((prev) => ({ ...prev, widgets: [...prev.widgets, instance] }));
      setSelectedId(instance.id);
    },
    [setProfile],
  );

  const removeWidget = useCallback(
    (id) => {
      setProfile((prev) => ({
        ...prev,
        widgets: prev.widgets.filter((w) => w.id !== id),
      }));
      setSelectedId((current) => (current === id ? null : current));
    },
    [setProfile],
  );

  const resetProfile = useCallback(() => {
    if (!confirm('Reset the entire profile to defaults?')) return;
    setProfile(makeDefaultProfile());
    setSelectedId(null);
  }, [setProfile]);

  /* -------------------------------------------------------------------- */
  /* Server bridges                                                        */
  /* -------------------------------------------------------------------- */

  // Called by VanityUrlPanel after a successful claim/rename. The save
  // itself was done by the panel — we just record the new slug so future
  // auto-saves use it, and mark the current snapshot as clean.
  const handleSlugClaimed = useCallback(
    (slug) => {
      setServerSlug(slug);
      lastSavedSnapshotRef.current = JSON.stringify(profile);
      setLastSavedAt(new Date());
      setSaveStatus('saved');
    },
    [profile],
  );

  // Force a save right now — bypasses the debounce. Used when the user hits
  // "Save now" in the status chip.
  const forceSave = useCallback(async () => {
    if (!me || !serverSlug) return;
    setSaveStatus('saving');
    try {
      await saveProfile(serverSlug, profile);
      lastSavedSnapshotRef.current = JSON.stringify(profile);
      setLastSavedAt(new Date());
      setSaveStatus('saved');
    } catch (err) {
      console.error('[forceSave]', err);
      setSaveStatus('error');
    }
  }, [me, serverSlug, profile]);

  const handleLogout = useCallback(async () => {
    await logout();
    setMe(null);
    setServerSlug(null);
    setSaveStatus('idle');
    lastSavedSnapshotRef.current = null;
    setLastSavedAt(null);
    navigate('/');
  }, [navigate]);

  /* -------------------------------------------------------------------- */
  /* Share actions                                                         */
  /* -------------------------------------------------------------------- */

  const buildShareUrl = useCallback(() => {
    if (serverSlug) return `${window.location.origin}/${serverSlug}`;
    const payload = encodeProfile(profile);
    return `${window.location.origin}/view#${payload}`;
  }, [profile, serverSlug]);

  const openPreview = useCallback(() => {
    window.open(buildShareUrl(), '_blank', 'noopener,noreferrer');
  }, [buildShareUrl]);

  /* -------------------------------------------------------------------- */
  /* Render                                                                */
  /* -------------------------------------------------------------------- */

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink-950 text-white">
      <main className="relative hidden flex-1 lg:block">
        <TopBar
          me={me}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          hasServerProfile={!!serverSlug}
          onForceSave={forceSave}
          onOpenShare={() => {
            setSidebarSection('share');
            setSelectedId(null);
          }}
          onPreview={openPreview}
          onReset={resetProfile}
          onLogout={handleLogout}
          onOpenHistory={() => setHistoryOpen(true)}
        />
        <MusicPlayer music={profile.music} accent={accentHex} hideControls>
          <DragCanvas
            profile={profile}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onWidgetMove={(id, pos) => updateWidget(id, { pos })}
            onWidgetResize={(id, size) => updateWidget(id, { size })}
          />
        </MusicPlayer>
        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-ink-800/90 px-4 py-2 text-xs font-medium shadow-xl backdrop-blur">
            {toast.message}
          </div>
        )}
      </main>

      {/* Mobile gate */}
      <div className="flex flex-1 items-center justify-center px-8 text-center lg:hidden">
        <div className="max-w-sm">
          <div className="eyebrow mb-3 text-discord">persn.me</div>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight">
            Desktop recommended
          </h1>
          <p className="text-sm text-white/60">
            The freeform editor uses drag-and-drop on a canvas — it's built for
            a bigger screen. Your profile will still look great on mobile once
            published.
          </p>
        </div>
      </div>

      <Sidebar
        profile={profile}
        activeSection={sidebarSection}
        onSectionChange={setSidebarSection}
        selectedWidget={selectedWidget}
        onSelectWidget={setSelectedId}
        onToggleWidget={(id) =>
          updateWidget(id, {
            visible: !profile.widgets.find((w) => w.id === id)?.visible,
          })
        }
        onAddWidget={addWidget}
        onRemoveWidget={removeWidget}
        onUpdateTheme={updateTheme}
        onUpdateBackground={updateBackground}
        onUpdateMusic={updateMusic}
        onUpdateWidgetData={updateWidgetData}
        onUpdateWidgetStyle={updateWidgetStyle}
        me={me}
        onSlugClaimed={handleSlugClaimed}
        onApplyTemplate={(tpl) => setPendingTemplate(tpl)}
        serverSlug={serverSlug}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {pendingTemplate && (
        <TemplateConfirmModal
          template={pendingTemplate}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            setProfile(pendingTemplate.profile);
            setSelectedId(null);
            setPendingTemplate(null);
          }}
        />
      )}

      {historyOpen && (
        <HistoryDrawer
          slug={serverSlug}
          onClose={() => setHistoryOpen(false)}
          onRestored={(restoredData) => {
            setProfile(restoredData);
            setHistoryOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* TopBar                                                                     */
/* -------------------------------------------------------------------------- */

function TopBar({
  me,
  saveStatus,
  lastSavedAt,
  hasServerProfile,
  onForceSave,
  onOpenShare,
  onPreview,
  onReset,
  onLogout,
  onOpenHistory,
}) {
  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex items-center justify-between px-6 py-5">
      <div className="pointer-events-auto flex items-center gap-3">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-discord to-indigo-500 font-bold text-white shadow-lg transition group-hover:brightness-110">
            P
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">persn.me</div>
            <div className="eyebrow">Profile editor</div>
          </div>
        </Link>

        {me && (
          <SaveStatusChip
            status={saveStatus}
            lastSavedAt={lastSavedAt}
            hasServerProfile={hasServerProfile}
            onForceSave={onForceSave}
          />
        )}
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        {me && hasServerProfile && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
            title="Restore a previous save"
          >
            History
          </button>
        )}
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/60 transition hover:bg-white/10 hover:text-white"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onPreview}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          Preview
        </button>
        <button
          type="button"
          onClick={onOpenShare}
          className="group relative overflow-hidden rounded-full bg-discord px-5 py-2 text-xs font-semibold text-white shadow-[0_0_30px_rgba(88,101,242,0.35)] transition hover:brightness-110"
        >
          {me ? 'Share' : 'Generate link'}
        </button>

        {me ? (
          <AccountChip user={me} onLogout={onLogout} />
        ) : (
          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

/** Save status indicator — click to force an immediate save. */
function SaveStatusChip({ status, lastSavedAt, hasServerProfile, onForceSave }) {
  if (!hasServerProfile) {
    return (
      <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
        <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
        Not yet claimed
      </span>
    );
  }

  const spec = STATUS_SPEC[status] || STATUS_SPEC.idle;
  const relative = lastSavedAt ? formatRelative(lastSavedAt) : null;
  const clickable = status === 'dirty' || status === 'error';

  return (
    <button
      type="button"
      onClick={clickable ? onForceSave : undefined}
      disabled={!clickable}
      title={clickable ? 'Save now' : ''}
      className={[
        'flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em] transition',
        spec.classes,
        clickable ? 'cursor-pointer hover:brightness-110' : 'cursor-default',
      ].join(' ')}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${spec.dot}`} />
      <span>{spec.label}</span>
      {status === 'saved' && relative && (
        <span className="text-white/40 normal-case tracking-normal font-sans">
          · {relative}
        </span>
      )}
    </button>
  );
}

const STATUS_SPEC = {
  idle: {
    label: 'Ready',
    dot: 'bg-white/30',
    classes: 'border-white/10 bg-white/[0.03] text-white/50',
  },
  saved: {
    label: 'Saved',
    dot: 'bg-green-400',
    classes: 'border-green-400/20 bg-green-400/[0.05] text-green-200',
  },
  dirty: {
    label: 'Unsaved · click to save',
    dot: 'bg-amber-400',
    classes: 'border-amber-400/20 bg-amber-400/[0.05] text-amber-200',
  },
  saving: {
    label: 'Saving…',
    dot: 'bg-discord animate-pulse',
    classes: 'border-discord/30 bg-discord/[0.08] text-white',
  },
  error: {
    label: 'Save failed · retry',
    dot: 'bg-red-400',
    classes: 'border-red-400/20 bg-red-400/[0.05] text-red-200',
  },
};

function formatRelative(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function AccountChip({ user, onLogout }) {
  const initial = user.username?.charAt(0).toUpperCase() || '?';
  const isAdmin = user.role === 'ADMIN';
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-white transition hover:bg-white/10"
        aria-label="Account"
      >
        {initial}
      </button>
      <div className="pointer-events-none absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/10 bg-ink-800/95 p-1.5 opacity-0 shadow-2xl backdrop-blur transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="px-3 py-2">
          <div className="truncate text-[11px] font-semibold">{user.username}</div>
          <div className="truncate text-[10px] text-white/40">{user.email}</div>
          {isAdmin && (
            <div className="mt-1 inline-block rounded-sm bg-discord/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-discord">
              admin
            </div>
          )}
        </div>
        {isAdmin && (
          <Link
            to="/analytique"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
          >
            Analytique
          </Link>
        )}
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
