import React from "react";
import { EyeIcon, ShieldAlertIcon, ShieldCheckIcon, TriangleAlertIcon, BoxIcon } from "lucide-react";
import { AlertLevel } from "../types/attackcast";
export const LEVEL_META: Record<AlertLevel, {
  label: string;
  Icon: BoxIcon;
  text: string;
  fill: string;
  dot: string;
}> = {
  none: {
    label: 'No alert',
    Icon: ShieldCheckIcon,
    text: 'text-ok',
    fill: 'bg-ok/10 border-ok/30',
    dot: 'bg-ok'
  },
  watch: {
    label: 'Watch',
    Icon: EyeIcon,
    text: 'text-watch',
    fill: 'bg-watch/10 border-watch/40',
    dot: 'bg-watch'
  },
  warning: {
    label: 'Warning',
    Icon: TriangleAlertIcon,
    text: 'text-warn',
    fill: 'bg-warn/10 border-warn/40',
    dot: 'bg-warn'
  },
  critical: {
    label: 'Critical',
    Icon: ShieldAlertIcon,
    text: 'text-crit',
    fill: 'bg-crit/10 border-crit/40',
    dot: 'bg-crit'
  }
};
export function LevelBadge({
  level
}: {level: AlertLevel;}) {
  const m = LEVEL_META[level] || LEVEL_META.none;
  return <span className={`inline-flex items-center gap-1 text-xs font-medium ${m.text}`}>
      <m.Icon className="h-3.5 w-3.5" aria-hidden />
      {m.label}
    </span>;
}