import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import BackgroundLayer from '../components/BackgroundLayer.jsx';
import MusicPlayer from '../components/MusicPlayer.jsx';
import { decodeProfile } from '../utils/encode.js';
import { WIDGET_REGISTRY } from '../components/widgets/index.js';
import WidgetFrame from '../components/widgets/WidgetFrame.jsx';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { useMusic } from '../utils/MusicContext.jsx';
import { getProfileBySlug } from '../utils/api.js';

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

  // 1. Handle Slug (Database)
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    getProfileBySlug(slug).then((data) => {
      if (data) setProfile(data);
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
    document.title = `@${name} — Jimp`;
    return () => {
      document.title = 'Jimp Builder';
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

  if (!profile) {
    return <EmptyState />;
  }

  return (
    <MusicPlayer music={profile.music || { enabled: false }} accent={profile.theme?.accent}>
      <ProfileBody profile={profile} isMobile={isMobile} />
    </MusicPlayer>
  );
}

/** The body is its own component so it can consume MusicContext via hooks. */
function ProfileBody({ profile, isMobile }) {
  const { playing } = useMusic();
  const visibleWidgets = profile.widgets.filter((w) => w.visible !== false);
  const entryAnim = profile.theme?.entryAnimation || 'none';
  const animClass = entryAnim !== 'none' ? `animate-entry-${entryAnim}` : '';

  return (
    <div
      className={`relative min-h-screen w-full overflow-x-hidden ${animClass}`}
      style={{ background: profile.theme?.pageBg || '#0a0a0a' }}
    >
      <BackgroundLayer background={profile.background} />

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
              {renderWidget(widget, { musicPlaying: playing, accent: profile.theme?.accent })}
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

                return (
                  <motion.div
                    key={w.id}
                    className="absolute"
                    style={{
                      left: `${w.pos.x}%`,
                      top: `${w.pos.y}%`,
                      width: `${w.size.w}%`,
                      height: `${w.size.h}%`,
                    }}
                    initial={variants[animation] || variants['fade-up']}
                    animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                    transition={transition}
                  >
                    <WidgetFrame widget={w} mode="view">
                      <Comp
                        widget={w}
                        musicPlaying={playing}
                        accent={profile.theme?.accent}
                      />
                    </WidgetFrame>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      <MadeWithJimp />
    </div>
  );
}

/** Resolve a widget to its React component. Unknown types render nothing. */
function renderWidget(widget, ctx) {
  const Component = WIDGET_REGISTRY[widget.type]?.component;
  if (!Component) return null;
  return <Component widget={widget} {...ctx} />;
}

/** Tiny brand footer — "Made with Jimp" on the left, "Create yours" CTA on the right. */
function MadeWithJimp() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 px-5 py-3">
      <div className="pointer-events-auto flex items-center gap-2 text-[10px] uppercase tracking-widest text-white/35">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-discord" />
        Made with Jimp
      </div>
      <Link
        to="/editor"
        className="pointer-events-auto group flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 backdrop-blur-md transition hover:border-discord/50 hover:bg-discord/20 hover:text-white"
      >
        Create yours
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          referrerPolicy="origin"
          stroke="currentColor"
          strokeWidth="2.4"
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        >
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 text-center">
      <div className="max-w-md">
        <div className="eyebrow mb-3 text-discord">Jimp Builder</div>
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
