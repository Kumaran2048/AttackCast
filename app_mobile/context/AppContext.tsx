import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface HostInfo {
  id: string;
  name: string;
  status: 'Low risk' | 'Warning' | 'High risk' | 'Compromised';
  riskScore: number;
  campaignScore: number;
  flowsCount: number;
  portsCount: number;
  ip: string;
  role: string;
}

export interface FlaggedFlow {
  flow_id: string;
  src: string;
  dst: string;
  dport: number;
  proto: string;
  bytes: number;
  why: string;
  severity: 'high' | 'warning' | 'info';
  timestamp: string;
}

export interface ShapFeature {
  name: string;
  value: string;
  shap: number;
  direction: 'positive' | 'negative';
}

export interface PcapFile {
  id: string;
  name: string;
  size: string;
  status: 'Queued' | 'Parsing' | 'Extracted' | 'Completed' | 'Failed';
  progress: number;
  hosts: number;
  flows: number;
  alerts: number;
  timeSpan: string;
}

interface AppContextType {
  // Replay & Simulation
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  windowNum: number;
  setWindowNum: (num: number) => void;
  scenario: string;
  setScenario: (sc: string) => void;
  
  // Live Alert
  alertDismissed: boolean;
  alertConfirmed: boolean;
  confirmAlert: () => void;
  dismissAlert: () => void;
  resetAlert: () => void;
  
  // Hosts & Selection
  hosts: HostInfo[];
  selectedHost: HostInfo;
  setSelectedHostId: (id: string) => void;
  
  // Driving features & Flagged flows
  shapFeatures: ShapFeature[];
  flaggedFlows: FlaggedFlow[];
  
  // What-If Simulation
  whatIfAction: string;
  setWhatIfAction: (action: string) => void;
  whatIfTarget: string;
  setWhatIfTarget: (target: string) => void;
  isSimulating: boolean;
  runSimulation: () => void;
  simResults: {
    riskBefore: number;
    riskAfter: number;
    delta1: number;
    delta2: number;
    cfData: { k: string; orig: number; cf: number }[];
  };
  
  // PCAP Uploads
  pcapFiles: PcapFile[];
  activePcap: PcapFile;
  addMockPcap: (name?: string) => void;
  launchPcapReplay: (fileId: string) => void;
  
