import React from 'react';
import { PauseIcon, PlayIcon, RotateCcwIcon, SkipForwardIcon } from 'lucide-react';
import { useReplayContext } from '../contexts/ReplayContext';
import { SCENARIOS } from '../data/scenarios';
import { Tag } from './Tag';

const SPEEDS = [1, 2, 5, 10, 50];
const KS = [3, 5, 7];

export function ReplayControls() {
  const { state, dispatch, scenario } = useReplayContext();
  const pos = state.updates.length;
  const done = pos >= scenario.windows;

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0 lg:w-80">
          <label htmlFor="scenario" className="sr-only">Scenario</label>
          <select
            id="scenario"
            value={state.scenarioId}
            onChange={(e) => dispatch({ type: 'scenario', id: e.target.value })}
            className="w-full rounded-md border border-line bg-raised px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/60">
            
            {state.customScenario && (
              <option value={state.customScenario.id}>
                {state.customScenario.name}
              </option>
            )}
            {SCENARIOS.map((s) =>
            <option key={s.id} value={s.id}>{s.name}{s.is_multi_host ? ' · multi-host' : ''}</option>
            )}
          </select>
          <div className="mt-1.5 flex items-center gap-2">
            <Tag tone={scenario.sequence_origin === 'real' ? 'real' : 'accent'}>
              {scenario.sequence_origin === 'real' ? 'real dataset' : scenario.sequence_origin}
            </Tag>
            <span className="truncate text-xs text-subtle">{scenario.source}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: state.playing ? 'pause' : 'play' })}
            disabled={done}
            aria-label={state.playing ? 'Pause replay' : 'Play replay'}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-bg transition-opacity duration-150 hover:opacity-90 disabled:opacity-40">
            
            {state.playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          </button>
          <IconButton label="Step one window" onClick={() => dispatch({ type: 'tick' })} disabled={done}>
            <SkipForwardIcon className="h-4 w-4" />
          </IconButton>
          <IconButton label="Restart session (clears feedback)" onClick={() => dispatch({ type: 'reset' })}>
            <RotateCcwIcon className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <label htmlFor="seek" className="sr-only">Seek window</label>
          <input
            id="seek"
            type="range"
            min={1}
            max={scenario.windows}
            value={pos}
            onChange={(e) => dispatch({ type: 'seek', position: Number(e.target.value) })}
            className="w-full accent-accent" />
          
          <span className="whitespace-nowrap font-mono text-xs text-muted">
            w{pos - 1} / {scenario.windows - 1}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div role="group" aria-label="Replay speed" className="flex rounded-md border border-line p-0.5">
            {SPEEDS.map((s) =>
            <button
              key={s}
              type="button"
              onClick={() => dispatch({ type: 'speed', speed: s })}
              aria-pressed={state.speed === s}
              className={`rounded px-2 py-1 font-mono text-xs transition-colors duration-150 ${state.speed === s ? 'bg-raised text-fg' : 'text-subtle hover:text-fg'}`}>
              
                {s}×
              </button>
            )}
          </div>
          <label className="flex items-center gap-1.5 text-xs text-muted">
            K
            <select
              value={state.K}
              onChange={(e) => dispatch({ type: 'k', K: Number(e.target.value) })}
              className="rounded-md border border-line bg-raised px-2 py-1 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-accent/60">
              
              {KS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>
      </div>
      <p className="mt-3 border-t border-line pt-3 text-xs text-subtle">
        {scenario.summary} <span className="font-mono text-subtle">· {state.sessionId}</span>
      </p>
    </div>);

}

function IconButton({ label, onClick, disabled, children }: {label: string;onClick: () => void;disabled?: boolean;children: React.ReactNode;}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors duration-150 hover:bg-raised hover:text-fg disabled:opacity-40">
      
      {children}
    </button>);

}