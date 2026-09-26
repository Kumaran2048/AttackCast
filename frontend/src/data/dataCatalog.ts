import type { StateId } from '../types/attackcast';

export const STATE_RATIONALE: Record<StateId, {sourceLabel: string;rationale: string;}> = {
  0: { sourceLabel: 'Benign / Normal / Background', rationale: 'Dataset-labelled benign traffic.' },
  1: { sourceLabel: 'PortScan-like, CTU scan phases', rationale: 'High fan-out, SYN-only probing precedes most intrusions.' },
  2: { sourceLabel: 'FTP/SSH-Bruteforce, Brute Force -Web/-XSS, SQL Injection', rationale: 'Credential guessing and web exploitation to gain access.' },
  3: { sourceLabel: 'Infiltration (first internal activity)', rationale: 'First behaviour after access: payload download, new destinations.' },
  4: { sourceLabel: 'Bot, CTU-13 Botnet', rationale: 'Periodic beaconing to few external endpoints.' },
  5: { sourceLabel: 'none (heuristic)', rationale: 'Not labelled in either dataset — inferred from internal spread on admin ports.' },
  6: { sourceLabel: 'none (heuristic)', rationale: 'Not labelled — inferred from large, asymmetric outbound transfers.' },
  7: { sourceLabel: 'DoS-*, DDoS-*', rationale: 'Volumetric flooding.' }
};

export const HEURISTIC_RULES = [
{ state: 'Lateral Movement', rule: 'internal_spread ≥ 3 distinct internal hosts on 22/445/3389/5985 within one window, after a non-benign state on the same host.' },
{ state: 'Exfiltration', rule: 'largest_outbound_bytes ≥ 500 kB AND bytes_out_in_ratio ≥ 5 to an external destination, after C2 or Execution.' },
{ state: 'Multi-label windows', rule: 'Resolved by severity priority Impact > Exfil > Lateral > C2 > Execution > Credential > Recon > Benign; raw label counts kept.' }];


type Avail = 'yes' | 'no' | 'derived' | 'verify';

export const COLUMN_AVAILABILITY: {column: string;cic: Avail;ctu: Avail;pcap: Avail;}[] = [
{ column: 'ts_start', cic: 'yes', ctu: 'yes', pcap: 'yes' },
{ column: 'duration', cic: 'yes', ctu: 'yes', pcap: 'derived' },
{ column: 'src_ip / dst_ip', cic: 'verify', ctu: 'yes', pcap: 'yes' },
{ column: 'src_port', cic: 'verify', ctu: 'yes', pcap: 'yes' },
{ column: 'dst_port', cic: 'yes', ctu: 'yes', pcap: 'yes' },
{ column: 'proto', cic: 'yes', ctu: 'yes', pcap: 'yes' },
{ column: 'fwd_pkts / bwd_pkts', cic: 'yes', ctu: 'no', pcap: 'yes' },
{ column: 'fwd_bytes', cic: 'yes', ctu: 'yes', pcap: 'yes' },
{ column: 'bwd_bytes', cic: 'yes', ctu: 'derived', pcap: 'yes' },
{ column: 'syn/ack/rst/fin/psh counts', cic: 'yes', ctu: 'no', pcap: 'yes' },
{ column: 'tcp_state_or_flags', cic: 'yes', ctu: 'yes', pcap: 'yes' },
{ column: 'label_raw', cic: 'yes', ctu: 'yes', pcap: 'no' }];


export const LIMITATIONS = [
'Evaluation sequences are derived from CICIDS-2017/2018 (2,520,751 real flows) mapped to 8 MITRE ATT&CK stages via heuristic rules.',
'Lateral Movement and Exfiltration are heuristic labels; their metrics measure agreement with the rule, not an independent ground truth.',
'Campaign risk score is computed from correlated host signals — graph-layer lift quantification requires CTU-13 ingestion + crossdataset.py.',
'What-if uses policy priors (model-based assumptions), not do-calculus counterfactuals from a causal graph.',
'Cross-dataset results (train CIC-IDS-2018 → test CTU-13) are not yet computed; run backend/ml/eval/crossdataset.py after CTU-13 ingestion.'];