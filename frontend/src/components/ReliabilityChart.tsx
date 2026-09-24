import React from 'react';
import type { ReliabilityBin } from '../utils/metrics';

const S = 220;
const P = 28;

export function ReliabilityChart({ before, after }: {before: ReliabilityBin[];after: ReliabilityBin[];}) {
  const x = (v: number) => P + v * (S - P - 8);
  const y = (v: number) => S - P - v * (S - P - 8);
  const line = (bins: ReliabilityBin[]) =>
  bins.
  filter((b) => b.count > 0).
  map((b, i) => `${i === 0 ? 'M' : 'L'}${x(b.conf).toFixed(1)},${y(b.acc).toFixed(1)}`).
  join(' ');

  return (
    <figure>
      <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full max-w-[260px]" role="img" aria-label="Reliability diagram before and after temperature scaling">
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(0)} className="stroke-line" />
        <line x1={x(0)} y1={y(0)} x2={x(0)} y2={y(1)} className="stroke-line" />
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} className="stroke-subtle" strokeDasharray="3 3" />
        <path d={line(before)} fill="none" className="stroke-subtle" strokeWidth={1.5} />
        <path d={line(after)} fill="none" className="stroke-accent" strokeWidth={2} />
        {after.filter((b) => b.count > 0).map((b, i) =>
        <circle key={i} cx={x(b.conf)} cy={y(b.acc)} r={2.5} className="fill-accent" />
        )}
        {[0, 0.5, 1].map((v) =>
        <g key={v}>
            <text x={x(v)} y={S - 10} textAnchor="middle" className="fill-subtle font-mono" fontSize={9}>{v}</text>
            <text x={P - 6} y={y(v) + 3} textAnchor="end" className="fill-subtle font-mono" fontSize={9}>{v}</text>
          </g>
        )}
      </svg>
      <figcaption className="mt-1 flex gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-subtle" aria-hidden />before</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" aria-hidden />after scaling</span>
        <span>x: confidence · y: accuracy</span>
      </figcaption>
    </figure>);

}