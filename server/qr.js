/**
 * QR endpoints — `GET /api/qr/:slug.png` and `.svg`.
 *
 * The URL encoded into the QR is `https://<host>/<slug>` (using whatever the
 * incoming request thinks the host is, so it works on both jimp.app and
 * preview deployments). Output is cached in-memory with a short TTL since
 * regenerating is cheap but pages embed the image inside a modal that the
 * user might open repeatedly.
 *
 * Style choice: white modules on transparent (PNG) / no fill (SVG) so the
 * QR can sit on any colored card. The accent color (resolved from the
 * profile's theme) tints the modules. We don't draw the avatar in the
 * centre — `qrcode` doesn't natively support logos and we don't want to
 * pull in a heavier lib for this.
 */

import QRCode from 'qrcode';
import { resolveAccentForCanvas } from './accentServer.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map(); // key → { buf|str, expiresAt, contentType }

export function registerQrRoutes(app, prisma) {
  app.get('/api/qr/:slugWithExt', async (req, res) => {
    const { slugWithExt } = req.params;
    const m = slugWithExt.match(/^([a-z0-9][a-z0-9-]{1,29})\.(png|svg)$/i);
    if (!m) return res.status(400).send('bad slug');
    const slug = m[1].toLowerCase();
    const ext = m[2].toLowerCase();

    const cacheKey = `${slug}.${ext}`;
    const hit = cache.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) {
      res.set('Content-Type', hit.contentType);
      res.set('Cache-Control', 'public, max-age=300');
      return res.send(hit.payload);
    }

    const profile = await prisma.profile.findUnique({ where: { slug } });
    if (!profile) return res.status(404).send('profile not found');

    const origin = publicOrigin(req);
    const url = `${origin}/${slug}`;
    const accent = resolveAccentForCanvas(profile.data?.theme?.accent);

    try {
      if (ext === 'svg') {
        const svg = await QRCode.toString(url, {
          type: 'svg',
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: accent, light: '#00000000' },
          width: 512,
        });
        cache.set(cacheKey, { payload: svg, contentType: 'image/svg+xml', expiresAt: Date.now() + CACHE_TTL_MS });
        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=300');
        return res.send(svg);
      }

      const buf = await QRCode.toBuffer(url, {
        type: 'png',
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: accent, light: '#00000000' },
        width: 1024,
      });
      cache.set(cacheKey, { payload: buf, contentType: 'image/png', expiresAt: Date.now() + CACHE_TTL_MS });
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=300');
      return res.send(buf);
    } catch (err) {
      console.error('[qr] render failed:', err);
      res.status(500).send('qr render failed');
    }
  });
}

function publicOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}
