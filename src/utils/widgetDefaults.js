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
    label: 'Discord Presence',
    defaultPos: { x: 48, y: 4 },
    defaultSize: { w: 18, h: 9 },
    style: { ...baseStyle(), bgOpacity: 0.06 },
    data: {
      // Must be a snowflake (Discord user ID). Presence is broadcast by our
      // own gateway bot — the user has to join the persn.me Discord server
      // for the bot to see them.
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
      // Two-tone gradient accent — Discord blue sweeping to magenta pink.
      // Drives every accent surface (hover glow, slug indicator, splash).
      accent: { kind: 'gradient', from: '#5865F2', to: '#EC4899', angle: 135 },
      // Layered backdrop: indigo wash top-left, magenta blush bottom-right,
      // deep violet-ink base. Reads premium even on a blank canvas.
      pageBg: [
        'radial-gradient(ellipse 90% 70% at 18% 0%, rgba(88,101,242,0.32) 0%, transparent 55%)',
        'radial-gradient(ellipse 80% 60% at 85% 100%, rgba(236,72,153,0.24) 0%, transparent 55%)',
        'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(168,85,247,0.10) 0%, transparent 60%)',
        'linear-gradient(180deg, #0b0820 0%, #07051a 50%, #040311 100%)',
      ].join(', '),
      entryAnimation: 'blur',          // cinematic page reveal on first paint
      widgetEntryAnimation: 'fade-up', // each widget fades up in turn
      widgetHover: 'lift',
      widgetFloat: 'bob',              // subtle vertical drift, alive but not loud
      widgetSurface: 'aurora',         // shimmering accent halo behind cards
      widgetParticles: 'none',
      widgetAccentBar: 'top',          // thin gradient stripe at top of each card
      widgetGlowIntensity: 0.55,
      cursor: 'default',      // 'default' | 'pointer' | 'crosshair' | 'none' | 'custom'
      cursorUrl: '',          // when cursor === 'custom'
      cursorTrail: 'glow',    // 'none' | 'glow' | 'echo' | 'stars' | 'neon' | 'comet' | 'ghost' | 'prism' | 'orbit'
      cursorTrailCount: 6,    // used by 'ghost'
      particles: 'dust',      // 'none' | 'snow' | 'stars' | 'dust' | 'confetti'
      splash: {
        enabled: false,
        template: 'classic',
        text: 'Click to enter',
        subtitle: '',
        badge: 'Enter profile',
        hint: 'Click anywhere',
        intensity: 60,
        showGrid: true,
        showFooter: true,
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
    // Centred showcase — identity stack on the canvas centre line (x=50)
    // with two flanking community widgets and a single music player at the
    // bottom. Coords are percentages; widgets flagged `autoSize: true`
    // (badges, socials, discordServers, games) treat `pos` as the centre of
    // the box, not the top-left.
    //
    //   ┌──────────────────────────────────────────────┐
    //   │                                      [clock] │
    //   │  ┌─────────┐  ┌──────────┐  ┌─────────────┐  │
    //   │  │ DISCORD │  │  AVATAR  │  │    GAMES    │  │  showcase row
    //   │  │ SERVERS │  │ yourname │  │             │  │
    //   │  └─────────┘  └──────────┘  └─────────────┘  │
    //   │              [    BADGES    ]                │
    //   │              [   SOCIALS    ]                │  identity stack
    //   │           [    musicProgress     ]           │  single music widget
    //   └──────────────────────────────────────────────┘
    //
    // Symmetry contract:
    //   - avatar visual centre (x=50) == badges/socials autoSize centre
    //     (x=50) == musicProgress visual centre (x=50)
    //   - discordServers centre (x=16) and games centre (x=84) are mirrored
    //     either side of x=50 (Δ=34)
    widgets: [
      placed('clock',           { x: 86, y: 5  }, { w: 10, h: 7  }),

      placed('discordServers',  { x: 16, y: 36 }, { w: 28, h: 28 }),
      placed('avatar',          { x: 34, y: 18 }, { w: 32, h: 32 }),
      placed('games',           { x: 84, y: 36 }, { w: 28, h: 28 }),

      placed('badges',          { x: 50, y: 56 }, { w: 32, h: 8  }),
      placed('socials',         { x: 50, y: 68 }, { w: 32, h: 10 }),

      placed('musicProgress',   { x: 30, y: 80 }, { w: 40, h: 10 }),
    ],
  };
}
