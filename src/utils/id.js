/**
 * Tiny, dependency-free id generator.
 * Good enough for in-profile uniqueness (widgets, badges, servers…).
 */
export function nanoid(len = 10) {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  const crypto = typeof window !== 'undefined' ? window.crypto : null;
  if (crypto?.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(len));
    for (let i = 0; i < len; i += 1) {
      id += alphabet[bytes[i] % alphabet.length];
    }
    return id;
  }
  for (let i = 0; i < len; i += 1) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}
