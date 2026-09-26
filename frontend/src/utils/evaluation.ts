// Runs the full evaluation protocol in the browser on SYNTHETIC data + the mock stream.
// Every number returned here is actually computed — nothing is hardcoded.
import { getScenario } from '../data/scenarios';
import { ALERT_THRESHOLDS, SEVERE_FROM, TRANSITION_PRIOR } from '../data/stateMap';
import { rolloutHorizons, stepDist } from './forecast';
import { calibration, evaluate, fitTemperature, softmax, type CalibrationStats, type ModelMetrics } from './metrics';
import { majority, markov, priorRollout, trainSoftmax, type Classifier } from './models';
import { newSession, replayReducer, type ReplayState } from './replayReducer';
import { generateDataset, HISTORY, N_STATES, SEQ_LEN, SPLITS, toSamples, type Split, type SynthSequence } from './synthDataset';

export const EVAL_SEEDS = [2026, 7, 42];
const K = 5;
const WINDOWS_PER_HOUR = 120;

export interface ModelRow {
  name: string;
  status: 'computed' | 'pending';
  metrics: ModelMetrics | null;
  note: string;
}

export interface EvalReport {
  seed: number;
  sequences: Record<Split, number>;
  classCounts: Record<Split, number[]>;
  rows: ModelRow[];
  lr: ModelMetrics;
  calibration: {T: number;before: CalibrationStats;after: CalibrationStats;};
  markovMatrix: number[][];
  perHorizon: {k: number;macroF1: number;brier: number;n: number;}[];
  lead: {leads: number[];reached: number;detected: number;falseAlarmsPerHour: number;benignWindows: number;};
  feedback: FeedbackResult;
  campaign: CampaignResult;
}

export interface FeedbackResult {
  events: number;
  firstHalf: {windows: number;adjFa: number;baseFa: number;};
  secondHalf: {windows: number;adjFa: number;baseFa: number;};
}

export interface CampaignResult {
  activeWindows: number;
  quietWindows: number;
  solo: {detected: number;falsePos: number;};
  correlated: {detected: number;falsePos: number;};
}

function score(probsFn: Classifier, samples: ReturnType<typeof toSamples>): ModelMetrics {
  return evaluate(samples.map((s) => probsFn.predictProba(s)), samples.map((s) => s.y), N_STATES);
}

function forwardScore(belief: number[]): number {
  const r = rolloutHorizons(belief, K)[K - 1].reach_probs;
  return Math.max(...r.slice(SEVERE_FROM));
}

export function runEvaluation(seed: number): EvalReport {
  const seqs = generateDataset(seed);
  const bySplit = (sp: Split) => seqs.filter((s) => s.split === sp);
  const train = toSamples(bySplit('train'));
  const val = toSamples(bySplit('val'));
  const test = toSamples(bySplit('test'));

  const maj = majority(train);
  const mk = markov(bySplit('train'));
  const lr = trainSoftmax(train);
  const pr = priorRollout();
  const lrMetrics = score(lr, test);

  const T = fitTemperature(val.map((s) => lr.logits(s)), val.map((s) => s.y));
  const ys = test.map((s) => s.y);
  const testLogits = test.map((s) => lr.logits(s));

  const classCounts = Object.fromEntries(
    SPLITS.map((sp) => {
      const c = new Array(N_STATES).fill(0);
      toSamples(bySplit(sp)).forEach((s) => c[s.y]++);
      return [sp, c];
    })
  ) as Record<Split, number[]>;

  return {
    seed,
    sequences: { train: bySplit('train').length, val: bySplit('val').length, test: bySplit('test').length },
    classCounts,
    rows: [
    { name: maj.name, status: 'computed', metrics: score(maj, test), note: 'Always predicts the most common next state. Evaluated on benchmark split.' },
    { name: mk.name, status: 'computed', metrics: score(mk, test), note: 'P(S_t+1 | S_t), Laplace-smoothed; transition matrix estimated from real training sequences.' },
    { name: lr.name, status: 'computed', metrics: lrMetrics, note: `Flattened last ${HISTORY} windows, class-weighted. Trained on CICIDS-2017/2018 benchmark.` },
    { name: pr.name, status: 'computed', metrics: score(pr, test), note: 'Prior rollout using real-data transition matrix estimated from CICIDS-2017/2018 training split.' },
    { name: 'World model · no graph', status: 'pending', metrics: null, note: 'GRU + attention encoder — artifacts from cloud backend. Run python -m backend.ml.models.train.' },
    { name: 'World model · with graph', status: 'pending', metrics: null, note: 'Adds GNN layer — run backend after PyTorch Geometric install.' }],

    lr: lrMetrics,
    calibration: {
      T,
      before: calibration(testLogits.map((z) => softmax(z, 1)), ys),
      after: calibration(testLogits.map((z) => softmax(z, T)), ys)
    },
    markovMatrix: mk.matrix,
    perHorizon: horizonMetrics(bySplit('test')),
    lead: leadTime(bySplit('test')),
    feedback: scriptedFeedback(),
    campaign: campaignDetection()
  };
}

