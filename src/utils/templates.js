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
 * Layout contract — every widget gets an explicit `pos` and `size` so the
 * canvas stays balanced regardless of catalog defaults. autoSize widgets
 * (badges, socials, discordServers, games) treat `pos` as the centre of
 * the box rather than the top-left.
 */

import { makeWidgetInstance } from './widgetDefaults.js';

/** Build a widget with custom data + style + explicit pos/size. */
function w(type, { data = {}, style = {}, pos, size } = {}) {
  const inst = makeWidgetInstance(type);
  if (pos) inst.pos = pos;
  if (size) inst.size = size;
  inst.data = { ...inst.data, ...data };
  inst.style = { ...inst.style, ...style };
  return inst;
}

/** Default splash block — most templates leave it disabled. */
const noSplash = {
  enabled: false,
  template: 'classic',
  text: '',
  subtitle: '',
  badge: 'Enter profile',
  hint: 'Click anywhere',
  intensity: 60,
  showGrid: true,
  showFooter: true,
};

/** Default background block — most templates run on the page bg only. */
const noBg = {
  type: 'none',
  image: '',
  video: '',
  youtubeId: '',
  overlayColor: '#000000',
  overlayOpacity: 0,
};

const noMusic = {
  enabled: false,
  src: '',
  autoplay: false,
  volume: 0.35,
  trackTitle: '',
  artist: '',
};

