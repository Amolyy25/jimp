import { useState } from 'react';
import { X, Loader2, Check } from 'lucide-react';
import { importLinktree } from '../../utils/api.js';
import { makeDefaultProfile, makeWidgetInstance } from '../../utils/widgetDefaults.js';
import { SOCIALS } from '../../utils/socials.jsx';

/**
 * "Import from Linktree" — paste a linktr.ee URL, server scrapes it, we
 * preview what would be imported (avatar, bio, links classified by
 * platform), the user confirms, and the resulting Jimp profile blob is
 * dispatched to Editor.jsx via a `jimp:profile-import` CustomEvent.
 *
 * We don't perform the overwrite ourselves — Editor.jsx adds a confirm step
 * (same flow as templates) so users have one last chance to back out.
 */
export default function ImportModal({ onClose, onImported }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [includeKeys, setIncludeKeys] = useState(null); // Set<linkIndex> | null = all

  const fetchPreview = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await importLinktree(url);
      if (!r?.preview) throw new Error('Empty preview');
      setPreview(r.preview);
      setIncludeKeys(new Set(r.preview.links.map((_, i) => i)));
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const buildProfile = () => {
    const base = makeDefaultProfile();
    const avatar = base.widgets.find((w) => w.type === 'avatar');
    if (avatar) {
      avatar.data.username = preview.username || avatar.data.username;
      avatar.data.bio = preview.bio || avatar.data.bio;
      if (preview.avatarUrl) avatar.data.avatarUrl = preview.avatarUrl;
    }
    const socials = base.widgets.find((w) => w.type === 'socials');
    if (socials) {
      const links = { ...socials.data.links };
      const selected = preview.links.filter((_, i) => includeKeys?.has(i));
      for (const link of selected) {
        const platform = classifyLink(link.url);
        if (platform && !links[platform]) {
          links[platform] = handleFromUrl(link.url, platform);
        }
      }
      socials.data.links = links;
    }
    return base;
  };

  const apply = () => {
    onImported(buildProfile());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[520px] max-w-[92vw] rounded-2xl border border-white/10 bg-ink-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="eyebrow text-discord">Import</div>
        <h2 className="mt-1 text-lg font-bold tracking-tight">Migrate from Linktree</h2>
        <p className="mt-1 text-xs text-white/50">
          Paste your public Linktree URL. We'll fetch the avatar, bio and links,
          then you confirm what to import.
        </p>

        <div className="mt-5 flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://linktr.ee/yourname"
            className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none transition focus:border-discord/50 focus:bg-white/[0.06]"
          />
          <button
            type="button"
            onClick={fetchPreview}
            disabled={!url || busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-discord px-4 py-2.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
          </button>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        {preview && (
          <div className="mt-5 max-h-[55vh] space-y-4 overflow-y-auto thin-scroll pr-1">
            <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              {preview.avatarUrl ? (
                <img
                  src={preview.avatarUrl}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-white/10" />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{preview.username || '—'}</div>
                <div className="truncate text-[11px] text-white/40">{preview.bio || ''}</div>
              </div>
            </div>

            <div>
              <div className="eyebrow mb-2">Links to import</div>
              <ul className="space-y-1.5">
                {preview.links.length === 0 && (
                  <li className="text-xs text-white/40">No links found.</li>
                )}
                {preview.links.map((l, i) => {
                  const checked = includeKeys?.has(i) ?? false;
                  const platform = classifyLink(l.url);
                  return (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = new Set(includeKeys);
                          if (checked) next.delete(i);
                          else next.add(i);
                          setIncludeKeys(next);
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">{l.label || l.url}</div>
                        <div className="truncate text-[10px] text-white/40">{l.url}</div>
                      </div>
                      {platform ? (
                        <span className="rounded-full bg-discord/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-discord">
                          {platform}
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/40">
                          link
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!preview}
            className="flex items-center gap-2 rounded-full bg-discord px-5 py-2 text-xs font-semibold text-white shadow-[0_0_30px_rgba(88,101,242,0.35)] transition hover:brightness-110 disabled:opacity-40"
          >
            <Check className="h-3.5 w-3.5" />
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

const PLATFORM_REGEX = {
  twitter: /(?:twitter\.com|x\.com)\/([^/?#]+)/i,
  instagram: /instagram\.com\/([^/?#]+)/i,
  tiktok: /tiktok\.com\/@?([^/?#]+)/i,
  youtube: /youtube\.com\/(?:@|c\/|user\/|channel\/)?([^/?#]+)/i,
  twitch: /twitch\.tv\/([^/?#]+)/i,
  github: /github\.com\/([^/?#]+)/i,
  steam: /steamcommunity\.com\/id\/([^/?#]+)/i,
  discord: /discord\.gg\/([^/?#]+)/i,
};

function classifyLink(url) {
  if (!url) return null;
  for (const id of Object.keys(PLATFORM_REGEX)) {
    if (PLATFORM_REGEX[id].test(url) && SOCIALS.find((s) => s.id === id)) return id;
  }
  return null;
}

function handleFromUrl(url, platform) {
  const m = url.match(PLATFORM_REGEX[platform]);
  return m?.[1] || url;
}
