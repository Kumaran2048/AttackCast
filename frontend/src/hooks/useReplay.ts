import { useEffect, useMemo, useReducer } from 'react';
import { getScenario } from '../data/scenarios';
import { computeSummary, newSession, replayReducer } from '../utils/replayReducer';

const BASE_TICK_MS = 1200;

export function useReplay() {
  const [state, dispatch] = useReducer(replayReducer, undefined, () => newSession('infiltration', 1));
  const scenario = getScenario(state.scenarioId);

  useEffect(() => {
    if (!state.playing) return;
    const id = window.setInterval(() => dispatch({ type: 'tick' }), BASE_TICK_MS / state.speed);
    return () => window.clearInterval(id);
  }, [state.playing, state.speed]);

  const current = state.updates[state.updates.length - 1];
  const summary = useMemo(() => computeSummary(state.updates, state.events), [state.updates, state.events]);

  return { state, dispatch, scenario, current, summary };
}

export type ReplayApi = ReturnType<typeof useReplay>;