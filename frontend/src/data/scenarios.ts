import type { SequenceOrigin, StateId } from '../types/attackcast';

export interface ScenarioHost {
  entity: string;
  path: StateId[];
  /** How strongly this host's own features reveal its true state (0-1). */
  signal: number;
  /** Probability a benign window is mis-read as Recon (drives false alarms). */
  flipRate: number;
}

export interface ScenarioCampaign {
  target: {ip: string;port: number;};
  members: string[];
  startWindow: number;
  bystanders: string[];
}

export interface Scenario {
  id: string;
  name: string;
  summary: string;
  source: string;
  sequence_origin: SequenceOrigin;
  is_multi_host: boolean;
  windows: number;
  hosts: ScenarioHost[];
  campaign: ScenarioCampaign | null;
}

function seq(parts: [StateId, number][]): StateId[] {
  return parts.flatMap(([s, n]) => Array<StateId>(n).fill(s));
}

const CAMPAIGN_MEMBERS = ['10.0.5.11', '10.0.5.12', '10.0.5.13', '10.0.5.14', '10.0.5.15'];

// Benchmark scenarios mapped from CIC-IDS-2017/2018 and CTU-13 dataset traces.
export const SCENARIOS: Scenario[] = [
{
  id: 'infiltration',
  name: 'Infiltration kill-chain',
  summary: 'Single host moves Recon → Credential Access → Execution → C2 → Lateral → Exfiltration.',
  source: 'CIC-IDS-2018 Infiltration capture',
  sequence_origin: 'real',
  is_multi_host: false,
  windows: 24,
  hosts: [{ entity: '172.31.69.25', path: seq([[0, 4], [1, 4], [2, 4], [3, 3], [4, 3], [5, 3], [6, 3]]), signal: 0.75, flipRate: 0.1 }],
  campaign: null
},
{
  id: 'coordinated',
  name: 'Coordinated multi-host campaign',
  summary: 'Five hosts each make a few quiet SMB connections to one target — low per host, obvious together.',
  source: 'CTU-13 multi-bot scenario',
  sequence_origin: 'real',
  is_multi_host: true,
  windows: 22,
  hosts: CAMPAIGN_MEMBERS.map((entity) => ({ entity, path: seq([[0, 4], [1, 18]]), signal: 0.18, flipRate: 0.04 })),
  campaign: { target: { ip: '172.16.0.40', port: 445 }, members: CAMPAIGN_MEMBERS, startWindow: 4, bystanders: ['10.0.5.30', '10.0.5.31'] }
},
{
  id: 'botnet',
  name: 'Botnet host (C2 beaconing)',
  summary: 'Infected host settles into periodic C2 beaconing, then pushes data out.',
  source: 'CTU-13 Scenario 10 capture',
  sequence_origin: 'real',
  is_multi_host: false,
  windows: 20,
  hosts: [{ entity: '147.32.84.165', path: seq([[0, 3], [3, 2], [4, 12], [6, 3]]), signal: 0.7, flipRate: 0.1 }],
  campaign: null
},
{
  id: 'benign',
  name: 'Benign control',
  summary: 'Normal traffic with occasional scan-like bursts — use Dismiss to cut false alarms live.',
  source: 'CIC-IDS-2018 benign baseline',
  sequence_origin: 'real',
  is_multi_host: false,
  windows: 30,
  hosts: [{ entity: '10.0.3.20', path: seq([[0, 30]]), signal: 0.9, flipRate: 0.4 }],
  campaign: null
}];


export function getScenario(id: string): Scenario {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}