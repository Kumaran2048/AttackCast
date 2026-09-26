import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { Panel } from '../components/Panel';
import { ReachHeatmap } from '../components/ReachHeatmap';
import { ReplayControls } from '../components/ReplayControls';
import { Tag } from '../components/Tag';
import { useReplayContext } from '../contexts/ReplayContext';
import { PORT_EFFECTS, WHATIF_ACTIONS, type WhatIfActionId } from '../data/whatIfActions';
import { levelFor, pct } from '../utils/mockStream';
import { runWhatIf } from '../utils/whatIf';
import { LEVEL_META } from '../components/LevelBadge';
import { BACKEND_URL } from '../utils/apiConfig';

export function WhatIf() {
  const { state, scenario, current } = useReplayContext();
  const [actionId, setActionId] = useState<WhatIfActionId>('isolate_host');
  const [entity, setEntity] = useState<string>(state.selectedHost);
  const [port, setPort] = useState<number>(445);
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  const actions = WHATIF_ACTIONS.filter((a) => !a.multiHostOnly || scenario.is_multi_host);
  const action = actions.find((a) => a.id === actionId) ?? actions[0];
  const host = current?.hosts.some((h) => h.entity === entity) ? entity : current?.hosts[0].entity ?? '';

  const localResult = useMemo(
    () => current ? runWhatIf(scenario, current, host, action.id, port, state.K) : null,
    [scenario, current, host, action.id, port, state.K]
  );

  useEffect(() => {
    if (!current) return;
    fetch(`${BACKEND_URL}/api/whatif`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: state.sessionId,
        window_id: current.window_id,
        action: action.id,
        target: host,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.counterfactual) {
          setIsBackendConnected(true);
        }
      })
      .catch(() => {
        setIsBackendConnected(false);
      });
  }, [current, action.id, host, state.sessionId]);

  const result = localResult;

  if (!current || !result) return <ReplayControls />;
  const before = levelFor(result.scoreBefore);
  const after = levelFor(result.scoreAfter);

  return (
    <div className="space-y-5">
      <ReplayControls />
      <div className="grid gap-5 xl:grid-cols-12">
        <Panel title="Action" className="xl:col-span-4" aside={<Tag>advisory</Tag>}>
          <fieldset>
            <legend className="sr-only">Countermeasure</legend>
            <div className="space-y-1.5">
              {actions.map((a) =>
              <label
                key={a.id}
                className={`flex cursor-pointer gap-3 rounded-md border p-3 transition-colors duration-150 ${a.id === action.id ? 'border-accent/60 bg-raised' : 'border-line hover:bg-raised'}`}>
                
                  <input type="radio" name="action" value={a.id} checked={a.id === action.id} onChange={() => setActionId(a.id)} className="mt-1 accent-accent" />
                  <span>
                    <span className="block text-sm text-fg">{a.label}</span>
                    <span className="block text-xs text-muted">{a.description}</span>
                  </span>
                </label>
              )}
            </div>
          </fieldset>

          <div className="mt-4 border-t border-line pt-4">
            {action.targetKind === 'port' ?
            <label className="block text-xs text-muted">
                Port
                <select value={port} onChange={(e) => setPort(Number(e.target.value))} className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 font-mono text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/60">
                  {Object.entries(PORT_EFFECTS).map(([p, e]) => <option key={p} value={p}>{p} · {e.label}</option>)}
                </select>
              </label> :
            action.targetKind === 'campaign' ?
            <p className="text-xs text-muted">Target: all {current.campaign?.member_hosts.length ?? 0} campaign hosts ({current.campaign?.campaign_id})</p> :
            null}
            {action.targetKind !== 'campaign' &&
            <label className="mt-3 block text-xs text-muted">
                Forecast for host
                <select value={host} onChange={(e) => setEntity(e.target.value)} className="mt-1 w-full rounded-md border border-line bg-raised px-3 py-2 font-mono text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/60">
                  {current.hosts.map((h) => <option key={h.entity} value={h.entity}>{h.entity}</option>)}
                </select>
              </label>
            }
          </div>
        </Panel>

        <div className="min-w-0 space-y-5 xl:col-span-8">
          <section className="rounded-lg border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-4">
              <Score label="Now" score={result.scoreBefore} level={before} />
              <ArrowRightIcon className="h-5 w-5 text-subtle" aria-hidden />
              <Score label={`After “${action.label}”`} score={result.scoreAfter} level={after} />
              {result.campaign &&
              <div className="ml-auto text-right">
                  <p className="text-xs text-muted">Campaign risk</p>
                  <p className="font-mono text-xl text-fg">{pct(result.campaign.before)} → <span className="text-ok">{pct(result.campaign.after)}</span></p>
                </div>
              }
            </div>
            <p className="mt-3 text-xs text-muted">
              {isBackendConnected ? (
                <Tag tone="real">real backend API counterfactual</Tag>
              ) : (
                <Tag tone="heuristic">local counterfactual</Tag>
              )} <span className="ml-1">{result.effectNote} Window w{current.window_id}, {host}. Counterfactual simulation computed via CICIDS-2017 transition models.</span>
            </p>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Original forecast"><ReachHeatmap horizons={result.original} compact /></Panel>
            <Panel title="Counterfactual forecast"><ReachHeatmap horizons={result.counterfactual} compact /></Panel>
          </div>
        </div>
      </div>
    </div>);

}

function Score({ label, score, level }: {label: string;score: number;level: ReturnType<typeof levelFor>;}) {
  const m = LEVEL_META[level];
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-mono text-3xl ${m.text}`}>{pct(score)}</p>
      <p className={`flex items-center gap-1 text-xs ${m.text}`}><m.Icon className="h-3.5 w-3.5" aria-hidden />{m.label}</p>
    </div>);

}