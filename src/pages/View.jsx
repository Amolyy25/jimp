import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BackgroundLayer from '../components/BackgroundLayer.jsx';
import MusicPlayer from '../components/MusicPlayer.jsx';
import SplashScreen from '../components/SplashScreen.jsx';
import ParticlesLayer from '../components/ParticlesLayer.jsx';
import CursorTrail from '../components/CursorTrail.jsx';
import { decodeProfile } from '../utils/encode.js';
import { WIDGET_REGISTRY } from '../components/widgets/index.js';
import WidgetFrame from '../components/widgets/WidgetFrame.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { useMusic } from '../utils/MusicContext.jsx';
import { getProfileBySlug, recordView, recordClick } from '../utils/api.js';
import { resolveAccent } from '../utils/theme.js';
import GuestbookFloating from '../components/GuestbookFloating.jsx';
import axios from 'axios';
import { 
  Flag, 
  ShieldAlert, 
  Send, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  Mail, 
  Check 
} from 'lucide-react';

/**
 * Public profile page.
 *
 * Can load data from two sources:
 *  1. Database: if a `slug` param is in the URL (e.g. /my-name).
 *  2. URL Hash: legacy fallback (e.g. /view#base64...).
 */
export default function View() {
  const { slug } = useParams();
  const location = useLocation();
  const isMobile = useIsMobile();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!slug);
  // Splash gate — resolves to `true` (entered) once user clicks or when the
  // profile doesn't opt into a splash. The MusicPlayer only starts playback
  // after this gate is down, which also solves the autoplay policy.
  const [entered, setEntered] = useState(false);
  const [splashGone, setSplashGone] = useState(false);

  // 1. Handle Slug (Database). The payload carries `__ownerId` alongside
  // the profile blob — we strip it into its own state so widgets that need
  // the owner ID (e.g. Spotify now-playing) can request it without it
  // leaking into the editor's persisted profile state.
  const [ownerId, setOwnerId] = useState(null);
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProfileBySlug(slug).then((payload) => {
      if (payload) {
        const { __ownerId, ...data } = payload;
        setProfile(data);
        setOwnerId(__ownerId || null);
      }
      setLoading(false);
    });
  }, [slug]);

  // 2. Handle Hash (Legacy fallback)
  useEffect(() => {
    if (slug) return; // Database takes precedence
    const payload = location.hash.slice(1);
    if (payload) {
      try {
        const decoded = decodeProfile(payload);
        setProfile(decoded);
        // Clear the hash to keep the Referer header short and avoid 413 errors
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch (err) {
        console.error('Failed to decode profile:', err);
      }
    }
  }, [location.hash, slug]);

  // Update the browser tab title to match the profile pseudo.
  useEffect(() => {
    if (!profile) return;
    const avatar = profile.widgets?.find((w) => w.type === 'avatar');
    const name = avatar?.data?.username || 'Profile';
    document.title = `@${name} — persn.me`;
    return () => {
      document.title = 'persn.me';
    };
  }, [profile]);

  // Apply the custom cursor — cleaned up on unmount so it doesn't leak to
  // the editor if the user navigates back.
  useEffect(() => {
    if (!profile?.theme) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = cssCursor(profile.theme);
    return () => {
      document.body.style.cursor = prev;
    };
  }, [profile?.theme?.cursor, profile?.theme?.cursorUrl]);

  // While the slug is resolving, show a quiet placeholder rather than the
  // "empty link" screen — otherwise the user sees the EmptyState flash for
  // a few hundred ms before the real profile renders. Only commit to
  // EmptyState once loading is done AND no profile came back.
  const splashEnabled = !!profile?.theme?.splash?.enabled;
  const showSplash = splashEnabled && !splashGone;

  const musicConfig = {
    ...(profile?.music || { enabled: false }),
    autoplay: profile?.music?.autoplay ?? false,
  };

  const accentResolved = profile ? resolveAccent(profile.theme?.accent) : null;
  const accentHex = accentResolved?.hex || '#5865F2';
  const accentCss = accentResolved?.css || '#5865F2';

  return (
    <MusicPlayer music={musicConfig} accent={accentHex} readyToPlay={!splashEnabled || entered}>
      {loading ? (
        <ProfileLoading />
      ) : !profile ? (
        <EmptyState />
      ) : (
        <>
          {showSplash && (
            <SplashScreen
              text={profile.theme.splash.text || 'Click to enter'}
              subtitle={profile.theme.splash.subtitle}
              accent={accentHex}
              accentCss={accentCss}
              onEnter={() => setEntered(true)}
              onDismiss={() => setSplashGone(true)}
            />
          )}
          <ProfileBody profile={profile} isMobile={isMobile} ownerId={ownerId} slug={slug} />
          {slug && profile.theme?.guestbook?.enabled !== false && (
            <GuestbookFloating slug={slug} accent={accentHex} />
          )}
        </>
      )}
    </MusicPlayer>
  );
}

