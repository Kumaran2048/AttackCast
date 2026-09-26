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
  const graph = useMemo(() => (current ? buildHostGraph(scenario, current) : { nodes: [], edges: [] }), [scenario, current]);
  const riskHistory = useMemo(() => state.updates.map((u) => u.campaign?.risk_score ?? u.hosts[0]?.alert.adjusted_score ?? 0), [state.updates]);

  const host = current?.hosts?.[0];
  const isMulti = scenario.is_multi_host && campaign;
  const riskScore = isMulti ? campaign.risk_score ?? 0.05 : host?.alert?.adjusted_score ?? 0.05;
  const level = levelFor(riskScore);
  const m = LEVEL_META[level] || LEVEL_META.none;
  const memberScores = campaign?.member_scores || [];
  const memberHosts = campaign?.member_hosts || (host ? [host.entity] : []);
  const soloAlerts = isMulti
    ? memberScores.filter((s) => s.solo >= ALERT_THRESHOLDS.watch).length
    : host && (host.alert?.base_score ?? 0) >= ALERT_THRESHOLDS.watch
    ? 1
    : 0;

  if (!current) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-surface p-8 text-center">
        <NetworkIcon className="h-8 w-8 text-subtle" aria-hidden />
        <h2 className="mt-3 text-base font-medium text-fg">Initializing Replay Stream...</h2>
      </div>
    );
  }

  const forecastHorizons = isMulti
    ? (campaign?.forecast?.horizons || [])
    : (host?.forecast?.horizons || []);

  return (
    <div className="space-y-5">
      <ReplayControls />
      <div className="grid gap-5 xl:grid-cols-12">
        <Panel
          title={`Host interaction graph · w${current.window_id}`}
          className="min-w-0 xl:col-span-7"
          aside={<Tag tone="accent">network topology</Tag>}>
          
          <HostGraph nodes={graph.nodes || []} edges={graph.edges || []} />
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
                <p className="text-xs text-muted">{isMulti ? 'Campaign risk' : 'Host risk score'}</p>
                <p className={`mt-1 font-mono text-4xl font-medium ${m.text}`}>{pct(riskScore)}</p>
                <p className={`mt-1 flex items-center gap-1.5 text-sm ${m.text}`}>
                  <m.Icon className="h-4 w-4" aria-hidden /> {level === 'none' ? 'Normal Baseline' : `${m.label} · ${isMulti ? 'coordinated campaign' : host?.current_state?.name || 'active'}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-4xl font-medium text-fg">
                  {soloAlerts}
                  <span className="text-subtle">/{isMulti ? memberHosts.length : 1}</span>
                </p>
                <p className="text-xs text-muted">{isMulti ? 'hosts alerting alone' : 'monitored host'}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-fg">
              {isMulti
                ? (campaign?.explanation?.text || 'Correlated network activity detected across campaign hosts.')
                : (host?.explanation?.text ?? 'Monitoring single host interaction and topology flows.')}
            </p>
            <div className="mt-4">
              <Sparkline series={[{ values: riskHistory, className: 'stroke-crit', label: 'risk over time' }]} />
              <p className="text-[11px] text-subtle">Risk trajectory per window</p>
            </div>
          </section>

          <Panel title={`P(${isMulti ? 'campaign confirmed' : 'impact reach'}) · next ${forecastHorizons.length || 5} windows`}>
            <div className="flex items-end gap-2">
              {forecastHorizons.map((h: any) => {
                const prob = isMulti ? (h.reach_prob_confirmed ?? 0.5) : h.reach_probs ? (Array.isArray(h.reach_probs) ? (h.reach_probs[7] ?? 0.2) : (h.reach_probs['Impact'] ?? 0.2)) : 0.1;
                return (
                  <div key={h.k} className="flex flex-1 flex-col items-center gap-1">
                    <span className="font-mono text-[11px] text-fg">{Math.round(prob * 100)}</span>
                    <div className="flex h-20 w-full items-end rounded-sm bg-raised">
                      <div className="w-full rounded-sm bg-crit/80" style={{ height: `${Math.min(100, Math.round(prob * 100))}%` }} />
                    </div>
                    <span className="font-mono text-[10px] text-subtle">k={h.k}</span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        title={isMulti ? 'Individually low, collectively flagged' : 'Host Network Flow & Correlation'}
        aside={<Tag tone={scenario.sequence_origin === 'real' ? 'real' : 'accent'}>{scenario.sequence_origin === 'real' ? 'real dataset' : scenario.sequence_origin}</Tag>}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr>
                <th className="pb-2 font-normal">Host</th>
                <th className="pb-2 font-normal">{isMulti ? 'Solo score (no graph)' : 'Current State'}</th>
                <th className="pb-2 font-normal">{isMulti ? 'Correlated score (with graph)' : 'Risk Level'}</th>
                <th className="pb-2 text-right font-normal">{isMulti ? 'Contribution' : 'Top Feature'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isMulti ? (
                campaign.member_scores.map((s) => {
                  const w = campaign.explanation.top_contributing_hosts.find((h) => h.entity === s.entity)?.weight ?? 0;
                  return (
                    <tr key={s.entity}>
                      <td className="py-2.5 font-mono text-xs text-fg">{s.entity}</td>
                      <td className="py-2.5"><ScoreBar value={s.solo} /></td>
                      <td className="py-2.5"><ScoreBar value={s.correlated} /></td>
                      <td className="py-2.5 text-right font-mono text-xs text-muted">{pct(w)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="py-2.5 font-mono text-xs text-fg">{host?.entity}</td>
                  <td className="py-2.5 text-xs text-fg">{host?.current_state.name}</td>
                  <td className="py-2.5"><ScoreBar value={host?.alert.adjusted_score ?? 0} /></td>
                  <td className="py-2.5 text-right font-mono text-xs text-muted">
                    {host?.explanation.top_features[0]?.feature ?? 'flow_rate'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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