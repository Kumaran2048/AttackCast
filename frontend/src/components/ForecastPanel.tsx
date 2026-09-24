import React from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { STATES } from '../data/stateMap';
import type { HostUpdate } from '../types/attackcast';
import { Panel } from './Panel';
import { ReachHeatmap } from './ReachHeatmap';
import { Tag } from './Tag';

export function ForecastPanel({ host }: {host: HostUpdate;}) {
  const { forecast } = host;

  return (
    <Panel
      title={`Forecast · next ${forecast.K} windows`}
      aside={
      <>
          {forecast.uncertain && <Tag tone="heuristic">uncertain</Tag>}
          <Tag tone="mock">prior rollout · T={forecast.temperature.toFixed(2)}</Tag>
        </>
      }>
      
      <p className="mb-3 text-xs text-muted">Probability the host reaches each stage within k windows (k × 30s ahead).</p>
      <ReachHeatmap horizons={forecast.horizons} />

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="mb-2 text-xs text-muted">Most likely paths from {host.current_state.name}</h3>
        <ol className="space-y-2">
          {forecast.top_paths.map((p, i) =>
          <li key={i} className="flex flex-wrap items-center gap-1">
              {p.states.map((s, j) =>
            <React.Fragment key={j}>
                  {j > 0 && <ChevronRightIcon className="h-3 w-3 text-subtle" aria-hidden />}
                  <span className="rounded px-1.5 py-0.5 font-mono text-[11px] text-fg" style={{ backgroundColor: `${STATES[s].color}55` }}>
                    {STATES[s].short}
                  </span>
                </React.Fragment>
            )}
              <span className="ml-2 font-mono text-xs text-muted">p={p.prob.toFixed(3)}</span>
            </li>
          )}
        </ol>
      </div>
    </Panel>);

}