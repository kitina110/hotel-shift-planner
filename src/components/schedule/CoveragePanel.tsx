"use client";

import { CoverageIntervalCard } from "@/components/schedule/CoverageIntervalCard";
import type { DayCoverageView } from "@/lib/coverage/schedule-coverage";

interface CoveragePanelProps {
  days: DayCoverageView[];
  hasConfiguredIntervals: boolean;
  totalGaps: number;
}

export function CoveragePanel({
  days,
  hasConfiguredIntervals,
  totalGaps,
}: CoveragePanelProps) {
  if (!hasConfiguredIntervals) {
    return (
      <section className="mb-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
        <h3 className="text-sm font-semibold text-slate-700">Pokrytí provozu</h3>
        <p className="mt-1 text-sm text-slate-500">
          Zatím nejsou nastaveny intervaly pokrytí. Nakonfigurujte je v modulu{" "}
          <span className="font-medium">Obsazenost</span>.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Pokrytí provozu</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Přehled skutečného pokrytí intervalů dle hostů a naplánovaných směn
          </p>
        </div>
        {totalGaps > 0 ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
            {totalGaps} {totalGaps === 1 ? "mezera" : totalGaps < 5 ? "mezery" : "mezer"} v týdnu
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
            ✔ Týden plně pokryt
          </span>
        )}
      </div>

      <div className="p-5 space-y-6 max-h-[420px] overflow-y-auto">
        {days.map((day) => (
          <article key={day.date}>
            <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h4 className="text-sm font-semibold text-slate-800 capitalize">
                {day.weekdayLabel}
              </h4>
              <span className="text-xs text-slate-500">{day.dateLabel}</span>
              <span className="text-xs text-slate-400">
                Hosté: {day.guestCount}
              </span>
            </header>

            <div className="space-y-4">
              {day.zones.map((zone) => (
                <div key={`${day.date}-${zone.zoneId}`}>
                  <h5 className="text-sm font-bold text-slate-900 mb-2">{zone.zoneName}</h5>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {zone.intervals.map((intervalView) => (
                      <CoverageIntervalCard
                        key={intervalView.snapshot.target.intervalId}
                        view={intervalView}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
