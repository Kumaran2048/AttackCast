import React, { createContext, useContext, useState } from 'react';
import type { ParseResult } from '../utils/pcap';
import type { Flow, PcapWindow } from '../utils/pcapFlows';

export interface PcapAnalysis {
  name: string;
  synthetic: boolean;
  parse: ParseResult;
  flows: Flow[];
  windows: PcapWindow[];
}

interface PcapAnalysisCtx {
  analysis: PcapAnalysis | null;
  setAnalysis: (a: PcapAnalysis | null) => void;
}

const PcapAnalysisContext = createContext<PcapAnalysisCtx>({
  analysis: null,
  setAnalysis: () => {},
});

export function PcapAnalysisProvider({ children }: { children: React.ReactNode }) {
  const [analysis, setAnalysis] = useState<PcapAnalysis | null>(null);
  return (
    <PcapAnalysisContext.Provider value={{ analysis, setAnalysis }}>
      {children}
    </PcapAnalysisContext.Provider>
  );
}

export function usePcapAnalysis() {
  return useContext(PcapAnalysisContext);
}
