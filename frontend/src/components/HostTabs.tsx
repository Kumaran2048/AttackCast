import React from 'react';
import { useReplayContext } from '../contexts/ReplayContext';
import { LEVEL_META } from './LevelBadge';

export function HostTabs() {
  const { state, dispatch, current } = useReplayContext();
  if (!current || current.hosts.length < 2) return null;

  return (
    <div role="tablist" aria-label="Hosts" className="flex flex-wrap gap-1.5">
      {current.hosts.map((h) => {
        const active = h.entity === state.selectedHost;
        const m = LEVEL_META[h.alert.adjusted_level];
        return (
          <button
            key={h.entity}
            role="tab"
            aria-selected={active}
            onClick={() => dispatch({ type: 'select-host', entity: h.entity })}
            className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-xs transition-colors duration-150 ${active ? 'border-accent/60 bg-raised text-fg' : 'border-line text-muted hover:text-fg'}`}>
            
            <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden />
            {h.entity}
            <span className="sr-only">{m.label}</span>
          </button>);

      })}
    </div>);

}