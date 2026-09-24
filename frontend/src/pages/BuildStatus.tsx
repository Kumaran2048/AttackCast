import React from 'react';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { Panel } from '../components/Panel';
import { Tag } from '../components/Tag';
import { FEEDBACK_RULE_TEXT, PROTOTYPE_SCOPE, REPO_TREE, RISK_DECISIONS } from '../data/buildStatus';

const STATUS_TONE = { decided: 'accent', 'needs-verification': 'heuristic', prototyped: 'synthetic' } as const;

export function BuildStatus() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-fg">Build status</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          What runs in this web build, and what still needs the Python backend and real datasets. Every metric shown is computed by code in this build, on synthetic data.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Covered in this build">
          <ul className="space-y-2">
            {PROTOTYPE_SCOPE.covered.map((c) =>
            <li key={c} className="flex gap-2 text-sm text-fg"><CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-ok" aria-hidden />{c}</li>
            )}
          </ul>
        </Panel>
        <Panel title="Needs your local environment">
          <ul className="space-y-2">
            {PROTOTYPE_SCOPE.notCovered.map((c) =>
            <li key={c} className="flex gap-2 text-sm text-muted"><MinusIcon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />{c}</li>
            )}
          </ul>
        </Panel>
      </div>

      <Panel title="Risk decisions">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr>
                <th className="w-56 pb-2 font-normal">Risk</th>
                <th className="pb-2 font-normal">Decision</th>
                <th className="w-36 pb-2 text-right font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line align-top">
              {RISK_DECISIONS.map((r) =>
              <tr key={r.risk}>
                  <td className="py-3 pr-4 text-fg">{r.risk}</td>
                  <td className="py-3 pr-4 text-muted">{r.decision}</td>
                  <td className="py-3 text-right"><Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Repository layout">
          <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed text-muted">{REPO_TREE}</pre>
        </Panel>
        <Panel title="Extra B · online update rule">
          <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-muted">{FEEDBACK_RULE_TEXT}</pre>
        </Panel>
      </div>
    </div>);

}