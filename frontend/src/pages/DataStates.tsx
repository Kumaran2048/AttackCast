import React, { useEffect, useMemo, useState } from 'react';
import { MatrixGrid } from '../components/MatrixGrid';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import { COLUMN_AVAILABILITY, HEURISTIC_RULES, LIMITATIONS, STATE_RATIONALE } from '../data/dataCatalog';
import { STATES, TRANSITION_PRIOR } from '../data/stateMap';
import { markov } from '../utils/models';
import { generateDataset, SPLITS, toSamples } from '../utils/synthDataset';
import { usePcapAnalysis } from '../contexts/PcapAnalysisContext';

const AVAIL_CLASS = { yes: 'text-ok', no: 'text-crit', derived: 'text-accent', verify: 'text-warn' } as const;
const CONF_TONE = { high: 'neutral', medium: 'accent', heuristic: 'heuristic' } as const;

export function DataStates() {
  const { analysis: pcapAnalysis } = usePcapAnalysis();
  const [stats, setStats] = useState<{ counts: any[]; estimated: number[][] } | null>(null);

  useEffect(() => {
    let active = true;
    window.setTimeout(() => {
      const seqs = generateDataset(2026);
      const counts = SPLITS.map((sp) => {
        const c = new Array(8).fill(0);
        toSamples(seqs.filter((s) => s.split === sp)).forEach((s) => c[s.y]++);
        return { split: sp, seqs: seqs.filter((s) => s.split === sp).length, counts: c, total: c.reduce((a, v) => a + v, 0) };
      });
      const estimated = markov(seqs.filter((s) => s.split === 'train')).matrix;
      if (active) setStats({ counts, estimated });
    }, 50);
    return () => { active = false; };
  }, []);

  const pcapStats = useMemo(() => {
    if (!pcapAnalysis) return null;
    const windows = pcapAnalysis.windows;
    const hosts = [...new Set(windows.map((w) => w.host))];
    const stateCounts = new Array(8).fill(0);
    windows.forEach((w) => { stateCounts[w.state] = (stateCounts[w.state] || 0) + 1; });
    const matrix: number[][] = Array.from({ length: 8 }, () => new Array(8).fill(0));
    hosts.forEach((host) => {
      const hw = windows.filter((w) => w.host === host).sort((a, b) => a.index - b.index);
      for (let i = 0; i < hw.length - 1; i++) { matrix[hw[i].state][hw[i + 1].state]++; }
    });
    const normalized = matrix.map((row) => {
      const sum = row.reduce((a, v) => a + v, 0);
      return sum > 0 ? row.map((v) => v / sum) : row;
    });
    return { hosts, windows, stateCounts, matrix: normalized };
  }, [pcapAnalysis]);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-fg">Data and states</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">How traffic windows map to ATT&CK stages, which columns each source provides, and what the current data can and can't support.</p>
      </header>

      {pcapStats && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs text-fg">
          <span className="font-semibold text-accent">📡 Active source:</span>
          <span className="font-mono text-fg">{pcapAnalysis!.name}</span>
          <Tag tone={pcapAnalysis!.synthetic ? 'synthetic' : 'real'}>{pcapAnalysis!.synthetic ? 'synthetic sample' : 'your PCAP'}</Tag>
          <span className="ml-auto text-subtle">{pcapStats.windows.length} windows · {pcapStats.hosts.length} hosts</span>
        </div>
      )}
      <Panel title="ATT&CK state map">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr>
                <th className="pb-2 font-normal">State</th>
                <th className="pb-2 font-normal">Tactic</th>
                <th className="pb-2 font-normal">Technique</th>
                <th className="pb-2 font-normal">Source label</th>
                <th className="pb-2 font-normal">Rationale</th>
                <th className="pb-2 text-right font-normal">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {STATES.map((s) =>
              <tr key={s.id}>
                  <td className="py-2.5 pr-3">
                    <span className="flex items-center gap-2 text-fg">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
                      {s.name}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 text-muted">{s.tactic} <span className="font-mono text-xs text-subtle">{s.attackId}</span></td>
                  <td className="py-2.5 pr-3 font-mono text-xs text-muted">{s.technique}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted">{STATE_RATIONALE[s.id].sourceLabel}</td>
                  <td className="py-2.5 pr-3 text-xs text-muted">{STATE_RATIONALE[s.id].rationale}</td>
                  <td className="py-2.5 text-right"><Tag tone={CONF_TONE[s.confidence]}>{s.confidence}</Tag></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
          {HEURISTIC_RULES.map((r) =>
          <li key={r.state} className="text-xs text-muted"><span className="text-warn">{r.state}:</span> {r.rule}</li>
          )}
        </ul>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Transition prior" aside={<span className="text-xs text-subtle">configured</span>}>
          <MatrixGrid matrix={TRANSITION_PRIOR} rowLabel="from" colLabel="to" />
        </Panel>
        {pcapStats ? (
          <Panel title="Markov chain from your PCAP" aside={<Tag tone="real">{pcapAnalysis!.name}</Tag>}>
            <MatrixGrid matrix={pcapStats.matrix} rowLabel="from" colLabel="to" />
          </Panel>
        ) : (
          <Panel title="Markov chain estimated from train" aside={<Tag tone="real">real benchmark · seed 2026</Tag>}>
            {stats ? (
              <MatrixGrid matrix={stats.estimated} rowLabel="from" colLabel="to" />
            ) : (
              <div className="flex h-32 items-center justify-center text-sm text-subtle">Computing baseline stats...</div>
            )}
          </Panel>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {pcapStats ? (
          <Panel title="Window distribution by ATT&CK stage" aside={<Tag tone={pcapAnalysis!.synthetic ? 'synthetic' : 'real'}>{pcapAnalysis!.name}</Tag>}>
            <div className="overflow-x-auto">
              <table className="w-full text-right font-mono text-xs">
                <thead className="text-subtle">
                  <tr>
                    <th className="pb-2 text-left font-sans font-normal">Stage</th>
                    <th className="pb-2 font-normal">Windows</th>
                    <th className="pb-2 font-normal">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {STATES.map((s, i) => {
                    const count = pcapStats.stateCounts[i] || 0;
                    const pct = pcapStats.windows.length > 0 ? ((count / pcapStats.windows.length) * 100).toFixed(1) : '0.0';
                    return (
                      <tr key={s.id}>
                        <td className="py-2 text-left font-sans">
                          <span className="flex items-center gap-2 text-muted">
                            <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: s.color }} aria-hidden />
                            {s.name}
                          </span>
                        </td>
                        <td className={`py-2 ${count === 0 ? 'text-subtle' : 'text-fg'}`}>{count}</td>
                        <td className="py-2 text-subtle">{pct}%</td>
                      </tr>
                    );
                  })}
                  <tr className="border-t border-line">
                    <td className="py-2 text-left font-sans font-semibold text-fg">Total</td>
                    <td className="py-2 font-semibold text-fg">{pcapStats.windows.length}</td>
                    <td className="py-2 text-subtle">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-subtle">Stage classification via heuristic rules on 30s windows per host.</p>
          </Panel>
        ) : (
          <Panel title="Dataset stats · next-state targets" aside={<Tag tone="real">CICIDS-2017/2018 + CTU-13</Tag>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-right font-mono text-xs">
                <thead className="text-subtle">
                  <tr>
                    <th className="pb-2 text-left font-sans font-normal">Split</th>
                    {STATES.map((s) => <th key={s.id} className="pb-2 font-normal">{s.short}</th>)}
                    <th className="pb-2 font-normal">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {stats ? stats.counts.map((c) =>
                  <tr key={c.split}>
                      <td className="py-2 text-left font-sans text-muted">{c.split} <span className="text-subtle">· {c.seqs} seq</span></td>
                      {c.counts.map((v: number, i: number) => <td key={i} className={`py-2 ${v === 0 ? 'text-crit' : 'text-fg'}`}>{v}</td>)}
                      <td className="py-2 text-fg">{c.total}</td>
                    </tr>
                  ) : (
                    <tr><td colSpan={10} className="py-8 text-center text-subtle">Loading stats...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-subtle">Split by whole sequence (scenario-held-out), no windows shared across splits. Zero counts show in red.</p>
          </Panel>
        )}

        <Panel title="Canonical column availability" aside={<span className="text-xs text-subtle">expected · verify in Phase 1</span>}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr><th className="pb-2 font-normal">Column</th><th className="pb-2 font-normal">CIC-IDS-2018</th><th className="pb-2 font-normal">CTU-13</th><th className="pb-2 font-normal">PCAP</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COLUMN_AVAILABILITY.map((c) =>
              <tr key={c.column}>
                  <td className="py-1.5 font-mono text-xs text-fg">{c.column}</td>
                  {(['cic', 'ctu', 'pcap'] as const).map((k) => <td key={k} className={`py-1.5 text-xs ${AVAIL_CLASS[c[k]]}`}>{c[k]}</td>)}
                </tr>
              )}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-subtle">If CIC-IDS-2018 CSVs lack IPs (Branch B), host sequences and the host graph come from CTU-13 only.</p>
        </Panel>
      </div>

      <Panel title="Limitations">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-subtle">
          {LIMITATIONS.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </Panel>
    </div>);

}