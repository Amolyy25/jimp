import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Layers,
  Eye,
  MousePointerClick,
  UserPlus,
  HeartHandshake,
  History,
  Music2,
  Loader2,
  ShieldCheck,
  TrendingUp,
  RefreshCcw,
  LogOut,
} from 'lucide-react';
import AdminRoute from '../components/AdminRoute.jsx';
import { getAdminStats, logout } from '../utils/api.js';
import axios from 'axios';

export default function AnalytiqueRoute() {
  return (
    <AdminRoute>
      {(user) => <Dashboard user={user} />}
    </AdminRoute>
  );
}

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshedAt, setRefreshedAt] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminStats();
      if (!data) {
        // Server says no — bounce to home. AdminRoute already filtered the
        // obvious case, but the role could have been revoked between mount
        // and fetch.
        navigate('/');
        return;
      }
      setStats(data);
      setRefreshedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // No deps — we want one fetch on mount; refresh is manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="relative min-h-screen bg-ink-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, white 0 1px, transparent 1px 48px), repeating-linear-gradient(90deg, white 0 1px, transparent 1px 48px)',
        }}
      />
      <div className="pointer-events-none fixed -left-40 top-0 h-[500px] w-[500px] rounded-full bg-discord/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-40 bottom-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
        <Header
          user={user}
          refreshedAt={refreshedAt}
          loading={loading}
          onRefresh={load}
          onLogout={onLogout}
        />

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/[0.06] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-red-200">
            {error}
          </div>
        )}

        {loading && !stats ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : stats ? (
          <DashboardContent stats={stats} onRefresh={load} />
        ) : null}
      </div>
    </div>
  );
}

function Header({ user, refreshedAt, loading, onRefresh, onLogout }) {
  return (
    <header className="mb-10 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <Link
          to="/editor"
          className="mb-6 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40 transition hover:text-white"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to editor
        </Link>
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-discord">
          <ShieldCheck className="h-3 w-3" />
          Admin · @{user.username}
        </div>
        <h1
          className="text-[12vw] font-black leading-[0.88] tracking-[-0.02em] sm:text-[5rem]"
          style={{ fontFamily: 'Bebas Neue' }}
        >
          ANALYTIQUE.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/50">
          Tableau de bord interne. Données agrégées de toute l&apos;application —
          rafraîchies à la demande.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/30">
          {refreshedAt
            ? `Refreshed ${formatTime(refreshedAt)}`
            : 'Never refreshed'}
        </span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/70 transition hover:border-discord/40 hover:text-white disabled:opacity-40"
        >
          <RefreshCcw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          onClick={onLogout}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/70 transition hover:border-red-400/40 hover:text-white"
        >
          <LogOut className="h-3 w-3" />
          Logout
        </button>
      </div>
    </header>
  );
}

