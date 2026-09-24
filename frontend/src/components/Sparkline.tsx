import React from 'react';

interface Series {
  values: number[];
  className: string;
  dashed?: boolean;
  label: string;
}

export function Sparkline({ series, height = 56 }: {series: Series[];height?: number;}) {
  const n = Math.max(...series.map((s) => s.values.length), 2);
  const W = 240;
  const toPath = (vals: number[]) =>
  vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / (n - 1) * W).toFixed(1)},${(height - 4 - v * (height - 8)).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="h-14 w-full" role="img" aria-label={series.map((s) => s.label).join(' vs ')}>
      <line x1={0} x2={W} y1={height - 4} y2={height - 4} className="stroke-line" strokeWidth={1} />
      {series.map((s) =>
      s.values.length > 1 ?
      <path key={s.label} d={toPath(s.values)} fill="none" strokeWidth={1.75} strokeDasharray={s.dashed ? '3 3' : undefined} className={s.className} vectorEffect="non-scaling-stroke" /> :
      null
      )}
    </svg>);

}