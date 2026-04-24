/**
 * File upload helpers used across every "…or upload" control in the editor.
 *
 * Images are always resized + re-encoded through a canvas before being stored
 * as a data URL. Skipping that step is what lets a profile grow to tens of
 * megabytes in the first place, which in turn freezes the main thread during
 * base64 encoding and breaks window.open on some browsers.
 *
 * Presets tune width / format / quality per use-case:
 *   - avatar : 512px square PNG equivalent compressed to JPEG 82%
 *   - cover  : 800px longest side, JPEG 80%
 *   - icon   : 256px, JPEG 82%
 *   - bg     : 1920px, JPEG 78% (backgrounds tolerate some compression)
 *   - cursor : 64px, PNG (needs alpha)
 *
 * Returns a data URL string. If the input isn't an image (GIF, WebP with
 * animation, SVG…) we bail out to a raw read so the user still gets *something*
 * — but we surface the original byte size so callers can decide what to do.
 *
 * Video uploads have their own helper with a hard size cap: any clip larger
 * than `MAX_VIDEO_BYTES` is rejected with a thrown error carrying a friendly
 * message. The editor catches it and shows a toast.
 */

export const IMAGE_PRESETS = {
  avatar: { maxSide: 512, mime: 'image/jpeg', quality: 0.82 },
  cover: { maxSide: 800, mime: 'image/jpeg', quality: 0.8 },
  icon: { maxSide: 256, mime: 'image/jpeg', quality: 0.82 },
  bg: { maxSide: 1920, mime: 'image/jpeg', quality: 0.78 },
  cursor: { maxSide: 64, mime: 'image/png', quality: 1 },
};

export const MAX_VIDEO_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_IMAGE_FALLBACK_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

/**
 * Load an uploaded image file into an Image element. Resolves to the element
 * once it has finished decoding, or rejects on unsupported/corrupt input.
 */
function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ img, dataUrl: reader.result });
      img.onerror = () => reject(new Error('Could not decode image.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(reader.error || new Error('Read failed.'));
    reader.readAsDataURL(file);
  });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Read failed.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compress an image file using a preset. The returned data URL is ready to
 * store in the profile (and keep the final share link small).
 *
 * SVGs bypass compression — they're already tiny and vector.
 */
export async function compressImageFile(file, preset = 'cover') {
  if (!file) throw new Error('No file provided.');
  if (file.type === 'image/svg+xml') {
    // SVGs are small + vector — pass through unchanged.
    return readFileAsDataURL(file);
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.');
  }

  const { img } = await readImageFile(file);
  const config = IMAGE_PRESETS[preset] || IMAGE_PRESETS.cover;

  // Compute target size preserving aspect ratio.
  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longest > config.maxSide ? config.maxSide / longest : 1;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  // High-quality downscale — matters for avatars a lot more than covers.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, h);

  const dataUrl = canvas.toDataURL(config.mime, config.quality);

  // Fallback: if for some reason the encoded output is absurdly large (can
  // happen on very high-DPI PNGs with lots of detail), surface the issue
  // rather than silently bloating the profile.
  if (estimateDataUrlBytes(dataUrl) > MAX_IMAGE_FALLBACK_BYTES) {
    throw new Error(
      'That image is too heavy even after compression. Try a smaller one, or paste a public URL.',
    );
  }

  return dataUrl;
}

/**
 * Turn a video upload into a data URL only when the file is small enough
 * to safely inline. Throws otherwise — the caller (a form field) should
 * catch the error and relay the message to the user.
 */
export async function readVideoFileAsDataURL(file) {
  if (!file) throw new Error('No file provided.');
  if (!file.type.startsWith('video/')) {
    throw new Error('That file is not a video.');
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      `Video too heavy (${formatBytes(file.size)}). Keep clips under ${formatBytes(
        MAX_VIDEO_BYTES,
      )} or paste a public URL instead.`,
    );
  }
  return readFileAsDataURL(file);
}

/** Rough byte count for a data URL — tolerant of the `data:...;base64,` prefix. */
export function estimateDataUrlBytes(dataUrl) {
  if (typeof dataUrl !== 'string') return 0;
  const commaIdx = dataUrl.indexOf(',');
  const payload = commaIdx === -1 ? dataUrl : dataUrl.slice(commaIdx + 1);
  // base64 → 4 chars encode 3 bytes
  return Math.floor((payload.length * 3) / 4);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}
