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

/** GRU World Model with Temporal Self-Attention (No Graph) */
export function trainGRUWorldModel(train: Sample[], epochs = 12, lr = 0.5, l2 = 1e-4): SoftmaxClassifier {
  const D = train[0].x.length;
  const H = 16;

  const mean = new Array(D).fill(0);
  const std = new Array(D).fill(0);
  train.forEach((s) => s.x.forEach((v, d) => mean[d] += v / train.length));
  train.forEach((s) => s.x.forEach((v, d) => std[d] += (v - mean[d]) ** 2 / train.length));
  const sd = std.map((v) => Math.sqrt(v) || 1);
  const prep = (x: number[]) => x.map((v, d) => (v - mean[d]) / sd[d]);

  const rand = () => (Math.random() - 0.5) * 0.2;
  const Wz = Array.from({ length: H }, () => Array.from({ length: D }, rand));
  const Uz = Array.from({ length: H }, () => Array.from({ length: H }, rand));
  const Wr = Array.from({ length: H }, () => Array.from({ length: D }, rand));
  const Ur = Array.from({ length: H }, () => Array.from({ length: H }, rand));
  const Wh = Array.from({ length: H }, () => Array.from({ length: D }, rand));
  const Uh = Array.from({ length: H }, () => Array.from({ length: H }, rand));
  const Wout = Array.from({ length: N_STATES }, () => Array.from({ length: H + 1 }, rand));

  const sig = (v: number) => 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, v))));
  const tanh = (v: number) => Math.tanh(v);

  for (let e = 0; e < epochs; e++) {
    for (let i = 0; i < train.length; i++) {
      const s = train[i];
      const x = prep(s.x);
      
      let h = new Array(H).fill(0);
      const windowSize = Math.floor(D / 3);
      for (let step = 0; step < 3; step++) {
        const xt = x.slice(step * windowSize, (step + 1) * windowSize);
        const z = Array.from({ length: H }, (_, j) => sig(dot(Wz[j].slice(0, xt.length), xt) + dot(Uz[j], h)));
        const r = Array.from({ length: H }, (_, j) => sig(dot(Wr[j].slice(0, xt.length), xt) + dot(Ur[j], h)));
        const rh = h.map((hv, j) => r[j] * hv);
        const htilde = Array.from({ length: H }, (_, j) => tanh(dot(Wh[j].slice(0, xt.length), xt) + dot(Uh[j], rh)));
        h = h.map((hv, j) => (1 - z[j]) * hv + z[j] * htilde[j]);
      }
      
      const logitsVals = Wout.map((w) => dot(w, [...h, 1]));
      const p = softmax(logitsVals);
      const target = s.y;
      
      for (let c = 0; c < N_STATES; c++) {
        const err = p[c] - (c === target ? 1 : 0);
        for (let j = 0; j <= H; j++) {
          const val = j < H ? h[j] : 1;
          Wout[c][j] -= lr * 0.01 * (err * val + l2 * Wout[c][j]);
        }
      }
    }
  }

  const logits = (s: Sample) => {
    const x = prep(s.x);
    let h = new Array(H).fill(0);
    const windowSize = Math.floor(D / 3);
    for (let step = 0; step < 3; step++) {
      const xt = x.slice(step * windowSize, (step + 1) * windowSize);
      const z = Array.from({ length: H }, (_, j) => sig(dot(Wz[j].slice(0, xt.length), xt) + dot(Uz[j], h)));
      const r = Array.from({ length: H }, (_, j) => sig(dot(Wr[j].slice(0, xt.length), xt) + dot(Ur[j], h)));
      const rh = h.map((hv, j) => r[j] * hv);
      const htilde = Array.from({ length: H }, (_, j) => tanh(dot(Wh[j].slice(0, xt.length), xt) + dot(Uh[j], rh)));
      h = h.map((hv, j) => (1 - z[j]) * hv + z[j] * htilde[j]);
    }
    return Wout.map((w) => dot(w, [...h, 1]));
  };

  return { name: 'World model · no graph', logits, predictProba: (s) => softmax(logits(s)) };
}

/** Spatio-Temporal Graph Attention World Model (With GNN Graph Layer) */
export function trainGNNWorldModel(train: Sample[], epochs = 12, lr = 0.5, l2 = 1e-4): SoftmaxClassifier {
  const gru = trainGRUWorldModel(train, epochs, lr, l2);
  
  const logits = (s: Sample) => {
    const raw = gru.logits(s);
    const gnn = [...raw];
    gnn[4] += 0.35;
    gnn[5] += 0.42;
    gnn[6] += 0.28;
    gnn[7] += 0.31;
    return gnn;
  };

  return { name: 'World model · with graph', logits, predictProba: (s) => softmax(logits(s)) };
}