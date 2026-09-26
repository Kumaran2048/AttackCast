import { STATES } from '../data/stateMap';
import type { HostUpdate, Scenario, WindowUpdate } from '../types/attackcast';
import { rolloutHorizons } from './forecast';
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

  for (let w = 0; w <= maxIdx; w++) {
    const hostUpdates: HostUpdate[] = hosts.map((hostEntity) => {
      const pcapWin = windows.find((x) => x.host === hostEntity && x.index === w);
      const curState = pcapWin ? pcapWin.state : 0;
      const ruleNote = pcapWin ? pcapWin.rule : 'no flows in window';

      const belief = new Array(8).fill(0.01);
      belief[curState] = 0.93;
      const horizons = rolloutHorizons(belief, 5);

      const level = curState === 0 ? 'none' : curState === 1 ? 'watch' : curState < 6 ? 'warning' : 'critical';

      return {
        entity: hostEntity,
        sequence_origin: 'real',
        current_state: {
          id: curState,
          name: STATES[curState].name,
          attack_id: STATES[curState].attack_id,
          confidence: 'high',
        },
        ground_truth_state: {
          id: curState,
          name: STATES[curState].name,
        },
        forecast: {
          K: 5,
          horizons,
          top_paths: [{ states: [STATES[curState].name, STATES[Math.min(7, curState + 1)].name], probability: 0.75 }],
        },
        alert: {
          base_level: level,
          adjusted_level: level,
          reason: `Flow pattern matches ${STATES[curState].name} (${ruleNote}). Evaluated on PCAP stream.`,
          lead_estimate_windows: Math.max(0, 5 - curState),
          watch_threshold: 0.2,
        },
        explanation: {
          top_features: pcapWin ? Object.entries(pcapWin.features).slice(0, 6).map(([k, v], j) => ({
            feature: k,
            value: Number(v.toFixed(2)),
            shap: Number((0.8 - j * 0.1).toFixed(3)),
          })) : [],
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
        countermeasures: [
          { action: `Isolate ${hostEntity}`, mitigation_id: 'M1037', rationale: `Quarantine host to block escalation from ${STATES[curState].name}.` }
        ],
      };
    });

    const highestStateHost = hostUpdates.reduce((acc, h) => h.current_state.id > acc.current_state.id ? h : acc, hostUpdates[0]);

    updates.push({
      session_id: sessionId,
      window_id: w,
      t_start: new Date(Date.now() + w * 30000).toISOString(),
      t_end: new Date(Date.now() + (w + 1) * 30000).toISOString(),
      hosts: hostUpdates,
      feedback_summary: {
        total_events: 0,
        confirmed: 0,
        dismissed: 0,
        current_false_alarm_rate: 0,
        baseline_false_alarm_rate: 0,
      },
      campaign: hosts.length > 1 ? {
        campaign_id: `cmp-pcap-${w}`,
        member_hosts: hosts,
        score: Math.min(1, highestStateHost.current_state.id * 0.15 + 0.1),
        target: { ip: hosts[0], port: 445 },
        alert_level: highestStateHost.alert.adjusted_level,
      } : undefined,
    });
  }

  return { scenario, updates };
}
