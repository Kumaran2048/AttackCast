import React from 'react';
import type { FlaggedFlow } from '../types/attackcast';
import { Panel } from './Panel';

function fmtBytes(b: number): string {
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`;
  if (b >= 1e3) return `${(b / 1e3).toFixed(1)} kB`;
  return `${b} B`;
}

export function FlaggedFlows({ flows }: {flows: FlaggedFlow[];}) {
  return (
    <Panel title="Flagged flows" aside={<span className="font-mono text-xs text-subtle">{flows.length} linked</span>}>
      {flows.length === 0 ?
      <p className="text-sm text-muted">No flows flagged in this window.</p> :

      <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left font-mono text-xs">
            <thead className="text-subtle">
              <tr>
                <th className="pb-2 font-normal">flow_id</th>
                <th className="pb-2 font-normal">src</th>
                <th className="pb-2 font-normal">dst</th>
                <th className="pb-2 font-normal">proto</th>
                <th className="pb-2 text-right font-normal">pkts</th>
                <th className="pb-2 text-right font-normal">bytes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {flows.map((f) =>
            <tr key={f.flow_id} className="text-fg">
                  <td className="py-1.5 text-muted">{f.flow_id}</td>
                  <td className="py-1.5">{f.src_ip}</td>
                  <td className="py-1.5">{f.dst_ip}:{f.dst_port}</td>
                  <td className="py-1.5 text-muted">{f.proto}</td>
                  <td className="py-1.5 text-right">{f.pkts}</td>
                  <td className="py-1.5 text-right">{fmtBytes(f.bytes)}</td>
                </tr>
            )}
            </tbody>
          </table>
        </div>
      }
    </Panel>);

}