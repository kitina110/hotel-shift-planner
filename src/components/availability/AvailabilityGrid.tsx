"use client";

import { format, parseISO } from "date-fns";
import { cs } from "date-fns/locale";
import {
  availabilityStatusEmoji,
  formatAvailabilityStatus,
} from "@/lib/availability/status";
import type { WeeklyAvailabilityGrid } from "@/lib/availability/weekly-availability";
import { AVAILABILITY_CELL_CLASS_NAMES } from "@/components/availability/availability-cell-styles";
import type { AvailabilityStatus } from "@/types";

interface AvailabilityGridProps {
  grid: WeeklyAvailabilityGrid;
  savingKey: string | null;
  onCycleCell: (employeeId: string, dateKey: string) => void;
}

export function AvailabilityGrid({
  grid,
  savingKey,
  onCycleCell,
}: AvailabilityGridProps) {
  if (grid.employees.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
        Žádní aktivní zaměstnanci k zobrazení.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-800 min-w-[180px]">
                Zaměstnanec
              </th>
              {grid.weekDays.map((dateKey) => {
                const day = parseISO(dateKey);
                return (
                  <th
                    key={dateKey}
                    className="px-2 py-3 text-center font-medium text-slate-700 min-w-[112px]"
                  >
                    <div>{format(day, "EEE", { locale: cs })}</div>
                    <div className="text-xs font-normal text-slate-500">
                      {format(day, "d. M.", { locale: cs })}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {grid.employees.map((employee) => (
              <tr key={employee.id} className="border-b border-slate-100 last:border-0">
                <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-slate-900 border-r border-slate-100">
                  <div>{employee.name}</div>
                  <div className="text-xs font-normal text-slate-500">
                    {employee.contractHoursPerWeek} h/týden
                  </div>
                </td>
                {grid.weekDays.map((dateKey) => {
                  const cell = grid.cells[employee.id]?.[dateKey];
                  const status: AvailabilityStatus = cell?.status ?? "AVAILABLE";
                  const statusLabel = formatAvailabilityStatus(status);
                  const cellKey = `${employee.id}:${dateKey}`;
                  const isSaving = savingKey === cellKey;

                  return (
                    <td key={dateKey} className="px-2 py-2">
                      <button
                        type="button"
                        disabled={isSaving}
                        title={`${statusLabel} — kliknutím změnit`}
                        aria-label={`${employee.name}, ${dateKey}: ${statusLabel}`}
                        onClick={() => onCycleCell(employee.id, dateKey)}
                        className={`w-full rounded-lg border px-1 py-2 text-center transition-colors disabled:cursor-wait ${AVAILABILITY_CELL_CLASS_NAMES[status]}`}
                      >
                        <span className="text-base leading-none" aria-hidden>
                          {availabilityStatusEmoji(status)}
                        </span>
                        <span className="mt-1 block text-[10px] font-medium leading-snug">
                          {isSaving ? "…" : statusLabel}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
