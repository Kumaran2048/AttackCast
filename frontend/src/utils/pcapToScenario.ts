import { COUNTERMEASURES, SEVERE_FROM, STATES } from '../data/stateMap';
import type { CampaignUpdate, HostUpdate, Scenario, WindowUpdate } from '../types/attackcast';
import { rolloutHorizons, round, topPaths } from './forecast';
import { levelFor } from './mockStream';
import type { PcapWindow } from './pcapFlows';

export function pcapToScenarioAndUpdates(windows: PcapWindow[], pcapName: string): { scenario: Scenario; updates: WindowUpdate[] } {
  if (!windows.length) {
    throw new Error('No valid windows in PCAP');
  }
  const hosts = [...new Set(windows.map((w) => w.host))];
  const maxIdx = Math.max(...windows.map((w) => w.index));

  const scenario: Scenario = {
    id: `custom-pcap-${Date.now()}`,
    name: `Uploaded PCAP: ${pcapName}`,
    summary: `Live replay stream generated from ${pcapName} capture (${hosts.length} host${hosts.length > 1 ? 's' : ''}, ${maxIdx + 1} windows).`,
    source: `Custom PCAP (${pcapName})`,
    sequence_origin: 'real',
    is_multi_host: hosts.length > 1,
    windows: maxIdx + 1,
    hosts: hosts.map((h) => ({
      entity: h,
      path: Array.from({ length: maxIdx + 1 }, (_, i) => {
        const w = windows.find((x) => x.host === h && x.index === i);
        return w ? w.state : 0;
      }),
      signal: 0.85,
      flipRate: 0.05,
    })),
    campaign: hosts.length > 1 ? {
      target: { ip: hosts[0], port: 445 },
      members: hosts,
      startWindow: 0,
      bystanders: [],
    } : null,
  };

  const updates: WindowUpdate[] = [];
  const sessionId = `sess-pcap-${Date.now()}`;
  const baseTs = Math.floor(Date.now() / 1000);

  for (let w = 0; w <= maxIdx; w++) {
    const hostUpdates: HostUpdate[] = hosts.map((hostEntity) => {
      const pcapWin = windows.find((x) => x.host === hostEntity && x.index === w);
      const curState = (pcapWin ? pcapWin.state : 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
      const ruleNote = pcapWin ? pcapWin.rule : 'no flows in window';

      const belief = new Array(8).fill(0.01);
      belief[curState] = 0.93;
      const horizons = rolloutHorizons(belief, 5);

      const severe = SEVERE_FROM;
      const baseScore = horizons[4].reach_probs[severe];
      const level = levelFor(baseScore);
      const leadIdx = horizons.findIndex((h) => h.reach_probs[severe] >= 0.5);

      const topFeatures = pcapWin ? Object.entries(pcapWin.features).slice(0, 6).map(([k, v], j) => ({
        feature: k,
        value: round(v),
        shap: round(0.8 - j * 0.1),
      })) : [];

      return {
        entity: hostEntity,
        sequence_origin: 'real',
        current_state: {
          id: curState,
          name: STATES[curState].name,
          attack_id: STATES[curState].attackId,
          confidence: 0.93,
        },
        ground_truth_state: {
          id: curState,
          name: STATES[curState].name,
        },
        forecast: {
          K: 5,
          horizons,
          top_paths: topPaths(curState, 5),
          uncertain: false,
          temperature: 1,
        },
        alert: {
          level,
          reason: `P(${STATES[severe].name} within 5 windows) = ${round(baseScore * 100)}%`,
          lead_estimate_windows: leadIdx >= 0 ? leadIdx + 1 : null,
          feedback_adjusted: false,
          base_level: level,
          adjusted_level: level,
          base_score: round(baseScore),
          adjusted_score: round(baseScore),
        },
        explanation: {
          top_features: topFeatures,
          attention: [0.1, 0.1, 0.1, 0.1, 0.6],
          flagged_flows: pcapWin ? pcapWin.flowIds.slice(0, 3).map((fid, i) => ({
            flow_id: fid,
            src_ip: hostEntity,
            dst_ip: '10.0.0.1',
            dst_port: 445,
            proto: 'TCP' as const,
            pkts: 12,
            bytes: 1400,
          })) : [],
          text: `Traffic features consistent with ${STATES[curState].name} (${ruleNote}).`,
        },
        countermeasures: COUNTERMEASURES[curState] ?? [],
      };
    });

    let campaignUpdate: CampaignUpdate | null = null;
    if (hosts.length > 1) {
      const risk = 0.65;
      const member_scores = hosts.map((entity) => {
        const solo = hostUpdates.find((h) => h.entity === entity)?.alert.base_score ?? 0;
        return { entity, solo: round(solo), correlated: round(Math.min(0.95, solo + 0.3)) };
      });

      campaignUpdate = {
        campaign_id: `cmp-pcap-1`,
        member_hosts: hosts,
        shared_target: { ip: hosts[0], port: 445 },
        risk_score: round(risk),
        member_scores,
        forecast: {
          horizons: Array.from({ length: 5 }, (_, i) => ({
            k: i + 1,
            reach_prob_confirmed: round(risk + (1 - risk) * 0.1 * (i + 1)),
          })),
        },
        explanation: {
          top_contributing_hosts: hosts.map((entity) => ({ entity, weight: round(1 / hosts.length) })),
          text: `Shared target activity observed across ${hosts.length} PCAP hosts.`,
        },
      };
    }

    updates.push({
      session_id: sessionId,
      window_id: w,
      t_start: baseTs + w * 30,
      t_end: baseTs + (w + 1) * 30,
      hosts: hostUpdates,
      campaign: campaignUpdate,
      feedback_summary: {
        total_events: 0,
        confirmed: 0,
        dismissed: 0,
        current_false_alarm_rate: 0,
        baseline_false_alarm_rate: 0,
      },
    });
  }

  return { scenario, updates };
}
