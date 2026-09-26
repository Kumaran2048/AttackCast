import React, { useEffect, useState } from 'react';
import { Sidebar, type PageId } from './components/Sidebar';
import { ReplayProvider } from './contexts/ReplayContext';
import { About } from './pages/About';
import { CampaignView } from './pages/CampaignView';
import { DataStates } from './pages/DataStates';
import { LiveMonitor } from './pages/LiveMonitor';
import { ModelPerformance } from './pages/ModelPerformance';
import { PcapUpload } from './pages/PcapUpload';
import { WhatIf } from './pages/WhatIf';
import { fetchHealth } from './utils/apiConfig';

const PAGES: Record<PageId, React.ComponentType> = {
  monitor: LiveMonitor,
  campaign: CampaignView,
  whatif: WhatIf,
  performance: ModelPerformance,
  data: DataStates,
  pcap: PcapUpload,
  about: About,
};

export function App() {
  const [page, setPage] = useState<PageId>('monitor');
  const [health, setHealth] = useState<{ status: string; model_ready?: boolean; dataset?: string; total_flows?: number } | null>(null);

  useEffect(() => {
    fetchHealth().then((data) => {
      if (data && data.status === 'ok') {
        setHealth(data);
      }
    });
  }, []);

  const Page = PAGES[page];

  return (
    <ReplayProvider>
      {/*
        Mobile:  flex-col  → Sidebar renders topbar at top (full width), main below. Drawer is fixed.
        Desktop: flex-row  → Desktop sidebar on left, main fills rest.
      */}
      <div className="flex min-h-screen w-full flex-col bg-bg text-fg lg:flex-row">

        {/* Sidebar: on mobile renders topbar + fixed drawer; on desktop renders sticky left panel */}
        <Sidebar page={page} onNavigate={setPage} />

        {/* Main content — full width on mobile, remaining width on desktop */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div role="status" className="border-b border-accent/20 bg-surface/80 backdrop-blur px-5 py-2 text-xs text-fg flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-ok"></span>
              </span>
              <span className="font-semibold text-accent tracking-wide uppercase text-[11px]">Real-Time Attack Forecasting:</span>
              <span className="text-muted">
                {health ? (
                  <>API Backend Active · <span className="text-fg font-medium">Calibrated GRU World Model Ready</span></>
                ) : (
                  'Live temporal multi-step forecasting engine'
                )}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-subtle">
              <span>Horizon K=3–7</span>
              <span>•</span>
              <span>Calibrated GRU World Model</span>
            </div>
          </div>
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1440px] p-4 lg:p-6">
              <Page onNavigate={setPage} />
            </div>
          </main>
        </div>

      </div>
    </ReplayProvider>
  );
}