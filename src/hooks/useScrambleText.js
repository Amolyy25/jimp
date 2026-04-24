import { useState, useEffect, useRef } from 'react';

/**
 * Hook to create a "scramble" or "matrix" effect on a string.
 * It progressively reveals the original text while flickering random characters.
 */
export function useScrambleText(text, enabled = false) {
  const [display, setDisplay] = useState(text);
  const chars = '!<>-_\\/[]{}—=+*^?#________';
  const iterationRef = useRef(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      setDisplay(text);
      return;
    }

    iterationRef.current = 0;
    
    const scramble = () => {
      const scrambled = text
        .split('')
        .map((char, index) => {
          if (index < iterationRef.current) {
            return text[index];
          }
          return chars[Math.floor(Math.random() * chars.length)];
        })
        .join('');

      setDisplay(scrambled);

      if (iterationRef.current < text.length) {
        iterationRef.current += 1/3; // Reveal speed
        frameRef.current = setTimeout(scramble, 30);
      } else {
        // Stay on original text for a bit then loop?
        // For now just stop.
        setDisplay(text);
      }
    };

    scramble();
    return () => clearTimeout(frameRef.current);
  }, [text, enabled]);

  return display;
}
