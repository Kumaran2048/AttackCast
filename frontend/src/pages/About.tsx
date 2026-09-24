import React from 'react';
import { Panel } from '../components/Panel';

interface Box {
  label: string;
  sub: string;
  x: number;
  y: number;
  tone?: 'accent' | 'extra';
}

const W = 150;
const H = 52;

const BOXES: Box[] = [
{ label: 'PCAP / CSV', sub: 'Scapy · CIC · CTU', x: 10, y: 20 },
{ label: 'Canonical flows', sub: 'one schema', x: 190, y: 20 },
{ label: 'Windows + features', sub: '30s per host', x: 370, y: 20 },
{ label: 'Host graph', sub: 'who talked to whom', x: 550, y: 20, tone: 'extra' },
{ label: 'Host encoder', sub: 'MLP → GRU + attention', x: 370, y: 120 },
{ label: 'Graph layer', sub: 'GraphSAGE / fallback', x: 550, y: 120, tone: 'extra' },
{ label: 'Transition heads', sub: 'per host + campaign', x: 730, y: 120 },
{ label: 'K-step rollout', sub: 'Monte Carlo · calibrated', x: 730, y: 220 },
{ label: 'Explain', sub: 'SHAP · attention · flows', x: 550, y: 220 },
{ label: 'Feedback adjust', sub: 'session-only bias', x: 370, y: 220, tone: 'extra' },
{ label: 'Analyst console', sub: 'WebSocket stream', x: 190, y: 220, tone: 'accent' }];


const LINKS: [number, number][] = [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [3, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]];

function center(b: Box) {
  return { x: b.x + W / 2, y: b.y + H / 2 };
}

export function About() {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-semibold text-fg">About AttackCast</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          AttackCast watches network traffic and forecasts an attacker's next steps, before the attack finishes, instead of labelling flows after the fact.
        </p>
      </header>

      <Panel title="Architecture">
        <div className="overflow-x-auto">
          <svg viewBox="0 0 900 290" className="h-auto w-full min-w-[720px]" role="img" aria-label="AttackCast pipeline from packet capture to analyst console">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="rgb(var(--subtle))" />
              </marker>
            </defs>
            {LINKS.map(([a, b]) => {
              const p = center(BOXES[a]);
              const q = center(BOXES[b]);
              const horizontal = Math.abs(p.y - q.y) < 1;
              const dx = horizontal ? q.x > p.x ? W / 2 : -W / 2 : 0;
              const dy = horizontal ? 0 : q.y > p.y ? H / 2 : -H / 2;
              return <line key={`${a}-${b}`} x1={p.x + dx} y1={p.y + dy} x2={q.x - dx} y2={q.y - dy} stroke="rgb(var(--subtle))" strokeWidth={1.25} markerEnd="url(#arrow)" />;
            })}
            {BOXES.map((b) =>
            <g key={b.label}>
                <rect
                x={b.x}
                y={b.y}
                width={W}
                height={H}
                rx={6}
                fill="rgb(var(--raised))"
                stroke={b.tone === 'extra' ? 'rgb(var(--warn))' : b.tone === 'accent' ? 'rgb(var(--accent))' : 'rgb(var(--line))'} />
              
                <text x={b.x + 12} y={b.y + 22} className="fill-fg" fontSize={13}>{b.label}</text>
                <text x={b.x + 12} y={b.y + 39} className="fill-muted font-mono" fontSize={10}>{b.sub}</text>
              </g>
            )}
          </svg>
        </div>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted"><span className="h-3 w-3 rounded-sm border border-warn" aria-hidden />Orange outline marks the two differentiators: cross-host correlation and live feedback.</p>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title="Forecast, not detect">
          <p className="text-sm leading-relaxed text-muted">
            Each 30-second slice of a host's traffic is mapped to a MITRE ATT&CK stage. A world model learns how attackers move between stages and simulates the next few windows, so an analyst sees "likely exfiltration within two minutes" while there is still time to act.
          </p>
        </Panel>
        <Panel title="See the whole network">
          <p className="text-sm leading-relaxed text-muted">
            Five hosts each making a few quiet connections to the same server look harmless one at a time. A graph layer mixes each host's state with its neighbours', and a campaign score flags the group together.
          </p>
        </Panel>
        <Panel title="Learns from the analyst">
          <p className="text-sm leading-relaxed text-muted">
            Confirm or dismiss any alert. The session adjusts its thresholds per stage immediately, without retraining, and every change is logged. Nothing is ever blocked automatically.
          </p>
        </Panel>
      </div>

      <Panel title="Cloud Deployment & Live API">
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted marker:text-subtle">
          <li>
            <strong className="text-fg">Cloud Backend:</strong> Live on Render at{' '}
            <a
              href="https://attackcast.onrender.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline font-mono"
            >
              https://attackcast.onrender.com
            </a>{' '}
            (FastAPI + Async WebSockets + PyTorch GRU World Model).
          </li>
          <li>
            <strong className="text-fg">Real Dataset:</strong> Ingested 2,520,751 flows from CICIDS-2017 mapped to 8 MITRE ATT&CK stages.
          </li>
          <li>
            <strong className="text-fg">Swagger API Documentation:</strong>{' '}
            <a
              href="https://attackcast.onrender.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline font-mono"
            >
              https://attackcast.onrender.com/docs
            </a>
          </li>
        </ul>
      </Panel>
    </div>);
}