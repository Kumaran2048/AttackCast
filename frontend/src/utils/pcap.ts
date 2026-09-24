// Minimal in-browser libpcap reader/writer (Ethernet, raw IP, Linux SLL; IPv4 TCP/UDP).
// Mirrors backend/ml/ingest/pcap_to_flows.py so the PCAP path can be demoed offline.

export interface Packet {
  ts: number;
  src: string;
  dst: string;
  sport: number;
  dport: number;
  proto: 'TCP' | 'UDP';
  bytes: number;
  flags: number;
}

export interface ParseResult {
  packets: Packet[];
  total: number;
  skipped: number;
  linktype: number;
}

export class PcapError extends Error {}

export const TCP = { FIN: 1, SYN: 2, RST: 4, PSH: 8, ACK: 16 };

export function parsePcap(buf: ArrayBuffer): ParseResult {
  if (buf.byteLength < 24) throw new PcapError('File is too small to be a PCAP.');
  const dv = new DataView(buf);
  const magic = dv.getUint32(0, true);
  let le = true;
  let nano = false;
  if (magic === 0xa1b2c3d4) le = true;else
  if (magic === 0xa1b23c4d) nano = true;else
  if (magic === 0xd4c3b2a1) le = false;else
  if (magic === 0x4d3cb2a1) {
    le = false;
    nano = true;
  } else if (magic === 0x0a0d0d0a) throw new PcapError('pcapng is not supported yet. Convert first: editcap -F pcap in.pcapng out.pcap');else
  throw new PcapError('Not a PCAP file (unrecognised magic number).');

  const linktype = dv.getUint32(20, le);
  if (![1, 101, 113].includes(linktype)) throw new PcapError(`Unsupported link type ${linktype}. Supported: Ethernet (1), raw IP (101), Linux SLL (113).`);

  const packets: Packet[] = [];
  let off = 24;
  let total = 0;
  let skipped = 0;
  while (off + 16 <= buf.byteLength) {
    const sec = dv.getUint32(off, le);
    const frac = dv.getUint32(off + 4, le);
    const incl = dv.getUint32(off + 8, le);
    off += 16;
    if (off + incl > buf.byteLength) break;
    total++;
    const p = decode(dv, off, incl, linktype, sec + frac / (nano ? 1e9 : 1e6));
    if (p) packets.push(p);else
    skipped++;
    off += incl;
  }
  return { packets, total, skipped, linktype };
}

function decode(dv: DataView, start: number, len: number, linktype: number, ts: number): Packet | null {
  const end = start + len;
  let ip = start;
  if (linktype === 1) {
    if (start + 14 > end) return null;
    let et = dv.getUint16(start + 12);
    ip = start + 14;
    if (et === 0x8100) {
      et = dv.getUint16(start + 16);
      ip = start + 18;
    }
    if (et !== 0x0800) return null;
  } else if (linktype === 113) {
    if (start + 16 > end || dv.getUint16(start + 14) !== 0x0800) return null;
    ip = start + 16;
  }
  if (ip + 20 > end) return null;
  const vihl = dv.getUint8(ip);
  if (vihl >> 4 !== 4) return null;
  const l4 = ip + (vihl & 15) * 4;
  const bytes = dv.getUint16(ip + 2);
  const proto = dv.getUint8(ip + 9);
  const src = ipStr(dv, ip + 12);
  const dst = ipStr(dv, ip + 16);
  if (proto === 6 && l4 + 14 <= end) {
    return { ts, src, dst, sport: dv.getUint16(l4), dport: dv.getUint16(l4 + 2), proto: 'TCP', bytes, flags: dv.getUint8(l4 + 13) };
  }
  if (proto === 17 && l4 + 4 <= end) {
    return { ts, src, dst, sport: dv.getUint16(l4), dport: dv.getUint16(l4 + 2), proto: 'UDP', bytes, flags: 0 };
  }
  return null;
}

function ipStr(dv: DataView, o: number): string {
  return `${dv.getUint8(o)}.${dv.getUint8(o + 1)}.${dv.getUint8(o + 2)}.${dv.getUint8(o + 3)}`;
}

// ---------- SYNTHETIC sample writer ----------

interface Spec {
  ts: number;
  src: string;
  dst: string;
  sport: number;
  dport: number;
  flags: number;
  payload: number;
}

