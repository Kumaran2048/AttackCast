import React from 'react';

interface PanelProps {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Panel({ title, aside, children, className = '' }: PanelProps) {
  return (
    <section className={`rounded-lg border border-line bg-surface ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="text-sm font-medium text-fg">{title}</h2>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </header>
      <div className="p-4">{children}</div>
    </section>);

}