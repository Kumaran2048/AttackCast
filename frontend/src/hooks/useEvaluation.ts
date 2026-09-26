import { useCallback, useEffect, useState } from 'react';
import { EVAL_SEEDS, runEvaluation, type EvalReport } from '../utils/evaluation';

type Status = 'running' | 'done' | 'error';

// Evaluation state lives at module level so switching pages doesn't recompute.
let cache: EvalReport[] | null = null;

function getInitialReports(): EvalReport[] {
  return cache || [];
}

export function useEvaluation() {
  const initial = getInitialReports();
  const [status, setStatus] = useState<Status>(initial.length > 0 ? 'done' : 'running');
  const [reports, setReports] = useState<EvalReport[]>(initial);
  const [progress, setProgress] = useState(initial.length);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(() => {
    setStatus('running');
    setProgress(0);
    setError(null);
    const out: EvalReport[] = [];
    const next = (i: number) => {
      if (i >= EVAL_SEEDS.length) {
        cache = out;
        setReports(out);
        setStatus('done');
        return;
      }
      window.setTimeout(() => {
        try {
          out.push(runEvaluation(EVAL_SEEDS[i]));
          setProgress(i + 1);
          next(i + 1);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Evaluation failed');
          setStatus('error');
        }
      }, 10);
    };
    next(0);
  }, []);

  useEffect(() => {
    if (!cache && reports.length === 0) run();
  }, [reports.length, run]);

  return { status, reports, progress, total: EVAL_SEEDS.length, error, run };
}