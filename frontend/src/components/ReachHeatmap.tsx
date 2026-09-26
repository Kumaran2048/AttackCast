import React from 'react';
import { STATES } from '../data/stateMap';
import type { Horizon } from '../types/attackcast';

function alphaHex(p: number): string {
  return Math.round(Math.max(0.04, p) * 255).toString(16).padStart(2, '0');
}

function getProb(probs: any, s: { id: number; name: string }): number {
  if (!probs) return 0;
  if (Array.isArray(probs)) return typeof probs[s.id] === 'number' ? probs[s.id] : 0;
  if (typeof probs === 'object') {
    if (typeof probs[s.name] === 'number') return probs[s.name];
    if (typeof probs[s.id] === 'number') return probs[s.id];
  }
  return 0;
}

/** Stages × horizons grid of P(reach stage within k windows). */
export function ReachHeatmap({ horizons, compact = false }: {horizons: Horizon[];compact?: boolean;}) {
  const list = horizons || [];
  const rows = STATES.filter((s) => s.id !== 0);
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-separate ${compact ? 'min-w-[300px]' : 'min-w-[420px]'}`} style={{ borderSpacing: 3 }}>
        <thead>
          <tr>
            <th className={`${compact ? 'w-32' : 'w-44'} text-left text-xs font-normal text-subtle`}>Stage</th>
            {list.map((h) =>
            <th key={h.k} scope="col" className="text-center font-mono text-xs font-normal text-subtle">k={h.k}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) =>
          <tr key={s.id}>
              <th scope="row" className="whitespace-nowrap text-left text-xs font-normal">
                <span className="text-fg">{compact ? s.short : s.name}</span>
                {!compact && <span className="ml-1.5 font-mono text-[10px] text-subtle">{s.attackId}</span>}
              </th>
              {list.map((h) => {
              const p = getProb(h.reach_probs, s);
              return (
                <td
                  key={h.k}
                  className={`h-8 rounded text-center font-mono text-xs ${p > 0.6 ? 'text-bg' : 'text-fg'}`}
                  style={{ backgroundColor: `${s.color}${alphaHex(p)}` }}>
                  
                    {Math.round(p * 100)}
                  </td>);

            })}
            </tr>
          )}
        </tbody>
      </table>
    </div>);

}