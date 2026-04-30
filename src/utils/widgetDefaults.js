/**
 * Per-widget defaults.
 *
 * Each entry describes:
 *  - `type`        the widget key (matches the registry in components/widgets)
 *  - `label`       human readable name for the editor sidebar
 *  - `defaultPos`  starting position on the canvas (in %)
 *  - `defaultSize` starting size on the canvas (in % of the canvas)
 *  - `style`       the editable per-widget style (bg, blur, border, text…)
 *  - `data`        widget-specific content defaults
 */

import { nanoid } from './id.js';

/** Common style defaults — used as a base for every widget. */
const baseStyle = () => ({
  bgColor: '#ffffff',
  bgOpacity: 0.04,
  blur: 12,
  borderColor: '#ffffff',
  borderOpacity: 0.08,
  borderWidth: 1,
  borderRadius: 18,
  textColor: '#ffffff',
  // When true, the widget hugs its content — its `pos` becomes the *centre*
  // of the box (via translate(-50%, -50%)) and `size` acts as a max bound.
  // Adding items grows the box symmetrically, so the visual centre stays
  // pinned wherever the user dropped it.
  autoSize: false,
});

export const WIDGET_CATALOG = {
  avatar: {
    type: 'avatar',
    label: 'Avatar & identité',
    defaultPos: { x: 8, y: 14 },
    defaultSize: { w: 36, h: 32 },
    style: { ...baseStyle(), bgOpacity: 0 },
    data: {
      avatarUrl: 'https://api.dicebear.com/7.x/thumbs/svg?seed=persn',
      username: 'yourname',
      bio: 'A tiny corner of the internet.',
      pulseWhenPlaying: true,
      hasNitro: false,
      avatarSize: 'md',
      avatarShape: 'circle',
    },
  },
  badges: {
    type: 'badges',
    label: 'Badges',
    defaultPos: { x: 26, y: 53 },
    defaultSize: { w: 50, h: 14 },
    style: { ...baseStyle(), bgOpacity: 0.04, autoSize: true },
    data: {
      badges: [
        { emoji: '✨', label: 'Founder' },
        { emoji: '🎮', label: 'Gamer' },
      ],
    },
  },
  socials: {
    type: 'socials',
    label: 'Réseaux sociaux',
    defaultPos: { x: 26, y: 67 },
    defaultSize: { w: 50, h: 14 },
    style: { ...baseStyle(), bgOpacity: 0, autoSize: true },
    data: {
      links: {
        discord: 'yourname#0001',
        twitter: 'yourhandle',
        github: 'yourhandle',
      },
      hidden: [],
    },
  },
  discordServers: {
    type: 'discordServers',
    label: 'Serveurs Discord',
    defaultPos: { x: 70, y: 30 },
    defaultSize: { w: 50, h: 60 },
    style: { ...baseStyle(), bgOpacity: 0.04, autoSize: true },
    data: {
      servers: [
        {
          id: nanoid(),
          name: 'My Discord',
          icon: '',
          description: 'Come hang out — we chat, play and build together.',
          invite: 'https://discord.gg/your-invite',
        },
      ],
    },
  },
  games: {
    type: 'games',
    label: 'Jeux favoris',
    defaultPos: { x: 70, y: 70 },
    defaultSize: { w: 60, h: 60 },
    style: { ...baseStyle(), bgOpacity: 0.04, autoSize: true },
    data: {
      games: [
        {
          id: nanoid(),
          name: 'Valorant',
          cover: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400',
          rank: 'Immortal',
          profileUrl: '',
          clipUrl: '',
        },
        {
          id: nanoid(),
          name: 'League of Legends',
          cover: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400',
          rank: 'Diamond',
          profileUrl: '',
          clipUrl: '',
        },
      ],
    },
  },
  clock: {
    type: 'clock',
    label: 'Horloge',
    defaultPos: { x: 82, y: 4 },
    defaultSize: { w: 14, h: 7 },
    style: { ...baseStyle(), bgOpacity: 0 },
    data: { format24h: true, showSeconds: false },
  },
  weather: {
    type: 'weather',
    label: 'Météo',
    defaultPos: { x: 66, y: 4 },
    defaultSize: { w: 14, h: 7 },
    style: { ...baseStyle(), bgOpacity: 0.04 },
    data: { city: 'Paris', apiKey: '', unit: 'metric' },
  },
  nowPlaying: {
    type: 'nowPlaying',
    label: 'Now Playing',
    defaultPos: { x: 4, y: 80 },
    defaultSize: { w: 28, h: 9 },
    style: { ...baseStyle(), bgOpacity: 0.04 },
    data: { trackTitle: 'Untitled', artist: 'Unknown artist', syncFromPlayer: true },
  },
  musicProgress: {
    type: 'musicProgress',
    label: 'Progression musique',
    defaultPos: { x: 34, y: 80 },
    defaultSize: { w: 32, h: 12 },
    style: { ...baseStyle(), bgOpacity: 0.05 },
    data: {
      showControls: true,     // prev / play / next buttons
      showTime: true,         // elapsed + remaining
    },
  },
  visitorCounter: {
    type: 'visitorCounter',
    label: 'Compteur de visiteurs',
    defaultPos: { x: 84, y: 88 },
    defaultSize: { w: 12, h: 7 },
    style: { ...baseStyle(), bgOpacity: 0.04 },
    data: { storageKey: 'default' },
  },
  discordPresence: {
    type: 'discordPresence',
    label: 'Discord Presence (Lanyard)',
    defaultPos: { x: 48, y: 4 },
    defaultSize: { w: 18, h: 9 },
    style: { ...baseStyle(), bgOpacity: 0.06 },
    data: {
      // Must be a snowflake (Discord user ID). The user also has to join the
      // Lanyard Discord server for their presence to be broadcast.
      userId: '',
      showActivity: true,
      showSpotify: true,
    },
  },
  twitchStream: {
    type: 'twitchStream',
    label: 'Twitch Stream',
    defaultPos: { x: 4, y: 14 },
    defaultSize: { w: 30, h: 30 },
    style: { ...baseStyle(), bgOpacity: 0.05 },
    data: { channel: '' },
  },
  guestbook: {
    type: 'guestbook',
    label: 'Guestbook',
    defaultPos: { x: 4, y: 50 },
    defaultSize: { w: 38, h: 30 },
    style: { ...baseStyle(), bgOpacity: 0.05 },
    data: { maxEntries: 6 },
  },
  qa: {
    type: 'qa',
    label: 'Anonymous Q&A',
    defaultPos: { x: 60, y: 60 },
    defaultSize: { w: 36, h: 32 },
    style: { ...baseStyle(), bgOpacity: 0.05 },
    data: {
      title: 'Send me a message',
      placeholder: 'Anything anonymous…',
      maxAnswered: 6,
    },
  },
  clickerGame: {
    type: 'clickerGame',
    label: 'Clicker Game',
    defaultPos: { x: 78, y: 18 },
    defaultSize: { w: 18, h: 26 },
    style: { ...baseStyle(), bgOpacity: 0.05 },
    data: {
      emoji: '🍪',
      label: 'Click me!',
      increment: 1,
      target: 100,
    },
  },
};

