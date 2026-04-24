/**
 * Profile encoding helpers.
 *
 * The profile object is serialised as JSON, then encoded to a URL-safe base64
 * string so it can live in the location hash (e.g. /view#<payload>).
 *
 * Performance notes — *critical* for large profiles:
 *   - A naive `String.fromCharCode(byte)` loop + concatenation runs in O(n²)
 *     on most engines because strings are immutable and the interpreter
 *     keeps reallocating. For a profile with a handful of data-URL images,
 *     that loop alone can freeze the main thread for seconds.
 *   - We batch the conversion in 32KB chunks with `fromCharCode.apply`, which
 *     stays comfortably under the browser's argument-count limit and brings
 *     encoding back to effectively linear time.
 *
 * URL-safety: `+/` become `-_` and trailing `=` padding is stripped so the
 * payload doesn't require any extra `encodeURIComponent` wrapping.
 */

const CHUNK_SIZE = 0x8000; // 32 KB per chunk — safe below `call stack` limit

function bytesToBinaryString(bytes) {
  // Fast-path: small payloads can go through `apply` in one call.
  if (bytes.length <= CHUNK_SIZE) {
    return String.fromCharCode.apply(null, bytes);
  }
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const sub = bytes.subarray(i, i + CHUNK_SIZE);
    out += String.fromCharCode.apply(null, sub);
  }
  return out;
}

function binaryStringToBytes(binary) {
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  return btoa(bytesToBinaryString(bytes));
}

function base64ToUtf8(b64) {
  const binary = atob(b64);
  return new TextDecoder().decode(binaryStringToBytes(binary));
}

export function encodeProfile(profile) {
  const json = JSON.stringify(profile);
  return utf8ToBase64(json)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeProfile(payload) {
  if (!payload) return null;
  try {
    let b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    // Re-pad the base64 string so `atob` is happy.
    const pad = b64.length % 4;
    if (pad) b64 += '='.repeat(4 - pad);
    const json = base64ToUtf8(b64);
    return JSON.parse(json);
  } catch (err) {
    console.error('[decodeProfile] invalid payload', err);
    return null;
  }
}

/**
 * Cheap estimate of the final share URL length (characters) from a profile.
 * Used by the editor to warn before the link gets too heavy to open.
 */
export function estimatePayloadSize(profile) {
  const json = JSON.stringify(profile);
  // base64 expands bytes by ~4/3 — a good enough upper bound.
  return Math.ceil((json.length * 4) / 3);
}
