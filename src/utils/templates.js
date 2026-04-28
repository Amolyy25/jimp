/**
 * Templates — one-click profile presets.
 *
 * Each entry exposes:
 *   - id, name, tags    metadata for the gallery card
 *   - thumbnailGradient CSS background string used for the preview card
 *                       (we don't ship pre-rendered thumbnails — gradients
 *                       avoid the asset pipeline and stay in-bundle)
 *   - profile()         returns a fresh, fully-formed profile blob ready
 *                       to drop into setProfile(). Each call generates new
 *                       widget IDs so applying the same template twice
 *                       doesn't collide.
 *
 * Adding a template: copy an existing entry, adjust the theme + widgets,
 * and tag it. Keep widget positions consistent with the editor's 16:9
 * canvas (% units).
 */

import { makeWidgetInstance } from './widgetDefaults.js';

const baseStyle = (overrides = {}) => ({
  bgColor: '#ffffff',
  bgOpacity: 0.04,
  blur: 12,
  borderColor: '#ffffff',
  borderOpacity: 0.08,
  borderWidth: 1,
  borderRadius: 18,
  textColor: '#ffffff',
  autoSize: false,
  ...overrides,
});

/** Build a widget with a custom data + style on top of the catalog default. */
function w(type, { data = {}, style = {}, pos, size } = {}) {
  const inst = makeWidgetInstance(type);
  if (pos) inst.pos = pos;
  if (size) inst.size = size;
  inst.data = { ...inst.data, ...data };
  inst.style = { ...inst.style, ...style };
  return inst;
}

