import { useEffect, useState } from 'react';

/**
 * OpenWeatherMap city lookup.
 * The API key is stored per-widget (the user enters theirs in the editor).
 * Without a key, the widget shows a gentle stub so the profile still looks
 * intentional — no error screens here.
 */
export default function WeatherWidget({ widget }) {
  const { city, apiKey, unit } = widget.data;
  const [state, setState] = useState({ status: 'idle', data: null, error: null });

  useEffect(() => {
    if (!apiKey || !city) {
      setState({ status: 'idle', data: null, error: null });
      return;
    }
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
      city,
    )}&appid=${encodeURIComponent(apiKey)}&units=${unit || 'metric'}`;
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setState({ status: 'ok', data, error: null }))
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: err.message });
      });
    return () => controller.abort();
  }, [city, apiKey, unit]);

  const unitSymbol = (unit || 'metric') === 'imperial' ? '°F' : '°C';

  return (
    <div className="flex h-full w-full items-center gap-3 px-4">
      <div className="text-2xl">{weatherEmoji(state.data)}</div>
      <div className="min-w-0 flex-1">
        <div className="eyebrow truncate" style={{ color: 'currentColor' }}>
          {city || 'Set a city'}
        </div>
        <div
          className="truncate text-base font-semibold tracking-tight"
          style={{ color: 'currentColor' }}
        >
          {state.status === 'ok' && state.data?.main
            ? `${Math.round(state.data.main.temp)}${unitSymbol}`
            : state.status === 'loading'
            ? '…'
            : state.status === 'error'
            ? '—'
            : '—'}
        </div>
      </div>
    </div>
  );
}

function weatherEmoji(data) {
  if (!data?.weather?.[0]) return '🌤';
  const code = data.weather[0].id;
  if (code >= 200 && code < 300) return '⛈';
  if (code >= 300 && code < 500) return '🌦';
  if (code >= 500 && code < 600) return '🌧';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫';
  if (code === 800) return '☀️';
  if (code > 800) return '☁️';
  return '🌤';
}
