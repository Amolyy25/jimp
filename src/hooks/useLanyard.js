import { useEffect, useRef, useState } from 'react';

/**
 * Subscribes to a user's real-time Discord presence via Lanyard.
 *
 * Lanyard (https://github.com/Phineas/lanyard) is a free community service
 * that exposes Discord presence for users who join its server. We open a
 * WebSocket, send:
 *   op 2 → subscribe to one user
 *   op 3 → heartbeat every `heartbeat_interval` ms (sent by op 1 hello)
 * and receive op 0 events with `discord_status`, `activities`, `spotify`…
 *
 * Returns `{ state, data, error }` where state is:
 *   'idle'       — no userId yet
 *   'connecting'
 *   'subscribed' — presence received at least once
 *   'error'      — WS closed or user not in Lanyard server
 */
const LANYARD_WS = 'wss://api.lanyard.rest/socket';

export function useLanyard(userId) {
  const [state, setState] = useState(userId ? 'connecting' : 'idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);
  const retryRef = useRef(null);

  useEffect(() => {
    // Reset when the target user changes.
    setData(null);
    setError(null);
    if (!userId || !/^\d{15,22}$/.test(userId)) {
      setState('idle');
      return;
    }
    setState('connecting');

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const ws = new WebSocket(LANYARD_WS);
      wsRef.current = ws;

      ws.addEventListener('open', () => {
        // Subscribe to a single user. Lanyard also supports `subscribe_to_ids`
        // (array) — we keep it simple since widgets own a single userId.
        ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: userId } }));
      });

      ws.addEventListener('message', (event) => {
        let msg;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        // op 1 = Hello with heartbeat_interval
        if (msg.op === 1 && msg.d?.heartbeat_interval) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ op: 3 }));
            }
          }, msg.d.heartbeat_interval);
        }

        // op 0 = Event (INIT_STATE or PRESENCE_UPDATE)
        if (msg.op === 0) {
          if (msg.t === 'INIT_STATE' || msg.t === 'PRESENCE_UPDATE') {
            setData(msg.d);
            setState('subscribed');
          }
        }
      });

      ws.addEventListener('close', () => {
        clearInterval(heartbeatRef.current);
        if (cancelled) return;
        setState('error');
        setError('Lanyard connection lost. Reconnecting…');
        // Exponential back-off capped at 10s.
        retryRef.current = setTimeout(connect, 3000);
      });

      ws.addEventListener('error', () => {
        setError('Lanyard error. Is this user in the Lanyard Discord server?');
      });
    };

    connect();

    return () => {
      cancelled = true;
      clearInterval(heartbeatRef.current);
      clearTimeout(retryRef.current);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
    };
  }, [userId]);

  return { state, data, error };
}
