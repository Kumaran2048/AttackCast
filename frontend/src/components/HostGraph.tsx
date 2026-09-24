import React from 'react';
import type { GraphEdge, GraphNode } from '../types/attackcast';

function riskColor(r: number): string {
  if (r >= 0.65) return 'rgb(var(--crit))';
  if (r >= 0.45) return 'rgb(var(--warn))';
  if (r >= 0.25) return 'rgb(var(--watch))';
  return 'rgb(var(--ok))';
}

export function HostGraph({ nodes, edges }: {nodes: GraphNode[];edges: GraphEdge[];}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  return (
    <svg viewBox="0 0 600 380" className="h-auto w-full" role="img" aria-label="Host interaction graph for the current window">
      {edges.map((e) => {
        const a = byId.get(e.source);
        const b = byId.get(e.target);
        if (!a || !b) return null;
        return (
          <g key={`${e.source}-${e.target}`}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.shared_target ? 'rgb(var(--crit))' : 'rgb(var(--line))'}
              strokeOpacity={e.shared_target ? 0.75 : 1}
              strokeWidth={e.shared_target ? 1 + e.flows * 0.5 : 1.25} />
            
            {e.shared_target &&
            <text x={(a.x + b.x) / 2 - 20} y={(a.y + b.y) / 2 - 4} className="fill-muted font-mono" fontSize={10}>
                {e.flows} flows
              </text>
            }
          </g>);

      })}
      {nodes.map((n) => {
        const r = n.kind === 'target' ? 18 : n.kind === 'external' ? 12 : 8 + n.risk * 10;
        const labelLeft = n.kind === 'host' && n.x < 200;
        return (
          <g key={n.id}>
            {n.kind === 'external' ?
            <rect x={n.x - r} y={n.y - r} width={r * 2} height={r * 2} rx={4} fill="rgb(var(--raised))" stroke="rgb(var(--line))" /> :

            <circle cx={n.x} cy={n.y} r={r} fill={riskColor(n.risk)} fillOpacity={n.kind === 'target' ? 0.25 : 0.9} stroke={n.kind === 'target' ? riskColor(n.risk) : 'rgb(var(--bg))'} strokeWidth={2} />
            }
            <text
              x={labelLeft ? n.x - r - 8 : n.x + r + 8}
              y={n.y + 4}
              textAnchor={labelLeft ? 'end' : 'start'}
              className={`font-mono ${n.kind === 'target' ? 'fill-fg' : 'fill-muted'}`}
              fontSize={11}>
              
              {n.id}
              {n.kind === 'target' ? ' :445' : ''}
            </text>
          </g>);

      })}
    </svg>);

}