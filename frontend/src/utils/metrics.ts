export interface ClassMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelMetrics {
  n: number;
  accuracy: number;
  macroP: number;
  macroR: number;
  macroF1: number;
  weightedF1: number;
  top2: number;
  perClass: ClassMetrics[];
  confusion: number[][];
}

export interface ReliabilityBin {
  conf: number;
  acc: number;
  count: number;
}

export interface CalibrationStats {
  ece: number;
  brier: number;
  nll: number;
  bins: ReliabilityBin[];
}

export function softmax(z: number[], T = 1): number[] {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp((v - m) / T));
  const s = e.reduce((a, v) => a + v, 0);
  return e.map((v) => v / s);
}

/** Macro averages are over classes present in the evaluated split (support > 0). */
export function evaluate(probs: number[][], y: number[], C = 8): ModelMetrics {
  const confusion = Array.from({ length: C }, () => new Array(C).fill(0));
  let correct = 0;
  let top2 = 0;
  probs.forEach((p, i) => {
    const order = p.map((v, j) => [v, j]).sort((a, b) => b[0] - a[0]);
    const pred = order[0][1];
    confusion[y[i]][pred]++;
    if (pred === y[i]) correct++;
    if (pred === y[i] || order[1][1] === y[i]) top2++;
  });
  const perClass = confusion.map((row, c) => {
    const tp = row[c];
    const support = row.reduce((a, v) => a + v, 0);
    const predicted = confusion.reduce((a, r) => a + r[c], 0);
    const precision = predicted ? tp / predicted : 0;
    const recall = support ? tp / support : 0;
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    return { precision, recall, f1, support };
  });
  const present = perClass.filter((c) => c.support > 0);
  const mean = (k: keyof ClassMetrics) => present.reduce((a, c) => a + c[k], 0) / (present.length || 1);
  const n = y.length;
  return {
    n,
    accuracy: correct / n,
    macroP: mean('precision'),
    macroR: mean('recall'),
    macroF1: mean('f1'),
    weightedF1: perClass.reduce((a, c) => a + c.f1 * c.support, 0) / n,
    top2: top2 / n,
    perClass,
    confusion
  };
}

export function calibration(probs: number[][], y: number[], nBins = 10): CalibrationStats {
  const acc = Array.from({ length: nBins }, () => ({ conf: 0, acc: 0, count: 0 }));
  let brier = 0;
  let nll = 0;
  probs.forEach((p, i) => {
    const conf = Math.max(...p);
    const pred = p.indexOf(conf);
    const b = Math.min(nBins - 1, Math.floor(conf * nBins));
    acc[b].conf += conf;
    acc[b].acc += pred === y[i] ? 1 : 0;
    acc[b].count++;
    brier += p.reduce((a, v, c) => a + (v - (c === y[i] ? 1 : 0)) ** 2, 0);
    nll -= Math.log(Math.max(p[y[i]], 1e-12));
  });
  const n = y.length;
  const bins = acc.map((b) => b.count ? { conf: b.conf / b.count, acc: b.acc / b.count, count: b.count } : { conf: 0, acc: 0, count: 0 });
  const ece = bins.reduce((a, b) => a + Math.abs(b.acc - b.conf) * b.count / n, 0);
  return { ece, brier: brier / n, nll: nll / n, bins };
}

/** Temperature scaling: grid search on validation NLL only (never test). */
export function fitTemperature(logits: number[][], y: number[]): number {
  let best = 1;
  let bestNll = Infinity;
  for (let T = 0.5; T <= 4.001; T += 0.05) {
    const nll = logits.reduce((a, z, i) => a - Math.log(Math.max(softmax(z, T)[y[i]], 1e-12)), 0);
    if (nll < bestNll) {
      bestNll = nll;
      best = T;
    }
  }
  return Math.round(best * 100) / 100;
}

export function meanStd(values: number[]): {mean: number;std: number;} {
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length);
  return { mean, std };
}