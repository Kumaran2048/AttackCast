import React from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { useReplayContext } from '../contexts/ReplayContext';
import type { HostUpdate } from '../types/attackcast';
import { pct } from '../utils/mockStream';
import { resolutionKey } from '../utils/replayReducer';
import { LEVEL_META } from './LevelBadge';

export function AlertCard({ host, windowId }: {host: HostUpdate;windowId: number;}) {
  const { state, dispatch } = useReplayContext();
  const { alert, current_state } = host;
  const m = LEVEL_META[alert.adjusted_level];
  const resolved = state.resolutions[resolutionKey(windowId, host.entity)];
  const actionable = alert.adjusted_level !== 'none' || alert.base_level !== 'none';

  const send = (action: 'confirm' | 'dismiss') => dispatch({ type: 'feedback', windowId, host: host.entity, action });

  return (
    <section aria-live="polite" className={`rounded-lg border ${m.fill}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <m.Icon className={`h-6 w-6 ${m.text}`} aria-hidden />
            <div>
              <p className={`text-lg font-semibold leading-tight ${m.text}`}>{m.label}</p>
              <p className="font-mono text-xs text-muted">w{windowId} · {host.entity}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-medium text-fg">{pct(alert.adjusted_score)}</p>
            <p className="text-[11px] text-subtle">forward risk</p>
          </div>
        </div>

        <dl className="mt-4 space-y-1.5 text-xs">
          <Row label="Current stage" value={`${current_state.name} · ${current_state.attack_id}`} />
          <Row label="Driver" value={alert.reason} />
          <Row label="Lead estimate" value={alert.lead_estimate_windows ? `~${alert.lead_estimate_windows} windows (${alert.lead_estimate_windows * 30}s)` : '—'} />
          {alert.feedback_adjusted &&
          <Row label="Feedback" value={`${pct(alert.base_score)} → ${pct(alert.adjusted_score)} (base ${LEVEL_META[alert.base_level].label.toLowerCase()})`} highlight />
          }
        </dl>
      </div>

      <div className="flex items-center gap-2 border-t border-line/60 p-3">
        {resolved ?
        <p className="flex items-center gap-1.5 text-sm text-muted">
            {resolved === 'confirm' ? <CheckIcon className="h-4 w-4 text-crit" /> : <XIcon className="h-4 w-4 text-ok" />}
            {resolved === 'confirm' ? 'Confirmed as real — similar alerts will be raised' : 'Dismissed — similar alerts will be damped'}
          </p> :
        actionable ?
        <>
            <button
            type="button"
            onClick={() => send('confirm')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-crit px-3 py-2 text-sm font-medium text-bg transition-opacity duration-150 hover:opacity-90">
            
              <CheckIcon className="h-4 w-4" /> Confirm
            </button>
            <button
            type="button"
            onClick={() => send('dismiss')}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-raised px-3 py-2 text-sm font-medium text-fg transition-colors duration-150 hover:bg-line">
            
              <XIcon className="h-4 w-4" /> Dismiss
            </button>
          </> :

        <p className="text-sm text-muted">Nothing to review on this window.</p>
        }
      </div>
    </section>);

}

function Row({ label, value, highlight }: {label: string;value: string;highlight?: boolean;}) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 shrink-0 text-subtle">{label}</dt>
      <dd className={highlight ? 'text-accent' : 'text-fg'}>{value}</dd>
    </div>);

}