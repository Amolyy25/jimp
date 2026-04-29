import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getMe } from '../utils/api.js';

/**
 * Client-side admin guard.
 *
 * The server is the actual authority — every /api/admin/* call independently
 * re-checks the role on the DB. This guard only handles the *UX*: don't
 * render the dashboard chrome at all if the user clearly isn't allowed in.
 *
 * Resolution order:
 *   - not authenticated  → redirect to /login
 *   - authenticated user → redirect to / (no flash of admin shell)
 *   - admin              → render children
 */
export default function AdminRoute({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const user = await getMe();
      if (cancelled) return;
      if (!user) setState({ status: 'unauth', user: null });
      else if (user.role !== 'ADMIN') setState({ status: 'forbidden', user });
      else setState({ status: 'allowed', user });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950 text-white/40">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (state.status === 'unauth') return <Navigate to="/login" replace />;
  if (state.status === 'forbidden') return <Navigate to="/" replace />;

  return typeof children === 'function' ? children(state.user) : children;
}
