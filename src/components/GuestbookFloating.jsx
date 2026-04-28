import { useEffect, useState } from 'react';
import { Heart, UserPlus, UserCheck } from 'lucide-react';
import { follow, unfollow, getFollowState, getMe } from '../utils/api.js';

/**
 * Floating action pill rendered on /:slug.
 *
 *   - "Follow" toggle (logged-in viewers, not the profile owner)
 *   - Public follower count
 *
 * The guestbook itself lives in its own widget (`GuestbookWidget`); this
 * floating pill is intentionally tiny — it's the social entry point on
 * top of the profile, not a full panel. We sit in the bottom-right above
 * the "Made with Jimp" footer.
 */
export default function GuestbookFloating({ slug, accent }) {
  const [me, setMe] = useState(null);
  const [state, setState] = useState({ following: false, count: 0 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const [user, follow] = await Promise.all([getMe(), getFollowState(slug)]);
      if (cancelled) return;
      setMe(user);
      setState(follow);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const toggle = async () => {
    if (!me || busy) return;
    setBusy(true);
    try {
      const next = state.following ? await unfollow(slug) : await follow(slug);
      setState({
        following: !!next.following,
        count: typeof next.count === 'number' ? next.count : state.count,
      });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
    }
  };

  if (!slug) return null;

  return (
    <div className="pointer-events-auto fixed bottom-12 right-5 z-30 flex flex-col items-end gap-2">
      <div
        className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-xl"
        title="Followers"
      >
        <Heart className="h-3 w-3" style={{ color: accent || '#5865F2' }} />
        <span className="tabular-nums">{state.count}</span>
      </div>
      {me && (
        <button
          type="button"
          onClick={toggle}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-bold text-white shadow-lg backdrop-blur-xl transition disabled:opacity-50"
          style={{
            background: state.following ? 'rgba(255,255,255,0.08)' : (accent || '#5865F2'),
            border: state.following ? '1px solid rgba(255,255,255,0.12)' : 'none',
          }}
        >
          {state.following ? <UserCheck className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
          {state.following ? 'Following' : 'Follow'}
        </button>
      )}
    </div>
  );
}