export const TEMPLATES = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    tags: ['neon', 'gradient', 'gamer'],
    thumbnailGradient: 'linear-gradient(135deg, #ff0080 0%, #7928ca 50%, #00f0ff 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FF00AA', to: '#00F0FF', angle: 135 },
        pageBg: '#05030c',
        cursor: 'crosshair',
        cursorTrail: 'neon',
        particles: 'dust',
        splash: { enabled: true, text: 'JACK IN', subtitle: 'access denied' },
        entryAnimation: 'blur',
        customCss: '',
      },
      background: {
        type: 'none',
        image: '',
        video: '',
        youtubeId: '',
        overlayColor: '#05030c',
        overlayOpacity: 0.7,
      },
      music: { enabled: false, src: '', autoplay: true, volume: 0.35, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', {
          data: { username: 'NEON-RUNNER', bio: '// jacked into the grid', textEffect: 'neon' },
          style: { bgOpacity: 0, fontFamily: 'JetBrains Mono' },
        }),
        w('badges', {
          data: { badges: [{ emoji: '⚡', label: 'V2.077' }, { emoji: '🦾', label: 'Augmented' }] },
        }),
        w('socials'),
        w('games'),
        w('clock', { data: { format24h: true, showSeconds: true }, style: { bgOpacity: 0 } }),
        w('nowPlaying'),
        w('musicProgress'),
      ],
    }),
  },
  {
    id: 'y2k',
    name: 'Y2K',
    tags: ['holographic', 'pop', 'glitch'],
    thumbnailGradient: 'linear-gradient(135deg, #c0e0ff 0%, #ffb6e6 50%, #b8ffd1 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FFB6E6', to: '#B8FFD1', angle: 90 },
        pageBg: '#1a0a1f',
        cursor: 'pointer',
        cursorTrail: 'stars',
        particles: 'confetti',
        splash: { enabled: false, text: '', subtitle: '' },
        entryAnimation: 'scale',
        customCss: '',
      },
      background: {
        type: 'none', image: '', video: '', youtubeId: '',
        overlayColor: '#000000', overlayOpacity: 0,
      },
      music: { enabled: false, src: '', autoplay: false, volume: 0.35, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', {
          data: { username: 'cyberbabe', bio: '✿ glitter goblin ✿', textEffect: 'gradient' },
        }),
        w('badges', {
          data: { badges: [{ emoji: '💿', label: '2003' }, { emoji: '⭐', label: 'angelcore' }, { emoji: '🦋', label: 'butterfly' }] },
        }),
        w('socials'),
        w('games'),
        w('nowPlaying'),
        w('musicProgress'),
      ],
    }),
  },
  {
    id: 'editorial-mono',
    name: 'Editorial Mono',
    tags: ['minimal', 'serif', 'studio'],
    thumbnailGradient: 'linear-gradient(180deg, #f5f1e8 0%, #1a1a1a 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#f5f1e8' },
        pageBg: '#0e0e0e',
        cursor: 'default',
        cursorTrail: 'none',
        particles: 'none',
        splash: { enabled: false, text: '', subtitle: '' },
        entryAnimation: 'fade',
        customCss: '',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0 },
      music: { enabled: false, src: '', autoplay: false, volume: 0.35, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', {
          data: { username: 'Studio Atlas', bio: 'Photographer · Paris.', textEffect: 'none' },
          style: { bgOpacity: 0, fontFamily: 'Playfair Display' },
        }),
        w('socials', { style: { fontFamily: 'Playfair Display' } }),
        w('clock', { data: { format24h: true, showSeconds: false }, style: { bgOpacity: 0 } }),
      ],
    }),
  },
  {
    id: 'anime',
    name: 'Anime',
    tags: ['shoujo', 'soft', 'pastel'],
    thumbnailGradient: 'linear-gradient(135deg, #ffd6e0 0%, #c5b6f0 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FFB3D1', to: '#A39BD8', angle: 135 },
        pageBg: '#1a1424',
        cursor: 'default',
        cursorTrail: 'stars',
        particles: 'snow',
        splash: { enabled: true, text: '✿ enter ✿', subtitle: '' },
        entryAnimation: 'fade',
        customCss: '',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0.2 },
      music: { enabled: false, src: '', autoplay: true, volume: 0.3, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', { data: { username: 'sakura', bio: '— a quiet kind of magic.', textEffect: 'glow' } }),
        w('badges', {
          data: { badges: [{ emoji: '🌸', label: 'Spring' }, { emoji: '🎀', label: 'Soft' }, { emoji: '🌙', label: 'Moonchild' }] },
        }),
        w('socials'),
        w('discordServers'),
        w('nowPlaying'),
      ],
    }),
  },
  {
    id: 'brutalist',
    name: 'Brutalist',
    tags: ['mono', 'raw', 'stark'],
    thumbnailGradient: 'linear-gradient(45deg, #000 0%, #ff3300 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#FF3300' },
        pageBg: '#000000',
        cursor: 'default',
        cursorTrail: 'none',
        particles: 'none',
        splash: { enabled: false, text: '', subtitle: '' },
        entryAnimation: 'none',
        customCss: '#profile-root .widget { border-radius: 0 !important; }',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0 },
      music: { enabled: false, src: '', autoplay: false, volume: 0.35, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', {
          data: { username: 'BLOC', bio: 'No frills. No filter.', textEffect: 'none' },
          style: { borderRadius: 0, bgOpacity: 0, fontFamily: 'JetBrains Mono' },
        }),
        w('socials', { style: { borderRadius: 0, bgOpacity: 0 } }),
        w('clock', { style: { borderRadius: 0, bgOpacity: 0 } }),
      ],
    }),
  },
  {
    id: 'sunset',
    name: 'Sunset',
    tags: ['warm', 'gradient', 'soft'],
    thumbnailGradient: 'linear-gradient(135deg, #ff8a3d 0%, #ffd54a 50%, #ff5e8a 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FF8A3D', to: '#FF5E8A', angle: 110 },
        pageBg: '#1f0f1a',
        cursor: 'default',
        cursorTrail: 'glow',
        particles: 'dust',
        splash: { enabled: false, text: '', subtitle: '' },
        entryAnimation: 'fade',
        customCss: '',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0.15 },
      music: { enabled: false, src: '', autoplay: false, volume: 0.4, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', { data: { username: 'goldenhour', bio: 'Always magic, just before dark.', textEffect: 'gradient' } }),
        w('badges', { data: { badges: [{ emoji: '🌅', label: 'Sunset' }, { emoji: '🍑', label: 'Peach' }] } }),
        w('socials'),
        w('weather', { data: { city: 'Lisbon' } }),
        w('nowPlaying'),
      ],
    }),
  },
  {
    id: 'terminal-hacker',
    name: 'Terminal Hacker',
    tags: ['mono', 'matrix', 'dev'],
    thumbnailGradient: 'linear-gradient(180deg, #0a0a0a 0%, #00ff66 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#00FF66' },
        pageBg: '#020806',
        cursor: 'crosshair',
        cursorTrail: 'neon',
        particles: 'none',
        splash: { enabled: true, text: '> ./run', subtitle: 'authenticating…' },
        entryAnimation: 'blur',
        customCss: '#profile-root .widget { font-family: "JetBrains Mono", monospace; }',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0 },
      music: { enabled: false, src: '', autoplay: false, volume: 0.35, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', {
          data: { username: 'r00t', bio: 'whoami', textEffect: 'matrix' },
          style: { bgOpacity: 0, fontFamily: 'JetBrains Mono' },
        }),
        w('badges', {
          data: { badges: [{ emoji: '⌨️', label: 'sudo' }, { emoji: '🔓', label: 'no_password' }] },
        }),
        w('socials', { style: { bgOpacity: 0 } }),
        w('clock', { data: { format24h: true, showSeconds: true }, style: { bgOpacity: 0, fontFamily: 'JetBrains Mono' } }),
      ],
    }),
  },
  {
    id: 'streamer',
    name: 'Streamer',
    tags: ['gaming', 'twitch', 'live'],
    thumbnailGradient: 'linear-gradient(135deg, #9146ff 0%, #4d2a99 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#9146FF' },
        pageBg: '#0e0a18',
        cursor: 'default',
        cursorTrail: 'glow',
        particles: 'dust',
        splash: { enabled: false, text: '', subtitle: '' },
        entryAnimation: 'fade',
        customCss: '',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0 },
      music: { enabled: false, src: '', autoplay: false, volume: 0.35, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', { data: { username: 'Streamer', bio: 'Live · variety · cozy chats.' } }),
        w('badges', { data: { badges: [{ emoji: '🟣', label: 'Twitch Affiliate' }, { emoji: '🎮', label: 'Variety' }] } }),
        w('socials'),
        w('discordServers'),
        w('games'),
      ],
    }),
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    tags: ['retro', 'pink', 'aesthetic'],
    thumbnailGradient: 'linear-gradient(135deg, #ff71ce 0%, #01cdfe 50%, #b967ff 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FF71CE', to: '#01CDFE', angle: 135 },
        pageBg: '#10052b',
        cursor: 'default',
        cursorTrail: 'stars',
        particles: 'stars',
        splash: { enabled: true, text: 'A E S T H E T I C', subtitle: '◊◊◊' },
        entryAnimation: 'fade',
        customCss: '',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0.2 },
      music: { enabled: false, src: '', autoplay: false, volume: 0.4, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', { data: { username: 'NEO_TOKYO', bio: '愛 dreams of tomorrow', textEffect: 'rainbow' } }),
        w('socials'),
        w('clock', { data: { format24h: false }, style: { bgOpacity: 0 } }),
        w('nowPlaying'),
      ],
    }),
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    tags: ['clean', 'pro', 'simple'],
    thumbnailGradient: 'linear-gradient(135deg, #1a1a1a 0%, #fafafa 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#FAFAFA' },
        pageBg: '#0a0a0a',
        cursor: 'default',
        cursorTrail: 'none',
        particles: 'none',
        splash: { enabled: false, text: '', subtitle: '' },
        entryAnimation: 'fade',
        customCss: '',
      },
      background: { type: 'none', image: '', video: '', youtubeId: '', overlayColor: '#000', overlayOpacity: 0 },
      music: { enabled: false, src: '', autoplay: false, volume: 0.35, trackTitle: '', artist: '' },
      widgets: [
        w('avatar', { data: { username: 'Jane Doe', bio: 'Designer · NYC.' }, style: { bgOpacity: 0 } }),
        w('socials', { style: { bgOpacity: 0 } }),
      ],
    }),
  },
];

export function findTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}
