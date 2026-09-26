import { useEffect, useMemo, useReducer, useRef } from 'react';
import { getScenario } from '../data/scenarios';
import { BACKEND_URL, WS_BACKEND_URL } from '../utils/apiConfig';
import { computeSummary, newSession, replayReducer } from '../utils/replayReducer';

const BASE_TICK_MS = 1200;

export function useReplay() {
  const [state, dispatch] = useReducer(replayReducer, undefined, () => newSession('infiltration', 1));
  const scenario = (state.customScenario && state.scenarioId === state.customScenario.id) ? state.customScenario : getScenario(state.scenarioId);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!state.playing) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    let isUsingWs = false;
    let lastWsMessage = Date.now();

    // Attempt starting a live backend WebSocket replay session
    fetch(`${BACKEND_URL}/api/replay/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario_id: state.scenarioId,
        K: state.K,
        speed: state.speed,
        window_seconds: 30,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.session_id && state.playing) {
          const ws = new WebSocket(`${WS_BACKEND_URL}/ws/replay/${data.session_id}`);
          wsRef.current = ws;
          isUsingWs = true;

          ws.onmessage = (evt) => {
            lastWsMessage = Date.now();
            try {
              const raw = JSON.parse(evt.data);
              if (raw && raw.window_id !== undefined) {
                if (!raw.hosts && raw.current_state) {
                  raw.hosts = [
                    {
                      entity: raw.entity || 'demo-host',
                      sequence_origin: raw.sequence_origin || 'real',
                      current_state: raw.current_state,
                      ground_truth_state: raw.ground_truth_state,
                      forecast: raw.forecast,
                      alert: { ...raw.alert, base_level: raw.alert?.level || 'none', adjusted_level: raw.alert?.level || 'none' },
                      explanation: raw.explanation,
                      countermeasures: raw.countermeasures,
                    },
                  ];
                }
                dispatch({ type: 'push-update', update: raw });
              }
            } catch (err) {
              console.warn('WS parse error:', err);
            }
          };

          ws.onerror = () => { isUsingWs = false; };
          ws.onclose = () => { isUsingWs = false; };
        }
      })
      .catch(() => {
        isUsingWs = false;
      });

    // Fallback timer tick
    const id = window.setInterval(() => {
      // If the websocket hangs (e.g. on Vercel), fallback after 3 seconds of no messages
      if (isUsingWs && wsRef.current) {
        if (wsRef.current.readyState === WebSocket.CLOSED || wsRef.current.readyState === WebSocket.CLOSING) {
          isUsingWs = false;
        } else if (Date.now() - lastWsMessage > 3000) {
          isUsingWs = false;
          try { wsRef.current.close(); } catch (e) {}
        }
      }

      if (!isUsingWs) {
        dispatch({ type: 'tick' });
      }
    }, BASE_TICK_MS / state.speed);

    return () => {
      window.clearInterval(id);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [state.playing, state.speed, state.scenarioId, state.K]);

  const current = state.updates[state.updates.length - 1];
  const summary = useMemo(() => computeSummary(state.updates, state.events), [state.updates, state.events]);

  return { state, dispatch, scenario, current, summary };
}

export type ReplayApi = ReturnType<typeof useReplay>;