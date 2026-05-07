import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { nanoid } from 'nanoid';
import { Link, useNavigate } from 'react-router-dom';
import DragCanvas from '../components/editor/DragCanvas.jsx';
import MusicPlayer from '../components/MusicPlayer.jsx';
import Sidebar from '../components/editor/Sidebar.jsx';
import MobileEditor from '../components/editor/MobileEditor.jsx';
import { useLocalStorage } from '../hooks/useLocalStorage.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import {
  makeDefaultProfile,
  makeWidgetInstance,
  WIDGET_CATALOG,
} from '../utils/widgetDefaults.js';
import { encodeProfile } from '../utils/encode.js';
import { getDiscordImport, getMe, getMyProfile, logout, saveProfile } from '../utils/api.js';
import { resolveAccent } from '../utils/theme.js';
import HistoryDrawer from '../components/editor/HistoryDrawer.jsx';
import TemplateConfirmModal from '../components/editor/TemplateConfirmModal.jsx';
import Coachmarks from '../components/editor/Coachmarks.jsx';
import logo from '../image/logo.jpeg';
import axios from 'axios';
import {
  AlertCircle,
  Mail,
  Loader2,
  Check,
  AlertTriangle,
  RotateCcw,
  Eye as EyeIcon,
  Share2,
  History as HistoryIcon,
  Undo2,
  Lightbulb,
  X as XIcon,
} from 'lucide-react';

