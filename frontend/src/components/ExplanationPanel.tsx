import React from 'react';
import type { HostUpdate } from '../types/attackcast';
import { Panel } from './Panel';
import { Tag } from './Tag';

export function ExplanationPanel({ host }: {host: HostUpdate;}) {
  const top_features = host?.explanation?.top_features || [];
  const attention = host?.explanation?.attention || [];
  const text = host?.explanation?.text || '';
  const maxAbs = Math.max(...top_features.map((f) => Math.abs(f.shap || 0)), 0.01);
  const maxAtt = Math.max(...(attention.length ? attention : [1]), 0.01);

  return (
    <Panel title="Why this forecast" aside={<Tag tone="mock">attribution</Tag>}>
      <p className="mb-5 text-sm leading-relaxed text-fg">{text || 'Traffic feature profile consistent with state classification rules.'}</p>
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
          <h3 className="mb-2 text-xs text-muted">Feature contribution toward {host?.current_state?.name || 'Current Stage'}</h3>
          <ul className="space-y-1.5">
            {top_features.map((f, idx) => {
              const shapVal = f.shap || 0;
              const w = Math.abs(shapVal) / maxAbs * 50;
              const pos = shapVal >= 0;
              return (
                <li key={f.feature || idx} className="grid grid-cols-[minmax(0,10rem)_1fr_3.5rem] items-center gap-2">
                  <span className="truncate font-mono text-xs text-fg" title={`${f.feature} = ${f.value}`}>{f.feature}</span>
                  <div className="relative h-3">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
                    <div
                      className={`absolute inset-y-0 rounded-sm ${pos ? 'left-1/2 bg-crit/80' : 'bg-accent/70'}`}
                      style={pos ? { width: `${w}%` } : { width: `${w}%`, right: '50%' }} />
                    
                  </div>
                  <span className={`text-right font-mono text-xs ${pos ? 'text-crit' : 'text-accent'}`}>
                    {pos ? '+' : ''}{shapVal.toFixed(2)}
                  </span>
                </li>);

            })}
          </ul>
        </div>
        <div className="md:col-span-2">
          <h3 className="mb-2 text-xs text-muted">Attention over last {attention.length} windows</h3>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.max(1, attention.length)}, minmax(0, 1fr))` }}>
            {attention.map((a, i) =>
            <div
              key={i}
              title={`t−${attention.length - 1 - i}: ${a.toFixed(3)}`}
              className="h-8 rounded-sm bg-accent"
              style={{ opacity: 0.12 + a / maxAtt * 0.88 }} />

            )}
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-subtle">
            <span>t−{Math.max(0, attention.length - 1)}</span>
            <span>t</span>
          </div>
        </div>
      </div>
    </Panel>);

}