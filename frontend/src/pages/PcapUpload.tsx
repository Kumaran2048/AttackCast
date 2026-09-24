import React, { useMemo, useRef, useState } from 'react';
import { DownloadIcon, FileUpIcon, FlaskConicalIcon, LoaderCircleIcon } from 'lucide-react';
import { Panel } from '../components/Panel';
import { ReachHeatmap } from '../components/ReachHeatmap';
import { Tag } from '../components/Tag';
import { STATES } from '../data/stateMap';
import { rolloutHorizons } from '../utils/forecast';
import { generateSamplePcap, parsePcap, PcapError, type ParseResult } from '../utils/pcap';
import { aggregateFlows, windowFlows, type Flow, type PcapWindow } from '../utils/pcapFlows';

interface Analysis {
  name: string;
  synthetic: boolean;
  parse: ParseResult;
  flows: Flow[];
  windows: PcapWindow[];
}

const MAX_BYTES = 50 * 1024 * 1024;
const FEATURE_COLS = ['n_flows', 'unique_dst_ports', 'syn_only_ratio', 'same_dst_port_max', 'bytes_out_in_ratio', 'internal_spread'];

export function PcapUpload() {
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const analyze = (buf: ArrayBuffer, name: string, synthetic: boolean) => {
    setStatus('running');
    window.setTimeout(() => {
      try {
        const parse = parsePcap(buf);
        if (!parse.packets.length) throw new PcapError('No IPv4 TCP/UDP packets found in this capture.');
        const flows = aggregateFlows(parse.packets);
        setAnalysis({ name, synthetic, parse, flows, windows: windowFlows(flows) });
        setStatus('done');
      } catch (e) {
        setError(e instanceof PcapError ? e.message : 'Could not read this file.');
        setStatus('error');
      }
    }, 20);
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setError('File is larger than 50 MB. Use a smaller capture for the in-browser demo.');
      setStatus('error');
      return;
    }
    analyze(await file.arrayBuffer(), file.name, false);
  };

  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([generateSamplePcap()], { type: 'application/vnd.tcpdump.pcap' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attackcast-synthetic-sample.pcap';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-fg">PCAP analysis</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Packets are parsed in your browser, grouped into flows (idle 120s, active 300s), split into 30s windows per host, and labelled with the heuristic stage rules. Nothing is uploaded anywhere.
        </p>
      </header>

      <div
        onDragOver={(e) => {e.preventDefault();setDragging(true);}}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {e.preventDefault();setDragging(false);onFile(e.dataTransfer.files[0]);}}
        className={`flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center transition-colors duration-150 md:flex-row md:text-left ${dragging ? 'border-accent bg-accent/5' : 'border-line bg-surface'}`}>
        
        <FileUpIcon className="h-8 w-8 shrink-0 text-subtle" aria-hidden />
        <div className="flex-1">
          <p className="text-sm text-fg">Drop a .pcap file here, or choose one</p>
          <p className="text-xs text-muted">libpcap format · Ethernet, raw IP or Linux SLL · IPv4 TCP/UDP · up to 50 MB</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <input ref={input} type="file" accept=".pcap,.cap" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choose PCAP file" />
          <button type="button" onClick={() => input.current?.click()} className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg transition-opacity duration-150 hover:opacity-90">
            Choose file
          </button>
          <button type="button" onClick={() => analyze(generateSamplePcap(), 'synthetic-sample.pcap', true)} className="flex items-center gap-1.5 rounded-md border border-line bg-raised px-3 py-2 text-sm text-fg transition-colors duration-150 hover:bg-line">
            <FlaskConicalIcon className="h-4 w-4" aria-hidden /> Use synthetic sample
          </button>
          <button type="button" onClick={downloadSample} aria-label="Download synthetic sample PCAP" title="Download synthetic sample PCAP" className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors duration-150 hover:bg-raised hover:text-fg">
            <DownloadIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {status === 'running' &&
      <div role="status" className="flex items-center gap-3 rounded-lg border border-line bg-surface p-5 text-sm text-muted">
          <LoaderCircleIcon className="h-5 w-5 animate-spin text-accent" aria-hidden /> Parsing packets and building flows…
        </div>
      }
      {status === 'error' && <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 p-4 text-sm text-crit">{error}</div>}
      {status === 'done' && analysis && <Results a={analysis} />}
    </div>);

}

