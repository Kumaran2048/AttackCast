// SYNTHETIC dataset for in-browser evaluation. Sequences are sampled from the same
// ATT&CK-inspired prior the mock stream uses, so they stand in for real CIC/CTU windows
// until Phase 1 runs in Python. Split is by sequence (scenario-held-out), never by window.
import { TRANSITION_PRIOR } from '../data/stateMap';
import type { StateId } from '../types/attackcast';
import { mulberry32 } from './random';

export type Split = 'train' | 'val' | 'test';
export const SPLITS: Split[] = ['train', 'val', 'test'];
export const SEQ_LEN = 20;
export const HISTORY = 3;
export const N_STATES = 8;

export interface SynthSequence {
  id: number;
  split: Split;
  states: StateId[];
  obs: number[][];
}

export interface Sample {
  x: number[];
  obs: number[];
  y: StateId;
  seqId: number;
  t: number;
}

export function argmax(v: number[]): StateId {
  return v.reduce((best, x, i) => x > v[best] ? i : best, 0) as StateId;
}

function sampleRow(row: number[], r: number): StateId {
  let acc = 0;
  for (let j = 0; j < row.length; j++) {
    acc += row[j];
    if (r < acc) return j as StateId;
  }
  return row.length - 1 as StateId;
}

/** Noisy observation of the true state — stands in for window features. */
function observe(gt: StateId, rng: () => number): number[] {
  const o = new Array(N_STATES).fill(0);
  if (gt === 0 && rng() < 0.12) {
    o[0] = 0.45;
    o[1] = 0.55; // benign scan-like burst -> source of false alarms
  } else {
    const signal = 0.45 + rng() * 0.35;
    const rest = 1 - signal;
    o[gt] += signal;
    o[0] += rest * 0.5;
    o[Math.max(0, gt - 1)] += rest * 0.25;
    o[Math.min(7, gt + 1)] += rest * 0.25;
  }
  for (let i = 0; i < N_STATES; i++) o[i] += rng() * 0.05;
  const sum = o.reduce((a, v) => a + v, 0);
  return o.map((v) => v / sum);
}

export function generateDataset(seed: number, n = 240): SynthSequence[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, (_, id) => {
    const states: StateId[] = [0];
    for (let t = 1; t < SEQ_LEN; t++) states.push(sampleRow(TRANSITION_PRIOR[states[t - 1]], rng()));
    const obs = states.map((s) => observe(s, rng));
    const split: Split = id < n * 0.6 ? 'train' : id < n * 0.8 ? 'val' : 'test';
    return { id, split, states, obs };
  });
}

export function toSamples(seqs: SynthSequence[]): Sample[] {
  const out: Sample[] = [];
  for (const s of seqs) {
    for (let t = HISTORY - 1; t < SEQ_LEN - 1; t++) {
      out.push({ x: s.obs.slice(t - HISTORY + 1, t + 1).flat(), obs: s.obs[t], y: s.states[t + 1], seqId: s.id, t });
    }
  }
  return out;
}