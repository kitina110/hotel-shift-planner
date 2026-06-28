"use client";

import { CoverageAlertItem } from "@/components/schedule/CoverageAlertItem";
import type { CoverageAlert } from "@/lib/coverage/coverage-alerts";

interface CoverageAlertsPanelProps {
  alerts: CoverageAlert[];
  hasConfiguredIntervals: boolean;
  activeAlertId: string | null;
  onSelectAlert: (alert: CoverageAlert | null) => void;
}

export function CoverageAlertsPanel({
  alerts,
  hasConfiguredIntervals,
  activeAlertId,
  onSelectAlert,
}: CoverageAlertsPanelProps) {
  if (!hasConfiguredIntervals) {
    return null;
  }

  if (alerts.length === 0) {
    return (
      <section className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
        <p className="text-sm font-medium text-emerald-800">
          ✔ Tento týden je pokrytí v pořádku.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2">
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Upozornění na pokrytí · {alerts.length}{" "}
          {alerts.length === 1 ? "problém" : alerts.length < 5 ? "problémy" : "problémů"}
        </p>
        {activeAlertId && (
          <button
            type="button"
            onClick={() => onSelectAlert(null)}
            className="text-xs text-amber-700 hover:text-amber-900 underline shrink-0"
          >
            Zrušit zvýraznění
          </button>
        )}
      </div>
      <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-amber-100/80">
        {alerts.map((alert) => (
          <CoverageAlertItem
            key={alert.id}
            alert={alert}
            isActive={activeAlertId === alert.id}
            onSelect={onSelectAlert}
          />
        ))}
      </div>
    </section>
  );
}
