import { SOCIALS } from '../../utils/socials.jsx';
import { nanoid } from '../../utils/id.js';
import TextInput from './controls/TextInput.jsx';

/**
 * Per-widget content editor.
 * Dispatches to a small component per widget type — keeps each form focused.
 */
export default function WidgetPanel({ widget, onUpdate }) {
  switch (widget.type) {
    case 'avatar':
      return <AvatarForm data={widget.data} onUpdate={onUpdate} />;
    case 'badges':
      return <BadgesForm data={widget.data} onUpdate={onUpdate} />;
    case 'socials':
      return <SocialsForm data={widget.data} onUpdate={onUpdate} />;
    case 'discordServers':
      return <DiscordServersForm data={widget.data} onUpdate={onUpdate} />;
    case 'games':
      return <GamesForm data={widget.data} onUpdate={onUpdate} />;
    case 'clock':
      return <ClockForm data={widget.data} onUpdate={onUpdate} />;
    case 'weather':
      return <WeatherForm data={widget.data} onUpdate={onUpdate} />;
    case 'nowPlaying':
      return <NowPlayingForm data={widget.data} onUpdate={onUpdate} />;
    case 'musicProgress':
      return <MusicProgressForm data={widget.data} onUpdate={onUpdate} />;
    case 'visitorCounter':
      return <VisitorCounterForm data={widget.data} onUpdate={onUpdate} />;
    case 'discordPresence':
      return <DiscordPresenceForm data={widget.data} onUpdate={onUpdate} />;
    case 'twitchStream':
      return <TwitchStreamForm data={widget.data} onUpdate={onUpdate} />;
    case 'guestbook':
      return <GuestbookForm data={widget.data} onUpdate={onUpdate} />;
    case 'qa':
      return <QAForm data={widget.data} onUpdate={onUpdate} />;
    case 'clickerGame':
      return <ClickerGameForm data={widget.data} onUpdate={onUpdate} />;
    case 'group':
      return <GroupForm data={widget.data} onUpdate={onUpdate} />;
    default:
      return (
        <p className="text-xs text-white/40">No editor for this widget yet.</p>
      );
  }
}

