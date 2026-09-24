import type { StateId } from '../types/attackcast';

export type WhatIfActionId = 'block_host' | 'isolate_host' | 'block_port' | 'reset_credentials' | 'isolate_campaign_hosts';

export interface WhatIfAction {
  id: WhatIfActionId;
  label: string;
  description: string;
  targetKind: 'host' | 'port' | 'campaign';
  multiHostOnly?: boolean;
  /** Transitions INTO these states are scaled by factor; removed mass goes to Benign (contained). */
  effect?: {states: StateId[];factor: number;};
}

// Mirror of configs/mitigations.yaml policy priors — ASSUMPTIONS, not learned.
export const WHATIF_ACTIONS: WhatIfAction[] = [
{ id: 'block_host', label: 'Block host egress', description: 'Cut the host off from external destinations.', targetKind: 'host', effect: { states: [4, 6], factor: 0.15 } },
{ id: 'isolate_host', label: 'Isolate host', description: 'Quarantine the host from all networks.', targetKind: 'host', effect: { states: [4, 5, 6], factor: 0.05 } },
{ id: 'block_port', label: 'Block port', description: 'Drop traffic on one destination port.', targetKind: 'port' },
{ id: 'reset_credentials', label: 'Reset credentials', description: 'Force password reset for accounts used on the host.', targetKind: 'host', effect: { states: [3, 5], factor: 0.35 } },
{ id: 'isolate_campaign_hosts', label: 'Isolate campaign group', description: 'Quarantine every host in the flagged campaign.', targetKind: 'campaign', multiHostOnly: true, effect: { states: [4, 5, 6], factor: 0.05 } }];


export const PORT_EFFECTS: Record<number, {states: StateId[];factor: number;label: string;}> = {
  22: { states: [2], factor: 0.2, label: 'SSH — brute force path' },
  445: { states: [5], factor: 0.2, label: 'SMB — lateral movement path' },
  3389: { states: [2, 5], factor: 0.25, label: 'RDP — credential + lateral path' },
  443: { states: [4, 6], factor: 0.6, label: 'HTTPS — partial C2/exfil (breaks legit traffic)' },
  4444: { states: [3, 4], factor: 0.2, label: 'Common reverse-shell port' }
};

export const CAMPAIGN_ISOLATION_FACTOR = 0.1;