import { useState, useEffect, useRef } from 'react';

/**
 * Hook to create a "scramble" or "matrix" effect on a string.
 * It progressively reveals the original text while flickering random characters,
 * then replays the effect in a loop every ~10 seconds.
 */
export function useScrambleText(text, enabled = false, loopDelayMs = 10000) {
  const [display, setDisplay] = useState(text);
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  const frameRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(frameRef.current);
    clearTimeout(timerRef.current);

    if (!enabled) {
      setDisplay(text);
      return;
    }

    const makeRandomText = (lockedCount = 0) =>
      text
        .split('')
        .map((char, index) => {
          if (char === ' ') return ' ';
          if (index < lockedCount) return text[index];
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

    const runPhase = (phase, onDone) => {
      let progress = phase === 'reveal' ? 0 : text.length;

      const tick = () => {
        if (phase === 'reveal') {
          setDisplay(makeRandomText(progress));
          if (progress < text.length) {
            progress += 1 / 3;
            frameRef.current = setTimeout(tick, 30);
            return;
          }
          setDisplay(text);
          onDone?.();
          return;
        }

        if (phase === 'scramble-out') {
          const lockedCount = Math.max(0, Math.floor(progress));
          setDisplay(makeRandomText(lockedCount));
          if (progress > 0) {
            progress -= 1 / 2.5;
            frameRef.current = setTimeout(tick, 28);
            return;
          }
          onDone?.();
        }
      };

      tick();
    };

    const delay = Math.max(3000, Number(loopDelayMs) || 10000);

    const scheduleLoop = () => {
      timerRef.current = setTimeout(() => {
        runPhase('scramble-out', () => {
          runPhase('reveal', scheduleLoop);
        });
      }, delay);
    };

    runPhase('reveal', scheduleLoop);

    return () => {
      clearTimeout(frameRef.current);
      clearTimeout(timerRef.current);
    };
  }, [text, enabled, loopDelayMs]);

  return display;
}
