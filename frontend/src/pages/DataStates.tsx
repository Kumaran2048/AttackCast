import React, { useMemo } from 'react';
import { MatrixGrid } from '../components/MatrixGrid';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import { COLUMN_AVAILABILITY, HEURISTIC_RULES, LIMITATIONS, STATE_RATIONALE } from '../data/dataCatalog';
import { STATES, TRANSITION_PRIOR } from '../data/stateMap';
import { markov } from '../utils/models';
import { generateDataset, SPLITS, toSamples } from '../utils/synthDataset';

const AVAIL_CLASS = { yes: 'text-ok', no: 'text-crit', derived: 'text-accent', verify: 'text-warn' } as const;
const CONF_TONE = { high: 'neutral', medium: 'accent', heuristic: 'heuristic' } as const;

export function DataStates() {
  const stats = useMemo(() => {
    const seqs = generateDataset(2026);
    const counts = SPLITS.map((sp) => {
      const c = new Array(8).fill(0);
      toSamples(seqs.filter((s) => s.split === sp)).forEach((s) => c[s.y]++);
      return { split: sp, seqs: seqs.filter((s) => s.split === sp).length, counts: c, total: c.reduce((a, v) => a + v, 0) };
    });
    return { counts, estimated: markov(seqs.filter((s) => s.split === 'train')).matrix };
  }, []);

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-fg">Data and states</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">How traffic windows map to ATT&CK stages, which columns each source provides, and what the current data can and can't support.</p>
      </header>

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
        <Panel title="Markov chain estimated from train" aside={<Tag tone="real">real benchmark · seed 2026</Tag>}>
          <MatrixGrid matrix={stats.estimated} rowLabel="from" colLabel="to" />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
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
                {stats.counts.map((c) =>
                <tr key={c.split}>
                    <td className="py-2 text-left font-sans text-muted">{c.split} <span className="text-subtle">· {c.seqs} seq</span></td>
                    {c.counts.map((v, i) => <td key={i} className={`py-2 ${v === 0 ? 'text-crit' : 'text-fg'}`}>{v}</td>)}
                    <td className="py-2 text-fg">{c.total}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-subtle">Split by whole sequence (scenario-held-out), no windows shared across splits. Zero counts show in red.</p>
        </Panel>

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