import { getScenario, type Scenario } from '../data/scenarios';
import type { FeedbackAction, FeedbackEvent, FeedbackSummary, WindowUpdate } from '../types/attackcast';
import { applyFeedback, biasFor, effectiveWatchThreshold, type FeedbackState } from './feedbackRule';
import { round } from './forecast';
import { buildWindowUpdate } from './mockStream';

export interface ReplayState {
  sessionSeq: number;
  sessionId: string;
  scenarioId: string;
  customScenario?: Scenario;
  customUpdates?: WindowUpdate[];
  K: number;
  speed: number;
  playing: boolean;
  updates: WindowUpdate[];
  feedback: FeedbackState;
  events: FeedbackEvent[];
  resolutions: Record<string, FeedbackAction>;
  selectedHost: string;
}

export type ReplayAction =
  | { type: 'tick' }
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'speed'; speed: number }
  | { type: 'k'; K: number }
  | { type: 'seek'; position: number }
  | { type: 'scenario'; id: string }
  | { type: 'reset' }
  | { type: 'select-host'; entity: string }
  | { type: 'feedback'; windowId: number; host: string; action: FeedbackAction }
  | { type: 'push-update'; update: WindowUpdate }
  | { type: 'load-custom-pcap'; scenario: Scenario; updates: WindowUpdate[] };

export function resolutionKey(windowId: number, host: string): string {
  return `${windowId}|${host}`;
}

/** False alarm = an alert raised on a window whose ground truth is Benign. */
export function computeSummary(updates: WindowUpdate[], events: FeedbackEvent[]): FeedbackSummary {
  let benign = 0;
  let baseFa = 0;
  let adjFa = 0;
  for (const u of updates) {
    for (const h of u.hosts) {
      if (h.ground_truth_state?.id !== 0) continue;
      benign++;
      if (h.alert.base_level !== 'none') baseFa++;
      if (h.alert.adjusted_level !== 'none') adjFa++;
    }
  }
  const confirmed = events.filter((e) => e.action === 'confirm').length;
  return {
    total_events: events.length,
    confirmed,
    dismissed: events.length - confirmed,
    current_false_alarm_rate: benign ? round(adjFa / benign) : 0,
    baseline_false_alarm_rate: benign ? round(baseFa / benign) : 0
  };
}

function appendWindow(state: ReplayState): ReplayState {
  if (state.customUpdates && state.customUpdates.length > 0 && state.scenarioId === state.customScenario?.id) {
    const w = state.updates.length;
    if (w >= state.customUpdates.length) return { ...state, playing: false };
    const draft = state.customUpdates[w];
    const updates = [...state.updates, draft];
    draft.feedback_summary = computeSummary(updates, state.events);
    return { ...state, updates, playing: state.playing && updates.length < state.customUpdates.length };
  }
  const sc = (state.customScenario && state.scenarioId === state.customScenario.id) ? state.customScenario : getScenario(state.scenarioId);
  const w = state.updates.length;
  if (w >= sc.windows) return { ...state, playing: false };
  const draft = buildWindowUpdate(sc, w, state.K, state.feedback, state.sessionId, computeSummary(state.updates, state.events));
  const updates = [...state.updates, draft];
  draft.feedback_summary = computeSummary(updates, state.events);
  return { ...state, updates, playing: state.playing && updates.length < sc.windows };
}

export function newSession(scenarioId: string, seq: number, K = 5, speed = 2): ReplayState {
  const sc = getScenario(scenarioId);
  const base: ReplayState = {
    sessionSeq: seq,
    sessionId: `sess-${scenarioId}-${String(seq).padStart(3, '0')}`,
    scenarioId,
    K,
    speed,
    playing: false,
    updates: [],
    feedback: {},
    events: [],
    resolutions: {},
    selectedHost: sc.hosts[0].entity
  };
  return appendWindow(base);
}

export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'tick':
      return appendWindow(state);
    case 'play': {
      const sc = (state.customScenario && state.scenarioId === state.customScenario.id) ? state.customScenario : getScenario(state.scenarioId);
      const done = state.updates.length >= sc.windows;
      return done ? state : { ...state, playing: true };
    }
    case 'pause':
      return { ...state, playing: false };
    case 'speed':
      return { ...state, speed: action.speed };
    case 'k':
      return { ...state, K: action.K };
    case 'select-host':
      return { ...state, selectedHost: action.entity };
    case 'scenario':
      return newSession(action.id, state.sessionSeq + 1, state.K, state.speed);
    case 'reset': {
      if (state.customScenario && state.scenarioId === state.customScenario.id && state.customUpdates) {
        return {
          ...state,
          playing: false,
          updates: [state.customUpdates[0]],
          feedback: {},
          events: [],
          resolutions: {},
        };
      }
      const resetState = newSession(state.scenarioId, state.sessionSeq + 1, state.K, state.speed);
      return { ...resetState, selectedHost: state.selectedHost };
    }
    case 'seek': {
      const sc = (state.customScenario && state.scenarioId === state.customScenario.id) ? state.customScenario : getScenario(state.scenarioId);
      const target = Math.max(1, Math.min(action.position, sc.windows));
      if (target <= state.updates.length) return { ...state, updates: state.updates.slice(0, target) };
      let next = state;
      while (next.updates.length < target) next = appendWindow(next);
      return next;
    }
    case 'load-custom-pcap': {
      return {
        sessionSeq: state.sessionSeq + 1,
        sessionId: `sess-pcap-${state.sessionSeq + 1}`,
        scenarioId: action.scenario.id,
        customScenario: action.scenario,
        customUpdates: action.updates,
        K: state.K,
        speed: state.speed,
        playing: true,
        updates: [action.updates[0]],
        feedback: {},
        events: [],
        resolutions: {},
        selectedHost: action.scenario.hosts[0].entity,
      };
    }
    case 'feedback':{
        const u = state.updates.find((x) => x.window_id === action.windowId);
        const h = u?.hosts.find((x) => x.entity === action.host);
        if (!u || !h) return state;
        const stateId = h.current_state.id;
        const biasBefore = biasFor(state.feedback, stateId);
        const feedback = applyFeedback(state.feedback, stateId, action.action);
        const biasAfter = biasFor(feedback, stateId);
        const event: FeedbackEvent = {
          id: state.events.length + 1,
          window_id: action.windowId,
          host: action.host,
          state_id: stateId,
          action: action.action,
          level_at_click: h.alert.adjusted_level,
          bias_before: round(biasBefore),
          bias_after: round(biasAfter),
          watch_threshold_before: round(effectiveWatchThreshold(biasBefore)),
          watch_threshold_after: round(effectiveWatchThreshold(biasAfter))
        };
        return {
          ...state,
          feedback,
          events: [...state.events, event],
          resolutions: { ...state.resolutions, [resolutionKey(action.windowId, action.host)]: action.action }
        };
      }
    case 'push-update': {
      const updates = [...state.updates, action.update];
      const done = updates.length >= getScenario(state.scenarioId).windows;
      return { ...state, updates, playing: state.playing && !done };
    }
    default:
      return state;
  }
}