function TwitchStreamForm({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <TextInput
        label="Twitch channel"
        value={data.channel || ''}
        onChange={(v) => onUpdate({ channel: v.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
        placeholder="e.g. shroud"
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        When the channel is live the widget shows the embedded player. When
        offline it shows the avatar + an "Offline" tag. Server-side polling
        is cached for 60 seconds.
      </p>
    </div>
  );
}

function QAForm({ data, onUpdate }) {
  const max = data.maxAnswered ?? 6;
  return (
    <div className="space-y-3">
      <TextInput
        label="Header"
        value={data.title || ''}
        onChange={(v) => onUpdate({ title: v.slice(0, 60) })}
        placeholder="Send me a message"
        filter
      />
      <TextInput
        label="Placeholder"
        value={data.placeholder || ''}
        onChange={(v) => onUpdate({ placeholder: v.slice(0, 80) })}
        placeholder="Anything anonymous…"
        filter
      />
      <TextInput
        label="Answers shown"
        value={String(max)}
        onChange={(v) => {
          const n = Math.max(1, Math.min(20, parseInt(v, 10) || 6));
          onUpdate({ maxAnswered: n });
        }}
        placeholder="6"
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Visitors send messages anonymously. You'll see them in your inbox
        and choose which to publish — answered ones appear here on your
        profile.
      </p>
    </div>
  );
}

function GuestbookForm({ data, onUpdate }) {
  const max = data.maxEntries ?? 6;
  return (
    <div className="space-y-3">
      <TextInput
        label="Visible entries"
        value={String(max)}
        onChange={(v) => {
          const n = Math.max(1, Math.min(20, parseInt(v, 10) || 6));
          onUpdate({ maxEntries: n });
        }}
        placeholder="6"
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Visitors with an account can leave one short message each. You can
        delete any message from your own profile page.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function AvatarForm({ data, onUpdate }) {
  return (
    <div className="space-y-4">
      <TextInput
        label="Avatar URL"
        value={data.avatarUrl}
        onChange={(v) => onUpdate({ avatarUrl: v })}
        placeholder="https://..."
      />

      <TextInput
        label="Username"
        value={data.username}
        onChange={(v) => onUpdate({ username: v })}
        placeholder="yourname"
        maxLength={32}
        filter
      />
      <TextInput
        label="Bio"
        value={data.bio}
        onChange={(v) => onUpdate({ bio: v })}
        placeholder="A short, catchy line…"
        maxLength={200}
        textarea
        rows={3}
        filter
      />

      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Layout"
          value={data.layout || 'top'}
          onChange={(v) => onUpdate({ layout: v })}
          options={[
            { value: 'top', label: 'Image Top' },
            { value: 'bottom', label: 'Image Bottom' },
            { value: 'left', label: 'Image Left' },
            { value: 'right', label: 'Image Right' },
          ]}
        />
        <TextInput
          label="Text Align"
          value={data.textAlign || 'start'}
          onChange={(v) => onUpdate({ textAlign: v })}
          options={[
            { value: 'start', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'end', label: 'Right' },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Avatar Size"
          value={data.avatarSize || 'md'}
          onChange={(v) => onUpdate({ avatarSize: v })}
          options={[
            { value: 'sm', label: 'Small' },
            { value: 'md', label: 'Medium' },
            { value: 'lg', label: 'Large' },
            { value: 'xl', label: 'Extra Large' },
          ]}
        />
        <TextInput
          label="Avatar Shape"
          value={data.avatarShape || 'circle'}
          onChange={(v) => onUpdate({ avatarShape: v })}
          options={[
            { value: 'circle', label: 'Circle' },
            { value: 'squircle', label: 'Squircle' },
            { value: 'square', label: 'Square' },
          ]}
        />
      </div>

      <TextInput
        label="Text Effect"
        value={data.textEffect || 'none'}
        onChange={(v) => onUpdate({ textEffect: v })}
        options={[
          { value: 'none', label: 'None' },
          { value: 'glow', label: 'Glow' },
          { value: 'neon', label: 'Neon' },
          { value: 'gradient', label: 'Gradient' },
          { value: 'rainbow', label: 'Rainbow' },
          { value: 'matrix', label: 'Matrix' },
          { value: 'glitch', label: 'Glitch' },
        ]}
      />

      <ToggleRow
        title="Discord Nitro"
        subtitle="Shows a gradient Nitro pill next to your pseudo."
        checked={!!data.hasNitro}
        onChange={(v) => onUpdate({ hasNitro: v })}
      />

      <ToggleRow
        title="Pulse ring while music plays"
        subtitle="Subtle animated ring around the avatar when music is playing."
        checked={!!data.pulseWhenPlaying}
        onChange={(v) => onUpdate({ pulseWhenPlaying: v })}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BadgesForm({ data, onUpdate }) {
  const badges = data.badges || [];
  const update = (i, patch) => {
    const next = badges.slice();
    next[i] = { ...next[i], ...patch };
    onUpdate({ badges: next });
  };
  const remove = (i) => onUpdate({ badges: badges.filter((_, idx) => idx !== i) });
  const add = () =>
    onUpdate({ badges: [...badges, { emoji: '🌟', label: 'New badge' }] });

  return (
    <div className="space-y-3">
      {badges.length === 0 && <p className="text-xs text-white/40">No badges yet.</p>}

      {badges.map((b, i) => (
        <div
          key={i}
          className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3"
        >
          <div className="flex items-center gap-2">
            <input
              value={b.emoji || ''}
              onChange={(e) => update(i, { emoji: e.target.value })}
              className="h-10 w-10 rounded-lg border border-white/10 bg-white/[0.04] text-center text-lg"
              maxLength={2}
            />
            <TextInput
              value={b.label || ''}
              onChange={(v) => update(i, { label: v })}
              placeholder="Label"
              filter
            />
            <DeleteIcon onClick={() => remove(i)} />
          </div>
        </div>
      ))}

      <AddRow label="Add badge" onClick={add} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function SocialsForm({ data, onUpdate }) {
  const links = data.links || {};
  const hidden = new Set(data.hidden || []);
  const actions = data.actions || {};

  const toggleHidden = (id) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onUpdate({ hidden: Array.from(next) });
  };

  const toggleAction = (id) => {
    const next = { ...actions };
    next[id] = next[id] === 'copy' ? 'link' : 'copy';
    onUpdate({ actions: next });
  };

  return (
    <div className="space-y-3">
      {SOCIALS.map((s) => {
        const isHidden = hidden.has(s.id);
        const action = actions[s.id] || (s.copy ? 'copy' : 'link');
        return (
          <div
            key={s.id}
            className={[
              'rounded-xl border border-white/5 bg-white/[0.02] p-3 transition',
              isHidden ? 'opacity-40' : '',
            ].join(' ')}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ color: s.color }}
                  >
                    {s.svg}
                  </svg>
                </span>
                <span className="text-xs font-semibold">{s.label}</span>
              </div>
              <div className="flex items-center gap-3">
                {s.href && (
                  <button
                    type="button"
                    onClick={() => toggleAction(s.id)}
                    className="eyebrow text-discord/80 transition hover:text-discord"
                  >
                    {action === 'copy' ? 'Action: Copy' : 'Action: Link'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleHidden(s.id)}
                  className="eyebrow text-white/50 transition hover:text-white"
                >
                  {isHidden ? 'Show' : 'Hide'}
                </button>
              </div>
            </div>
            <input
              value={links[s.id] || ''}
              onChange={(e) =>
                onUpdate({ links: { ...links, [s.id]: e.target.value } })
              }
              placeholder={s.placeholder}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white/90 outline-none focus:border-discord"
            />
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DiscordServersForm({ data, onUpdate }) {
  const servers = data.servers || [];
  const update = (id, patch) =>
    onUpdate({ servers: servers.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const remove = (id) => onUpdate({ servers: servers.filter((s) => s.id !== id) });
  const add = () =>
    onUpdate({
      servers: [
        ...servers,
        { id: nanoid(), name: 'New server', icon: '', description: '', invite: '' },
      ],
    });

  return (
    <div className="space-y-3">
      {servers.map((s) => (
        <div
          key={s.id}
          className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">Server</span>
            <DeleteIcon onClick={() => remove(s.id)} />
          </div>
          <TextInput
            label="Name"
            value={s.name}
            onChange={(v) => update(s.id, { name: v })}
            filter
          />
          <TextInput
            label="Icon URL"
            value={s.icon}
            onChange={(v) => update(s.id, { icon: v })}
            placeholder="https://..."
          />
          <TextInput
            label="Short description"
            value={s.description}
            onChange={(v) => update(s.id, { description: v })}
            maxLength={120}
            filter
          />
          <TextInput
            label="Invite link"
            value={s.invite}
            onChange={(v) => update(s.id, { invite: v })}
            placeholder="https://discord.gg/..."
          />
        </div>
      ))}
      <AddRow label="Add Discord server" onClick={add} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function GamesForm({ data, onUpdate }) {
  const games = data.games || [];
  const update = (id, patch) =>
    onUpdate({ games: games.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const remove = (id) => onUpdate({ games: games.filter((g) => g.id !== id) });
  const add = () =>
    onUpdate({
      games: [
        ...games,
        { id: nanoid(), name: 'New game', cover: '', rank: '', profileUrl: '', clipUrl: '' },
      ],
    });

  return (
    <div className="space-y-3">
      {games.map((g) => (
        <div
          key={g.id}
          className="space-y-2 rounded-xl border border-white/5 bg-white/[0.02] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="eyebrow">Game</span>
            <DeleteIcon onClick={() => remove(g.id)} />
          </div>
          <TextInput
            label="Name"
            value={g.name}
            onChange={(v) => update(g.id, { name: v })}
            filter
          />

          <TextInput
            label="Cover URL"
            value={g.cover}
            onChange={(v) => update(g.id, { cover: v })}
            placeholder="https://..."
          />

          <TextInput
            label="Rank / Level (optional)"
            value={g.rank}
            onChange={(v) => update(g.id, { rank: v })}
            filter
          />

          <TextInput
            label="Profile link (optional)"
            value={g.profileUrl}
            onChange={(v) => update(g.id, { profileUrl: v })}
            placeholder="https://tracker.gg/…"
          />

          <TextInput
            label="Hover clip URL (optional)"
            value={g.clipUrl}
            onChange={(v) => update(g.id, { clipUrl: v })}
            placeholder="https://.../clip.mp4 or YouTube URL"
          />
          <p className="text-[11px] leading-relaxed text-white/40">
            The clip auto-plays (muted, looped) when visitors hover the card.
            Host the file somewhere (e.g. a CDN or YouTube) and paste its URL.
          </p>
        </div>
      ))}
      <AddRow label="Add game" onClick={add} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ClockForm({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <ToggleRow
        title="24h format"
        subtitle="Show the clock in 24h notation."
        checked={!!data.format24h}
        onChange={(v) => onUpdate({ format24h: v })}
      />
      <ToggleRow
        title="Show seconds"
        subtitle="Adds a ticking seconds digit."
        checked={!!data.showSeconds}
        onChange={(v) => onUpdate({ showSeconds: v })}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function WeatherForm({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <TextInput
        label="City"
        value={data.city}
        onChange={(v) => onUpdate({ city: v })}
        placeholder="Paris"
      />
      <TextInput
        label="OpenWeatherMap API key"
        value={data.apiKey}
        onChange={(v) => onUpdate({ apiKey: v })}
        placeholder="your-key"
      />
      <TextInput
        label="Unit"
        value={data.unit || 'metric'}
        onChange={(v) => onUpdate({ unit: v })}
        options={[
          { value: 'metric', label: 'Metric (°C)' },
          { value: 'imperial', label: 'Imperial (°F)' },
        ]}
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Get a free API key at{' '}
        <a
          href="https://openweathermap.org/api"
          target="_blank"
          rel="noopener noreferrer"
          className="text-discord hover:underline"
        >
          openweathermap.org
        </a>
        . The key is stored only in your profile — it ends up in the shareable
        link, so use a key you're OK making public or skip the widget.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function NowPlayingForm({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <ToggleRow
        title="Sync from player"
        subtitle="Use the track title & artist set in the Music panel."
        checked={!!data.syncFromPlayer}
        onChange={(v) => onUpdate({ syncFromPlayer: v })}
      />
      <TextInput
        label="Track title (fallback)"
        value={data.trackTitle}
        onChange={(v) => onUpdate({ trackTitle: v })}
        filter
      />
      <TextInput
        label="Artist (fallback)"
        value={data.artist}
        onChange={(v) => onUpdate({ artist: v })}
        filter
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        The equaliser bars animate whenever the main profile music is playing.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function MusicProgressForm({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <ToggleRow
        title="Show controls"
        subtitle="Previous / play / next buttons."
        checked={!!data.showControls}
        onChange={(v) => onUpdate({ showControls: v })}
      />
      <ToggleRow
        title="Show times"
        subtitle="Elapsed and remaining seconds under the bar."
        checked={!!data.showTime}
        onChange={(v) => onUpdate({ showTime: v })}
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Real progress is available for direct audio files and YouTube URLs.
        Spotify and SoundCloud show the controls but can't expose their
        internal timer — the bar will stay empty for those.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function DiscordPresenceForm({ data, onUpdate }) {
  const validId = !data.userId || /^\d{15,22}$/.test(data.userId);
  return (
    <div className="space-y-3">
      <TextInput
        label="Discord user ID"
        value={data.userId}
        onChange={(v) => onUpdate({ userId: v.replace(/\D/g, '') })}
        placeholder="e.g. 123456789012345678"
      />
      {!validId && (
        <p className="text-[10px] font-medium text-red-400/90">
          A Discord user ID is 17–20 digits. In Discord: User Settings →
          Advanced → Developer Mode → right-click your name → Copy User ID.
        </p>
      )}
      <ToggleRow
        title="Show current game"
        subtitle="Rich presence from the app you're playing."
        checked={!!data.showActivity}
        onChange={(v) => onUpdate({ showActivity: v })}
      />
      <ToggleRow
        title="Show Spotify"
        subtitle="Track + album art + progress bar when playing."
        checked={!!data.showSpotify}
        onChange={(v) => onUpdate({ showSpotify: v })}
      />
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-white/50">
        <p className="mb-1.5 font-semibold text-white/70">One-time setup</p>
        <p>
          Join the{' '}
          <a
            href="https://discord.gg/lanyard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-discord transition hover:underline"
          >
            Lanyard Discord server
          </a>
          {' '}so your presence is broadcast. Powered by lanyard.rest — a free
          public service, no setup beyond that.
        </p>
      </div>
    </div>
  );
}

function ClickerGameForm({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <TextInput
        label="Emoji"
        value={data.emoji || ''}
        onChange={(v) => onUpdate({ emoji: v.slice(0, 4) })}
        placeholder="🍪"
        maxLength={4}
      />
      <TextInput
        label="Label"
        value={data.label || ''}
        onChange={(v) => onUpdate({ label: v.slice(0, 40) })}
        placeholder="Click me!"
        filter
      />
      <div className="grid grid-cols-2 gap-3">
        <TextInput
          label="Goal (0 = none)"
          value={String(data.target ?? 0)}
          onChange={(v) => {
            const n = Math.max(0, Math.min(1_000_000_000, parseInt(v, 10) || 0));
            onUpdate({ target: n });
          }}
          placeholder="100"
        />
      </div>
      <p className="text-[11px] leading-relaxed text-white/40">
        The score lives in each visitor's browser only — every visitor starts
        from zero. Cosmetic / fun widget.
      </p>
    </div>
  );
}

function VisitorCounterForm() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-white/40">
        Shows the real number of distinct visitors on your profile — same source
        as your analytics page. Each browser counts once per 24 h. Nothing to
        configure.
      </p>
    </div>
  );
}

function GroupForm({ data, onUpdate }) {
  return (
    <div className="space-y-3">
      <TextInput
        label="Nom du groupe"
        value={data.title || ''}
        onChange={(v) => onUpdate({ title: v })}
        placeholder="Mon groupe"
      />
      <ToggleRow
        title="Effet 3D au survol"
        subtitle="Le groupe et ses enfants s'inclineront avec la souris."
        checked={!!data.enable3D}
        onChange={(v) => onUpdate({ enable3D: v })}
      />
      <p className="text-[11px] leading-relaxed text-white/40">
        Utilisez ce widget comme un conteneur. Allez dans le panneau de style de vos autres widgets pour les lier à ce groupe. Lorsqu'ils sont liés, déplacer le groupe déplacera aussi les widgets.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared atoms                                                               */
/* -------------------------------------------------------------------------- */

function DeleteIcon({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full p-1.5 text-white/40 transition hover:bg-red-500/20 hover:text-red-300"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 7h16M10 11v6M14 11v6M5 7l1 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-13M9 7V4h6v3" />
      </svg>
    </button>
  );
}

function AddRow({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs font-semibold text-white/60 transition hover:border-discord/40 hover:bg-discord/10 hover:text-white"
    >
      <span className="text-base leading-none">+</span>
      {label}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        'relative h-6 w-10 rounded-full border transition',
        checked ? 'border-discord bg-discord' : 'border-white/10 bg-white/10',
      ].join(' ')}
    >
      <span
        className={[
          'absolute left-0 top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        ].join(' ')}
      />
    </button>
  );
}

function ToggleRow({ title, subtitle, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
      <div>
        <div className="text-xs font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-white/40">{subtitle}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </label>
  );
}