export const TEMPLATES = [
  /* -------------------------------------------------------------------- */
  /* Cyberpunk — neon gamer, scanline grit                                 */
  /* -------------------------------------------------------------------- */
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    tags: ['neon', 'gradient', 'gamer'],
    thumbnailGradient: 'linear-gradient(135deg, #ff0080 0%, #7928ca 50%, #00f0ff 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FF00AA', to: '#00F0FF', angle: 135 },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 18% 0%, rgba(255,0,170,0.32), transparent 55%)',
          'radial-gradient(ellipse 90% 65% at 90% 100%, rgba(0,240,255,0.28), transparent 55%)',
          'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(121,40,202,0.18), transparent 60%)',
          'linear-gradient(180deg, #0a0014 0%, #03000a 100%)',
        ].join(', '),
        cursor: 'crosshair',
        cursorTrail: 'neon',
        particles: 'dust',
        entryAnimation: 'blur',
        widgetEntryAnimation: 'slide-left',
        widgetHover: 'glow',
        widgetFloat: 'drift',
        widgetSurface: 'scanlines',
        widgetParticles: 'sparkles',
        widgetAccentBar: 'left',
        widgetGlowIntensity: 0.7,
        splash: { ...noSplash, enabled: true, template: 'terminal', text: 'JACK IN', subtitle: 'access denied', badge: '> ENTER' },
        customCss: '',
      },
      background: { ...noBg, overlayColor: '#05030c', overlayOpacity: 0.5 },
      music: { ...noMusic, autoplay: true },
      widgets: [
        w('clock',           { data: { format24h: true, showSeconds: true }, style: { bgOpacity: 0, fontFamily: 'JetBrains Mono' }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('discordServers',  { pos: { x: 16, y: 36 }, size: { w: 28, h: 28 } }),
        w('avatar',          { data: { username: 'NEON-RUNNER', bio: '// jacked into the grid', textEffect: 'neon' }, style: { bgOpacity: 0, fontFamily: 'JetBrains Mono' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('games',           { pos: { x: 84, y: 36 }, size: { w: 28, h: 28 } }),
        w('badges',          { data: { badges: [{ emoji: '⚡', label: 'V2.077' }, { emoji: '🦾', label: 'Augmented' }] }, pos: { x: 50, y: 56 }, size: { w: 32, h: 8 } }),
        w('socials',         { pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
        w('musicProgress',   { pos: { x: 30, y: 80 }, size: { w: 40, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Y2K — holographic, glittery, pop                                      */
  /* -------------------------------------------------------------------- */
  {
    id: 'y2k',
    name: 'Y2K',
    tags: ['holographic', 'pop', 'glitch'],
    thumbnailGradient: 'linear-gradient(135deg, #c0e0ff 0%, #ffb6e6 50%, #b8ffd1 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FFB6E6', to: '#B8FFD1', angle: 90 },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 25% 0%, rgba(255,182,230,0.35), transparent 55%)',
          'radial-gradient(ellipse 80% 60% at 80% 100%, rgba(184,255,209,0.3), transparent 55%)',
          'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(192,224,255,0.2), transparent 60%)',
          'linear-gradient(180deg, #1a0a1f 0%, #0e0515 100%)',
        ].join(', '),
        cursor: 'pointer',
        cursorTrail: 'stars',
        particles: 'confetti',
        entryAnimation: 'scale',
        widgetEntryAnimation: 'zoom-in',
        widgetHover: 'tilt',
        widgetFloat: 'bob',
        widgetSurface: 'glass',
        widgetParticles: 'sparkles',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.6,
        splash: { ...noSplash },
        customCss: '',
      },
      background: { ...noBg },
      music: { ...noMusic },
      widgets: [
        w('clock',          { data: { format24h: false }, style: { bgOpacity: 0 }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('games',          { pos: { x: 16, y: 36 }, size: { w: 28, h: 32 } }),
        w('avatar',         { data: { username: 'cyberbabe', bio: '✿ glitter goblin ✿', textEffect: 'gradient' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('discordServers', { pos: { x: 84, y: 36 }, size: { w: 28, h: 28 } }),
        w('badges',         { data: { badges: [{ emoji: '💿', label: '2003' }, { emoji: '⭐', label: 'angelcore' }, { emoji: '🦋', label: 'butterfly' }] }, pos: { x: 50, y: 56 }, size: { w: 36, h: 8 } }),
        w('socials',        { pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
        w('musicProgress',  { pos: { x: 30, y: 80 }, size: { w: 40, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Editorial Mono — minimalist studio, serif headline                    */
  /* -------------------------------------------------------------------- */
  {
    id: 'editorial-mono',
    name: 'Editorial Mono',
    tags: ['minimal', 'serif', 'studio'],
    thumbnailGradient: 'linear-gradient(180deg, #f5f1e8 0%, #1a1a1a 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#f5f1e8' },
        pageBg: [
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,241,232,0.05), transparent 60%)',
          'linear-gradient(180deg, #0e0e0e 0%, #050505 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'none',
        particles: 'none',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-in',
        widgetHover: 'none',
        widgetFloat: 'none',
        widgetSurface: 'none',
        widgetParticles: 'none',
        widgetAccentBar: 'left',
        widgetGlowIntensity: 0.05,
        splash: { ...noSplash },
        customCss: '',
      },
      background: { ...noBg },
      music: { ...noMusic },
      widgets: [
        w('clock',   { data: { format24h: true, showSeconds: false }, style: { bgOpacity: 0 }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',  { data: { username: 'Studio Atlas', bio: 'Photographer · Paris.', textEffect: 'none' }, style: { bgOpacity: 0, fontFamily: 'Playfair Display' }, pos: { x: 34, y: 22 }, size: { w: 32, h: 32 } }),
        w('socials', { style: { fontFamily: 'Playfair Display', bgOpacity: 0 }, pos: { x: 50, y: 64 }, size: { w: 32, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Anime — soft pastel shoujo                                            */
  /* -------------------------------------------------------------------- */
  {
    id: 'anime',
    name: 'Anime',
    tags: ['shoujo', 'soft', 'pastel'],
    thumbnailGradient: 'linear-gradient(135deg, #ffd6e0 0%, #c5b6f0 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FFB3D1', to: '#A39BD8', angle: 135 },
        pageBg: [
          'radial-gradient(ellipse 90% 70% at 30% 10%, rgba(255,179,209,0.35), transparent 55%)',
          'radial-gradient(ellipse 80% 60% at 80% 90%, rgba(163,155,216,0.3), transparent 55%)',
          'linear-gradient(180deg, #1a1424 0%, #0e0a16 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'stars',
        particles: 'snow',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-up',
        widgetHover: 'lift',
        widgetFloat: 'bob',
        widgetSurface: 'aurora',
        widgetParticles: 'sparkles',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.55,
        splash: { ...noSplash, enabled: true, template: 'classic', text: '✿ enter ✿', subtitle: 'a quiet kind of magic' },
        customCss: '',
      },
      background: { ...noBg, overlayOpacity: 0.2 },
      music: { ...noMusic, autoplay: true, volume: 0.3 },
      widgets: [
        w('clock',          { pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('discordServers', { pos: { x: 16, y: 36 }, size: { w: 28, h: 28 } }),
        w('avatar',         { data: { username: 'sakura', bio: '— a quiet kind of magic.', textEffect: 'glow' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('games',          { pos: { x: 84, y: 36 }, size: { w: 28, h: 28 } }),
        w('badges',         { data: { badges: [{ emoji: '🌸', label: 'Spring' }, { emoji: '🎀', label: 'Soft' }, { emoji: '🌙', label: 'Moonchild' }] }, pos: { x: 50, y: 56 }, size: { w: 36, h: 8 } }),
        w('socials',        { pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
        w('nowPlaying',     { pos: { x: 30, y: 80 }, size: { w: 40, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Brutalist — raw, blocky, sharp edges                                  */
  /* -------------------------------------------------------------------- */
  {
    id: 'brutalist',
    name: 'Brutalist',
    tags: ['mono', 'raw', 'stark'],
    thumbnailGradient: 'linear-gradient(45deg, #000 0%, #ff3300 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#FF3300' },
        pageBg: 'linear-gradient(180deg, #000000 0%, #0a0000 100%)',
        cursor: 'default',
        cursorTrail: 'none',
        particles: 'none',
        entryAnimation: 'none',
        widgetEntryAnimation: 'none',
        widgetHover: 'none',
        widgetFloat: 'none',
        widgetSurface: 'none',
        widgetParticles: 'none',
        widgetAccentBar: 'left',
        widgetGlowIntensity: 0,
        splash: { ...noSplash },
        customCss: '#profile-root .widget { border-radius: 0 !important; }',
      },
      background: { ...noBg },
      music: { ...noMusic },
      widgets: [
        w('clock',   { style: { borderRadius: 0, bgOpacity: 0, fontFamily: 'JetBrains Mono' }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',  { data: { username: 'BLOC', bio: 'No frills. No filter.', textEffect: 'none' }, style: { borderRadius: 0, bgOpacity: 0, fontFamily: 'JetBrains Mono' }, pos: { x: 4, y: 14 }, size: { w: 34, h: 30 } }),
        w('badges',  { data: { badges: [{ emoji: '◼', label: 'RAW' }, { emoji: '◻', label: 'STARK' }] }, style: { borderRadius: 0, fontFamily: 'JetBrains Mono' }, pos: { x: 19, y: 50 }, size: { w: 30, h: 8 } }),
        w('socials', { style: { borderRadius: 0, bgOpacity: 0 }, pos: { x: 19, y: 62 }, size: { w: 30, h: 10 } }),
        w('games',   { style: { borderRadius: 0 }, pos: { x: 70, y: 36 }, size: { w: 50, h: 56 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Sunset — warm gradients, golden hour                                  */
  /* -------------------------------------------------------------------- */
  {
    id: 'sunset',
    name: 'Sunset',
    tags: ['warm', 'gradient', 'soft'],
    thumbnailGradient: 'linear-gradient(135deg, #ff8a3d 0%, #ffd54a 50%, #ff5e8a 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FF8A3D', to: '#FF5E8A', angle: 110 },
        pageBg: [
          'radial-gradient(ellipse 110% 70% at 50% 0%, rgba(255,138,61,0.4), transparent 55%)',
          'radial-gradient(ellipse 90% 60% at 50% 100%, rgba(255,94,138,0.3), transparent 55%)',
          'radial-gradient(ellipse 60% 50% at 80% 30%, rgba(255,213,74,0.2), transparent 60%)',
          'linear-gradient(180deg, #1f0f1a 0%, #0e0508 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'glow',
        particles: 'dust',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-up',
        widgetHover: 'lift',
        widgetFloat: 'drift',
        widgetSurface: 'aurora',
        widgetParticles: 'none',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.6,
        splash: { ...noSplash },
        customCss: '',
      },
      background: { ...noBg, overlayOpacity: 0.15 },
      music: { ...noMusic, volume: 0.4 },
      widgets: [
        w('weather',     { data: { city: 'Lisbon' }, pos: { x: 4, y: 5 }, size: { w: 16, h: 9 } }),
        w('clock',       { pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',      { data: { username: 'goldenhour', bio: 'Always magic, just before dark.', textEffect: 'gradient' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('badges',      { data: { badges: [{ emoji: '🌅', label: 'Sunset' }, { emoji: '🍑', label: 'Peach' }] }, pos: { x: 50, y: 56 }, size: { w: 32, h: 8 } }),
        w('socials',     { pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
        w('nowPlaying',  { pos: { x: 30, y: 80 }, size: { w: 40, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Terminal Hacker — green-on-black, monospace                           */
  /* -------------------------------------------------------------------- */
  {
    id: 'terminal-hacker',
    name: 'Terminal Hacker',
    tags: ['mono', 'matrix', 'dev'],
    thumbnailGradient: 'linear-gradient(180deg, #0a0a0a 0%, #00ff66 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#00FF66' },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(0,255,102,0.06), transparent 55%)',
          'linear-gradient(180deg, #020806 0%, #000402 100%)',
        ].join(', '),
        cursor: 'crosshair',
        cursorTrail: 'neon',
        particles: 'none',
        entryAnimation: 'blur',
        widgetEntryAnimation: 'fade-in',
        widgetHover: 'glow',
        widgetFloat: 'none',
        widgetSurface: 'scanlines',
        widgetParticles: 'none',
        widgetAccentBar: 'left',
        widgetGlowIntensity: 0.45,
        splash: { ...noSplash, enabled: true, template: 'terminal', text: '> ./run', subtitle: 'authenticating…' },
        customCss: '#profile-root .widget { font-family: "JetBrains Mono", monospace; }',
      },
      background: { ...noBg },
      music: { ...noMusic },
      widgets: [
        w('visitorCounter', { pos: { x: 4, y: 5 }, size: { w: 14, h: 9 } }),
        w('clock',          { data: { format24h: true, showSeconds: true }, style: { bgOpacity: 0, fontFamily: 'JetBrains Mono' }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',         { data: { username: 'r00t', bio: 'whoami', textEffect: 'matrix' }, style: { bgOpacity: 0, fontFamily: 'JetBrains Mono' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('badges',         { data: { badges: [{ emoji: '⌨️', label: 'sudo' }, { emoji: '🔓', label: 'no_password' }] }, pos: { x: 50, y: 56 }, size: { w: 32, h: 8 } }),
        w('socials',        { style: { bgOpacity: 0 }, pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Streamer — Twitch purple, game-heavy                                  */
  /* -------------------------------------------------------------------- */
  {
    id: 'streamer',
    name: 'Streamer',
    tags: ['gaming', 'twitch', 'live'],
    thumbnailGradient: 'linear-gradient(135deg, #9146ff 0%, #4d2a99 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#9146FF' },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 30% 0%, rgba(145,70,255,0.35), transparent 55%)',
          'radial-gradient(ellipse 80% 60% at 80% 100%, rgba(145,70,255,0.22), transparent 55%)',
          'linear-gradient(180deg, #0e0a18 0%, #06030c 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'glow',
        particles: 'dust',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-up',
        widgetHover: 'lift',
        widgetFloat: 'bob',
        widgetSurface: 'aurora',
        widgetParticles: 'none',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.6,
        splash: { ...noSplash },
        customCss: '',
      },
      background: { ...noBg },
      music: { ...noMusic },
      widgets: [
        w('clock',          { pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('visitorCounter', { pos: { x: 4, y: 5 }, size: { w: 12, h: 9 } }),
        w('avatar',         { data: { username: 'Streamer', bio: 'Live · variety · cozy chats.' }, pos: { x: 4, y: 18 }, size: { w: 30, h: 30 } }),
        w('badges',         { data: { badges: [{ emoji: '🟣', label: 'Twitch Affiliate' }, { emoji: '🎮', label: 'Variety' }] }, pos: { x: 19, y: 54 }, size: { w: 28, h: 8 } }),
        w('socials',         { pos: { x: 19, y: 66 }, size: { w: 28, h: 10 } }),
        w('discordServers',  { pos: { x: 19, y: 84 }, size: { w: 30, h: 14 } }),
        w('games',           { pos: { x: 70, y: 50 }, size: { w: 56, h: 80 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Vaporwave — pink/cyan/violet retro wash                               */
  /* -------------------------------------------------------------------- */
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    tags: ['retro', 'pink', 'aesthetic'],
    thumbnailGradient: 'linear-gradient(135deg, #ff71ce 0%, #01cdfe 50%, #b967ff 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FF71CE', to: '#01CDFE', angle: 135 },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 25% 0%, rgba(255,113,206,0.35), transparent 55%)',
          'radial-gradient(ellipse 80% 60% at 80% 100%, rgba(1,205,254,0.3), transparent 55%)',
          'radial-gradient(ellipse 60% 50% at 60% 50%, rgba(185,103,255,0.2), transparent 60%)',
          'linear-gradient(180deg, #10052b 0%, #050118 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'stars',
        particles: 'stars',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-up',
        widgetHover: 'tilt',
        widgetFloat: 'drift',
        widgetSurface: 'glass',
        widgetParticles: 'sparkles',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.65,
        splash: { ...noSplash, enabled: true, template: 'classic', text: 'A E S T H E T I C', subtitle: '◊◊◊' },
        customCss: '',
      },
      background: { ...noBg, overlayOpacity: 0.2 },
      music: { ...noMusic, volume: 0.4 },
      widgets: [
        w('clock',         { data: { format24h: false }, style: { bgOpacity: 0 }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',        { data: { username: 'NEO_TOKYO', bio: '愛 dreams of tomorrow', textEffect: 'rainbow' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('badges',        { data: { badges: [{ emoji: '◊', label: 'Aesthetic' }, { emoji: '☯', label: '1995' }] }, pos: { x: 50, y: 56 }, size: { w: 32, h: 8 } }),
        w('socials',       { pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
        w('nowPlaying',    { pos: { x: 30, y: 80 }, size: { w: 40, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Minimalist — clean professional, near-zero ornament                   */
  /* -------------------------------------------------------------------- */
  {
    id: 'minimalist',
    name: 'Minimalist',
    tags: ['clean', 'pro', 'simple'],
    thumbnailGradient: 'linear-gradient(135deg, #1a1a1a 0%, #fafafa 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#FAFAFA' },
        pageBg: [
          'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.04), transparent 60%)',
          'linear-gradient(180deg, #0a0a0a 0%, #050505 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'none',
        particles: 'none',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-in',
        widgetHover: 'none',
        widgetFloat: 'none',
        widgetSurface: 'none',
        widgetParticles: 'none',
        widgetAccentBar: 'none',
        widgetGlowIntensity: 0,
        splash: { ...noSplash },
        customCss: '',
      },
      background: { ...noBg },
      music: { ...noMusic },
      widgets: [
        w('clock',   { data: { format24h: true, showSeconds: false }, style: { bgOpacity: 0 }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',  { data: { username: 'Jane Doe', bio: 'Designer · NYC.' }, style: { bgOpacity: 0 }, pos: { x: 34, y: 22 }, size: { w: 32, h: 30 } }),
        w('badges',  { data: { badges: [{ emoji: '○', label: 'Open to work' }] }, style: { bgOpacity: 0 }, pos: { x: 50, y: 60 }, size: { w: 28, h: 8 } }),
        w('socials', { style: { bgOpacity: 0 }, pos: { x: 50, y: 72 }, size: { w: 28, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Frost — glass cool blue, snow                                         */
  /* -------------------------------------------------------------------- */
  {
    id: 'frost',
    name: 'Frost',
    tags: ['glass', 'pro', 'cool'],
    thumbnailGradient: 'linear-gradient(135deg, #cfe9ff 0%, #6db3f2 50%, #1e3c72 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#A0D8EF', to: '#ECFAFF', angle: 135 },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 30% 0%, rgba(160,216,239,0.32), transparent 55%)',
          'radial-gradient(ellipse 80% 60% at 70% 100%, rgba(236,250,255,0.22), transparent 55%)',
          'linear-gradient(180deg, #08111c 0%, #03070d 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'glow',
        particles: 'snow',
        entryAnimation: 'blur',
        widgetEntryAnimation: 'fade-up',
        widgetHover: 'lift',
        widgetFloat: 'bob',
        widgetSurface: 'glass',
        widgetParticles: 'none',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.5,
        splash: { ...noSplash, enabled: true, template: 'classic', text: 'welcome', subtitle: 'take a moment' },
        customCss: '',
      },
      background: { ...noBg, overlayOpacity: 0.1 },
      music: { ...noMusic },
      widgets: [
        w('weather',     { data: { city: 'Reykjavik' }, pos: { x: 4, y: 5 }, size: { w: 16, h: 9 } }),
        w('clock',       { data: { format24h: true, showSeconds: false }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',      { data: { username: 'Aurora', bio: 'Designer · cold takes only.', textEffect: 'gradient' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('badges',      { data: { badges: [{ emoji: '❄', label: 'Calm' }, { emoji: '✦', label: 'Crisp' }] }, pos: { x: 50, y: 56 }, size: { w: 32, h: 8 } }),
        w('socials',     { pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
        w('nowPlaying',  { pos: { x: 30, y: 80 }, size: { w: 40, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Lo-Fi Café — warm beats and brews                                     */
  /* -------------------------------------------------------------------- */
  {
    id: 'lofi',
    name: 'Lo-Fi Café',
    tags: ['warm', 'cozy', 'music'],
    thumbnailGradient: 'linear-gradient(135deg, #3b2a1f 0%, #b08864 60%, #f3d9b1 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'solid', value: '#E5B783' },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 30% 0%, rgba(229,183,131,0.28), transparent 55%)',
          'radial-gradient(ellipse 80% 60% at 80% 100%, rgba(176,136,100,0.25), transparent 55%)',
          'linear-gradient(180deg, #1a1209 0%, #0a0604 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'none',
        particles: 'dust',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-up',
        widgetHover: 'lift',
        widgetFloat: 'bob',
        widgetSurface: 'aurora',
        widgetParticles: 'none',
        widgetAccentBar: 'left',
        widgetGlowIntensity: 0.5,
        splash: { ...noSplash },
        customCss: '',
      },
      background: { ...noBg, overlayColor: '#1a1209', overlayOpacity: 0.4 },
      music: { ...noMusic, autoplay: true, volume: 0.3 },
      widgets: [
        w('clock',         { data: { format24h: false }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',        { data: { username: 'beans', bio: 'beats · books · brewed slow.', textEffect: 'glow' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 30 } }),
        w('badges',        { data: { badges: [{ emoji: '☕', label: 'Caffeinated' }, { emoji: '🎧', label: 'Lo-fi' }, { emoji: '📚', label: 'Reader' }] }, pos: { x: 50, y: 54 }, size: { w: 36, h: 8 } }),
        w('socials',       { pos: { x: 50, y: 66 }, size: { w: 32, h: 10 } }),
        w('nowPlaying',    { pos: { x: 4,  y: 80 }, size: { w: 42, h: 12 } }),
        w('musicProgress', { pos: { x: 50, y: 80 }, size: { w: 46, h: 12 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Sakura — zen pink blossom                                             */
  /* -------------------------------------------------------------------- */
  {
    id: 'sakura',
    name: 'Sakura',
    tags: ['zen', 'pink', 'minimal'],
    thumbnailGradient: 'linear-gradient(180deg, #ffd6e7 0%, #ff7aa9 60%, #1a0a14 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FFB7CE', to: '#FF7AA9', angle: 110 },
        pageBg: [
          'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(255,183,206,0.35), transparent 55%)',
          'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(255,122,169,0.28), transparent 55%)',
          'linear-gradient(180deg, #0c0509 0%, #060205 100%)',
        ].join(', '),
        cursor: 'default',
        cursorTrail: 'glow',
        particles: 'snow',
        entryAnimation: 'fade',
        widgetEntryAnimation: 'fade-up',
        widgetHover: 'lift',
        widgetFloat: 'drift',
        widgetSurface: 'aurora',
        widgetParticles: 'sparkles',
        widgetAccentBar: 'top',
        widgetGlowIntensity: 0.55,
        splash: { ...noSplash, enabled: true, template: 'classic', text: '桜', subtitle: 'cherry blossoms' },
        customCss: '',
      },
      background: { ...noBg, overlayColor: '#0c0509', overlayOpacity: 0.2 },
      music: { ...noMusic },
      widgets: [
        w('clock',   { data: { format24h: true }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('avatar',  { data: { username: 'hanami', bio: 'one petal at a time.', textEffect: 'gradient' }, pos: { x: 34, y: 18 }, size: { w: 32, h: 32 } }),
        w('qa',      { pos: { x: 4,  y: 32 }, size: { w: 26, h: 38 } }),
        w('badges',  { data: { badges: [{ emoji: '🌸', label: 'Bloom' }, { emoji: '🍃', label: 'Quiet' }] }, pos: { x: 50, y: 56 }, size: { w: 32, h: 8 } }),
        w('socials', { pos: { x: 50, y: 68 }, size: { w: 32, h: 10 } }),
      ],
    }),
  },

  /* -------------------------------------------------------------------- */
  /* Synthwave — 80s neon horizon                                          */
  /* -------------------------------------------------------------------- */
  {
    id: 'synthwave',
    name: 'Synthwave',
    tags: ['retro', 'neon', '80s'],
    thumbnailGradient: 'linear-gradient(180deg, #1a0033 0%, #ff007a 50%, #ffae00 100%)',
    profile: () => ({
      version: 2,
      theme: {
        accent: { kind: 'gradient', from: '#FF007A', to: '#FFAE00', angle: 90 },
        pageBg: [
          'radial-gradient(ellipse 130% 80% at 50% 100%, rgba(255,0,122,0.45), transparent 55%)',
          'radial-gradient(ellipse 100% 70% at 50% 90%, rgba(255,174,0,0.32), transparent 50%)',
          'radial-gradient(ellipse 80% 50% at 50% 30%, rgba(121,40,202,0.2), transparent 60%)',
          'linear-gradient(180deg, #0a0220 0%, #1a0033 60%, #2a0033 100%)',
        ].join(', '),
        cursor: 'crosshair',
        cursorTrail: 'neon',
        particles: 'stars',
        entryAnimation: 'scale',
        widgetEntryAnimation: 'slide-up',
        widgetHover: 'glow',
        widgetFloat: 'drift',
        widgetSurface: 'scanlines',
        widgetParticles: 'orbs',
        widgetAccentBar: 'bottom',
        widgetGlowIntensity: 0.75,
        splash: { ...noSplash, enabled: true, template: 'arcade', text: 'GAME ON', subtitle: '★ insert coin ★' },
        customCss: '',
      },
      background: { ...noBg, overlayColor: '#0a0220', overlayOpacity: 0.3 },
      music: { ...noMusic, volume: 0.4 },
      widgets: [
        w('clock',         { data: { format24h: false, showSeconds: true }, pos: { x: 86, y: 5 }, size: { w: 10, h: 7 } }),
        w('games',         { pos: { x: 16, y: 36 }, size: { w: 28, h: 32 } }),
        w('avatar',        { data: { username: 'NIGHT-DRIVER', bio: 'sunset on the 405.', textEffect: 'neon' }, pos: { x: 34, y: 16 }, size: { w: 32, h: 30 } }),
        w('discordServers', { pos: { x: 84, y: 36 }, size: { w: 28, h: 32 } }),
        w('badges',        { data: { badges: [{ emoji: '🏁', label: 'Outrun' }, { emoji: '🌴', label: 'Miami' }, { emoji: '💾', label: '198X' }] }, pos: { x: 50, y: 54 }, size: { w: 36, h: 8 } }),
        w('socials',       { pos: { x: 50, y: 66 }, size: { w: 32, h: 10 } }),
        w('nowPlaying',    { pos: { x: 4,  y: 80 }, size: { w: 46, h: 10 } }),
        w('musicProgress', { pos: { x: 50, y: 80 }, size: { w: 46, h: 10 } }),
      ],
    }),
  },
];

export function findTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}
