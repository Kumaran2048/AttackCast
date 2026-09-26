import React from 'react';
import { AlertCard } from '../components/AlertCard';
import { CountermeasuresList } from '../components/CountermeasuresList';
import { ExplanationPanel } from '../components/ExplanationPanel';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { FlaggedFlows } from '../components/FlaggedFlows';
import { ForecastPanel } from '../components/ForecastPanel';
import { HostTabs } from '../components/HostTabs';
import { ReplayControls } from '../components/ReplayControls';
import { StageTimeline } from '../components/StageTimeline';
import { useReplayContext } from '../contexts/ReplayContext';

export function LiveMonitor() {
  const { state, current } = useReplayContext();
  if (!current || !current.hosts || !current.hosts.length) return <ReplayControls />;
  const host = current.hosts.find((h) => h.entity === state.selectedHost) ?? current.hosts[0];
  if (!host) return <ReplayControls />;

  return (
    <div className="space-y-5">
      <ReplayControls />
      <HostTabs />
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="min-w-0 space-y-5 xl:col-span-8">
          <StageTimeline entity={host.entity} />
          <ForecastPanel host={host} />
          <ExplanationPanel host={host} />
          <FlaggedFlows flows={host.explanation.flagged_flows} />
        </div>
        <div className="min-w-0 space-y-5 xl:col-span-4">
          <AlertCard host={host} windowId={current.window_id} />
          <FeedbackPanel />
          <CountermeasuresList items={host.countermeasures} />
        </div>
      </div>
    </div>);

}