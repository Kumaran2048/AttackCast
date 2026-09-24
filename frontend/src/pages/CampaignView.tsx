import React, { useMemo } from 'react';
import { NetworkIcon } from 'lucide-react';
import { HostGraph } from '../components/HostGraph';
import { Panel } from '../components/Panel';
import { ReplayControls } from '../components/ReplayControls';
import { Sparkline } from '../components/Sparkline';
import { Tag } from '../components/Tag';
import { useReplayContext } from '../contexts/ReplayContext';
import { ALERT_THRESHOLDS } from '../data/stateMap';
import { buildHostGraph } from '../utils/hostGraph';
import { levelFor, pct } from '../utils/mockStream';
import { LEVEL_META } from '../components/LevelBadge';

export function CampaignView() {
  const { state, dispatch, scenario, current } = useReplayContext();
  const campaign = current?.campaign ?? null;
  const graph = useMemo(() => current ? buildHostGraph(scenario, current) : { nodes: [], edges: [] }, [scenario, current]);
  const riskHistory = useMemo(() => state.updates.map((u) => u.campaign?.risk_score ?? 0), [state.updates]);

  if (!scenario.is_multi_host || !campaign || !current) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface p-8 text-center">
        <NetworkIcon className="h-8 w-8 text-subtle" aria-hidden />
        <h2 className="mt-3 text-base font-medium text-fg">No multi-host scenario loaded</h2>
        <p className="mt-1 max-w-sm text-sm text-muted">Cross-host correlation needs a scenario with several hosts. Load the coordinated campaign to see it.</p>
        <button
          type="button"
          onClick={() => dispatch({ type: 'scenario', id: 'coordinated' })}
          className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity duration-150 hover:opacity-90">
          
          Load coordinated campaign
        </button>
      </div>);

  }

  const level = levelFor(campaign.risk_score);
  const m = LEVEL_META[level];
  const soloAlerts = campaign.member_scores.filter((s) => s.solo >= ALERT_THRESHOLDS.watch).length;

  return (
    <div className="space-y-5">
      <ReplayControls />
      <div className="grid gap-5 xl:grid-cols-12">
        <Panel
          title={`Host interaction graph · w${current.window_id}`}
          className="min-w-0 xl:col-span-7"
          aside={<Tag tone="mock">fixed layout</Tag>}>
          
          <HostGraph nodes={graph.nodes} edges={graph.edges} />
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-crit" aria-hidden /> shared-target edge</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-line" aria-hidden /> other traffic</span>
            <span>Node size and colour = correlated risk</span>
          </div>
        </Panel>

        <div className="min-w-0 space-y-5 xl:col-span-5">
          <section className={`rounded-lg border p-5 ${m.fill}`} aria-live="polite">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Campaign risk</p>
                <p className={`mt-1 font-mono text-4xl font-medium ${m.text}`}>{pct(campaign.risk_score)}</p>
                <p className={`mt-1 flex items-center gap-1.5 text-sm ${m.text}`}>
                  <m.Icon className="h-4 w-4" aria-hidden /> {level === 'none' ? 'No campaign' : `${m.label} · coordinated campaign`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-4xl font-medium text-fg">{soloAlerts}<span className="text-subtle">/{campaign.member_hosts.length}</span></p>
                <p className="text-xs text-muted">hosts alerting alone</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-fg">{campaign.explanation.text}</p>
            <div className="mt-4">
              <Sparkline series={[{ values: riskHistory, className: 'stroke-crit', label: 'campaign risk over time' }]} />
              <p className="text-[11px] text-subtle">Campaign risk per window</p>
            </div>
          </section>

          <Panel title={`P(campaign confirmed) · next ${campaign.forecast.horizons.length} windows`}>
            <div className="flex items-end gap-2">
              {campaign.forecast.horizons.map((h) =>
              <div key={h.k} className="flex flex-1 flex-col items-center gap-1">
                  <span className="font-mono text-[11px] text-fg">{Math.round(h.reach_prob_confirmed * 100)}</span>
                  <div className="flex h-20 w-full items-end rounded-sm bg-raised">
                    <div className="w-full rounded-sm bg-crit/80" style={{ height: `${h.reach_prob_confirmed * 100}%` }} />
                  </div>
                  <span className="font-mono text-[10px] text-subtle">k={h.k}</span>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Individually low, collectively flagged" aside={<Tag tone="synthetic">{scenario.sequence_origin}</Tag>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr>
                <th className="pb-2 font-normal">Host</th>
                <th className="pb-2 font-normal">Solo score (no graph)</th>
                <th className="pb-2 font-normal">Correlated score (with graph)</th>
                <th className="pb-2 text-right font-normal">Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {campaign.member_scores.map((s) => {
                const w = campaign.explanation.top_contributing_hosts.find((h) => h.entity === s.entity)?.weight ?? 0;
                return (
                  <tr key={s.entity}>
                    <td className="py-2.5 font-mono text-xs text-fg">{s.entity}</td>
                    <td className="py-2.5"><ScoreBar value={s.solo} /></td>
                    <td className="py-2.5"><ScoreBar value={s.correlated} /></td>
                    <td className="py-2.5 text-right font-mono text-xs text-muted">{pct(w)}</td>
                  </tr>);

              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-subtle">
          Correlated scores come from the mock stream. The real graph-layer lift gets measured in Phase 3 (ablation with vs without the graph layer).
        </p>
      </Panel>
    </div>);

}

function ScoreBar({ value }: {value: number;}) {
  const level = levelFor(value);
  const m = LEVEL_META[level];
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-32 rounded-full bg-raised">
        <div className={`h-full rounded-full ${m.dot}`} style={{ width: `${value * 100}%` }} />
      </div>
      <span className={`w-10 font-mono text-xs ${m.text}`}>{pct(value)}</span>
      <span className="sr-only">{m.label}</span>
    </div>);

}