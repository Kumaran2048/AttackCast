import { TRANSITION_PRIOR } from '../data/stateMap';
import type { ForecastPath, Horizon, StateId } from '../types/attackcast';

type Mat = number[][];

export function round(v: number, d = 3): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

export function stepDist(p: number[], T: Mat): number[] {
  const out = new Array(p.length).fill(0);
  for (let i = 0; i < p.length; i++) {
    if (p[i] === 0) continue;
    for (let j = 0; j < p.length; j++) out[j] += p[i] * T[i][j];
  }
  return out;
}

// Make state x absorbing so mass that ever enters x stays there: P(reach x within k).
function absorbing(T: Mat, x: number): Mat {
  return T.map((row, i) => i === x ? row.map((_, j) => j === x ? 1 : 0) : row);
}

export function rolloutHorizons(belief: number[], K: number, T: Mat = TRANSITION_PRIOR): Horizon[] {
  const absMats = T.map((_, x) => absorbing(T, x));
  const reachDists = T.map(() => belief.slice());
  const horizons: Horizon[] = [];
  let p = belief;
  for (let k = 1; k <= K; k++) {
    p = stepDist(p, T);
    const reach = reachDists.map((q, x) => {
      reachDists[x] = stepDist(q, absMats[x]);
      return reachDists[x][x];
    });
    horizons.push({ k, state_probs: p.map((v) => round(v)), reach_probs: reach.map((v) => round(v)) });
  }
  return horizons;
}

export function topPaths(start: number, K: number, T: Mat = TRANSITION_PRIOR, beam = 12): ForecastPath[] {
  let paths: {states: StateId[];prob: number;last: number;}[] = [{ states: [], prob: 1, last: start }];
  for (let k = 0; k < K; k++) {
    const next: typeof paths = [];
    for (const p of paths) {
      T[p.last].forEach((q, j) => {
        if (q > 0) next.push({ states: [...p.states, j as StateId], prob: p.prob * q, last: j });
      });
    }
    next.sort((a, b) => b.prob - a.prob);
    paths = next.slice(0, beam);
  }
  return paths.slice(0, 3).map(({ states, prob }) => ({ states, prob: round(prob, 4) }));
}

export function entropy(p: number[]): number {
  return -p.reduce((acc, v) => v > 0 ? acc + v * Math.log(v) : acc, 0);
}