/**
 * Import a public Linktree page into a Jimp profile blob.
 *
 * POST /api/import { source: 'linktree', url: 'https://linktr.ee/foo' }
 *   → { ok: true, preview: { username, bio, avatarUrl, links: [{label,url}] } }
 *
 * Strategy: Linktree pages are SSR'd by Next.js, so the canonical source of
 * truth is the JSON inside <script id="__NEXT_DATA__">. We pull the page
 * with a real-ish User-Agent, parse the JSON, and walk the props for the
 * fields we need. Falls back to scraping rendered DOM if the JSON shape
 * changes.
 *
 * The endpoint never *applies* the import — it just returns a normalized
 * preview. The caller's UI shows the preview and lets the user confirm
 * before overwriting their current profile.
 */

import * as cheerio from 'cheerio';

const FETCH_TIMEOUT_MS = 8_000;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

const LINKTREE_HOST_RE = /^(linktr\.ee|www\.linktr\.ee)$/i;

export function registerImportRoutes(app) {
  app.post('/api/import', async (req, res) => {
    const { source, url } = req.body || {};
    if (source !== 'linktree') {
      return res.status(400).json({ error: 'Only Linktree is supported for now' });
    }

    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL' });
    }
    if (!LINKTREE_HOST_RE.test(parsed.host)) {
      return res.status(400).json({ error: 'URL must point to linktr.ee' });
    }

    try {
      const html = await fetchHtml(parsed.toString());
      const preview = extractLinktreePreview(html, parsed);
      if (!preview) return res.status(422).json({ error: 'Could not parse Linktree page' });
      return res.json({ ok: true, preview });
    } catch (err) {
      console.error('[import] linktree fetch failed:', err.message);
      return res.status(502).json({ error: 'Failed to reach Linktree' });
    }
  });
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      redirect: 'follow',
    });
    if (!r.ok) throw new Error(`linktree ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
  }
}

function extractLinktreePreview(html, parsedUrl) {
  const $ = cheerio.load(html);
  const nextData = $('#__NEXT_DATA__').html();
  if (nextData) {
    try {
      const json = JSON.parse(nextData);
      const account =
        json?.props?.pageProps?.account ||
        json?.props?.pageProps?.profile ||
        null;
      const links =
        json?.props?.pageProps?.links ||
        json?.props?.pageProps?.account?.links ||
        [];
      if (account || links?.length) {
        const handle = parsedUrl.pathname.replace(/^\/+/, '');
        return {
          username: account?.username || account?.pageTitle || handle || '',
          bio: account?.description || account?.bio || '',
          avatarUrl: account?.profilePictureUrl || account?.avatar || '',
          links: (links || [])
            .filter((l) => l && (l.url || l.target))
            .slice(0, 24)
            .map((l) => ({
              label: l.title || l.label || '',
              url: l.url || l.target || '',
            })),
        };
      }
    } catch {
      // Fall through to DOM scrape
    }
  }

  // DOM fallback — Linktree's HTML is fairly stable with data-testid hooks.
  const username = $('[data-testid="profile-title"]').first().text().trim();
  const bio = $('[data-testid="profile-description"]').first().text().trim();
  const avatarUrl = $('[data-testid="profile-image"] img').first().attr('src') || '';
  const links = [];
  $('a[data-testid="LinkButton"], a[href]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const label = $el.text().trim();
    if (href && /^https?:/i.test(href) && label && links.length < 24) {
      links.push({ label, url: href });
    }
  });
  if (!username && !links.length) return null;
  return { username, bio, avatarUrl, links };
}
