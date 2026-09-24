// Flow aggregation + window features + heuristic state rules for the PCAP path.
import type { StateId } from '../types/attackcast';
import { TCP, type Packet } from './pcap';

export interface Flow {
  flow_id: string;
  ts_start: number;
  ts_last: number;
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  proto: 'TCP' | 'UDP';
  fwd_pkts: number;
  bwd_pkts: number;
  fwd_bytes: number;
  bwd_bytes: number;
  syn_cnt: number;
  ack_cnt: number;
  rst_cnt: number;
  fin_cnt: number;
  psh_cnt: number;
  fwd_ack: number;
}

export interface PcapWindow {
  host: string;
  index: number;
  t_start: number;
  features: Record<string, number>;
  state: StateId;
  rule: string;
  flowIds: string[];
}

const key = (p: string, a: string, ap: number, b: string, bp: number) => `${p}|${a}|${ap}|${b}|${bp}`;

/** Bidirectional 5-tuple aggregation; idle timeout 120s, active timeout 300s. */
export function aggregateFlows(packets: Packet[], idle = 120, active = 300): Flow[] {
  const sorted = [...packets].sort((a, b) => a.ts - b.ts);
  const open = new Map<string, Flow>();
  const done: Flow[] = [];
  let seq = 0;
  for (const p of sorted) {
    const fk = key(p.proto, p.src, p.sport, p.dst, p.dport);
    const rk = key(p.proto, p.dst, p.dport, p.src, p.sport);
    let k = fk;
    let f = open.get(fk);
    let fwd = true;
    if (!f && open.has(rk)) {
      f = open.get(rk);
      k = rk;
      fwd = false;
    }
    if (f && (p.ts - f.ts_last > idle || p.ts - f.ts_start > active)) {
      done.push(f);
      open.delete(k);
      f = undefined;
    }
    if (!f) {
      f = { flow_id: `pcap-f${seq++}`, ts_start: p.ts, ts_last: p.ts, src_ip: p.src, dst_ip: p.dst, src_port: p.sport, dst_port: p.dport, proto: p.proto, fwd_pkts: 0, bwd_pkts: 0, fwd_bytes: 0, bwd_bytes: 0, syn_cnt: 0, ack_cnt: 0, rst_cnt: 0, fin_cnt: 0, psh_cnt: 0, fwd_ack: 0 };
      open.set(fk, f);
      fwd = true;
    }
    f.ts_last = p.ts;
    if (fwd) {
      f.fwd_pkts++;
      f.fwd_bytes += p.bytes;
      if (p.flags & TCP.ACK) f.fwd_ack++;
    } else {
      f.bwd_pkts++;
      f.bwd_bytes += p.bytes;
    }
    if (p.flags & TCP.SYN) f.syn_cnt++;
    if (p.flags & TCP.ACK) f.ack_cnt++;
    if (p.flags & TCP.RST) f.rst_cnt++;
    if (p.flags & TCP.FIN) f.fin_cnt++;
    if (p.flags & TCP.PSH) f.psh_cnt++;
  }
  done.push(...open.values());
  return done.sort((a, b) => a.ts_start - b.ts_start);
}

function isInternal(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 192 && b === 168 || a === 172 && b >= 16 && b <= 31;
}

function entropy(values: (string | number)[]): number {
  const counts = new Map<string | number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return -[...counts.values()].reduce((a, c) => a + c / values.length * Math.log2(c / values.length), 0);
}

export function windowFlows(flows: Flow[], seconds = 30): PcapWindow[] {
  if (!flows.length) return [];
  const t0 = flows[0].ts_start;
  const groups = new Map<string, Flow[]>();
  flows.forEach((f) => {
    const k = `${f.src_ip}|${Math.floor((f.ts_start - t0) / seconds)}`;
    groups.set(k, [...(groups.get(k) ?? []), f]);
  });
  return [...groups.entries()].
  map(([k, fs]) => {
    const [host, idx] = k.split('|');
    const index = Number(idx);
    const features = computeFeatures(fs);
    const { state, rule } = classify(features);
    return { host, index, t_start: t0 + index * seconds, features, state, rule, flowIds: fs.map((f) => f.flow_id) };
  }).
  sort((a, b) => a.index - b.index || a.host.localeCompare(b.host));
}

function computeFeatures(fs: Flow[]): Record<string, number> {
  const n = fs.length;
  const out = fs.reduce((a, f) => a + f.fwd_bytes, 0);
  const inn = fs.reduce((a, f) => a + f.bwd_bytes, 0);
  const portCounts = new Map<string, number>();
  fs.forEach((f) => portCounts.set(`${f.dst_ip}:${f.dst_port}`, (portCounts.get(`${f.dst_ip}:${f.dst_port}`) ?? 0) + 1));
  const spread = new Set(fs.filter((f) => isInternal(f.dst_ip) && [22, 445, 3389, 5985].includes(f.dst_port)).map((f) => f.dst_ip));
  return {
    n_flows: n,
    unique_dst_ips: new Set(fs.map((f) => f.dst_ip)).size,
    unique_dst_ports: new Set(fs.map((f) => f.dst_port)).size,
    port_entropy: entropy(fs.map((f) => f.dst_port)),
    syn_only_ratio: fs.filter((f) => f.syn_cnt > 0 && f.fwd_ack === 0).length / n,
    rst_ratio: fs.filter((f) => f.rst_cnt > 0).length / n,
    short_flow_ratio: fs.filter((f) => f.ts_last - f.ts_start < 2).length / n,
    zero_bwd_ratio: fs.filter((f) => f.bwd_pkts === 0).length / n,
    bytes_out_in_ratio: out / Math.max(inn, 1),
    largest_outbound_bytes: Math.max(...fs.map((f) => f.fwd_bytes)),
    same_dst_port_max: Math.max(...portCounts.values()),
    internal_spread: spread.size
  };
}

// Heuristic rules — documented in Data & States; flagged state_source = "heuristic".
export function classify(f: Record<string, number>): {state: StateId;rule: string;} {
  if (f.largest_outbound_bytes >= 5e5 && f.bytes_out_in_ratio >= 5) return { state: 6, rule: 'largest_outbound ≥ 500 kB and out/in ≥ 5' };
  if (f.internal_spread >= 3) return { state: 5, rule: '≥ 3 internal hosts on 22/445/3389/5985' };
  if (f.unique_dst_ports >= 20 && f.syn_only_ratio >= 0.5) return { state: 1, rule: '≥ 20 dst ports and SYN-only ≥ 50%' };
  if (f.same_dst_port_max >= 15 && f.short_flow_ratio >= 0.5) return { state: 2, rule: '≥ 15 short flows to one service' };
  return { state: 0, rule: 'no rule matched' };
}