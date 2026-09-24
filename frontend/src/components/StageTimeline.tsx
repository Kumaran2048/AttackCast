import React from 'react';
import { useReplayContext } from '../contexts/ReplayContext';
import { STATES } from '../data/stateMap';
import { Panel } from './Panel';

export function StageTimeline({ entity }: {entity: string;}) {
  const { state, dispatch, scenario } = useReplayContext();
  const cells = Array.from({ length: scenario.windows }, (_, i) => {
    const h = state.updates[i]?.hosts.find((x) => x.entity === entity);
    return { pred: h?.current_state.id, gt: h?.ground_truth_state?.id };
  });
  const cursor = state.updates.length - 1;

  const row = (key: 'pred' | 'gt', label: string) =>
  <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-xs text-muted">{label}</span>
      <div className="grid flex-1 gap-px" style={{ gridTemplateColumns: `repeat(${scenario.windows}, minmax(0, 1fr))` }}>
        {cells.map((c, i) => {
        const s = c[key];
        return (
          <button
            key={i}
            type="button"
            onClick={() => dispatch({ type: 'seek', position: i + 1 })}
            aria-label={`Window ${i}: ${s !== undefined ? STATES[s].name : 'not yet played'}`}
            title={s !== undefined ? `w${i} · ${STATES[s].name}` : `w${i}`}
            className={`h-6 rounded-sm ${i === cursor ? 'ring-2 ring-fg/80 ring-offset-1 ring-offset-surface' : ''}`}
            style={{ backgroundColor: s !== undefined ? STATES[s].color : 'rgb(var(--raised))' }} />);


      })}
      </div>
    </div>;


  return (
    <Panel title="Stage timeline" aside={<span className="font-mono text-xs text-subtle">{entity} · 30s windows</span>}>
      <div className="space-y-2">
        {row('pred', 'Predicted')}
        {row('gt', 'Ground truth')}
      </div>
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
        {STATES.map((s) =>
        <li key={s.id} className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden />
            {s.name}
            {s.confidence === 'heuristic' && <span className="text-warn">*</span>}
          </li>
        )}
        <li className="text-xs text-subtle">* heuristic label</li>
      </ul>
    </Panel>);

}