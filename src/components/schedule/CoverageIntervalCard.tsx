"use client";

import { formatIntervalRange } from "@/lib/coverage-display";
import {
  formatGapSeverity,
  gapSeverityClass,
} from "@/lib/coverage/gap-display";
import type { IntervalCoverageView } from "@/lib/coverage/schedule-coverage";

interface CoverageIntervalCardProps {
  view: IntervalCoverageView;
}

export function CoverageIntervalCard({ view }: CoverageIntervalCardProps) {
  const { snapshot, gap } = view;
  const { target, coveredHeadcount, deficit, fulfilled, coveringStaff } = snapshot;

  return (
    <div
      className={`rounded-lg border p-4 ${
        fulfilled
          ? "border-emerald-200 bg-emerald-50/40"
          : gap
            ? gapSeverityClass(gap.severity)
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <h5 className="text-sm font-semibold text-slate-900 tabular-nums">
          {formatIntervalRange(target.startTime, target.endTime)}
        </h5>
        {fulfilled ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            ✔ Splněno
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-red-700 border border-red-200">
            ❌ Chybí {deficit}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-3 gap-3 text-sm mb-3">
        <div>
          <dt className="text-xs text-slate-500">Potřeba</dt>
          <dd className="font-semibold text-slate-900">{target.requiredHeadcount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Naplánováno</dt>
          <dd className="font-semibold text-slate-900">{coveredHeadcount}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Deficit</dt>
          <dd className={`font-semibold ${deficit > 0 ? "text-red-700" : "text-emerald-700"}`}>
            {deficit}
          </dd>
        </div>
      </dl>

      {gap && (
        <p className="mb-3 text-xs text-slate-600">
          Závažnost mezery:{" "}
          <span className="font-medium">{formatGapSeverity(gap.severity)}</span>
        </p>
      )}

      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">Pokrývající zaměstnanci</p>
        {coveringStaff.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Nikdo nebyl přiřazen</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {coveringStaff.map((staff) => (
              <li key={staff.employeeId}>
                {staff.displayName}{" "}
                <span className="text-slate-500 tabular-nums">({staff.shiftTimeLabel})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
