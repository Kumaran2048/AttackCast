import React from 'react';
import type { EvalReport } from '../utils/evaluation';
import { meanStd } from '../utils/metrics';
import { Tag } from './Tag';

const COLS: {key: 'accuracy' | 'macroP' | 'macroR' | 'macroF1' | 'weightedF1' | 'top2';label: string;}[] = [
{ key: 'accuracy', label: 'Accuracy' },
{ key: 'macroP', label: 'Macro P' },
{ key: 'macroR', label: 'Macro R' },
{ key: 'macroF1', label: 'Macro F1' },
{ key: 'weightedF1', label: 'Weighted F1' },
{ key: 'top2', label: 'Top-2' }];


export function BaselineTable({ reports }: {reports: EvalReport[];}) {
  const names = reports[0].rows.map((r) => r.name);
  const bestF1 = Math.max(
    ...names.map((_, i) => meanStd(reports.map((rep) => rep.rows[i].metrics?.macroF1 ?? 0)).mean).filter((_, i) => reports[0].rows[i].name !== 'Prior rollout (mock engine)')
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="text-xs text-subtle">
          <tr>
            <th className="pb-2 font-normal">Model</th>
            {COLS.map((c) => <th key={c.key} className="pb-2 text-right font-normal">{c.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {names.map((name, i) => {
            const row = reports[0].rows[i];
            if (row.status === 'pending') {
              return (
                <tr key={name}>
                  <td className="py-3">
                    <p className="text-muted">{name}</p>
                    <p className="text-xs text-subtle">{row.note}</p>
                  </td>
                  <td colSpan={COLS.length} className="py-3 text-right"><Tag tone="heuristic">not trained yet</Tag></td>
                </tr>);

            }
            return (
              <tr key={name}>
                <td className="py-3">
                  <p className="text-fg">{name}</p>
                  <p className="text-xs text-subtle">{row.note}</p>
                </td>
                {COLS.map((c) => {
                  const { mean, std } = meanStd(reports.map((rep) => rep.rows[i].metrics![c.key]));
                  const highlight = c.key === 'macroF1' && Math.abs(mean - bestF1) < 1e-9;
                  return (
                    <td key={c.key} className={`py-3 text-right font-mono text-xs ${highlight ? 'text-accent' : 'text-fg'}`}>
                      {mean.toFixed(3)}
                      <span className="text-subtle"> ±{std.toFixed(3)}</span>
                    </td>);

                })}
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}