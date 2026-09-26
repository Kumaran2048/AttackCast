import React, { useState } from 'react';
import {
  ActivityIcon, DatabaseIcon, FlaskConicalIcon, GaugeIcon,
  InfoIcon, ListChecksIcon, NetworkIcon, RadarIcon,
  UploadIcon, XIcon, ChevronLeftIcon, ChevronRightIcon, MenuIcon,
} from 'lucide-react';

export type PageId = 'monitor' | 'campaign' | 'whatif' | 'performance' | 'data' | 'pcap' | 'about';

const NAV: { id: PageId; label: string; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }[] = [
  { id: 'monitor',     label: 'Live Monitor',     Icon: ActivityIcon },
  { id: 'campaign',    label: 'Campaign',          Icon: NetworkIcon },
  { id: 'whatif',      label: 'What-If',           Icon: FlaskConicalIcon },
  { id: 'performance', label: 'Model Performance', Icon: GaugeIcon },
  { id: 'data',        label: 'Data & States',     Icon: DatabaseIcon },
  { id: 'pcap',        label: 'PCAP Upload',       Icon: UploadIcon },
  { id: 'about',       label: 'About',             Icon: InfoIcon },
];

interface SidebarProps {
  page: PageId;
  onNavigate: (p: PageId) => void;
}

// This hook + state is exported so App can render the mobile topbar in the right place
export function useSidebar() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return { open, setOpen, collapsed, setCollapsed };
}

export function MobileTopbar({ onOpen }: { onOpen: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
      <div className="flex items-center gap-2">
        <RadarIcon className="h-5 w-5 text-accent" aria-hidden />
        <span className="font-semibold tracking-tight text-fg">AttackCast</span>
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
        aria-label="Open menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>
    </header>
  );
}

export function Sidebar({ page, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleNav = (id: PageId) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ── MOBILE TOPBAR (only visible on small screens, part of main column) ── */}
      <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <RadarIcon className="h-5 w-5 text-accent" aria-hidden />
          <span className="font-semibold tracking-tight text-fg">AttackCast</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
          aria-label="Open navigation"
        >
          <MenuIcon className="h-5 w-5" />
        </button>
      </header>

      {/* ── MOBILE OVERLAY (fixed, no layout space) ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* ── MOBILE DRAWER (fixed, no layout space) ── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-line bg-surface shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <RadarIcon className="h-5 w-5 text-accent" aria-hidden />
            <span className="font-semibold tracking-tight text-fg">AttackCast</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
            aria-label="Close navigation"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV.map(({ id, label, Icon }) => {
            const active = id === page;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNav(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors duration-150 text-left w-full ${
                  active ? 'bg-raised text-fg font-medium' : 'text-muted hover:bg-raised hover:text-fg'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── DESKTOP SIDEBAR (sticky, part of flex-row layout, hidden on mobile) ── */}
      <aside
        className={`hidden lg:flex flex-col border-r border-line bg-surface sticky top-0 h-screen shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          collapsed ? 'w-[56px]' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-line py-4 ${collapsed ? 'justify-center' : 'gap-2 px-5'}`}>
          <RadarIcon className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          {!collapsed && (
            <span className="font-semibold tracking-tight text-fg whitespace-nowrap">AttackCast</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV.map(({ id, label, Icon }) => {
            const active = id === page;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNav(id)}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-2.5 rounded-md transition-colors duration-150 w-full ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                } ${active ? 'bg-raised text-fg font-medium' : 'text-muted hover:bg-raised hover:text-fg'}`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {!collapsed && <span className="text-sm whitespace-nowrap">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-line p-2">
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex w-full items-center rounded-md py-2 text-subtle transition-colors hover:bg-raised hover:text-fg ${
              collapsed ? 'justify-center px-0' : 'gap-2 px-2'
            }`}
          >
            {collapsed
              ? <ChevronRightIcon className="h-4 w-4" />
              : <><ChevronLeftIcon className="h-4 w-4" /><span className="text-xs">Collapse</span></>
            }
          </button>
        </div>
      </aside>
    </>
  );
}