/**
 * Social platforms registry.
 * Each entry describes: display name, brand colour (used on hover), a URL
 * builder (or `copy: true` if the handle is meant to be shown, not linked),
 * and an inline SVG body so we don't ship any icon library.
 */

export const SOCIALS = [
  {
    id: 'discord',
    label: 'Discord',
    color: '#5865F2',
    placeholder: 'yourname#0001',
    copy: true,
    href: null,
    svg: (
      <path
        d="M19.27 5.33A16.47 16.47 0 0 0 15.34 4a12.64 12.64 0 0 0-.61 1.26 15.23 15.23 0 0 0-4.46 0A12.64 12.64 0 0 0 9.66 4a16.47 16.47 0 0 0-3.93 1.33A17.38 17.38 0 0 0 3 17.24a16.6 16.6 0 0 0 5.05 2.55 12.36 12.36 0 0 0 1.08-1.76 10.72 10.72 0 0 1-1.7-.82c.14-.1.28-.21.41-.32a11.92 11.92 0 0 0 10.32 0c.13.11.27.22.41.32a10.72 10.72 0 0 1-1.7.82 12.36 12.36 0 0 0 1.08 1.76A16.6 16.6 0 0 0 23 17.24a17.38 17.38 0 0 0-3.73-11.91ZM9.7 14.63c-1 0-1.82-.92-1.82-2.05s.8-2.06 1.82-2.06 1.84.93 1.82 2.06-.81 2.05-1.82 2.05Zm6.6 0c-1 0-1.82-.92-1.82-2.05s.8-2.06 1.82-2.06 1.84.93 1.82 2.06-.81 2.05-1.82 2.05Z"
        fill="currentColor"
      />
    ),
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    color: '#ffffff',
    placeholder: 'yourhandle',
    href: (h) => `https://x.com/${h.replace(/^@/, '')}`,
    svg: (
      <path
        d="M18.244 3H21l-6.52 7.45L22 21h-5.9l-4.62-5.79L5.98 21H3.22l6.98-7.97L2 3h6.04l4.17 5.3L18.24 3Zm-1.03 16.2h1.63L7.88 4.68H6.13l11.08 14.52Z"
        fill="currentColor"
      />
    ),
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#E4405F',
    placeholder: 'yourhandle',
    href: (h) => `https://instagram.com/${h.replace(/^@/, '')}`,
    svg: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" fill="none" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </>
    ),
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    color: '#FF0050',
    placeholder: 'yourhandle',
    href: (h) => `https://tiktok.com/@${h.replace(/^@/, '')}`,
    svg: (
      <path
        d="M19.6 8.8a7.7 7.7 0 0 1-4.5-1.45v7.2a5.85 5.85 0 1 1-5.85-5.85c.32 0 .64.03.95.08v2.98a2.92 2.92 0 1 0 2 2.76V3h2.9a4.75 4.75 0 0 0 4.5 4.5v3.3Z"
        fill="currentColor"
      />
    ),
  },
  {
    id: 'youtube',
    label: 'YouTube',
    color: '#FF0000',
    placeholder: '@yourchannel',
    href: (h) => `https://youtube.com/${h.startsWith('@') ? h : '@' + h}`,
    svg: (
      <path
        d="M21.6 7.2a2.55 2.55 0 0 0-1.8-1.8C18.1 5 12 5 12 5s-6.1 0-7.8.4A2.55 2.55 0 0 0 2.4 7.2 26.6 26.6 0 0 0 2 12a26.6 26.6 0 0 0 .4 4.8 2.55 2.55 0 0 0 1.8 1.8C5.9 19 12 19 12 19s6.1 0 7.8-.4a2.55 2.55 0 0 0 1.8-1.8A26.6 26.6 0 0 0 22 12a26.6 26.6 0 0 0-.4-4.8ZM10 15V9l5.2 3-5.2 3Z"
        fill="currentColor"
      />
    ),
  },
  {
    id: 'twitch',
    label: 'Twitch',
    color: '#9146FF',
    placeholder: 'yourchannel',
    href: (h) => `https://twitch.tv/${h.replace(/^@/, '')}`,
    svg: (
      <path
        d="M4.5 3 3 6.8v13h4.4V22h2.5l2.2-2.2h3.5l4.9-4.9V3H4.5Zm15.1 11-2.8 2.8H13l-2.2 2.2v-2.2H7.1V4.8h12.5v9.2Zm-4-7.2h-1.7v4.9h1.7V6.8Zm-4.5 0H9.4v4.9h1.7V6.8Z"
        fill="currentColor"
      />
    ),
  },
  {
    id: 'github',
    label: 'GitHub',
    color: '#ffffff',
    placeholder: 'yourhandle',
    href: (h) => `https://github.com/${h.replace(/^@/, '')}`,
    svg: (
      <path
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34a2.65 2.65 0 0 0-1.12-1.47c-.92-.63.07-.62.07-.62a2.1 2.1 0 0 1 1.53 1 2.13 2.13 0 0 0 2.92.83 2.14 2.14 0 0 1 .64-1.35c-2.22-.25-4.55-1.11-4.55-4.94a3.86 3.86 0 0 1 1-2.68 3.58 3.58 0 0 1 .1-2.65s.84-.27 2.75 1a9.46 9.46 0 0 1 5 0c1.9-1.29 2.74-1 2.74-1a3.58 3.58 0 0 1 .1 2.65 3.85 3.85 0 0 1 1 2.68c0 3.84-2.33 4.68-4.56 4.93a2.4 2.4 0 0 1 .68 1.85v2.75c0 .26.18.58.69.48A10 10 0 0 0 12 2Z"
        fill="currentColor"
      />
    ),
  },
  {
    id: 'steam',
    label: 'Steam',
    color: '#c7d5e0',
    placeholder: 'yourprofile',
    href: (h) => `https://steamcommunity.com/id/${h.replace(/^@/, '')}`,
    svg: (
      <path
        d="M12 2a10 10 0 0 0-9.96 9.2l5.35 2.2a2.85 2.85 0 0 1 1.6-.5h.16l2.39-3.46v-.05a3.78 3.78 0 1 1 3.78 3.78h-.09l-3.41 2.43a2.85 2.85 0 0 1-5.66.33l-3.82-1.58A10 10 0 1 0 12 2Zm-3.14 15.15a2.2 2.2 0 0 1-1.2-1.2l1.22.5a1.6 1.6 0 0 0 2.1-.86 1.6 1.6 0 0 0-.87-2.1l-1.26-.52a2.2 2.2 0 1 1 .01 4.18Zm7-3.59A2.52 2.52 0 1 1 18.4 11a2.52 2.52 0 0 1-2.53 2.56Zm0-.62a1.9 1.9 0 1 0-1.9-1.9 1.9 1.9 0 0 0 1.9 1.9Z"
        fill="currentColor"
      />
    ),
  },
];

export const SOCIALS_BY_ID = Object.fromEntries(SOCIALS.map((s) => [s.id, s]));