const STORAGE_KEY = 'persn:profile';
const AUTOSAVE_DEBOUNCE_MS = 5000;
const WIDGET_LABEL = Object.fromEntries(
  Object.values(WIDGET_CATALOG).map((d) => [d.type, d.label]),
);

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
  const isMobile = useIsMobile(1024); // anything below `lg` gets the mobile editor
  const [profile, setProfile] = useLocalStorage(STORAGE_KEY, makeDefaultProfile());
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;
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

  const handleSelect = useCallback((id) => {
    if (!id) setSelectedIds([]);
    else setSelectedIds([id]);
  }, []);

  const handleSelectMultiple = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleGroupWidgets = useCallback((ids) => {
    const widgets = profile.widgets.filter((w) => ids.includes(w.id));
    if (widgets.length < 2) return;

    // Find if there is an existing group in the selection
    const existingGroup = widgets.find(w => w.type === 'group');

    let targetGroupId = existingGroup ? existingGroup.id : nanoid(8);
    let minX = 100, minY = 100, maxX = 0, maxY = 0;

    // We calculate the bounding box using all children of the existing group + newly selected widgets
    const allIdsToGroup = [...ids];
    if (existingGroup) {
      profile.widgets.forEach(w => {
        if (w.groupId === existingGroup.id && !allIdsToGroup.includes(w.id)) {
          allIdsToGroup.push(w.id);
        }
      });
    }

    const allWidgets = profile.widgets.filter(w => allIdsToGroup.includes(w.id) || (existingGroup && w.id === existingGroup.id));

    allWidgets.forEach((w) => {
      if (w.type === 'group') return;

      const auto = w.style?.autoSize;
      const left = auto ? w.pos.x - w.size.w / 2 : w.pos.x;
      const top = auto ? w.pos.y - w.size.h / 2 : w.pos.y;
      const right = auto ? w.pos.x + w.size.w / 2 : left + w.size.w;
      const bottom = auto ? w.pos.y + w.size.h / 2 : top + w.size.h;

      if (left < minX) minX = left;
      if (top < minY) minY = top;
      if (right > maxX) maxX = right;
      if (bottom > maxY) maxY = bottom;
    });

    const padding = 2;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(100, maxX + padding);
    maxY = Math.min(100, maxY + padding);

    const groupPos = { x: Number(minX.toFixed(2)), y: Number(minY.toFixed(2)) };
    const groupSize = { w: Number((maxX - minX).toFixed(2)), h: Number((maxY - minY).toFixed(2)) };

    setProfile((prev) => {
      const nextWidgets = prev.widgets.map((w) => {
        if (w.id === targetGroupId) {
          return { ...w, pos: groupPos, size: groupSize };
        }
        if (allIdsToGroup.includes(w.id)) {
          if (w.type === 'group') return w;
          return { ...w, groupId: targetGroupId };
        }
        return w;
      });

      if (!existingGroup) {
        const newGroup = {
          id: targetGroupId,
          type: 'group',
          pos: groupPos,
          size: groupSize,
          style: { bgOpacity: 0.05, blur: 16, autoSize: false, borderRadius: 16 },
          data: { title: 'Groupe', enable3D: false },
          visible: true,
        };
        nextWidgets.push(newGroup);
      }

      // Handle disbanding other selected groups
      const otherGroupIds = widgets.filter(w => w.type === 'group' && w.id !== targetGroupId).map(w => w.id);
      let finalWidgets = nextWidgets;
      if (otherGroupIds.length > 0) {
        finalWidgets = nextWidgets.filter(w => !otherGroupIds.includes(w.id)).map(w => {
           if (otherGroupIds.includes(w.groupId)) {
               return { ...w, groupId: targetGroupId };
           }
           return w;
        });
      }

      return { ...prev, widgets: finalWidgets };
    });
    setSelectedIds([targetGroupId]);
  }, [profile.widgets]);

  const handleUngroupWidget = useCallback((groupId) => {
    setProfile(prev => {
      const nextWidgets = prev.widgets.filter(w => w.id !== groupId).map(w => {
        if (w.groupId === groupId) {
          const { groupId: _, ...rest } = w;
          return rest;
        }
        return w;
      });
      return { ...prev, widgets: nextWidgets };
    });
    setSelectedIds([]);
  }, []);

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

  const updateWidgets = useCallback(
    (updates) => {
      setProfile((prev) => {
        let nextWidgets = prev.widgets.map((w) => {
          const up = updates.find((u) => u.id === w.id);
          if (up) return { ...w, ...up.patch };
          return w;
        });

        const updatedIds = new Set(updates.map(u => u.id));
        const groupsToUpdate = new Set();
        nextWidgets.forEach(w => {
           if (w.groupId && updatedIds.has(w.id)) {
              groupsToUpdate.add(w.groupId);
           }
        });

        groupsToUpdate.forEach(groupId => {
           const groupIndex = nextWidgets.findIndex(w => w.id === groupId);
           if (groupIndex === -1) return;
           const group = nextWidgets[groupIndex];
           if (!group.style?.autoSize) return;

           const children = nextWidgets.filter(w => w.groupId === groupId);
           if (children.length > 0) {
              let minX = 100, minY = 100, maxX = 0, maxY = 0;
              children.forEach(w => {
                 const auto = w.style?.autoSize && w.type !== 'group';
                 const left = auto ? w.pos.x - w.size.w / 2 : w.pos.x;
                 const top = auto ? w.pos.y - w.size.h / 2 : w.pos.y;
                 const right = auto ? w.pos.x + w.size.w / 2 : w.pos.x + w.size.w;
                 const bottom = auto ? w.pos.y + w.size.h / 2 : w.pos.y + w.size.h;
                 if (left < minX) minX = left;
                 if (top < minY) minY = top;
                 if (right > maxX) maxX = right;
                 if (bottom > maxY) maxY = bottom;
              });
              const padding = 2;
              minX = Math.max(0, minX - padding);
              minY = Math.max(0, minY - padding);
              maxX = Math.min(100, maxX + padding);
              maxY = Math.min(100, maxY + padding);
              
              nextWidgets[groupIndex] = {
                 ...group,
                 pos: { x: Number(minX.toFixed(2)), y: Number(minY.toFixed(2)) },
                 size: { w: Number((maxX - minX).toFixed(2)), h: Number((maxY - minY).toFixed(2)) }
              };
           }
        });

        return { ...prev, widgets: nextWidgets };
      });
    },
    [setProfile]
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
      setSelectedIds([instance.id]);
    },
    [setProfile],
  );

  const removeWidget = useCallback(
    (id) => {
      setProfile((prev) => {
        const isGroup = prev.widgets.find(w => w.id === id)?.type === 'group';
        let nextWidgets = prev.widgets.filter((w) => w.id !== id);
        
        if (isGroup) {
           nextWidgets = nextWidgets.map(w => w.groupId === id ? { ...w, groupId: null } : w);
        }
        
        return { ...prev, widgets: nextWidgets };
      });
      setSelectedIds((prev) => (prev.includes(id) ? [] : prev));
    },
    [setProfile],
  );

  const resetProfile = useCallback(() => {
    if (!confirm('Reset the entire profile to defaults?')) return;
    setProfile(makeDefaultProfile());
    setSelectedIds([]);
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

  // Progressive coachmarks — non-blocking guided tour. Shown once per user
  // (or once per anonymous session) on first visit; can be re-triggered from
  // the welcome card in the sidebar.
  const [showCoachmarks, setShowCoachmarks] = useState(false);
  const coachmarksKey = me ? `persn:coachmarks:v1:${me.id}` : 'persn:coachmarks:v1:anon';
  useEffect(() => {
    if (!hydrated) return;
    if (!localStorage.getItem(coachmarksKey)) setShowCoachmarks(true);
  }, [hydrated, coachmarksKey]);

  const handleCoachmarksDone = useCallback(() => {
    setShowCoachmarks(false);
    localStorage.setItem(coachmarksKey, '1');
  }, [coachmarksKey]);

  const startTour = useCallback(() => {
    setSidebarSection('widgets');
    setSelectedIds([]);
    setShowCoachmarks(true);
  }, []);

  // Reset confirmation — replaces the native confirm() prompt with a custom
  // modal that matches the editor's visual language.
  const [resetOpen, setResetOpen] = useState(false);
  const requestReset = useCallback(() => setResetOpen(true), []);
  const confirmReset = useCallback(() => {
    setProfile(makeDefaultProfile());
    setSelectedIds([]);
    setResetOpen(false);
  }, [setProfile]);

  // Undo toast — used by widget delete (and other reversible destructive ops)
  // to skip a confirm dialog while still giving users an out.
  const [undo, setUndo] = useState(null); // { message, run, expiresAt }
  const undoTimerRef = useRef(null);

  const requestUndoableDelete = useCallback(
    (id) => {
      const widget = profile.widgets.find((w) => w.id === id);
      if (!widget) return;
      const snapshot = profile;
      removeWidget(id);
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      const label = WIDGET_LABEL[widget.type] || 'Widget';
      setUndo({
        message: `${label} supprimé`,
        run: () => {
          setProfile(snapshot);
          setUndo(null);
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        },
      });
      undoTimerRef.current = setTimeout(() => setUndo(null), 5000);
    },
    [profile, removeWidget, setProfile],
  );

  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
  }, []);

  // Group + 3D hover tip — surfaces a small non-blocking hint after the user
  // has spent a few minutes in the editor, since Alt-click multi-select isn't
  // discoverable on its own. Persisted per-user (or per-anon) so it never
  // re-fires once acknowledged.
  const [showGroupTip, setShowGroupTip] = useState(false);
  const groupTipKey = me ? `persn:tip:groups:v1:${me.id}` : 'persn:tip:groups:v1:anon';
  const altKeyLabel = useMemo(() => {
    if (typeof navigator === 'undefined') return 'Alt';
    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Option' : 'Alt';
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (showCoachmarks) return; // don't pile hints on top of the tour
    if (localStorage.getItem(groupTipKey)) return;
    const id = setTimeout(() => setShowGroupTip(true), 3 * 60_000);
    return () => clearTimeout(id);
  }, [hydrated, showCoachmarks, groupTipKey]);

  const dismissGroupTip = useCallback(() => {
    setShowGroupTip(false);
    localStorage.setItem(groupTipKey, '1');
  }, [groupTipKey]);

  // Modals are rendered for both layouts.
  const modals = (
    <>
      {pendingTemplate && (
        <TemplateConfirmModal
          template={pendingTemplate}
          onCancel={() => setPendingTemplate(null)}
          onConfirm={() => {
            setProfile(pendingTemplate.profile);
            setSelectedIds([]);
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
    </>
  );

  if (isMobile) {
    return (
      <>
        <MusicPlayer music={profile.music} accent={accentHex} hideControls>
          <MobileEditor
            profile={profile}
            setProfile={setProfile}
            me={me}
            serverSlug={serverSlug}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt}
            onForceSave={forceSave}
            onPreview={openPreview}
            onReset={resetProfile}
            onLogout={handleLogout}
            onOpenHistory={() => setHistoryOpen(true)}
            onAddWidget={addWidget}
            onRemoveWidget={removeWidget}
            onUpdateWidget={updateWidget}
            onUpdateWidgetData={updateWidgetData}
            onUpdateWidgetStyle={updateWidgetStyle}
            onUpdateTheme={updateTheme}
            onUpdateBackground={updateBackground}
            onUpdateMusic={updateMusic}
            onSlugClaimed={handleSlugClaimed}
          />
        </MusicPlayer>
        {modals}
      </>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ink-950 text-white">
      <main className="relative flex-1" data-coachmark="canvas-area">
        <VerificationBanner user={me} />
        <TopBar
          me={me}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          hasServerProfile={!!serverSlug}
          onForceSave={forceSave}
          onOpenShare={() => {
            setSidebarSection('share');
            setSelectedIds([]);
          }}
          onPreview={openPreview}
          onReset={requestReset}
          onLogout={handleLogout}
          onOpenHistory={() => setHistoryOpen(true)}
        />
        <MusicPlayer music={profile.music} accent={accentHex} hideControls>
          <DragCanvas
            profile={profile}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onSelectMultiple={handleSelectMultiple}
            onWidgetsMove={updateWidgets}
            onWidgetResize={(id, size) => updateWidget(id, { size })}
          />
        </MusicPlayer>

        {showCoachmarks && <Coachmarks onDone={handleCoachmarksDone} />}

        {toast && (
          <div className="pointer-events-none absolute left-1/2 top-6 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-ink-800/90 px-4 py-2 text-xs font-medium shadow-xl backdrop-blur">
            {toast.message}
          </div>
        )}

        {undo && <UndoToast message={undo.message} onUndo={undo.run} />}

        {showGroupTip && (
          <TipToast shortcut={altKeyLabel} onClose={dismissGroupTip} />
        )}
      </main>

      <Sidebar
        profile={profile}
        activeSection={sidebarSection}
        onSectionChange={setSidebarSection}
        selectedIds={selectedIds}
        selectedWidget={selectedWidget}
        onSelectWidget={handleSelect}
        onGroupWidgets={handleGroupWidgets}
        onUngroupWidget={handleUngroupWidget}
        onToggleWidget={(id) =>
          updateWidget(id, {
            visible: !profile.widgets.find((w) => w.id === id)?.visible,
          })
        }
        onAddWidget={addWidget}
        onRemoveWidget={requestUndoableDelete}
        onUpdateTheme={updateTheme}
        onUpdateBackground={updateBackground}
        onUpdateMusic={updateMusic}
        onUpdateWidgetData={updateWidgetData}
        onUpdateWidgetStyle={updateWidgetStyle}
        onUpdateWidget={updateWidget}
        me={me}
        onSlugClaimed={handleSlugClaimed}
        onApplyTemplate={(tpl) => setPendingTemplate(tpl)}
        serverSlug={serverSlug}
        onOpenHistory={() => setHistoryOpen(true)}
        onStartTour={startTour}
      />

      {modals}
      {resetOpen && (
        <ConfirmModal
          icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
          tone="danger"
          eyebrow="Action irréversible"
          title="Réinitialiser le profil ?"
          body="Tous tes widgets, ton thème, ta musique et ton arrière-plan seront remis aux valeurs par défaut. Tu garderas ton compte et ton URL."
          confirmLabel="Tout réinitialiser"
          cancelLabel="Annuler"
          onConfirm={confirmReset}
          onCancel={() => setResetOpen(false)}
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
          <img
            src={logo}
            alt="persn.me"
            className="h-9 w-9 rounded-xl object-cover shadow-lg ring-1 ring-white/10 transition group-hover:brightness-110"
          />
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
          <IconTextButton
            onClick={onOpenHistory}
            icon={<HistoryIcon className="h-3.5 w-3.5" />}
            tooltip="Restaurer une sauvegarde précédente"
          >
            Historique
          </IconTextButton>
        )}
        <IconTextButton
          onClick={onReset}
          icon={<RotateCcw className="h-3.5 w-3.5" />}
          tooltip="Tout réinitialiser"
          tone="danger"
        >
          Reset
        </IconTextButton>
        <span className="mx-1 h-5 w-px bg-white/10" aria-hidden />
        <IconTextButton
          onClick={onPreview}
          icon={<EyeIcon className="h-3.5 w-3.5" />}
          tooltip="Ouvrir la prévisualisation"
          dataCoachmark="topbar-preview"
        >
          Aperçu
        </IconTextButton>
        <button
          type="button"
          onClick={onOpenShare}
          data-coachmark="topbar-share"
          title={me ? 'Publier / partager ton profil' : 'Génère un lien partageable'}
          className="group relative flex items-center gap-1.5 overflow-hidden rounded-full bg-discord px-5 py-2 text-xs font-semibold text-white shadow-[0_0_30px_rgba(88,101,242,0.35)] transition hover:brightness-110"
        >
          <Share2 className="h-3.5 w-3.5" />
          {me ? 'Partager' : 'Générer le lien'}
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

function IconTextButton({ onClick, icon, children, tooltip, tone, dataCoachmark }) {
  const danger = tone === 'danger';
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      data-coachmark={dataCoachmark}
      className={[
        'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition',
        danger
          ? 'border-white/10 bg-white/[0.04] text-white/55 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200'
          : 'border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white',
      ].join(' ')}
    >
      {icon}
      <span>{children}</span>
    </button>
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

function VerificationBanner({ user }) {
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  
  if (!user || user.emailVerified) return null;

  const handleResend = async () => {
    setStatus('loading');
    try {
      await axios.post('/api/auth/resend-verification');
      setStatus('success');
      setTimeout(() => setStatus('idle'), 5000);
    } catch (err) {
      console.error('[resend] failed:', err);
      setStatus('error');
    }
  };

  return (
    <div className="relative z-50 flex items-center justify-center gap-3 bg-discord/10 px-4 py-2 border-b border-discord/20 backdrop-blur-md">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-discord/20">
        <Mail className="h-3.5 w-3.5 text-discord" />
      </div>
      <p className="text-[11px] font-medium text-white/80">
        Votre profil n'est pas encore public. <span className="text-white">Vérifiez votre adresse email</span> pour l'activer.
      </p>
      
      <button
        onClick={handleResend}
        disabled={status === 'loading' || status === 'success'}
        className="ml-2 rounded-full bg-discord/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition hover:bg-discord/30 disabled:opacity-50"
      >
        {status === 'loading' ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : status === 'success' ? (
          <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Envoyé !</span>
        ) : (
          "Renvoyer le mail"
        )}
      </button>

      {status === 'error' && (
        <span className="flex items-center gap-1 text-[10px] text-red-400">
          <AlertCircle className="h-3 w-3" /> Erreur
        </span>
      )}
    </div>
  );
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

/* -------------------------------------------------------------------------- */
/* ConfirmModal — reusable destructive confirmation modal                     */
/* -------------------------------------------------------------------------- */

function ConfirmModal({
  icon,
  eyebrow,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Annuler',
  tone = 'danger',
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, onConfirm]);

  const confirmCls =
    tone === 'danger'
      ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(248,113,113,0.35)] hover:brightness-110'
      : 'bg-discord text-white shadow-[0_0_30px_rgba(88,101,242,0.35)] hover:brightness-110';

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[420px] max-w-[90vw] rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={[
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                tone === 'danger' ? 'bg-red-500/10' : 'bg-discord/10',
              ].join(' ')}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {eyebrow && (
              <div
                className={[
                  'eyebrow',
                  tone === 'danger' ? 'text-red-400' : 'text-discord',
                ].join(' ')}
              >
                {eyebrow}
              </div>
            )}
            <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'rounded-full px-5 py-2 text-xs font-semibold transition',
              confirmCls,
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* UndoToast — non-blocking reversible-action notice                          */
/* -------------------------------------------------------------------------- */

function TipToast({ shortcut, onClose }) {
  // Auto-dismiss after a comfortable read window. The user can also click X.
  useEffect(() => {
    const id = setTimeout(onClose, 14_000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="pointer-events-auto absolute bottom-6 left-6 z-40 max-w-[360px] animate-fade-up">
      <div className="relative flex items-start gap-3 rounded-2xl border border-discord/30 bg-ink-900/95 p-4 shadow-2xl backdrop-blur">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-discord/15">
          <Lightbulb className="h-4 w-4 text-discord" />
        </div>
        <div className="min-w-0 flex-1 pr-4">
          <div className="eyebrow text-discord">Astuce</div>
          <p className="mt-1 text-xs leading-relaxed text-white/75">
            Maintiens{' '}
            <kbd className="rounded-md border border-white/15 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
              {shortcut}
            </kbd>{' '}
            et clique deux widgets pour les grouper. Active ensuite l'effet 3D
            au survol depuis l'onglet Style.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer l'astuce"
          className="absolute right-2 top-2 rounded-full p-1 text-white/30 transition hover:bg-white/10 hover:text-white"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function UndoToast({ message, onUndo }) {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-ink-800/95 py-2 pl-4 pr-2 shadow-2xl backdrop-blur">
        <span className="text-xs font-medium text-white/80">{message}</span>
        <button
          type="button"
          onClick={onUndo}
          className="flex items-center gap-1.5 rounded-full bg-discord px-3 py-1 text-[11px] font-bold text-white transition hover:brightness-110"
        >
          <Undo2 className="h-3 w-3" />
          Annuler
        </button>
      </div>
    </div>
  );
}
