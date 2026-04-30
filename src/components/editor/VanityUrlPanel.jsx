import { useEffect, useMemo, useState } from 'react';
import {
  Globe,
  Check,
  AlertCircle,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Clock,
  LogIn,
  QrCode,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyProfile, isSlugTaken, saveProfile } from '../../utils/api.js';
import QrModal from './QrModal.jsx';
import ImportModal from './ImportModal.jsx';

/**
 * Vanity URL panel.
 *
 * - Anonymous visitor → prompts them to sign in / create an account.
 * - Signed-in user with no profile → lets them claim a slug (cooldown starts).
 * - Signed-in user with a profile → shows the live URL; slug edits are
 *   blocked until the 7-day cooldown elapses, but data saves are always
 *   allowed ("Update design").
 *
 * Cooldown is authoritative on the server; we also render a live countdown
 * so the user knows exactly when they can rename.
 */
export default function VanityUrlPanel({ profile, me, onSlugClaimed }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [myProfile, setMyProfile] = useState(null);

  const [slug, setSlug] = useState('');
  const [available, setAvailable] = useState(null);

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { kind: 'ok' | 'err', message }
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Live countdown tick — refreshes the cooldown display every minute.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!myProfile?.locked) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [myProfile?.locked]);

  // `me` is owned by the parent Editor (single source of truth for auth).
  // Here we only need to fetch the user's existing profile / cooldown info.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!me) {
        setAuthChecked(true);
        return;
      }
      const mine = await getMyProfile();
      if (cancelled) return;
      setMyProfile(mine);
      if (mine?.slug) setSlug(mine.slug);
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  // Derived state -----------------------------------------------------------

  const currentSlug = myProfile?.slug || '';
  const slugDirty = slug !== currentSlug;
  const locked = !!myProfile?.locked;
  const slugChangeBlocked = slugDirty && locked;

  // 4-30 on new claims (matches server). The user's CURRENT slug, even if
  // 2-3 chars (grandfathered), stays valid because we only enforce the
  // longer rule on dirty/changing values.
  const validSlugFormat = useMemo(
    () => /^[a-z0-9][a-z0-9-]{3,29}$/.test(slug),
    [slug],
  );

  // Debounced availability check when the user edits the slug.
  useEffect(() => {
    if (!slug || !slugDirty || !validSlugFormat) {
      setAvailable(slug && !validSlugFormat ? false : null);
      return;
    }
    let cancelled = false;
    setAvailable(null);
    const id = setTimeout(async () => {
      const taken = await isSlugTaken(slug);
      if (!cancelled) setAvailable(!taken);
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [slug, slugDirty, validSlugFormat]);

  // Actions -----------------------------------------------------------------

  const pushToast = (kind, message, ttl = 2600) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), ttl);
  };

  const save = async (nextSlug) => {
    setSaving(true);
    try {
      const saved = await saveProfile(nextSlug, profile);
      setMyProfile(saved);
      setSlug(saved.slug);
      // Let the parent Editor know the server slug — it will plug it into
      // the auto-save loop so subsequent edits persist automatically.
      onSlugClaimed?.(saved.slug);
      pushToast('ok', slugDirty ? 'Profile claimed & saved' : 'Design updated');
    } catch (err) {
      if (err.cooldown) {
        setMyProfile((p) =>
          p ? { ...p, ...err.cooldown, locked: true } : p,
        );
        pushToast('err', err.message, 4000);
      } else {
        pushToast('err', err.message || 'Save failed', 4000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePrimary = () => {
    if (!me) return;
    if (!slug) return;
    if (slugChangeBlocked) return;
    if (slugDirty && !available) return;
    save(slug);
  };

  const shareUrl = `${window.location.origin}/${slug || currentSlug || 'your-link'}`;
  const canCopy = !!(slug || currentSlug);

  const copyLink = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy your profile link:', shareUrl);
    }
  };

  // Render ------------------------------------------------------------------

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center py-12 text-white/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!me) return <SignInPrompt />;

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div
          className={[
            'rounded-xl border px-3 py-2 text-xs font-medium',
            toast.kind === 'ok'
              ? 'border-green-400/20 bg-green-400/10 text-green-200'
              : 'border-red-400/20 bg-red-400/10 text-red-200',
          ].join(' ')}
        >
          {toast.message}
        </div>
      )}

      {/* Account chip */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-discord text-[11px] font-bold text-white">
          {me.username?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] font-semibold">{me.username}</div>
          <div className="truncate text-[10px] text-white/40">{me.email}</div>
        </div>
      </div>

      {/* Slug input */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Custom URL
          </label>
          {currentSlug && !slugDirty && (
            <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-green-400">
              Claimed
            </span>
          )}
          {slugChangeBlocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-amber-300">
              <Lock className="h-2.5 w-2.5" />
              Locked
            </span>
          )}
        </div>

        <div className="relative">
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/20">
            persn.me/
          </div>
          <input
            type="text"
            value={slug}
            onChange={(e) =>
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
            }
            placeholder="your-name"
            maxLength={30}
            disabled={locked && !slugDirty ? false : false}
            className="h-11 w-full rounded-xl border border-white/5 bg-white/[0.03] pl-[88px] pr-10 text-sm text-white outline-none transition focus:border-discord/50 focus:bg-white/[0.06] disabled:opacity-50"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <SlugIndicator
              slug={slug}
              dirty={slugDirty}
              available={available}
              format={validSlugFormat}
            />
          </div>
        </div>

        {slug && !validSlugFormat && (
          <p className="text-[10px] text-red-400">
            4–30 chars. Lowercase letters, digits or dashes. Can't start with a dash.
          </p>
        )}
        {slug && validSlugFormat && slugDirty && available === false && (
          <p className="text-[10px] text-red-400">This URL is already taken.</p>
        )}
      </div>

      {/* Cooldown card */}
      {locked && (
        <CooldownCard
          unlocksAt={myProfile.unlocksAt}
          remainingMs={myProfile.remainingMs}
        />
      )}

      {/* Primary action */}
      <button
        onClick={handlePrimary}
        disabled={
          saving ||
          !slug ||
          !validSlugFormat ||
          (slugDirty && !available) ||
          slugChangeBlocked
        }
        className="group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-discord text-sm font-bold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale"
      >
        {saving ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : slugChangeBlocked ? (
          <>
            <Lock className="h-4 w-4" />
            Slug locked — data saves still work
          </>
        ) : !slugDirty && currentSlug ? (
          <>
            <Check className="h-4 w-4" />
            Update design
          </>
        ) : (
          <>
            <Globe className="h-4 w-4" />
            {currentSlug ? 'Change URL & save' : 'Claim & save'}
          </>
        )}
      </button>

      {/* Live preview */}
      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
        <h4 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
          Live URL
        </h4>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-black/40 p-3">
          <span className="truncate text-xs text-white/60">
            {canCopy ? shareUrl : 'persn.me/your-link'}
          </span>
          <div className="flex gap-1">
            <button
              onClick={copyLink}
              disabled={!canCopy}
              className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/5 disabled:opacity-20"
              aria-label="Copy"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/5 ${
                !canCopy ? 'pointer-events-none opacity-20' : ''
              }`}
              aria-label="Open"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => currentSlug && setQrOpen(true)}
            disabled={!currentSlug}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-30"
          >
            <QrCode className="h-3.5 w-3.5" />
            Get QR
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <Upload className="h-3.5 w-3.5" />
            Import Linktree
          </button>
        </div>
      </div>

      {qrOpen && currentSlug && (
        <QrModal slug={currentSlug} onClose={() => setQrOpen(false)} />
      )}
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImported={(imported) => {
            // Bubble the imported profile up via a custom event — Editor.jsx
            // listens for it and replaces the current profile after a
            // confirmation step (same flow as Templates).
            window.dispatchEvent(
              new CustomEvent('persn:profile-import', { detail: imported }),
            );
            setImportOpen(false);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                              */
/* -------------------------------------------------------------------------- */

function SlugIndicator({ slug, dirty, available, format }) {
  if (!slug) return null;
  if (!format) return <AlertCircle className="h-4 w-4 text-red-400" />;
  if (!dirty) return <Check className="h-4 w-4 text-green-400" />;
  if (available === true) return <Check className="h-4 w-4 text-green-400" />;
  if (available === false) return <AlertCircle className="h-4 w-4 text-red-400" />;
  return <Loader2 className="h-4 w-4 animate-spin text-white/20" />;
}

function CooldownCard({ unlocksAt, remainingMs }) {
  const parts = formatDuration(remainingMs);
  const unlockDate = new Date(unlocksAt);
  return (
    <div className="space-y-2 rounded-2xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
      <div className="flex items-center gap-2 text-amber-200">
        <Clock className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-widest">
          Slug locked
        </span>
      </div>
      <div className="flex items-end gap-3 font-mono tabular-nums">
        {parts.map(([value, label]) => (
          <div key={label} className="text-white/90">
            <div className="text-2xl font-bold leading-none">{value}</div>
            <div className="mt-1 text-[9px] uppercase tracking-widest text-white/40">
              {label}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-white/50">
        You can rename your URL on{' '}
        <span className="font-semibold text-white/80">
          {unlockDate.toLocaleString()}
        </span>
        . Until then you can still save design updates under the same URL.
      </p>
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-white">
        <LogIn className="h-4 w-4 text-discord" />
        <h3 className="text-sm font-bold">Sign in to claim a URL</h3>
      </div>
      <p className="text-xs leading-relaxed text-white/50">
        Your custom URL is tied to your account. Once claimed, the slug is
        yours and can be changed every 7 days.
      </p>
      <div className="flex gap-2">
        <Link
          to="/login"
          className="flex h-10 flex-1 items-center justify-center rounded-xl bg-discord text-[11px] font-bold uppercase tracking-widest text-white transition hover:brightness-110"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[11px] font-bold uppercase tracking-widest text-white/80 transition hover:bg-white/10"
        >
          Create account
        </Link>
      </div>
    </div>
  );
}

/** [value, label] pairs for days / hours / minutes. Omits leading zeros. */
function formatDuration(ms) {
  const safe = Math.max(0, ms);
  const totalMinutes = Math.floor(safe / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  const parts = [];
  if (days > 0) parts.push([String(days), days > 1 ? 'days' : 'day']);
  if (days > 0 || hours > 0) parts.push([String(hours).padStart(2, '0'), 'hours']);
  parts.push([String(mins).padStart(2, '0'), 'mins']);
  return parts;
}
