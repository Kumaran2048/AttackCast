import React, { useState } from 'react';
import { Sidebar, type PageId } from './components/Sidebar';
import { ReplayProvider } from './contexts/ReplayContext';
import { About } from './pages/About';
import { BuildStatus } from './pages/BuildStatus';
import { CampaignView } from './pages/CampaignView';
import { DataStates } from './pages/DataStates';
import { LiveMonitor } from './pages/LiveMonitor';
import { ModelPerformance } from './pages/ModelPerformance';
import { PcapUpload } from './pages/PcapUpload';
import { WhatIf } from './pages/WhatIf';

const PAGES: Record<PageId, React.ComponentType> = {
  monitor: LiveMonitor,
  campaign: CampaignView,
  whatif: WhatIf,
  performance: ModelPerformance,
  data: DataStates,
  pcap: PcapUpload,
  about: About,
  build: BuildStatus,
};

export function App() {
  const [page, setPage] = useState<PageId>('monitor');
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
          <div role="status" className="border-b border-watch/30 bg-watch/10 px-5 py-2 text-xs text-watch">
            Synthetic data throughout. Metrics are computed live in the browser on generated sequences, not on CIC-IDS-2018 or CTU-13.
          </div>
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-[1440px] p-4 lg:p-6">
              <Page />
            </div>
          </main>
        </div>

      </div>
    </ReplayProvider>
  );
}