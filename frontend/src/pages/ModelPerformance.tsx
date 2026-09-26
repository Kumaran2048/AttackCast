import React, { useEffect, useState } from 'react';
import { CheckCircle2Icon, LoaderCircleIcon, RefreshCwIcon } from 'lucide-react';
import { BaselineTable } from '../components/BaselineTable';
import { MatrixGrid } from '../components/MatrixGrid';
import { Panel } from '../components/Panel';
import { ReliabilityChart } from '../components/ReliabilityChart';
import { Tag } from '../components/Tag';
import { STATES } from '../data/stateMap';
import { useEvaluation } from '../hooks/useEvaluation';
import { EVAL_SEEDS, type EvalReport } from '../utils/evaluation';
import { meanStd } from '../utils/metrics';
import { pct } from '../utils/mockStream';
import { fetchMetrics } from '../utils/apiConfig';

export function ModelPerformance() {
  const { status, reports, progress, total, error, run } = useEvaluation();
  const [backendMetrics, setBackendMetrics] = useState<any>(null);

  useEffect(() => {
    fetchMetrics().then((data) => {
      if (data && data.status !== 'not-generated') {
        setBackendMetrics(data);
      }
    });
  }, []);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Model performance</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Evaluated on temporal benchmark split across canonical attack flows. Temporal split — seeds {EVAL_SEEDS.join(', ')}.
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={status === 'running'}
          className="flex items-center gap-2 self-start rounded-md border border-line bg-raised px-3 py-2 text-sm text-fg transition-colors duration-150 hover:bg-line disabled:opacity-50">
          
          <RefreshCwIcon className="h-4 w-4" aria-hidden /> Re-run evaluation
        </button>
      </header>

      {backendMetrics && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/5 p-4 text-xs text-fg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2Icon className="h-4 w-4 text-accent shrink-0" />
            <span>
              <strong>Backend Metrics Active:</strong> {backendMetrics.n_test_samples?.toLocaleString()} held-out test samples evaluated on FastAPI inference server.
            </span>
          </div>
          {backendMetrics.models?.gru_world_model?.macro_f1 && (
            <span className="font-mono text-accent">GRU Macro F1: {backendMetrics.models.gru_world_model.macro_f1}</span>
          )}
        </div>
      )}

      {status === 'running' &&
      <div role="status" className="flex items-center gap-3 rounded-lg border border-line bg-surface p-6 text-sm text-muted">
          <LoaderCircleIcon className="h-5 w-5 animate-spin text-accent" aria-hidden />
          Training and evaluating · seed {Math.min(progress + 1, total)} of {total}
        </div>
      }
      {status === 'error' &&
      <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 p-4 text-sm text-crit">Evaluation failed: {error}</div>
      }
      {status === 'done' && reports.length > 0 && <Results reports={reports} />}
    </div>);

}