const HDR = 54; // eth 14 + ip 20 + tcp 20; payload is not stored (snaplen-style)

function writePacket(u8: Uint8Array, dv: DataView, o: number, s: Spec) {
  dv.setUint16(o + 12, 0x0800);
  const ip = o + 14;
  dv.setUint8(ip, 0x45);
  dv.setUint16(ip + 2, 40 + s.payload);
  dv.setUint8(ip + 8, 64);
  dv.setUint8(ip + 9, 6);
  u8.set(s.src.split('.').map(Number), ip + 12);
  u8.set(s.dst.split('.').map(Number), ip + 16);
  const tcp = ip + 20;
  dv.setUint16(tcp, s.sport);
  dv.setUint16(tcp + 2, s.dport);
  dv.setUint8(tcp + 12, 0x50);
  dv.setUint8(tcp + 13, s.flags);
  dv.setUint16(tcp + 14, 65535);
}

/** Builds a small SYNTHETIC capture: port scan, SSH brute-force burst, bulk outbound transfer. */
export function generateSamplePcap(): ArrayBuffer {
  const A = '10.0.0.66';
  const V = '10.0.0.10';
  const B = '10.0.0.77';
  const X = '198.51.100.23';
  const { SYN, ACK, RST, PSH } = TCP;
  const specs: Spec[] = [];
  const t0 = 1_700_000_000;

  for (let p = 1; p <= 80; p++) {
    const ts = t0 + p * 0.1;
    specs.push({ ts, src: A, dst: V, sport: 51000, dport: p, flags: SYN, payload: 0 });
    specs.push({ ts: ts + 0.001, src: V, dst: A, sport: p, dport: 51000, flags: RST | ACK, payload: 0 });
  }
  for (let i = 0; i < 30; i++) {
    const ts = t0 + 35 + i * 0.8;
    const sp = 52000 + i;
    specs.push({ ts, src: A, dst: V, sport: sp, dport: 22, flags: SYN, payload: 0 });
    specs.push({ ts: ts + 0.01, src: V, dst: A, sport: 22, dport: sp, flags: SYN | ACK, payload: 0 });
    specs.push({ ts: ts + 0.02, src: A, dst: V, sport: sp, dport: 22, flags: ACK, payload: 0 });
    specs.push({ ts: ts + 0.1, src: A, dst: V, sport: sp, dport: 22, flags: PSH | ACK, payload: 40 });
    specs.push({ ts: ts + 0.2, src: V, dst: A, sport: 22, dport: sp, flags: PSH | ACK, payload: 60 });
    specs.push({ ts: ts + 0.3, src: V, dst: A, sport: 22, dport: sp, flags: RST, payload: 0 });
  }
  specs.push({ ts: t0 + 70, src: B, dst: X, sport: 53000, dport: 443, flags: SYN, payload: 0 });
  specs.push({ ts: t0 + 70.02, src: X, dst: B, sport: 443, dport: 53000, flags: SYN | ACK, payload: 0 });
  for (let i = 0; i < 700; i++) {
    const ts = t0 + 70.05 + i * 0.02;
    specs.push({ ts, src: B, dst: X, sport: 53000, dport: 443, flags: PSH | ACK, payload: 1400 });
    if (i % 10 === 0) specs.push({ ts: ts + 0.005, src: X, dst: B, sport: 443, dport: 53000, flags: ACK, payload: 0 });
  }

  specs.sort((a, b) => a.ts - b.ts);
  const buf = new ArrayBuffer(24 + specs.length * (16 + HDR));
  const dv = new DataView(buf);
  const u8 = new Uint8Array(buf);
  dv.setUint32(0, 0xa1b2c3d4, true);
  dv.setUint16(4, 2, true);
  dv.setUint16(6, 4, true);
  dv.setUint32(16, 65535, true);
  dv.setUint32(20, 1, true);
  let o = 24;
  specs.forEach((s) => {
    const sec = Math.floor(s.ts);
    dv.setUint32(o, sec, true);
    dv.setUint32(o + 4, Math.round((s.ts - sec) * 1e6), true);
    dv.setUint32(o + 8, HDR, true);
    dv.setUint32(o + 12, HDR + s.payload, true);
    writePacket(u8, dv, o + 16, s);
    o += 16 + HDR;
  });
  return buf;
}