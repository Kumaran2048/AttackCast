// Mirrors backend/app/schemas.py (section 10.1 WindowUpdate contract).
// Extension vs spec: CampaignUpdate.member_scores (solo vs correlated per host),
// Alert.base_score / adjusted_score — needed to show "individually low, collectively flagged".

export type StateId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type SequenceOrigin = 'natural' | 'synthetic';
export type AlertLevel = 'none' | 'watch' | 'warning' | 'critical';
export type FeedbackAction = 'confirm' | 'dismiss';

export interface AttackState {
  id: StateId;
  name: string;
  short: string;
  tactic: string;
  attackId: string;
  technique: string;
  confidence: 'high' | 'medium' | 'heuristic';
  color: string;
}

export interface Horizon {
  k: number;
  state_probs: number[];
  reach_probs: number[];
}

export interface ForecastPath {
  states: StateId[];
  prob: number;
}

export interface Forecast {
  K: number;
  horizons: Horizon[];
  top_paths: ForecastPath[];
  uncertain: boolean;
  temperature: number;
}

export interface Alert {
  level: AlertLevel;
  reason: string;
  lead_estimate_windows: number | null;
  feedback_adjusted: boolean;
  base_level: AlertLevel;
  adjusted_level: AlertLevel;
  base_score: number;
  adjusted_score: number;
}

export interface FeatureAttribution {
  feature: string;
  value: number;
  shap: number;
}

export interface FlaggedFlow {
  flow_id: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  proto: 'TCP' | 'UDP';
  pkts: number;
  bytes: number;
}

export interface Explanation {
  top_features: FeatureAttribution[];
  attention: number[];
  flagged_flows: FlaggedFlow[];
  text: string;
}

export interface Countermeasure {
  mitigation_id: string;
  name: string;
  note: string;
}

export interface HostUpdate {
  entity: string;
  sequence_origin: SequenceOrigin;
  current_state: {id: StateId;name: string;attack_id: string;confidence: number;};
  ground_truth_state: {id: StateId;name: string;} | null;
  forecast: Forecast;
  alert: Alert;
  explanation: Explanation;
  countermeasures: Countermeasure[];
}

export interface MemberScore {
  entity: string;
  solo: number;
  correlated: number;
}

export interface CampaignUpdate {
  campaign_id: string;
  member_hosts: string[];
  shared_target: {ip: string;port: number;} | null;
  risk_score: number;
  member_scores: MemberScore[];
  forecast: {horizons: {k: number;reach_prob_confirmed: number;}[];};
  explanation: {top_contributing_hosts: {entity: string;weight: number;}[];text: string;};
}

export interface FeedbackSummary {
  total_events: number;
  confirmed: number;
  dismissed: number;
  current_false_alarm_rate: number;
  baseline_false_alarm_rate: number;
}

export interface WindowUpdate {
  session_id: string;
  window_id: number;
  t_start: number;
  t_end: number;
  hosts: HostUpdate[];
  campaign: CampaignUpdate | null;
  feedback_summary: FeedbackSummary;
}

export interface FeedbackEvent {
  id: number;
  window_id: number;
  host: string;
  state_id: StateId;
  action: FeedbackAction;
  level_at_click: AlertLevel;
  bias_before: number;
  bias_after: number;
  watch_threshold_before: number;
  watch_threshold_after: number;
}

export interface GraphNode {
  id: string;
  kind: 'host' | 'target' | 'external';
  x: number;
  y: number;
  risk: number;
  in_campaign: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  flows: number;
  port: number;
  shared_target: boolean;
}