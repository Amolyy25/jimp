# Project Context: persn.me

## 🚀 Overview & Mission

**persn.me** is a premium, highly interactive "bio-link" platform designed for creators who want a state-of-the-art digital identity. Unlike standard link aggregators, it features a freeform canvas editor, a modular widget system, real-time social integrations, and advanced visual effects.

The goal is to provide a "Figma-like" experience for personal profiles, where every element is customizable, interactive, and visually stunning.

---

## 🎨 Design System & Aesthetics

The platform follows a **"State-of-the-Art"** design philosophy:

- **Core Palette**:
  - **Primary Background**: `Ink-950` (#0a0a0a).
  - **Accent**: `Discord Blue` (#5865f2) by default, but user-customizable.
  - **Glassmorphism**: Extensive use of low-opacity backgrounds (`bg-white/5`), backdrop blur, and subtle dashed borders for inactive elements.
- **Typography**:
  - Uses modern, high-readability sans-serif fonts (Inter, Outfit, Roboto).
  - Support for per-widget custom Google Fonts.
- **Micro-Animations**:
  - **Framer Motion**: Used for all UI transitions and hover states.
  - **Text Effects**: Matrix, Glitch, Rainbow, Glow, and Neon effects.
  - **Entry Animations**: Profiles load with premium effects: `Fade`, `Slide Up`, `Scale`, or `Blur`.
- **Global 3D Parallax**: All widgets and groups react to mouse movement with a smooth, window-level 3D tilt effect, creating depth.

---

## 🛠 Tech Stack

- **Frontend**:
  - **React 18 + Vite**: High-performance rendering and HMR.
  - **Tailwind CSS**: Core utility-first styling.
  - **Framer Motion**: Complex animations and 3D transforms.
  - **Lucide React**: Premium iconography.
- **Backend**:
  - **Express 5**: Modern Node.js server.
  - **Prisma ORM + PostgreSQL**: Relational data management and high-speed queries.
  - **JWT + Cookie-parser**: Secure, cookie-based session management.
- **Integrations**:
  - **Discord OAuth**: Primary auth method; fetches real-time status and activity.
  - **Spotify API**: Powers "Now Playing" widgets with real-time sync.
  - **Twitch API**: Tracks live stream status and viewer counts.
  - **Canvas (@napi-rs/canvas)**: Generates dynamic Open Graph (OG) images for social sharing.
  - **Resend**: Handles transactional emails (invites, alerts).

---

## 📂 Functional Modules

### 1. The Editor (`src/pages/Editor.jsx`)

- **DragCanvas**: A 16:9 aspect-ratio constrained workspace.
  - **Snapping**: Widgets snap to edges, centers, and other widgets (0.8% threshold).
  - **Multi-Selection**: `Alt/Option + Click` to select multiple widgets.
  - **Grouping**: Bundle widgets into interactive containers with proportional resizing.
- **Sidebar**: Modular panels for `Widgets`, `Theme`, `Background`, `Music`, and `Share`.
- **Auto-Save**: Changes are debounced and synced to the backend to prevent data loss.

### 2. The Grouping System

- **Auto-Parenting**: Dragging a widget into a group's bounds automatically links it (`groupId`).
- **Proportional Scaling**: Resizing a group scales child positions and sizes relative to the parent.
- **Hug Content**: A group can be set to `autoSize`, causing it to shrink/expand to fit its children perfectly.

### 3. The Public View (`src/pages/View.jsx`)

- **Responsive Layout**:
  - **Desktop**: 16:9 pixel-perfect mirror of the editor.
  - **Mobile**: Automatically stacks widgets vertically for optimal readability.
- **Splash Screen**: A premium entry animation that also "unlocks" browser audio autoplay.
- **Music Player**: Global manager supporting YouTube and Spotify backgrounds.

---

## 🧩 Widget Catalog

1. **Avatar**: Profile picture with custom shapes, borders, and text effects.
2. **Socials**: Link aggregator with custom icons, colors, and click tracking.
3. **Discord Presence**: Real-time status, activity (Rich Presence), and Spotify sync.
4. **Spotify Now Playing**: Visualizes what the user is currently listening to.
5. **Guestbook**: Public wall for visitors to leave messages.
6. **Q&A**: Anonymous questions with an inbox/answer system for owners.
7. **Twitch**: Live stream status and embedded player link.
8. **Clock**: Digital/Analog time with time-zone support.
9. **Weather**: Real-time weather data based on city.
10. **Games**: Gaming stats and clips integration.
11. **Text**: Versatile text blocks with Markdown and animation support.
12. **Clicker Game**: Interactive "Egg" clicker with global leaderboards.
13. **Group**: Container for bundling other widgets together.

---

## 🛡 Security & Moderation

- **Profanity Filter**: Robust regex engine that normalizes character substitutions (leet-speak) across usernames, bios, and URLs.
- **CSS Sanitizer**: Server-side filtering to prevent XSS via custom CSS injections.
- **Forbidden Slugs**: Protection against hijacking system URLs (e.g., `/admin`, `/login`).
- **Discord Bot**: Custom bot for administrative actions (bans, mutes, server setup).
- **Rate Limiting**: Per-route throttling for auth, writes, and heavy API ingest.

---

## 🧠 AI Implementation Rules

1. **Coordinate Math**: Positions/Sizes are ALWAYS **percentages (%)** of the 16:9 inner box.
2. **Centering**: `autoSize` widgets (Avatar, Text) are centered at `pos.x/y` using `translate(-50%, -50%)`. Groups use Top-Left anchoring.
3. **Modularity**: Add new widgets to `src/components/widgets/` and register them in `utils/widgetDefaults.js`.
4. **Vibe Check**: Every UI update should feel **premium**. Use HSL colors, smooth gradients, and micro-animations. Avoid default browser styling.
5. **Clean Diffs**: When editing, preserve existing comments and structure unless specifically asked to refactor.

## 🔒 Drop Mode & Waitlist System

persn.me utilise un système d'acquisition par "Drop" (ouvertures limitées).

- **Global State** : Le "Drop Mode" (fermeture des inscriptions) est contrôlable dynamiquement par les administrateurs depuis le panel `/analytique`.
- **Route Guards (Frontend & Backend)** :
  - Quand le mode est ACTIF, les routes `/login`, `/register` et `/editor` (même sans compte) sont bloquées et redirigent vers `/`.
  - Les routes publiques comme `/explore`, `/classement` et les profils utilisateurs (`/:username`) restent accessibles.
- **Waitlist UI** : La landing page (`/`) se transforme en une page de capture d'email premium (Ink-950, Glassmorphism) avec un Call-to-Action fort vers Discord.