export const WIDGET_TYPES = Object.keys(WIDGET_CATALOG);

export function makeWidgetInstance(type) {
  const def = WIDGET_CATALOG[type];
  if (!def) throw new Error(`Unknown widget type: ${type}`);
  return {
    id: nanoid(),
    type: def.type,
    visible: true,
    pos: { ...def.defaultPos },
    size: { ...def.defaultSize },
    style: { ...def.style },
    data: JSON.parse(JSON.stringify(def.data)),
  };
}

/**
 * Build a widget instance with explicit pos/size overrides — used by the
 * default profile to lay things out as a coherent welcome canvas instead of
 * relying on catalog defaults (which are tuned for "drop a single widget"
 * scenarios and would overlap if used together).
 */
function placed(type, pos, size) {
  const inst = makeWidgetInstance(type);
  inst.pos = pos;
  inst.size = size;
  return inst;
}

/** Default profile used when no hash is present (first-time editor visit). */
export function makeDefaultProfile() {
  return {
    version: 2,
    theme: {
      accent: '#5865F2',
      pageBg: '#0a0a0a',
      cursor: 'default',      // 'default' | 'pointer' | 'crosshair' | 'none' | 'custom'
      cursorUrl: '',          // when cursor === 'custom'
      cursorTrail: 'none',    // 'none' | 'glow' | 'stars' | 'neon'
      particles: 'none',      // 'none' | 'snow' | 'stars' | 'dust' | 'confetti'
      splash: {
        enabled: false,
        text: 'Click to enter',
        subtitle: '',
      },
    },
    background: {
      type: 'none',
      image: '',
      video: '',
      youtubeId: '',
      overlayColor: '#000000',
      overlayOpacity: 0.45,
    },
    music: {
      enabled: false,
      src: '',
      autoplay: true,
      volume: 0.35,
      trackTitle: '',
      artist: '',
    },
    // Welcome layout: identity column on the left (avatar → badges → socials),
    // engagement column on the right (Discord servers + games), utility strip
    // along the bottom (now playing + progress) and a tiny clock top-right.
    widgets: [
      placed('avatar',         { x: 6,  y: 10 }, { w: 32, h: 38 }),
      placed('badges',         { x: 22, y: 56 }, { w: 32, h: 10 }),
      placed('socials',        { x: 22, y: 70 }, { w: 38, h: 12 }),
      placed('discordServers', { x: 72, y: 30 }, { w: 44, h: 40 }),
      placed('games',          { x: 72, y: 70 }, { w: 50, h: 32 }),
      placed('clock',          { x: 84, y: 5  }, { w: 12, h: 7  }),
      placed('nowPlaying',     { x: 4,  y: 88 }, { w: 28, h: 9  }),
      placed('musicProgress',  { x: 36, y: 88 }, { w: 30, h: 9  }),
    ],
  };
}