function Results({ reports }: {reports: EvalReport[];}) {
  const r0 = reports[0];
  const ms = (f: (r: EvalReport) => number) => meanStd(reports.map(f));
  const perClassF1 = STATES.map((s) => ms((r) => r.lr.perClass[s.id].f1));
  const weak = STATES.filter((s) => perClassF1[s.id].mean < 0.3 && r0.lr.perClass[s.id].support > 0);
  const leads = reports.flatMap((r) => r.lead.leads);
  const maxLead = Math.max(1, ...leads);
  const leadBins = Array.from({ length: maxLead }, (_, i) => leads.filter((l) => l === i + 1).length);
  const maxBin = Math.max(1, ...leadBins);
  const { feedback: fb, campaign: cp } = r0;

  return (
    <>
      <Panel title="Next-state prediction · baseline comparison" aside={<Tag tone="real">real dataset · mean ± std, 3 seeds</Tag>}>
        <BaselineTable reports={reports} />
        <p className="mt-3 text-xs text-subtle">
          Test samples per seed: {r0.lr.n} ({r0.sequences.test} held-out sequences). Macro averages over classes present in test.
        </p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Confusion matrix · logistic regression" aside={<span className="font-mono text-xs text-subtle">seed {r0.seed}</span>}>
          <MatrixGrid matrix={r0.lr.confusion} shade="row" format={(v) => String(v)} rowLabel="true" colLabel="predicted" />
          <h3 className="mb-2 mt-4 text-xs text-muted">Per-class F1 (mean over seeds)</h3>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
            {STATES.map((s) =>
            <li key={s.id} className="flex justify-between font-mono text-xs">
                <span className="text-muted">{s.short}</span>
                <span className={perClassF1[s.id].mean < 0.3 ? 'text-warn' : 'text-fg'}>{perClassF1[s.id].mean.toFixed(2)}</span>
              </li>
            )}
          </ul>
        </Panel>

        <Panel title="Calibration · temperature scaling" aside={<span className="font-mono text-xs text-subtle">T fit on validation</span>}>
          <div className="grid gap-5 sm:grid-cols-2">
            <ReliabilityChart before={r0.calibration.before.bins} after={r0.calibration.after.bins} />
            <dl className="space-y-3 text-sm">
              <Stat label="Temperature" value={ms((r) => r.calibration.T)} digits={2} />
              <BeforeAfter label="ECE" before={ms((r) => r.calibration.before.ece)} after={ms((r) => r.calibration.after.ece)} />
              <BeforeAfter label="Brier" before={ms((r) => r.calibration.before.brier)} after={ms((r) => r.calibration.after.brier)} />
              <BeforeAfter label="Log-loss" before={ms((r) => r.calibration.before.nll)} after={ms((r) => r.calibration.after.nll)} />
            </dl>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="K-step forecast · prior rollout" aside={<Tag tone="real">real benchmark</Tag>}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr><th className="pb-2 font-normal">Horizon</th><th className="pb-2 text-right font-normal">Macro F1</th><th className="pb-2 text-right font-normal">Brier</th><th className="pb-2 text-right font-normal">n</th></tr>
            </thead>
            <tbody className="divide-y divide-line font-mono text-xs">
              {r0.perHorizon.map((h, i) =>
              <tr key={h.k}>
                  <td className="py-2 text-muted">k={h.k}</td>
                  <td className="py-2 text-right text-fg">{ms((r) => r.perHorizon[i].macroF1).mean.toFixed(3)}</td>
                  <td className="py-2 text-right text-fg">{ms((r) => r.perHorizon[i].brier).mean.toFixed(3)}</td>
                  <td className="py-2 text-right text-subtle">{h.n}</td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="Early warning · lead time">
          <div className="mb-4 grid grid-cols-3 gap-4">
            <Big value={`${reports.reduce((a, r) => a + r.lead.detected, 0)}/${reports.reduce((a, r) => a + r.lead.reached, 0)}`} label="attacks warned before Lateral/Exfil/Impact" />
            <Big value={leads.length ? (leads.reduce((a, v) => a + v, 0) / leads.length).toFixed(1) : '—'} label="mean lead (windows)" />
            <Big value={ms((r) => r.lead.falseAlarmsPerHour).mean.toFixed(1)} label="false alarms / hour" />
          </div>
          <div className="flex h-24 items-end gap-1" role="img" aria-label="Lead time histogram">
            {leadBins.map((c, i) =>
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-sm bg-accent/80" style={{ height: `${c / maxBin * 80}px` }} title={`${c} attacks warned ${i + 1} windows ahead`} />
                <span className="font-mono text-[10px] text-subtle">{i + 1}</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-[11px] text-subtle">Windows of warning (30s each) before the first Lateral/Exfil/Impact window, test sequences, all seeds.</p>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Extra A · campaign detection" aside={<Tag tone="real">CTU-13 correlated</Tag>}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr><th className="pb-2 font-normal">View</th><th className="pb-2 text-right font-normal">Detection rate</th><th className="pb-2 text-right font-normal">False-positive rate</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              <tr><td className="py-2 text-muted">Single-host only</td><td className="py-2 text-right font-mono text-xs text-fg">{pct(cp.solo.detected / cp.activeWindows)}</td><td className="py-2 text-right font-mono text-xs text-fg">{pct(cp.solo.falsePos / cp.quietWindows)}</td></tr>
              <tr><td className="py-2 text-fg">Correlated (campaign score)</td><td className="py-2 text-right font-mono text-xs text-accent">{pct(cp.correlated.detected / cp.activeWindows)}</td><td className="py-2 text-right font-mono text-xs text-fg">{pct(cp.correlated.falsePos / cp.quietWindows)}</td></tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-subtle">
            {cp.activeWindows} active campaign windows, {cp.quietWindows} benign-only windows in the CTU-13 coordinated scenario. Correlated graph score vs single-host baseline — confirms the campaign detection pipeline.
          </p>
        </Panel>

        <Panel title="Extra B · scripted feedback session" aside={<span className="font-mono text-xs text-subtle">{fb.events} dismissals</span>}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted">First half · analyst dismisses alerts</p>
              <p className="mt-1 font-mono text-2xl text-fg">{fb.firstHalf.adjFa}<span className="text-sm text-subtle">/{fb.firstHalf.windows}</span></p>
              <p className="text-xs text-subtle">false alarms</p>
            </div>
            <div>
              <p className="text-xs text-muted">Second half · no clicks</p>
              <p className="mt-1 font-mono text-2xl text-accent">{fb.secondHalf.adjFa}<span className="text-sm text-subtle">/{fb.secondHalf.windows}</span></p>
              <p className="text-xs text-subtle">false alarms (would be {fb.secondHalf.baseFa} without feedback)</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-subtle">Benign control scenario, same rule as the Live Monitor buttons. Session-only; the base model is untouched.</p>
        </Panel>
      </div>

      <Panel title="Notes & coverage">
        <ul className="space-y-2 text-sm">
          {weak.length > 0 && <li className="text-warn">Weak classes for logistic regression (F1 &lt; 0.30): {weak.map((s) => s.name).join(', ')} — under-represented in CICIDS-2017 labelling.</li>}
          <li className="text-muted">GRU world model rows shown when PyTorch training artifacts are present. Run <code className="text-accent">python -m backend.ml.models.train</code> to generate.</li>
          <li className="text-muted">Cross-dataset (train CIC-IDS-2018 → test CTU-13): run <code className="text-accent">python backend/ml/eval/crossdataset.py</code> after ingesting both datasets.</li>
          <li className="text-muted">Evaluation sequences are derived from 2,520,751 real benchmark flows mapped to 8 MITRE ATT&amp;CK stages.</li>
        </ul>
      </Panel>
    </>);

}

function Stat({ label, value, digits = 3 }: {label: string;value: {mean: number;std: number;};digits?: number;}) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-fg">{value.mean.toFixed(digits)} <span className="text-xs text-subtle">±{value.std.toFixed(digits)}</span></dd>
    </div>);

}

function BeforeAfter({ label, before, after }: {label: string;before: {mean: number;};after: {mean: number;};}) {
  const better = after.mean <= before.mean;
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-mono text-sm">
        <span className="text-subtle">{before.mean.toFixed(3)}</span>
        <span className="text-subtle"> → </span>
        <span className={better ? 'text-ok' : 'text-warn'}>{after.mean.toFixed(3)}</span>
      </dd>
    </div>);

}

function Big({ value, label }: {value: string;label: string;}) {
  return (
    <div>
      <p className="font-mono text-2xl text-fg">{value}</p>
      <p className="text-xs leading-snug text-muted">{label}</p>
    </div>);

}