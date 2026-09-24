// MOCK stream generator — stands in for backend replay until Phase 5.
// Probabilities come from rolling a transition prior forward, NOT from a trained model.
import {
  ALERT_THRESHOLDS,
  COUNTERMEASURES,
  FILLER_FEATURES,
  SEVERE_FROM,
  STATE_FEATURES,
  STATES,
  UNCERTAIN_ENTROPY } from
'../data/stateMap';
import type { Scenario, ScenarioHost } from '../data/scenarios';
import type {
  AlertLevel,
  CampaignUpdate,
  FeatureAttribution,
  FeedbackSummary,
  FlaggedFlow,
  HostUpdate,
  StateId,
  WindowUpdate } from
'../types/attackcast';
import { biasFor, type FeedbackState } from './feedbackRule';
import { entropy, rolloutHorizons, round, topPaths } from './forecast';
import { hashSeed, mulberry32 } from './random';

export const WINDOW_SECONDS = 30;
const BASE_TS = Date.UTC(2018, 1, 28, 14, 0, 0) / 1000;
const HISTORY_L = 10;

export function levelFor(score: number): AlertLevel {
  if (score >= ALERT_THRESHOLDS.critical) return 'critical';
  if (score >= ALERT_THRESHOLDS.warning) return 'warning';
  if (score >= ALERT_THRESHOLDS.watch) return 'watch';
  return 'none';
}

export function buildWindowUpdate(
sc: Scenario,
w: number,
K: number,
feedback: FeedbackState,
sessionId: string,
summary: FeedbackSummary)
: WindowUpdate {
  const hosts = sc.hosts.map((h) => buildHost(sc, h, w, K, feedback));
  return {
    session_id: sessionId,
    window_id: w,
    t_start: BASE_TS + w * WINDOW_SECONDS,
    t_end: BASE_TS + (w + 1) * WINDOW_SECONDS,
    hosts,
    campaign: sc.campaign ? buildCampaign(sc, w, K, hosts) : null,
    feedback_summary: summary
  };
}

function beliefFor(host: ScenarioHost, gt: StateId, rng: () => number): number[] {
  const b = new Array(8).fill(0);
  if (gt === 0) {
    b[0] = 0.9;
    if (rng() < host.flipRate) {
      const w = 0.6 + rng() * 0.22;
      b[0] = 1 - w;
      b[1] = w;
    }
  } else {
    const rest = 1 - host.signal;
    b[gt] += host.signal;
    b[0] += rest * 0.7;
    b[gt > 1 ? gt - 1 : 0] += rest * 0.15;
    b[gt < 7 ? gt + 1 : gt] += rest * 0.15;
  }
  for (let i = 0; i < 8; i++) b[i] += rng() * 0.03;
  const sum = b.reduce((a, v) => a + v, 0);
  return b.map((v) => v / sum);
}

/** Reproduces the exact belief buildHost used for this host/window (same seeded RNG order). */
export function hostBelief(sc: Scenario, entity: string, w: number): number[] {
  const host = sc.hosts.find((h) => h.entity === entity) ?? sc.hosts[0];
  const gt = host.path[Math.min(w, host.path.length - 1)];
  return beliefFor(host, gt, mulberry32(hashSeed(sc.id, host.entity, w)));
}

function argmax(v: number[]): StateId {
  return v.reduce((best, x, i) => x > v[best] ? i : best, 0) as StateId;
}

function buildHost(sc: Scenario, host: ScenarioHost, w: number, K: number, fb: FeedbackState): HostUpdate {
  const gt = host.path[Math.min(w, host.path.length - 1)];
  const rng = mulberry32(hashSeed(sc.id, host.entity, w));
  const belief = beliefFor(host, gt, rng);
  const cur = argmax(belief);
  const horizons = rolloutHorizons(belief, K);
  const last = horizons[K - 1].reach_probs;

  let severe = SEVERE_FROM as number;
  for (let x = SEVERE_FROM; x < 8; x++) if (last[x] > last[severe]) severe = x;
  const baseScore = last[severe];
  const bias = biasFor(fb, cur);
  const adjScore = Math.min(1, Math.max(0, baseScore + bias));
  const baseLevel = levelFor(baseScore);
  const adjLevel = levelFor(adjScore);
  const leadIdx = horizons.findIndex((h) => h.reach_probs[severe] >= 0.5);

  const topFeatures = buildFeatures(cur, belief[cur], rng);
  const flows = cur === 0 ? [] : buildFlows(sc.id, host.entity, cur, w, rng);
  const severeName = STATES[severe].name;
  const text =
  adjLevel === 'none' ?
  `Traffic consistent with ${STATES[cur].name.toLowerCase()} behaviour. Highest forward risk: ${severeName} at ${pct(adjScore)} within ${K} windows.` :
  `${STATES[cur].name} behaviour (${pct(belief[cur])} confidence). ${severeName} forecast within ${K} windows at ${pct(adjScore)}, driven by ${topFeatures.
  filter((f) => f.shap > 0).
  slice(0, 3).
  map((f) => f.feature).
  join(', ')}.`;

  return {
    entity: host.entity,
    sequence_origin: sc.sequence_origin,
    current_state: { id: cur, name: STATES[cur].name, attack_id: STATES[cur].attackId, confidence: round(belief[cur]) },
    ground_truth_state: { id: gt, name: STATES[gt].name },
    forecast: {
      K,
      horizons,
      top_paths: topPaths(cur, K),
      uncertain: entropy(belief) > UNCERTAIN_ENTROPY,
      temperature: 1
    },
    alert: {
      level: adjLevel,
      reason: `P(${severeName} within ${K} windows) = ${pct(baseScore)}`,
      lead_estimate_windows: leadIdx >= 0 ? leadIdx + 1 : null,
      feedback_adjusted: bias !== 0,
      base_level: baseLevel,
      adjusted_level: adjLevel,
      base_score: round(baseScore),
      adjusted_score: round(adjScore)
    },
    explanation: {
      top_features: topFeatures,
      attention: buildAttention(rng),
      flagged_flows: flows,
      text
    },
    countermeasures: COUNTERMEASURES[cur]
  };
}

