import React from 'react';

type Tone = 'neutral' | 'mock' | 'synthetic' | 'heuristic' | 'accent' | 'real' | 'benchmark';

const TONES: Record<Tone, string> = {
  neutral: 'border-line text-muted',
  mock: 'border-accent/40 bg-accent/10 text-accent',
  synthetic: 'border-accent/40 bg-accent/10 text-accent',
  heuristic: 'border-warn/40 bg-warn/10 text-warn',
  accent: 'border-accent/40 text-accent',
  real: 'border-ok/40 bg-ok/10 text-ok',
  benchmark: 'border-accent/40 bg-accent/10 text-accent',
};

export function Tag({ tone = 'neutral', children }: {tone?: Tone;children: React.ReactNode;}) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${TONES[tone]}`}>
      {children}
    </span>);

}