function DashboardContent({ stats, onRefresh }) {
  const { totals, recent, timeseries, topProfiles, recentSignups, pendingReports } = stats;

  const handleAction = async (type, target) => {
    try {
      if (type === 'ban' || type === 'ban-user') {
        const reason = prompt('Raison du bannissement ?');
        if (reason === null) return;
        const id = target.userId || target.id;
        await axios.post(`/api/admin/users/${id}/ban`, { banned: true, reason });
      } else if (type === 'unban') {
        await axios.post(`/api/admin/users/${target.id}/ban`, { banned: false });
      } else if (type === 'dismiss') {
        await axios.post(`/api/admin/reports/${target.id}/status`, { status: 'DISMISSED' });
      }
      onRefresh();
    } catch (err) {
      alert('Action failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const cards = [
    {
      label: 'Comptes utilisateurs',
      value: totals.users,
      delta: recent.usersLast24h,
      deltaLabel: 'last 24h',
      icon: Users,
    },
    {
      label: 'Profils créés',
      value: totals.profiles,
      delta: recent.profilesLast7d,
      deltaLabel: 'last 7d',
      icon: Layers,
    },
    {
      label: 'Vues totales',
      value: totals.views,
      delta: recent.viewsLast24h,
      deltaLabel: 'last 24h',
      icon: Eye,
    },
    {
      label: 'Clics enregistrés',
      value: totals.clicks,
      delta: recent.clicksLast7d,
      deltaLabel: 'last 7d',
      icon: MousePointerClick,
    },
    {
      label: 'Follows',
      value: totals.follows,
      icon: HeartHandshake,
    },
    {
      label: 'Messages livre d’or',
      value: totals.guestbookEntries,
      icon: UserPlus,
    },
    {
      label: 'Versions sauvegardées',
      value: totals.profileVersions,
      icon: History,
    },
    {
      label: 'Spotify connectés',
      value: totals.spotifyConnected,
      icon: Music2,
    },
  ];

  return (
    <div className="space-y-10">
      <section>
        <SectionTitle eyebrow="Totals" title="Volume global" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {cards.map((c) => (
            <MetricCard key={c.label} {...c} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="Inscriptions / jour"
          eyebrow="Last 30d"
          data={timeseries.signupsPerDay}
          accent="#5865F2"
        />
        <ChartPanel
          title="Vues / jour"
          eyebrow="Last 30d"
          data={timeseries.viewsPerDay}
          accent="#22d3ee"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Panel className="lg:col-span-3">
          <SectionTitle eyebrow="Modération" title="Signalements en attente" />
          {pendingReports.length === 0 ? (
            <Empty>Aucun signalement en attente. Félicitations !</Empty>
          ) : (
            <div className="space-y-3">
              {pendingReports.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-red-500/10 bg-red-500/[0.03] p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/${r.profileSlug}`}
                          target="_blank"
                          className="font-mono text-[12px] font-bold text-white hover:text-discord"
                        >
                          /{r.profileSlug}
                        </Link>
                        <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-red-400">
                          {r.reason}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-white/30">
                        {formatRelative(r.createdAt)}
                      </div>
                    </div>
                  </div>
                  {r.details && (
                    <p className="mb-4 text-xs text-white/60">"{r.details}"</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction('ban', r)}
                      className="rounded bg-red-500/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-200 transition hover:bg-red-500/40"
                    >
                      Bannir
                    </button>
                    <button
                      onClick={() => handleAction('dismiss', r)}
                      className="rounded bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40 transition hover:bg-white/10 hover:text-white"
                    >
                      Ignorer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="lg:col-span-2">
          <SectionTitle eyebrow="Comptes" title="Inscriptions récentes" />
          {recentSignups.length === 0 ? (
            <Empty>Aucune inscription pour l&apos;instant.</Empty>
          ) : (
            <ul className="space-y-2">
              {recentSignups.map((u) => (
                <li
                  key={u.id}
                  className="group flex items-center justify-between rounded-md border border-white/5 bg-white/[0.02] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono text-[12px] text-white">
                        @{u.username}
                      </span>
                      {u.role === 'ADMIN' && (
                        <span className="rounded-sm bg-discord/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-discord">
                          admin
                        </span>
                      )}
                      {u.isBanned && (
                        <span className="rounded-sm bg-red-500/20 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.2em] text-red-400">
                          Banni
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
                      {u.slug ? `/${u.slug}` : 'no profile'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40 group-hover:hidden">
                      {formatRelative(u.createdAt)}
                    </span>
                    <button
                      onClick={() => handleAction(u.isBanned ? 'unban' : 'ban-user', u)}
                      className="hidden font-mono text-[9px] uppercase tracking-wider text-red-400 hover:underline group-hover:block"
                    >
                      {u.isBanned ? 'Débannir' : 'Bannir'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          eyebrow="Trafic"
          title="Profils les plus vus (30 derniers jours)"
        />
        {topProfiles.length === 0 ? (
          <Empty>Pas encore de vues sur cette fenêtre.</Empty>
        ) : (
          <div className="overflow-hidden rounded-lg border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">Slug</th>
                  <th className="px-4 py-2.5 text-right">Vues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {topProfiles.map((p, i) => (
                  <tr key={p.slug || i} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-white/30">
                      {String(i + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[12px] text-white">
                      {p.slug ? (
                        <Link to={`/${p.slug}`} className="hover:text-discord">
                          /{p.slug}
                        </Link>
                      ) : (
                        <span className="text-white/30">— deleted —</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] tabular-nums">
                      {p.views.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <footer className="pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-white/25">
        Données générées le {new Date(stats.generatedAt).toLocaleString()} · Toutes
        les statistiques sont agrégées et ne contiennent aucune donnée
        personnelle au-delà du nom d&apos;utilisateur public.
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Building blocks                                                            */
/* -------------------------------------------------------------------------- */

function MetricCard({ label, value, delta, deltaLabel, icon: Icon }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-white/5 bg-white/[0.02] p-4 transition hover:border-white/10 hover:bg-white/[0.04]">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-discord/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          {label}
        </div>
        {Icon && <Icon className="h-3.5 w-3.5 text-white/30" />}
      </div>
      <div
        className="relative mt-3 text-[2.4rem] font-black leading-none tracking-tight tabular-nums"
        style={{ fontFamily: 'Bebas Neue' }}
      >
        {Number(value).toLocaleString()}
      </div>
      {typeof delta === 'number' && (
        <div className="relative mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">
          <TrendingUp className="h-3 w-3" />+{delta.toLocaleString()}{' '}
          <span className="text-white/30">{deltaLabel}</span>
        </div>
      )}
    </div>
  );
}

function Panel({ children, className = '' }) {
  return (
    <div
      className={`rounded-xl border border-white/5 bg-black/30 p-5 backdrop-blur ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/40">
        <span className="h-1 w-3 bg-discord" />
        {eyebrow}
      </div>
      <h2
        className="text-2xl font-black leading-none tracking-tight"
        style={{ fontFamily: 'Bebas Neue' }}
      >
        {title}
      </h2>
    </div>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-md border border-dashed border-white/10 px-4 py-6 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-white/30">
      {children}
    </div>
  );
}

function ChartPanel({ title, eyebrow, data, accent }) {
  const max = useMemo(
    () => data.reduce((m, p) => (p.count > m ? p.count : m), 0),
    [data],
  );
  const total = useMemo(
    () => data.reduce((s, p) => s + p.count, 0),
    [data],
  );

  return (
    <Panel>
      <div className="mb-4 flex items-end justify-between">
        <SectionTitle eyebrow={eyebrow} title={title} />
        <div className="text-right">
          <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">
            Total
          </div>
          <div
            className="text-2xl font-black tabular-nums"
            style={{ fontFamily: 'Bebas Neue' }}
          >
            {total.toLocaleString()}
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <Empty>Pas encore de données.</Empty>
      ) : (
        <Sparkbar data={data} max={max} accent={accent} />
      )}
    </Panel>
  );
}

function Sparkbar({ data, max, accent }) {
  // Simple inline SVG bar chart — no chart library dependency. The bars are
  // sized relative to the max value; days with zero events render as a thin
  // baseline so the time axis is still visible.
  const W = 600;
  const H = 140;
  const PAD = 6;
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const barWidth = innerW / data.length;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="Time-series bar chart"
      >
        {data.map((p, i) => {
          const h = max === 0 ? 1 : Math.max(1, (p.count / max) * innerH);
          const x = PAD + i * barWidth + 1;
          const y = PAD + (innerH - h);
          return (
            <g key={p.day}>
              <rect
                x={x}
                y={y}
                width={Math.max(1, barWidth - 2)}
                height={h}
                rx={1.5}
                fill={accent}
                opacity={0.8}
              >
                <title>{`${p.day}: ${p.count}`}</title>
              </rect>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">
        <span>{data[0]?.day}</span>
        <span>{data[data.length - 1]?.day}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Date helpers                                                                */
/* -------------------------------------------------------------------------- */

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(iso) {
  const ts = new Date(iso).getTime();
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
