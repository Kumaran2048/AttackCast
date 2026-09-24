import { ALERT_THRESHOLDS } from '../data/stateMap';
import type { FeedbackAction } from '../types/attackcast';

// Mirror of backend/ml/feedback/online_update.py (primary Extra B rule).
export const FEEDBACK_CONFIG = { decay: 0.7, maxBias: 0.25 };

export interface StateFeedback {
  confirm: number;
  dismiss: number;
}

export type FeedbackState = Partial<Record<number, StateFeedback>>;

/** Positive bias raises future alerts for this state; negative suppresses them. */
export function biasFor(fs: FeedbackState, stateId: number): number {
  const f = fs[stateId];
  if (!f) return 0;
  return FEEDBACK_CONFIG.maxBias * (f.confirm - f.dismiss) / (f.confirm + f.dismiss + 1);
}

/** Pure update: older feedback decays by λ, the new event adds 1 to its bucket. */
export function applyFeedback(fs: FeedbackState, stateId: number, action: FeedbackAction): FeedbackState {
  const prev = fs[stateId] ?? { confirm: 0, dismiss: 0 };
  const d = FEEDBACK_CONFIG.decay;
  return {
    ...fs,
    [stateId]: {
      confirm: prev.confirm * d + (action === 'confirm' ? 1 : 0),
      dismiss: prev.dismiss * d + (action === 'dismiss' ? 1 : 0)
    }
  };
}

export function effectiveWatchThreshold(bias: number): number {
  return ALERT_THRESHOLDS.watch - bias;
}