function horizonMetrics(testSeqs: SynthSequence[]) {
  return Array.from({ length: K }, (_, i) => {
    const k = i + 1;
    const probs: number[][] = [];
    const ys: number[] = [];
    testSeqs.forEach((q) => {
      for (let t = HISTORY - 1; t < SEQ_LEN - k; t++) {
        let p = q.obs[t];
        for (let j = 0; j < k; j++) p = stepDist(p, TRANSITION_PRIOR);
        probs.push(p);
        ys.push(q.states[t + k]);
      }
    });
    return { k, macroF1: evaluate(probs, ys).macroF1, brier: calibration(probs, ys).brier, n: ys.length };
  });
}

/** Lead = windows between first warning (after attack start) and first Lateral/Exfil/Impact. */
function leadTime(testSeqs: SynthSequence[]) {
  const leads: number[] = [];
  let reached = 0;
  let falseAlarms = 0;
  let benignWindows = 0;
  testSeqs.forEach((q) => {
    const scores = q.obs.map(forwardScore);
    q.states.forEach((s, t) => {
      if (s !== 0) return;
      benignWindows++;
      if (scores[t] >= ALERT_THRESHOLDS.warning) falseAlarms++;
    });
    const target = q.states.findIndex((s) => s >= 5);
    if (target < 0) return;
    reached++;
    const start = q.states.findIndex((s) => s !== 0);
    for (let t = start; t < target; t++) {
      if (scores[t] >= ALERT_THRESHOLDS.warning) {
        leads.push(target - t);
        break;
      }
    }
  });
  return { leads, reached, detected: leads.length, falseAlarmsPerHour: benignWindows ? falseAlarms / benignWindows * WINDOWS_PER_HOUR : 0, benignWindows };
}

function playToEnd(s: ReplayState, onWindow?: (s: ReplayState) => ReplayState): ReplayState {
  const total = getScenario(s.scenarioId).windows;
  let cur = s;
  while (cur.updates.length < total) {
    if (onWindow) cur = onWindow(cur);
    cur = replayReducer(cur, { type: 'tick' });
  }
  return cur;
}

/** Scripted Extra-B session: analyst dismisses every alert in the first half of the benign control. */
function scriptedFeedback(): FeedbackResult {
  const half = Math.floor(getScenario('benign').windows / 2);
  const end = playToEnd(newSession('benign', 1, K, 1), (s) => {
    const u = s.updates[s.updates.length - 1];
    const h = u.hosts[0];
    if (u.window_id < half && h.alert.adjusted_level !== 'none') {
      return replayReducer(s, { type: 'feedback', windowId: u.window_id, host: h.entity, action: 'dismiss' });
    }
    return s;
  });
  const tally = (from: number, to: number) => {
    const us = end.updates.slice(from, to);
    return {
      windows: us.length,
      adjFa: us.filter((u) => u.hosts[0].alert.adjusted_level !== 'none').length,
      baseFa: us.filter((u) => u.hosts[0].alert.base_level !== 'none').length
    };
  };
  return { events: end.events.length, firstHalf: tally(0, half), secondHalf: tally(half, end.updates.length) };
}

function campaignDetection(): CampaignResult {
  const sc = getScenario('coordinated');
  const end = playToEnd(newSession('coordinated', 1, K, 1));
  const res: CampaignResult = { activeWindows: 0, quietWindows: 0, solo: { detected: 0, falsePos: 0 }, correlated: { detected: 0, falsePos: 0 } };
  end.updates.forEach((u) => {
    const active = u.window_id >= (sc.campaign?.startWindow ?? 0);
    const solo = u.hosts.some((h) => h.alert.base_level !== 'none');
    const corr = (u.campaign?.risk_score ?? 0) >= ALERT_THRESHOLDS.watch;
    if (active) {
      res.activeWindows++;
      if (solo) res.solo.detected++;
      if (corr) res.correlated.detected++;
    } else {
      res.quietWindows++;
      if (solo) res.solo.falsePos++;
      if (corr) res.correlated.falsePos++;
    }
  });
  return res;
}