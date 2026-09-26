import React from 'react';
import type { Countermeasure } from '../types/attackcast';
import { Panel } from './Panel';
import { Tag } from './Tag';

export function CountermeasuresList({ items }: {items: Countermeasure[];}) {
  const list = items || [];
  return (
    <Panel title="Countermeasures" aside={<Tag>advisory</Tag>}>
      {list.length === 0 ?
      <p className="text-sm text-muted">No action suggested for benign traffic.</p> :

      <ul className="space-y-3">
          {list.map((c: any, i: number) => {
            const id = c.mitigation_id || `M10${i + 10}`;
            const title = c.name || c.action || 'Mitigation Action';
            const description = c.note || c.rationale || '';
            return (
              <li key={id + title + i}>
                <p className="text-sm text-fg">
                  <span className="mr-2 font-mono text-xs text-accent">{id}</span>
                  {title}
                </p>
                {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
              </li>
            );
          })}
        </ul>
      }
      <p className="mt-4 text-[11px] text-subtle">Nothing is blocked automatically. Advisory recommendations only.</p>
    </Panel>);

}