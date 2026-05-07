import { useEffect, useLayoutEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';

const STEPS = [
  {
    id: 'tabs',
    target: 'sidebar-tabs',
    side: 'left',
    title: 'Tout est ici',
    body: 'Widgets, thèmes, musique, partage… Chaque onglet du panneau de droite gère un aspect de ton profil.',
  },
  {
    id: 'add',
    target: 'add-widget',
    side: 'left',
    title: 'Ajoute des widgets',
    body: 'Avatar, liens sociaux, jeux, horloge… Clique « + Add » puis pose-les sur le canvas en glisser-déposer.',
  },
  {
    id: 'canvas',
    target: 'canvas-area',
    side: 'right',
    title: 'Le canvas est libre',
    body: 'Glisse pour bouger, redimensionne par les bords. Clique un widget pour ouvrir ses réglages à droite.',
  },
  {
    id: 'preview',
    target: 'topbar-preview',
    side: 'bottom',
    title: 'Prévisualise à tout moment',
    body: 'Ouvre ton profil en condition réelle dans un nouvel onglet, sans publier.',
  },
  {
    id: 'share',
    target: 'topbar-share',
    side: 'bottom',
    title: 'Publie quand tu es prêt',
    body: 'Réserve ton URL personnalisée (persn.me/ton-nom). Tes modifications se sauvegardent ensuite automatiquement.',
  },
];

/**
 * Non-blocking guided tour. Anchors a small card next to a target element
 * marked with `data-coachmark="<id>"`. Backdrop is dimmed but does not capture
 * pointer events — the user can keep interacting with the UI at any time.
 *
 * Persists completion via the `onDone` prop (parent stores it in localStorage).
 */
export default function Coachmarks({ onDone }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const step = STEPS[stepIdx];

  useLayoutEffect(() => {
    if (!step) return;
    const update = () => {
      const el = document.querySelector(`[data-coachmark="${step.target}"]`);
      if (!el) {
        setRect(null);
        return;
      }
      setRect(el.getBoundingClientRect());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    const id = setInterval(update, 250);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      clearInterval(id);
    };
  }, [step]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onDone();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  const next = () => {
    if (stepIdx >= STEPS.length - 1) onDone();
    else setStepIdx((i) => i + 1);
  };
  const back = () => setStepIdx((i) => Math.max(0, i - 1));

  if (!step) return null;

  const cardPos = computeCardPos(rect, step.side);
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[90]"
      aria-live="polite"
    >
      {rect && <Spotlight rect={rect} />}

      <div
        className="pointer-events-auto absolute w-[320px] rounded-2xl border border-white/10 bg-ink-900/95 p-5 shadow-2xl backdrop-blur-xl"
        style={cardPos}
      >
        <button
          type="button"
          onClick={onDone}
          className="absolute right-3 top-3 rounded-full p-1 text-white/30 transition hover:bg-white/10 hover:text-white"
          aria-label="Skip tour"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        <div className="eyebrow text-discord">
          {stepIdx + 1} / {STEPS.length}
        </div>
        <h3 className="mt-2 text-base font-bold tracking-tight text-white">
          {step.title}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-white/60">
          {step.body}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onDone}
            className="text-[11px] font-semibold text-white/40 transition hover:text-white"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {stepIdx > 0 && (
              <button
                type="button"
                onClick={back}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-white/70 transition hover:bg-white/10"
              >
                Retour
              </button>
            )}
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 rounded-full bg-discord px-4 py-1.5 text-[11px] font-bold text-white shadow-[0_0_20px_rgba(88,101,242,0.35)] transition hover:brightness-110"
            >
              {isLast ? 'C\'est parti' : 'Suivant'}
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={[
                'h-1 rounded-full transition-all',
                i === stepIdx ? 'w-6 bg-discord' : 'w-1 bg-white/15',
              ].join(' ')}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Spotlight({ rect }) {
  const pad = 8;
  return (
    <>
      <div
        className="absolute rounded-2xl ring-2 ring-discord/70 transition-all duration-300 ease-out"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55), 0 0 40px rgba(88,101,242,0.35)',
        }}
      />
    </>
  );
}

function computeCardPos(rect, side) {
  if (!rect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  const gap = 18;
  const cardW = 320;
  const cardH = 220;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top, left;
  switch (side) {
    case 'left':
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.left - cardW - gap;
      break;
    case 'right':
      top = rect.top + rect.height / 2 - cardH / 2;
      left = rect.right + gap;
      break;
    case 'top':
      top = rect.top - cardH - gap;
      left = rect.left + rect.width / 2 - cardW / 2;
      break;
    case 'bottom':
    default:
      top = rect.bottom + gap;
      left = rect.left + rect.width / 2 - cardW / 2;
      break;
  }
  top = Math.max(16, Math.min(vh - cardH - 16, top));
  left = Math.max(16, Math.min(vw - cardW - 16, left));
  return { top, left };
}