function buildFeatures(cur: StateId, conf: number, rng: () => number): FeatureAttribution[] {
  const main = STATE_FEATURES[cur].map((f, i) => ({
    feature: f.feature,
    value: round(f.min + (f.max - f.min) * rng(), 2),
    shap: round((0.34 - i * 0.07) * (0.7 + 0.6 * rng()) * conf, 3)
  }));
  const filler = FILLER_FEATURES.slice(0, 2).map((feature) => ({
    feature,
    value: round(rng() * 1.5, 2),
    shap: round(-(0.03 + rng() * 0.08), 3)
  }));
  return [...main, ...filler].sort((a, b) => Math.abs(b.shap) - Math.abs(a.shap));
}

function buildAttention(rng: () => number): number[] {
  const raw = Array.from({ length: HISTORY_L }, (_, i) => Math.exp(0.32 * i + rng() * 0.4));
  const sum = raw.reduce((a, v) => a + v, 0);
  return raw.map((v) => round(v / sum));
}

const FLOW_TARGETS: Record<StateId, {ip: (i: number) => string;port: (i: number, r: number) => number;bytes: number;}> = {
  0: { ip: () => '0.0.0.0', port: () => 0, bytes: 0 },
  1: { ip: (i) => `172.16.0.${10 + i}`, port: (_, r) => Math.floor(r * 1024) + 1, bytes: 60 },
  2: { ip: () => '172.16.0.10', port: () => 22, bytes: 900 },
  3: { ip: () => '172.16.0.10', port: () => 4444, bytes: 12000 },
  4: { ip: () => '203.0.113.50', port: () => 443, bytes: 2200 },
  5: { ip: (i) => `172.16.0.${20 + i}`, port: (i) => i % 2 ? 445 : 3389, bytes: 6000 },
  6: { ip: () => '198.51.100.23', port: () => 443, bytes: 4_800_000 },
  7: { ip: () => '172.16.0.5', port: () => 80, bytes: 120 }
};

function buildFlows(scId: string, entity: string, cur: StateId, w: number, rng: () => number): FlaggedFlow[] {
  const t = FLOW_TARGETS[cur];
  const n = 3 + Math.floor(rng() * 3);
  return Array.from({ length: n }, (_, i) => {
    const pkts = 2 + Math.floor(rng() * 40);
    return {
      flow_id: `${scId}-w${w}-f${i}`,
      src_ip: entity,
      dst_ip: t.ip(i),
      dst_port: t.port(i, rng()),
      proto: 'TCP' as const,
      pkts,
      bytes: Math.round(t.bytes * (0.5 + rng()))
    };
  });
}

/** Flows per campaign member toward the shared target in window w (deterministic). */
export function memberFlows(scId: string, member: string, w: number): number {
  const rng = mulberry32(hashSeed(scId, 'flows', member, w));
  return 3 + Math.floor(rng() * 4);
}

function buildCampaign(sc: Scenario, w: number, K: number, hosts: HostUpdate[]): CampaignUpdate {
  const c = sc.campaign!;
  const active = w >= c.startWindow;
  const n = active ? w - c.startWindow + 1 : 0;
  const risk = active ? Math.min(0.96, 1 - Math.exp(-0.2 * n)) : 0.04;
  const flows = c.members.map((m) => active ? memberFlows(sc.id, m, w) : 0);
  const totalFlows = flows.reduce((a, v) => a + v, 0) || 1;
  const weights = flows.map((f) => f / totalFlows);

  const member_scores = c.members.map((entity, i) => {
    const solo = hosts.find((h) => h.entity === entity)?.alert.base_score ?? 0;
    const correlated = Math.min(0.97, 0.35 * solo + 0.7 * risk * (0.8 + 0.2 * weights[i] * c.members.length));
    return { entity, solo: round(solo), correlated: round(correlated) };
  });
  const maxSolo = Math.max(...member_scores.map((m) => m.solo));
  const lo = Math.min(...flows);
  const hi = Math.max(...flows);

  return {
    campaign_id: `${sc.id}-c1`,
    member_hosts: c.members,
    shared_target: active ? c.target : null,
    risk_score: round(risk),
    member_scores,
    forecast: {
      horizons: Array.from({ length: K }, (_, i) => ({
        k: i + 1,
        reach_prob_confirmed: round(risk + (1 - risk) * risk * (1 - 0.8 ** (i + 1)))
      }))
    },
    explanation: {
      top_contributing_hosts: c.members.
      map((entity, i) => ({ entity, weight: round(weights[i]) })).
      sort((a, b) => b.weight - a.weight),
      text: active ?
      `Flagged: ${c.members.length} hosts each made ${lo}–${hi} connections to ${c.target.ip}:${c.target.port} within ${WINDOW_SECONDS}s — individually quiet (highest solo score ${pct(maxSolo)}), collectively a scan pattern.` :
      `No shared-target pattern yet across the ${c.members.length} monitored hosts.`
    }
  };
}

export function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}