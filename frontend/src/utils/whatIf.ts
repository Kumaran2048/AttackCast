import type { Scenario } from '../data/scenarios';
import { SEVERE_FROM, TRANSITION_PRIOR } from '../data/stateMap';
import { CAMPAIGN_ISOLATION_FACTOR, PORT_EFFECTS, WHATIF_ACTIONS, type WhatIfActionId } from '../data/whatIfActions';
import type { Horizon, WindowUpdate } from '../types/attackcast';
import { rolloutHorizons } from './forecast';
import { hostBelief } from './mockStream';

export interface WhatIfResult {
  original: Horizon[];
  counterfactual: Horizon[];
  scoreBefore: number;
  scoreAfter: number;
  campaign: {before: number;after: number;} | null;
  effectNote: string;
}

/** Scale transitions into `states`; removed mass is re-routed to Benign ("contained"). */
export function modifyPrior(T: number[][], states: number[], factor: number): number[][] {
  return T.map((row) => {
    const out = row.slice();
    let removed = 0;
    states.forEach((s) => {
      const cut = out[s] * (1 - factor);
      out[s] -= cut;
      removed += cut;
    });
    out[0] += removed;
    return out;
  });
}

function severeScore(h: Horizon[]): number {
  return Math.max(...h[h.length - 1].reach_probs.slice(SEVERE_FROM));
}

export function runWhatIf(sc: Scenario, update: WindowUpdate, entity: string, actionId: WhatIfActionId, port: number, K: number): WhatIfResult {
  const action = WHATIF_ACTIONS.find((a) => a.id === actionId)!;
  const effect = actionId === 'block_port' ? PORT_EFFECTS[port] : action.effect;
  const belief = hostBelief(sc, entity, update.window_id);
  const T2 = effect ? modifyPrior(TRANSITION_PRIOR, effect.states, effect.factor) : TRANSITION_PRIOR;
  const original = rolloutHorizons(belief, K);
  const counterfactual = rolloutHorizons(belief, K, T2);
  const campaign =
  actionId === 'isolate_campaign_hosts' && update.campaign ?
  { before: update.campaign.risk_score, after: update.campaign.risk_score * CAMPAIGN_ISOLATION_FACTOR } :
  null;
  return {
    original,
    counterfactual,
    scoreBefore: severeScore(original),
    scoreAfter: severeScore(counterfactual),
    campaign,
    effectNote: effect ? `Transitions into ${effect.states.length} stage(s) scaled ×${effect.factor}; removed probability treated as contained.` : 'No policy prior defined for this port — forecast unchanged.'
  };
}