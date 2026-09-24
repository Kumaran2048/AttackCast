import React, { useMemo } from 'react';
import { useReplayContext } from '../contexts/ReplayContext';
import { STATES } from '../data/stateMap';
import { pct } from '../utils/mockStream';
import { Panel } from './Panel';
import { Sparkline } from './Sparkline';

const ROLLING = 8;

export function FeedbackPanel() {
  const { state, summary } = useReplayContext();

  // Rolling false-alarm rate over the last N windows (benign ground truth only).
  const series = useMemo(() => {
    const base: number[] = [];
    const adj: number[] = [];
    state.updates.forEach((_, i) => {
      const slice = state.updates.slice(Math.max(0, i - ROLLING + 1), i + 1).flatMap((u) => u.hosts.filter((h) => h.ground_truth_state?.id === 0));
      const n = slice.length || 1;
      base.push(slice.filter((h) => h.alert.base_level !== 'none').length / n);
      adj.push(slice.filter((h) => h.alert.adjusted_level !== 'none').length / n);
    });
    return { base, adj };
  }, [state.updates]);

  const drop = summary.baseline_false_alarm_rate - summary.current_false_alarm_rate;

  return (
    <Panel title="Analyst feedback" aside={<span className="font-mono text-xs text-subtle">session only</span>}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="font-mono text-2xl text-fg">{pct(summary.current_false_alarm_rate)}</p>
          <p className="text-xs text-muted">False-alarm rate now</p>
        </div>
        <div>
          <p className="font-mono text-2xl text-subtle">{pct(summary.baseline_false_alarm_rate)}</p>
          <p className="text-xs text-muted">Without feedback</p>
        </div>
      </div>

      <div className="mt-3">
        <Sparkline
          series={[
          { values: series.base, className: 'stroke-subtle', dashed: true, label: 'baseline rolling false-alarm rate' },
          { values: series.adj, className: 'stroke-accent', label: 'adjusted rolling false-alarm rate' }]
          } />
        
        <div className="mt-1 flex items-center justify-between text-[11px] text-subtle">
          <span>Rolling {ROLLING}-window rate · <span className="text-accent">adjusted</span> vs dashed baseline</span>
          {drop > 0 && <span className="text-ok">−{pct(drop)}</span>}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-3">
        <p className="mb-2 text-xs text-muted">
          {summary.total_events} events · {summary.confirmed} confirmed · {summary.dismissed} dismissed
        </p>
        {state.events.length === 0 ?
        <p className="text-xs text-subtle">Confirm or dismiss alerts to recalibrate this session. The trained model is never modified.</p> :

        <ol className="max-h-44 space-y-2 overflow-y-auto pr-1">
            {[...state.events].reverse().map((e) =>
          <li key={e.id} className="text-xs leading-relaxed">
                <span className={e.action === 'confirm' ? 'text-crit' : 'text-ok'}>{e.action === 'confirm' ? 'Confirmed' : 'Dismissed'}</span>{' '}
                <span className="text-muted">{e.level_at_click} on</span> <span className="font-mono text-fg">{e.host}</span>{' '}
                <span className="text-muted">w{e.window_id} ({STATES[e.state_id].name})</span>
                <br />
                <span className="font-mono text-subtle">
                  bias {e.bias_before.toFixed(3)} → {e.bias_after.toFixed(3)} · watch at {e.watch_threshold_before.toFixed(2)} → {e.watch_threshold_after.toFixed(2)}
                </span>
              </li>
          )}
          </ol>
        }
      </div>
    </Panel>);

}