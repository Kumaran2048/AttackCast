import type { AttackState, Countermeasure, StateId } from '../types/attackcast';

// Mirror of configs/state_map.yaml. MITRE IDs to be verified against ATT&CK before submission.
export const STATES: AttackState[] = [
{ id: 0, name: 'Benign', short: 'BEN', tactic: '—', attackId: '—', technique: '—', confidence: 'high', color: '#3a4757' },
{ id: 1, name: 'Reconnaissance', short: 'REC', tactic: 'Reconnaissance', attackId: 'TA0043', technique: 'T1595', confidence: 'high', color: '#3d8fd1' },
{ id: 2, name: 'Credential Access', short: 'CRD', tactic: 'Initial / Credential Access', attackId: 'TA0001·TA0006', technique: 'T1110', confidence: 'high', color: '#6f7ae0' },
{ id: 3, name: 'Execution', short: 'EXE', tactic: 'Execution', attackId: 'TA0002', technique: 'T1059', confidence: 'medium', color: '#a066d3' },
{ id: 4, name: 'Command & Control', short: 'C2', tactic: 'Command and Control', attackId: 'TA0011', technique: 'T1071', confidence: 'high', color: '#d9a53a' },
{ id: 5, name: 'Lateral Movement', short: 'LAT', tactic: 'Lateral Movement', attackId: 'TA0008', technique: 'T1021', confidence: 'heuristic', color: '#e57a35' },
{ id: 6, name: 'Exfiltration', short: 'EXF', tactic: 'Exfiltration', attackId: 'TA0010', technique: 'T1041', confidence: 'heuristic', color: '#e5484d' },
{ id: 7, name: 'Impact', short: 'IMP', tactic: 'Impact', attackId: 'TA0040', technique: 'T1498', confidence: 'high', color: '#c2185b' }];


// ATT&CK-inspired transition prior (rows sum to 1). In the real build this is only the
// synthetic-campaign stitching prior; here it also drives the mock rollout.
export const TRANSITION_PRIOR: number[][] = [
[0.86, 0.1, 0.02, 0, 0.02, 0, 0, 0],
[0.15, 0.45, 0.3, 0.05, 0.03, 0.02, 0, 0],
[0.05, 0.08, 0.45, 0.3, 0.07, 0.05, 0, 0],
[0.03, 0.02, 0.05, 0.4, 0.35, 0.1, 0.03, 0.02],
[0.03, 0.02, 0.02, 0.05, 0.48, 0.22, 0.12, 0.06],
[0.02, 0.05, 0.05, 0.05, 0.1, 0.45, 0.2, 0.08],
[0.02, 0, 0, 0, 0.08, 0.05, 0.65, 0.2],
[0.05, 0, 0, 0, 0.05, 0, 0.05, 0.85]];


export const ALERT_THRESHOLDS = { watch: 0.25, warning: 0.45, critical: 0.65 };
export const SEVERE_FROM: StateId = 3;
export const UNCERTAIN_ENTROPY = 1.2;

export interface FeatureDef {
  feature: string;
  min: number;
  max: number;
}

export const STATE_FEATURES: Record<StateId, FeatureDef[]> = {
  0: [{ feature: 'n_flows', min: 4, max: 20 }, { feature: 'mean_inter_flow_gap', min: 2, max: 9 }, { feature: 'bytes_out_in_ratio', min: 0.2, max: 0.9 }],
  1: [{ feature: 'unique_dst_ports', min: 40, max: 900 }, { feature: 'port_entropy', min: 3.1, max: 6.8 }, { feature: 'syn_only_ratio', min: 0.55, max: 0.97 }],
  2: [{ feature: 'same_dst_port_count', min: 60, max: 420 }, { feature: 'short_flow_ratio', min: 0.6, max: 0.95 }, { feature: 'rst_ratio', min: 0.3, max: 0.8 }],
  3: [{ feature: 'new_dst_ratio', min: 0.4, max: 0.85 }, { feature: 'fwd_bytes_mean', min: 1800, max: 9400 }, { feature: 'flow_rate', min: 0.8, max: 3.5 }],
  4: [{ feature: 'mean_inter_flow_gap', min: 28, max: 61 }, { feature: 'same_dst_port_count', min: 12, max: 60 }, { feature: 'dst_ip_entropy', min: 0.1, max: 0.6 }],
  5: [{ feature: 'internal_hosts_445_3389', min: 3, max: 14 }, { feature: 'unique_dst_ips', min: 6, max: 30 }, { feature: 'new_dst_ratio', min: 0.5, max: 0.95 }],
  6: [{ feature: 'bytes_out_in_ratio', min: 8, max: 60 }, { feature: 'largest_outbound_bytes', min: 4e6, max: 9e7 }, { feature: 'fwd_bytes_total', min: 1e7, max: 2e8 }],
  7: [{ feature: 'flow_rate', min: 40, max: 400 }, { feature: 'n_flows', min: 900, max: 9000 }, { feature: 'zero_bwd_ratio', min: 0.6, max: 0.98 }]
};

export const FILLER_FEATURES = ['delta_t', 'udp_ratio', 'fin_ratio', 'ack_ratio'];

// Mirror of configs/mitigations.yaml — advisory only; IDs must be verified.
export const COUNTERMEASURES: Record<StateId, Countermeasure[]> = {
  0: [],
  1: [
  { mitigation_id: 'M1031', name: 'Network Intrusion Prevention', note: 'Rate-limit or drop scan sources at the perimeter.' },
  { mitigation_id: 'M1056', name: 'Pre-compromise', note: 'Reduce exposed services visible to scanning.' }],

  2: [
  { mitigation_id: 'M1032', name: 'Multi-factor Authentication', note: 'Enforce MFA on SSH/FTP/web logins under attack.' },
  { mitigation_id: 'M1036', name: 'Account Use Policies', note: 'Lockout after repeated failures.' }],

  3: [
  { mitigation_id: 'M1038', name: 'Execution Prevention', note: 'Application allow-listing on the affected host.' },
  { mitigation_id: 'M1040', name: 'Behavior Prevention on Endpoint', note: 'Enable EDR blocking rules.' }],

  4: [
  { mitigation_id: 'M1031', name: 'Network Intrusion Prevention', note: 'Signature/beacon detection on egress.' },
  { mitigation_id: 'M1037', name: 'Filter Network Traffic', note: 'Block the suspected C2 destination.' }],

  5: [
  { mitigation_id: 'M1030', name: 'Network Segmentation', note: 'Restrict SMB/RDP/WinRM between workstations.' },
  { mitigation_id: 'M1026', name: 'Privileged Account Management', note: 'Rotate admin credentials used on the host.' }],

  6: [
  { mitigation_id: 'M1057', name: 'Data Loss Prevention', note: 'Inspect large outbound transfers.' },
  { mitigation_id: 'M1037', name: 'Filter Network Traffic', note: 'Block unapproved egress destinations.' }],

  7: [
  { mitigation_id: 'M1037', name: 'Filter Network Traffic', note: 'Upstream filtering of flood traffic.' },
  { mitigation_id: 'M1053', name: 'Data Backup', note: 'Confirm recoverable backups exist.' }]

};