function Results({ a }: {a: Analysis;}) {
  const worst = useMemo(() => a.windows.reduce((w, x) => x.state > w.state ? x : w, a.windows[0]), [a.windows]);
  const horizons = useMemo(() => {
    const belief = new Array(8).fill(0);
    belief[worst.state] += 0.8;
    belief[0] += 0.2;
    return rolloutHorizons(belief, 5);
  }, [worst]);
  const hosts = [...new Set(a.windows.map((w) => w.host))];
  const maxIdx = Math.max(...a.windows.map((w) => w.index));

  return (
    <>
      <section className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-surface p-5 md:grid-cols-5">
        <div className="col-span-2 md:col-span-1">
          <p className="truncate font-mono text-sm text-fg">{a.name}</p>
          {a.synthetic ? <Tag tone="synthetic">synthetic</Tag> : <Tag>uploaded</Tag>}
        </div>
        <Stat value={a.parse.total} label="packets" />
        <Stat value={a.parse.skipped} label="skipped (non-IPv4 / other)" />
        <Stat value={a.flows.length} label="flows" />
        <Stat value={a.windows.length} label="host-windows" />
      </section>

      <Panel title="Heuristic stage per host and window" aside={<Tag tone="heuristic">heuristic rules</Tag>}>
        <div className="space-y-2">
          {hosts.map((h) =>
          <div key={h} className="flex items-center gap-3">
              <span className="w-32 shrink-0 truncate font-mono text-xs text-fg">{h}</span>
              <div className="grid flex-1 gap-px" style={{ gridTemplateColumns: `repeat(${maxIdx + 1}, minmax(0, 1fr))` }}>
                {Array.from({ length: maxIdx + 1 }, (_, i) => {
                const w = a.windows.find((x) => x.host === h && x.index === i);
                return (
                  <div key={i} title={w ? `w${i} · ${STATES[w.state].name} · ${w.rule}` : `w${i} · no flows`} className="flex h-7 items-center justify-center rounded-sm font-mono text-[10px] text-fg" style={{ backgroundColor: w ? STATES[w.state].color : 'rgb(var(--raised))' }}>
                      {w ? STATES[w.state].short : ''}
                    </div>);

              })}
              </div>
            </div>
          )}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-12">
        <Panel title="Window features" className="min-w-0 xl:col-span-7">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-right font-mono text-xs">
              <thead className="text-subtle">
                <tr>
                  <th className="pb-2 text-left font-normal">host · window</th>
                  <th className="pb-2 text-left font-normal">stage</th>
                  {FEATURE_COLS.map((c) => <th key={c} className="pb-2 font-normal">{c}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {a.windows.slice(0, 40).map((w) =>
                <tr key={`${w.host}-${w.index}`}>
                    <td className="py-1.5 text-left text-fg">{w.host} · w{w.index}</td>
                    <td className="py-1.5 text-left" title={w.rule}><span style={{ color: w.state ? STATES[w.state].color : undefined }} className={w.state ? '' : 'text-muted'}>{STATES[w.state].short}</span></td>
                    {FEATURE_COLS.map((c) => <td key={c} className="py-1.5 text-fg">{fmt(w.features[c])}</td>)}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {a.windows.length > 40 && <p className="mt-2 text-xs text-subtle">Showing 40 of {a.windows.length} windows.</p>}
        </Panel>

        <Panel title={`Forecast from most severe window`} className="min-w-0 xl:col-span-5" aside={<Tag tone="mock">prior rollout</Tag>}>
          <p className="mb-3 text-xs text-muted">
            {worst.host} · w{worst.index} labelled <span className="text-fg">{STATES[worst.state].name}</span> ({worst.rule}).
          </p>
          <ReachHeatmap horizons={horizons} compact />
        </Panel>
      </div>
    </>);

}

function Stat({ value, label }: {value: number;label: string;}) {
  return (
    <div>
      <p className="font-mono text-xl text-fg">{value.toLocaleString()}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>);

}

function fmt(v: number): string {
  if (v >= 1000) return v.toExponential(1);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}