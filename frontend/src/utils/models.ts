import { TRANSITION_PRIOR } from '../data/stateMap';
import { stepDist } from './forecast';
import { softmax } from './metrics';
import { N_STATES, type Sample, type SynthSequence } from './synthDataset';

export interface Classifier {
  name: string;
  predictProba: (s: Sample) => number[];
}

export function majority(train: Sample[]): Classifier {
  const counts = new Array(N_STATES).fill(0);
  train.forEach((s) => counts[s.y]++);
  const probs = counts.map((c) => c / train.length);
  return { name: 'Majority class', predictProba: () => probs };
}

/** First-order Markov chain fitted on train ground-truth pairs, Laplace-smoothed. */
export function markov(trainSeqs: SynthSequence[]): Classifier & {matrix: number[][];} {
  const counts = Array.from({ length: N_STATES }, () => new Array(N_STATES).fill(1));
  trainSeqs.forEach((q) => {
    for (let t = 0; t < q.states.length - 1; t++) counts[q.states[t]][q.states[t + 1]]++;
  });
  const matrix = counts.map((row) => {
    const sum = row.reduce((a, v) => a + v, 0);
    return row.map((v) => v / sum);
  });
  // At test time the current state is unknown, so we use the observed argmax.
  return {
    name: 'Markov chain',
    matrix,
    predictProba: (s) => matrix[s.obs.indexOf(Math.max(...s.obs))]
  };
}

export function priorRollout(): Classifier {
  return { name: 'Prior rollout (mock engine)', predictProba: (s) => stepDist(s.obs, TRANSITION_PRIOR) };
}

export interface SoftmaxClassifier extends Classifier {
  logits: (s: Sample) => number[];
}

/** Class-weighted multinomial logistic regression, standardised, full-batch gradient descent. */
export function trainSoftmax(train: Sample[], epochs = 150, lr = 0.8, l2 = 1e-4): SoftmaxClassifier {
  const D = train[0].x.length;
  const mean = new Array(D).fill(0);
  const std = new Array(D).fill(0);
  train.forEach((s) => s.x.forEach((v, d) => mean[d] += v / train.length));
  train.forEach((s) => s.x.forEach((v, d) => std[d] += (v - mean[d]) ** 2 / train.length));
  const sd = std.map((v) => Math.sqrt(v) || 1);
  const prep = (x: number[]) => [...x.map((v, d) => (v - mean[d]) / sd[d]), 1];

  const X = train.map((s) => prep(s.x));
  const counts = new Array(N_STATES).fill(0);
  train.forEach((s) => counts[s.y]++);
  const cw = counts.map((c) => c ? train.length / (N_STATES * c) : 0);
  const W = Array.from({ length: N_STATES }, () => new Array(D + 1).fill(0));

  for (let e = 0; e < epochs; e++) {
    const grad = Array.from({ length: N_STATES }, () => new Array(D + 1).fill(0));
    for (let i = 0; i < X.length; i++) {
      const x = X[i];
      const p = softmax(W.map((w) => dot(w, x)));
      const wy = cw[train[i].y];
      for (let c = 0; c < N_STATES; c++) {
        const g = (p[c] - (c === train[i].y ? 1 : 0)) * wy;
        if (g === 0) continue;
        const row = grad[c];
        for (let d = 0; d <= D; d++) row[d] += g * x[d];
      }
    }
    for (let c = 0; c < N_STATES; c++) {
      for (let d = 0; d <= D; d++) W[c][d] -= lr * (grad[c][d] / X.length + l2 * W[c][d]);
    }
  }

  const logits = (s: Sample) => {
    const x = prep(s.x);
    return W.map((w) => dot(w, x));
  };
  return { name: 'Logistic regression', logits, predictProba: (s) => softmax(logits(s)) };
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}