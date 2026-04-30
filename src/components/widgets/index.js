/**
 * Central registry — associates a widget type with its React component.
 * Anything new goes here (+ widgetDefaults.js + the content editor in
 * components/editor/WidgetPanel.jsx).
 */

import AvatarWidget from './AvatarWidget.jsx';
import BadgesWidget from './BadgesWidget.jsx';
import SocialsWidget from './SocialsWidget.jsx';
import DiscordServersWidget from './DiscordServersWidget.jsx';
import GamesWidget from './GamesWidget.jsx';
import ClockWidget from './ClockWidget.jsx';
import WeatherWidget from './WeatherWidget.jsx';
import NowPlayingWidget from './NowPlayingWidget.jsx';
import MusicProgressWidget from './MusicProgressWidget.jsx';
import VisitorCounterWidget from './VisitorCounterWidget.jsx';
import DiscordPresenceWidget from './DiscordPresenceWidget.jsx';
import TwitchStreamWidget from './TwitchStreamWidget.jsx';
import GuestbookWidget from './GuestbookWidget.jsx';
import QAWidget from './QAWidget.jsx';
import ClickerGameWidget from './ClickerGameWidget.jsx';
import GroupWidget from './GroupWidget.jsx';

export const WIDGET_REGISTRY = {
  avatar: { component: AvatarWidget, label: 'Avatar & identité' },
  badges: { component: BadgesWidget, label: 'Badges' },
  socials: { component: SocialsWidget, label: 'Réseaux sociaux' },
  discordServers: { component: DiscordServersWidget, label: 'Serveurs Discord' },
  games: { component: GamesWidget, label: 'Jeux favoris' },
  clock: { component: ClockWidget, label: 'Horloge' },
  weather: { component: WeatherWidget, label: 'Météo' },
  nowPlaying: { component: NowPlayingWidget, label: 'Now Playing' },
  musicProgress: { component: MusicProgressWidget, label: 'Progression musique' },
  visitorCounter: { component: VisitorCounterWidget, label: 'Compteur visiteurs' },
  discordPresence: { component: DiscordPresenceWidget, label: 'Discord Presence' },
  twitchStream: { component: TwitchStreamWidget, label: 'Twitch Stream' },
  guestbook: { component: GuestbookWidget, label: 'Guestbook' },
  qa: { component: QAWidget, label: 'Anonymous Q&A' },
  clickerGame: { component: ClickerGameWidget, label: 'Clicker Game' },
  group: { component: GroupWidget, label: 'Groupe (Conteneur)' },
};
