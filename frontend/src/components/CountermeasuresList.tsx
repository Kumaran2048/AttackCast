import React from 'react';
import type { Countermeasure } from '../types/attackcast';
import { Panel } from './Panel';
import { Tag } from './Tag';

export function CountermeasuresList({ items }: {items: Countermeasure[];}) {
  return (
    <Panel title="Countermeasures" aside={<Tag>advisory</Tag>}>
      {items.length === 0 ?
      <p className="text-sm text-muted">No action suggested for benign traffic.</p> :

      <ul className="space-y-3">
          {items.map((c) =>
        <li key={c.mitigation_id + c.name}>
              <p className="text-sm text-fg">
                <span className="mr-2 font-mono text-xs text-accent">{c.mitigation_id}</span>
                {c.name}
              </p>
              <p className="mt-0.5 text-xs text-muted">{c.note}</p>
            </li>
        )}
        </ul>
      }
      <p className="mt-4 text-[11px] text-subtle">Nothing is blocked automatically. MITRE mitigation IDs pending verification.</p>
    </Panel>);

}