  // Toast notifications
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const defaultHosts: HostInfo[] = [
  { id: 'host-1', name: 'Host-A1', status: 'High risk', riskScore: 0.85, campaignScore: 0.85, flowsCount: 1376, portsCount: 48, ip: '192.168.10.50', role: 'Workstation 01' },
  { id: 'host-2', name: 'Host-B4', status: 'High risk', riskScore: 0.82, campaignScore: 0.85, flowsCount: 924, portsCount: 39, ip: '192.168.10.54', role: 'Application Server' },
  { id: 'host-3', name: 'Host-C2', status: 'Warning', riskScore: 0.65, campaignScore: 0.83, flowsCount: 512, portsCount: 22, ip: '192.168.10.62', role: 'Dev Container' },
  { id: 'host-4', name: 'Host-D', status: 'Low risk', riskScore: 0.17, campaignScore: 0.42, flowsCount: 180, portsCount: 8, ip: '192.168.10.70', role: 'Backup Storage' },
  { id: 'host-5', name: 'Host-E1', status: 'Low risk', riskScore: 0.12, campaignScore: 0.38, flowsCount: 94, portsCount: 4, ip: '192.168.10.81', role: 'Print Server' },
];

const defaultShapFeatures: ShapFeature[] = [
  { name: 'Transmit Volume (300KB)', value: '300 KB / min', shap: 0.85, direction: 'positive' },
  { name: 'Connection Duration (121s)', value: '121 sec', shap: 0.64, direction: 'positive' },
  { name: 'Unique Port Fan-out (87%)', value: '87% fan-out', shap: 0.52, direction: 'positive' },
  { name: 'SYN/ACK Ratio', value: '0.94 ACK-heavy', shap: 0.28, direction: 'negative' },
];

const defaultFlaggedFlows: FlaggedFlow[] = [
  {
    flow_id: 'flow-94812',
    src: '192.168.10.50',
    dst: '172.16.0.4',
    dport: 445,
    proto: 'TCP',
    bytes: 84200,
    why: 'Suspicious SMBv2 TreeConnect & anomalous payload size',
    severity: 'high',
    timestamp: '14:22:08',
  },
  {
    flow_id: 'flow-94813',
    src: '192.168.10.50',
    dst: '172.16.0.12',
    dport: 3389,
    proto: 'TCP',
    bytes: 14200,
    why: 'RDP multi-port credential probe & beacon rhythm',
    severity: 'high',
    timestamp: '14:22:15',
  },
  {
    flow_id: 'flow-94820',
    src: '192.168.10.54',
    dst: '10.0.0.12',
    dport: 443,
    proto: 'TCP',
    bytes: 1345980,
    why: 'High-volume exfiltration connection to external database IP',
    severity: 'warning',
    timestamp: '14:23:02',
  }
];

const defaultPcaps: PcapFile[] = [
  { id: 'pcap-1', name: 'malware_traffic_v3.pcap', size: '26.9 MB', status: 'Extracted', progress: 100, hosts: 124, flows: 24900, alerts: 18, timeSpan: '4h 12m' },
  { id: 'pcap-2', name: 'APT29_capture_01.pcap', size: '13.3 MB', status: 'Completed', progress: 100, hosts: 48, flows: 14200, alerts: 9, timeSpan: '2h 45m' },
  { id: 'pcap-3', name: 'fictional_c2_03.pcap', size: '13.9 MB', status: 'Parsing', progress: 40, hosts: 32, flows: 8900, alerts: 4, timeSpan: '1h 10m' },
  { id: 'pcap-4', name: 'fictional_c2_05.pcap', size: '12.2 MB', status: 'Queued', progress: 0, hosts: 18, flows: 3200, alerts: 1, timeSpan: '45m' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [windowNum, setWindowNum] = useState(14);
  const [scenario, setScenario] = useState('Malware_Campaign_v3');
  
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [alertConfirmed, setAlertConfirmed] = useState(false);
  
  const [hosts, setHosts] = useState<HostInfo[]>(defaultHosts);
  const [selectedHostId, setSelectedHostId] = useState<string>('host-1');
  
  const [shapFeatures, setShapFeatures] = useState<ShapFeature[]>(defaultShapFeatures);
  const [flaggedFlows, setFlaggedFlows] = useState<FlaggedFlow[]>(defaultFlaggedFlows);
  
  // What-If Simulation
  const [whatIfAction, setWhatIfAction] = useState('Isolate host');
  const [whatIfTarget, setWhatIfTarget] = useState('Host-A1');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResults, setSimResults] = useState({
    riskBefore: 0.85,
    riskAfter: 0.25,
    delta1: -29.27,
    delta2: 12.30,
    cfData: [
      { k: 'Horizon 1', orig: 78, cf: 42 },
      { k: 'Horizon 2', orig: 64, cf: 35 },
      { k: 'Horizon 3', orig: 58, cf: 28 },
      { k: 'Horizon 4', orig: 54, cf: 22 },
      { k: 'Horizon 5', orig: 48, cf: 18 },
    ]
  });

  // PCAP Files
  const [pcapFiles, setPcapFiles] = useState<PcapFile[]>(defaultPcaps);
  const activePcap = pcapFiles[0];

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const confirmAlert = () => {
    setAlertConfirmed(true);
    showToast('Alert confirmed: Mitigations scheduled');
  };

  const dismissAlert = () => {
    setAlertDismissed(true);
    showToast('Alert dismissed');
  };

  const resetAlert = () => {
    setAlertDismissed(false);
    setAlertConfirmed(false);
  };

  const runSimulation = () => {
    setIsSimulating(true);
    showToast(`Simulating counterfactual for "${whatIfAction}" on ${whatIfTarget}...`);
    
    setTimeout(() => {
      setIsSimulating(false);
      const randomReduction = +(Math.random() * 0.2 + 0.55).toFixed(2);
      const newRiskAfter = +(0.85 * (1 - randomReduction)).toFixed(2);
      
      setSimResults({
        riskBefore: 0.85,
        riskAfter: newRiskAfter,
        delta1: -Math.round(randomReduction * 50 + 10),
        delta2: +Math.round(Math.random() * 10 + 5),
        cfData: [
          { k: 'Horizon 1', orig: 78, cf: Math.round(78 * (1 - randomReduction)) },
          { k: 'Horizon 2', orig: 64, cf: Math.round(64 * (1 - randomReduction)) },
          { k: 'Horizon 3', orig: 58, cf: Math.round(58 * (1 - randomReduction)) },
          { k: 'Horizon 4', orig: 54, cf: Math.round(54 * (1 - randomReduction)) },
          { k: 'Horizon 5', orig: 48, cf: Math.round(48 * (1 - randomReduction)) },
        ]
      });
      showToast('Counterfactual simulation completed');
    }, 1200);
  };

  const addMockPcap = (name = 'custom_attack_stream.pcap') => {
    const newFile: PcapFile = {
      id: `pcap-${Date.now()}`,
      name,
      size: `${(Math.random() * 20 + 5).toFixed(1)} MB`,
      status: 'Parsing',
      progress: 45,
      hosts: Math.floor(Math.random() * 50 + 20),
      flows: Math.floor(Math.random() * 15000 + 5000),
      alerts: Math.floor(Math.random() * 8 + 2),
      timeSpan: '1h 30m',
    };
    setPcapFiles([newFile, ...pcapFiles]);
    showToast(`Uploaded ${name}`);
  };

  const launchPcapReplay = (fileId: string) => {
    const file = pcapFiles.find(f => f.id === fileId) || pcapFiles[0];
    setScenario(file.name.replace('.pcap', ''));
    setIsPlaying(true);
    setWindowNum(1);
    showToast(`Replaying scenario: ${file.name}`);
  };

  // Simulated replay progression tick
  useEffect(() => {
    let timer: any = null;
    if (isPlaying) {
      timer = setInterval(() => {
        setWindowNum(prev => (prev >= 60 ? 1 : prev + 1));
      }, Math.max(400, 1500 / speed));
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, speed]);

  const selectedHost = hosts.find(h => h.id === selectedHostId) || hosts[0];

  return (
    <AppContext.Provider
      value={{
        isPlaying,
        setIsPlaying,
        speed,
        setSpeed,
        windowNum,
        setWindowNum,
        scenario,
        setScenario,
        alertDismissed,
        alertConfirmed,
        confirmAlert,
        dismissAlert,
        resetAlert,
        hosts,
        selectedHost,
        setSelectedHostId,
        shapFeatures,
        flaggedFlows,
        whatIfAction,
        setWhatIfAction,
        whatIfTarget,
        setWhatIfTarget,
        isSimulating,
        runSimulation,
        simResults,
        pcapFiles,
        activePcap,
        addMockPcap,
        launchPcapReplay,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
