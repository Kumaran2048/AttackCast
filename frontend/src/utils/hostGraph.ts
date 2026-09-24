import type { Scenario } from '../data/scenarios';
import type { GraphEdge, GraphNode, WindowUpdate } from '../types/attackcast';
import { memberFlows } from './mockStream';

// Fixed layout stands in for the backend's seeded NetworkX spring_layout (Phase 0 decision).
export function buildHostGraph(sc: Scenario, update: WindowUpdate): {nodes: GraphNode[];edges: GraphEdge[];} {
  const c = sc.campaign;
  if (!c || !update.campaign) return { nodes: [], edges: [] };
  const w = update.window_id;
  const active = w >= c.startWindow;
  const scores = update.campaign.member_scores;
  const step = 300 / (c.members.length - 1);

  const nodes: GraphNode[] = [
  ...c.members.map((id, i) => ({
    id,
    kind: 'host' as const,
    x: 140,
    y: 40 + i * step,
    risk: scores.find((s) => s.entity === id)?.correlated ?? 0,
    in_campaign: active
  })),
  { id: c.target.ip, kind: 'target', x: 470, y: 190, risk: update.campaign.risk_score, in_campaign: active },
  ...c.bystanders.map((id, i) => ({ id, kind: 'host' as const, x: 300, y: i === 0 ? 30 : 350, risk: 0.05, in_campaign: false })),
  { id: 'external', kind: 'external', x: 520, y: 330, risk: 0.02, in_campaign: false }];


  const edges: GraphEdge[] = [
  ...(active ?
  c.members.map((m) => ({ source: m, target: c.target.ip, flows: memberFlows(sc.id, m, w), port: c.target.port, shared_target: true })) :
  []),
  ...c.bystanders.map((b) => ({ source: b, target: 'external', flows: 6, port: 443, shared_target: false }))];


  return { nodes, edges };
}