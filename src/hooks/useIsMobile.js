import { useEffect, useState } from 'react';

/**
 * Returns true when the viewport is narrower than the provided breakpoint.
 * Used on the /view page to collapse absolute-positioned widgets into a
 * stacked, vertical layout on phones.
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    // Sync once on mount in case breakpoint changed.
    setIsMobile(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
