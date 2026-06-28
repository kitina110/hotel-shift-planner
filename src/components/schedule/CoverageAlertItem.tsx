"use client";

import { formatIntervalRange } from "@/lib/coverage-display";
import type { CoverageAlert } from "@/lib/coverage/coverage-alerts";
import type { GapSeverity } from "@/lib/coverage";

function alertBorderClass(severity: GapSeverity): string {
  switch (severity) {
    case "critical":
      return "border-l-red-400";
    case "medium":
      return "border-l-orange-400";
    case "low":
      return "border-l-amber-400";
    default:
      return "border-l-amber-400";
  }
}

interface CoverageAlertItemProps {
  alert: CoverageAlert;
  isActive: boolean;
  onSelect: (alert: CoverageAlert) => void;
}

export function CoverageAlertItem({ alert, isActive, onSelect }: CoverageAlertItemProps) {
  const severityBorder = alertBorderClass(alert.severity);

  return (
    <button
      type="button"
      onClick={() => onSelect(alert)}
      className={`w-full text-left border-l-4 ${severityBorder} pl-3 py-1.5 transition-colors ${
        isActive ? "bg-amber-100/80 rounded-r-md" : "hover:bg-slate-50 rounded-r-md"
      }`}
    >
      <p className="text-sm font-medium text-slate-800 capitalize">
        ⚠ {alert.weekdayLabel} · {alert.zoneName} ·{" "}
        {formatIntervalRange(alert.startTime, alert.endTime)}
      </p>
      <p className="text-xs text-slate-600 tabular-nums mt-0.5">
        Potřeba: {alert.requiredHeadcount} | Naplánováno: {alert.coveredHeadcount} | Chybí:{" "}
        {alert.deficit}
      </p>
    </button>
  );
}
