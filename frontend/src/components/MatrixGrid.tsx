import React from 'react';
import { STATES } from '../data/stateMap';

interface MatrixGridProps {
  matrix: number[][];
  /** 'row' shades by row-normalised value (confusion), 'raw' by the value itself (probabilities). */
  shade?: 'row' | 'raw';
  format?: (v: number) => string;
  rowLabel: string;
  colLabel: string;
}

export function MatrixGrid({ matrix, shade = 'raw', format = (v) => v.toFixed(2), rowLabel, colLabel }: MatrixGridProps) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-1 pl-12 text-[11px] text-subtle">{colLabel} →</p>
      <table className="border-separate" style={{ borderSpacing: 2 }}>
        <thead>
          <tr>
            <th className="w-10 text-left text-[10px] font-normal text-subtle">{rowLabel} ↓</th>
            {STATES.map((s) =>
            <th key={s.id} scope="col" className="w-11 text-center font-mono text-[10px] font-normal text-subtle">{s.short}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => {
            const sum = row.reduce((a, v) => a + v, 0) || 1;
            return (
              <tr key={i}>
                <th scope="row" className="text-left font-mono text-[10px] font-normal text-subtle">{STATES[i].short}</th>
                {row.map((v, j) => {
                  const intensity = shade === 'row' ? v / sum : v;
                  return (
                    <td
                      key={j}
                      title={`${STATES[i].name} → ${STATES[j].name}: ${format(v)}`}
                      className={`h-9 w-11 rounded-sm text-center font-mono text-[10px] ${intensity > 0.55 ? 'text-bg' : 'text-fg'} ${i === j ? 'outline outline-1 outline-line' : ''}`}
                      style={{ backgroundColor: `rgb(var(--accent) / ${Math.max(0.04, intensity).toFixed(2)})` }}>
                      
                      {format(v)}
                    </td>);

                })}
              </tr>);

          })}
        </tbody>
      </table>
    </div>);

}