/** The body is its own component so it can consume MusicContext via hooks. */
function ProfileBody({ profile, isMobile, ownerId, slug }) {
  const { playing } = useMusic();
  const visibleWidgets = profile.widgets.filter((w) => w.visible !== false);
  const entryAnim = profile.theme?.entryAnimation || 'none';
  const animClass = entryAnim !== 'none' ? `animate-entry-${entryAnim}` : '';

  const accentResolved = resolveAccent(profile.theme?.accent);
  const accent = accentResolved.hex;
  const accentCss = accentResolved.css;

  // Fire-and-forget view event — only on slug-based loads, throttled by the
  // session cookie set server-side.
  useEffect(() => {
    if (!slug) return;
    recordView(slug);
  }, [slug]);

  // Click analytics: bubble-phase listener intercepts <a> clicks anywhere
  // inside the profile and posts {target, kind} before the navigation lands.
  useEffect(() => {
    if (!slug) return;
    const onClick = (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      const widgetEl = a.closest('[data-widget-type]');
      const kind = widgetEl?.getAttribute('data-widget-type') || 'link';
      recordClick(slug, { kind, target: href });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [slug]);

  const ctx = { musicPlaying: playing, accent, accentCss, ownerId, slug };
  const customCss = profile.theme?.customCss || '';

  return (
    <div
      id="profile-root"
      className={`relative min-h-screen w-full overflow-x-hidden ${animClass}`}
      style={{ background: profile.theme?.pageBg || '#0a0a0a' }}
    >
      <BackgroundLayer background={profile.background} />

      {/* Scoped custom CSS — only the bytes that survived server sanitization
          end up here, but we still scope to #profile-root so a stray rule
          doesn't leak to /editor. */}
      {customCss && (
        <style>{`#profile-root { ${customCss} }`}</style>
      )}

      {/* Ambient effects — disabled on mobile to keep the feed light */}
      {!isMobile && (
        <>
          <ParticlesLayer variant={profile.theme?.particles} accent={accent} />
          <CursorTrail variant={profile.theme?.cursorTrail} accent={accent} />
        </>
      )}

      {isMobile ? (
        <div className="relative z-10 mx-auto flex max-w-md flex-col gap-5 px-5 py-8 pb-28">
          {visibleWidgets.map((widget, i) => (
            <WidgetFrame
              key={widget.id}
              widget={widget}
              mode="view"
              isMobile
              index={i}
            >
              {renderWidget(widget, ctx)}
            </WidgetFrame>
          ))}
        </div>
      ) : (
        <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden p-4">
          <div className="relative aspect-video h-full max-h-full w-auto max-w-full">
            {profile.widgets
              .filter((w) => w.visible !== false)
              .map((w, i) => {
                const Comp = WIDGET_REGISTRY[w.type]?.component;
                if (!Comp) return null;

                // The absolute-positioned children inside a fixed container
                // play badly with `whileInView` — framer-motion sometimes
                // fails to fire the intersection, leaving widgets stuck at
                // `initial` (opacity: 0). We animate on mount instead, with
                // a tiny stagger so things still feel lively.
                const animation = w.style?.animation || 'fade-up';
                const variants = {
                  none: { opacity: 0, y: 0, x: 0, scale: 1 },
                  'fade-up': { opacity: 0, y: 12, x: 0, scale: 1 },
                  'fade-in': { opacity: 0, y: 0, x: 0, scale: 1 },
                  'zoom-in': { opacity: 0, y: 0, x: 0, scale: 0.92 },
                  'slide-right': { opacity: 0, y: 0, x: -20, scale: 1 },
                  bounce: { opacity: 0, y: 24, x: 0, scale: 0.85 },
                };

                const transition = {
                  type: animation === 'bounce' ? 'spring' : 'tween',
                  duration: 0.5,
                  ease: [0.22, 1, 0.36, 1],
                  delay: Math.min(i * 0.05, 0.5),
                  bounce: animation === 'bounce' ? 0.4 : 0,
                };

                // Mirror the editor: when a widget opts into autoSize, pos
                // becomes the widget's centre and size becomes a max bound,
                // so adding items grows the box symmetrically around the
                // anchor instead of overflowing.
                const auto = !!w.style?.autoSize;
                const layoutStyle = auto
                  ? {
                      left: `${w.pos.x}%`,
                      top: `${w.pos.y}%`,
                      // CSS centring lives on the OUTER div so framer-motion
                      // (which manages `transform` internally on the inner
                      // motion.div) doesn't strip it during the animation.
                      transform: 'translate(-50%, -50%)',
                      maxWidth: `${w.size.w}%`,
                      maxHeight: `${w.size.h}%`,
                    }
                  : {
                      left: `${w.pos.x}%`,
                      top: `${w.pos.y}%`,
                      width: `${w.size.w}%`,
                      height: `${w.size.h}%`,
                    };

                return (
                  <div key={w.id} className="absolute" style={layoutStyle}>
                    <motion.div
                      className={auto ? '' : 'h-full w-full'}
                      initial={variants[animation] || variants['fade-up']}
                      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                      transition={transition}
                    >
                      <WidgetFrame widget={w} mode="view">
                        <Comp
                          widget={w}
                          musicPlaying={playing}
                          accent={accent}
                          accentCss={accentCss}
                          ownerId={ownerId}
                          slug={slug}
                        />
                      </WidgetFrame>
                    </motion.div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <FooterActions accent={accent} slug={slug} />
      <CreateYoursToast accent={accent} accentCss={accentCss} />
    </div>
  );
}

/** Resolve a widget to its React component. Unknown types render nothing. */
function renderWidget(widget, ctx) {
  const Component = WIDGET_REGISTRY[widget.type]?.component;
  if (!Component) return null;
  return <Component widget={widget} {...ctx} />;
}

/** Subtle "Made with" pill and Report button, bottom. */
function FooterActions({ accent = '#5865F2', slug }) {
  const [reportOpen, setReportOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 px-5 py-3">
      <div className="pointer-events-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/35">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
        />
        Made with persn.me
      </div>

      {slug && (
        <div className="pointer-events-auto">
          <button
            onClick={() => setReportOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/30 transition hover:bg-white/10 hover:text-white/60"
            title="Report this profile"
          >
            <Flag className="h-3.5 w-3.5" />
          </button>
          <AnimatePresence>
            {reportOpen && (
              <ReportModal
                slug={slug}
                accent={accent}
                onClose={() => setReportOpen(false)}
              />
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ReportModal({ slug, accent, onClose }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) return;
    setStatus('loading');
    try {
      await axios.post('/api/reports', { slug, reason, details });
      setStatus('success');
      setTimeout(onClose, 2000);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
      >
        {status === 'success' ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="mb-1 text-lg font-semibold">Signalement envoyé</h3>
            <p className="text-sm text-white/40">Merci de nous aider à garder persn.me sûr.</p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <ShieldAlert className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold leading-tight">Signaler un profil</h3>
                <p className="text-xs text-white/40">persn.me/{slug}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">Raison</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:border-white/20 focus:outline-none"
                >
                  <option value="" disabled>Choisir une raison...</option>
                  <option value="spam">Spam ou Publicité</option>
                  <option value="harassment">Harcèlement ou Haine</option>
                  <option value="impersonation">Usurpation d'identité</option>
                  <option value="nsfw">Contenu inapproprié / NSFW</option>
                  <option value="legal">Illégal / Droits d'auteur</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">Détails (Optionnel)</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Plus d'informations..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 focus:border-white/20 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-white/5 py-3 text-xs font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!reason || status === 'loading'}
                  className="flex flex-[1.5] items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: accent }}
                >
                  {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-3.5 w-3.5" /> Envoyer</>}
                </button>
              </div>
              {status === 'error' && (
                <p className="mt-2 text-center text-[10px] text-red-400">Une erreur est survenue. Réessayez.</p>
              )}
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Bottom-center CTA that nudges visitors to claim their own profile. Slides
 * up from below a couple seconds after the page lands, so it doesn't fight
 * the entry animations. Dismissable; we remember the dismissal for the
 * session so it doesn't pop up on every navigation. Always opens the
 * canonical editor URL — even when the profile is served on a custom domain.
 */
function CreateYoursToast({ accent = '#5865F2', accentCss = '#5865F2' }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Convert any hex into rgba so we can dial alpha for the glow + icon tint.
  const tint = (hex, alpha) => {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
      return `rgba(88, 101, 242, ${alpha})`;
    }
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    let cancelled = false;
    try {
      if (sessionStorage.getItem('persn:cta-dismissed') === '1') return;
    } catch { /* private mode etc. — fall through and just show */ }
    const id = setTimeout(() => {
      if (!cancelled) setVisible(true);
    }, 2400);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, []);

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDismissed(true);
    setVisible(false);
    try { sessionStorage.setItem('persn:cta-dismissed', '1'); } catch { /* ignore */ }
  };

  return (
    <AnimatePresence>
      {visible && !dismissed && (
        <motion.div
          key="cta-toast"
          initial={{ opacity: 0, y: 90, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 70, scale: 0.94 }}
          transition={{ type: 'spring', stiffness: 240, damping: 24, mass: 0.9 }}
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
          style={{
            // Sit above iOS home indicator and any browser chrome.
            bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
          }}
        >
          <a
            href="https://www.persn.me/editor"
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto group relative flex w-full max-w-[420px] items-center gap-3 overflow-hidden rounded-2xl border bg-ink-900/85 px-4 py-3 shadow-[0_18px_60px_-12px_rgba(0,0,0,0.6)] backdrop-blur-xl transition sm:gap-4 sm:py-3.5"
            style={{
              borderColor: 'rgba(255,255,255,0.10)',
              // Light up the border in the visitor's chosen accent on hover —
              // CSS variable lets us toggle via group-hover without losing
              // the dynamic colour.
              ['--toast-accent']: accent,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = tint(accent, 0.5);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)';
            }}
          >
            {/* Animated accent glow that sweeps on hover. Uses the full theme
                accent (gradient or solid) so the bloom matches the page. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background: `radial-gradient(120% 80% at 50% 100%, ${tint(accent, 0.35)} 0%, transparent 65%)`,
              }}
            />

            {/* Pulsing accent dot — tinted with the user's accent */}
            <span
              className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
              style={{
                background: tint(accent, 0.15),
                boxShadow: `inset 0 0 0 1px ${tint(accent, 0.4)}`,
              }}
            >
              <span
                className="absolute inset-0 animate-ping rounded-xl opacity-40"
                style={{ background: tint(accent, 0.3) }}
              />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="relative">
                <path d="M12 2v20M2 12h20" />
              </svg>
            </span>

            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-baseline gap-2">
                <span className="truncate text-[13px] font-semibold tracking-tight text-white">
                  Don't have your own yet?
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/55">
                <span>Build it free on</span>
                <span
                  className="font-mono font-semibold"
                  style={
                    accentCss && accentCss.startsWith('linear-gradient(')
                      ? {
                          backgroundImage: accentCss,
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          color: 'transparent',
                          WebkitTextFillColor: 'transparent',
                        }
                      : { color: accent }
                  }
                >
                  persn.me
                </span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:translate-x-0.5">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="relative flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Quiet placeholder shown while the profile is being fetched from the API.
 * Same dark background as EmptyState so there's no flash if the network is
 * slow — just a small accent dot pulsing in the centre.
 */
function ProfileLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-ink-950"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Loading profile…</span>
      <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-discord shadow-[0_0_24px_#5865F2]" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 text-center">
      <div className="max-w-md">
        <div className="eyebrow mb-3 text-discord">persn.me</div>
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">
          This link is empty
        </h1>
        <p className="mb-8 text-sm text-white/60">
          No profile was found in this URL. Build one in the editor, then copy
          your shareable link.
        </p>
        <Link
          to="/editor"
          className="inline-flex items-center gap-2 rounded-full bg-discord px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(88,101,242,0.35)] transition hover:brightness-110"
        >
          Open the editor
        </Link>
      </div>
    </div>
  );
}

/** Map a `theme.cursor` value to a CSS `cursor` declaration. */
function cssCursor(theme) {
  const kind = theme?.cursor || 'default';
  if (kind === 'custom' && theme?.cursorUrl) {
    return `url("${theme.cursorUrl}") 8 8, auto`;
  }
  if (kind === 'pointer') return 'pointer';
  if (kind === 'crosshair') return 'crosshair';
  if (kind === 'none') return 'none';
  return 'default';
}
