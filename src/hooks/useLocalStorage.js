import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal `useState` clone that persists its value in localStorage.
 * - Reads lazily on first render.
 * - Writes are serialised through JSON.
 * - Invalid JSON falls back to the provided default without throwing.
 */
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw == null ? defaultValue : JSON.parse(raw);
    } catch {
      return defaultValue;
    }
  });

  // Track whether we should actually write — avoids writing during the
  // initial hydration read.
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.warn('[useLocalStorage] write failed', err);
    }
  }, [key, value]);

  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);

  return [value, setValue, remove];
}
