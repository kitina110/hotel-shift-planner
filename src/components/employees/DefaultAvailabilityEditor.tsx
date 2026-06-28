"use client";

import { formatAvailabilityStatusWithEmoji } from "@/lib/availability/status";
import {
  AVAILABILITY_STATUSES,
  nextAvailabilityStatus,
} from "@/lib/availability/weekly-availability";
import { defaultTemplateRowsFromEmployee } from "@/lib/availability/default-template-sync";
import { AVAILABILITY_CELL_CLASS_NAMES } from "@/components/availability/availability-cell-styles";
import { DAY_LABELS, type AvailabilityStatus, type Employee } from "@/types";

export interface DefaultTemplateFormRow {
  dayOfWeek: number;
  status: AvailabilityStatus;
}

export function buildDefaultTemplateFormRows(employee: Employee): DefaultTemplateFormRow[] {
  return defaultTemplateRowsFromEmployee(employee);
}

interface DefaultAvailabilityEditorProps {
  rows: DefaultTemplateFormRow[];
  onChange: (rows: DefaultTemplateFormRow[]) => void;
}

function cycleStatus(current: AvailabilityStatus): AvailabilityStatus {
  const index = AVAILABILITY_STATUSES.indexOf(current);
  if (index < 0) return nextAvailabilityStatus("AVAILABLE");
  return AVAILABILITY_STATUSES[(index + 1) % AVAILABILITY_STATUSES.length]!;
}

export function DefaultAvailabilityEditor({
  rows,
  onChange,
}: DefaultAvailabilityEditorProps) {
  function updateStatus(dayOfWeek: number, status: AvailabilityStatus) {
    onChange(
      rows.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, status } : row)),
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAY_LABELS.map((label, dayOfWeek) => {
        const row = rows.find((r) => r.dayOfWeek === dayOfWeek)!;
        const status = row.status;

        return (
          <div
            key={dayOfWeek}
            className="rounded-lg border border-slate-200 p-2 text-center"
          >
            <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
            <button
              type="button"
              onClick={() => updateStatus(dayOfWeek, cycleStatus(status))}
              className={`block w-full rounded-md px-1 py-1.5 text-[10px] leading-snug border transition-colors cursor-pointer hover:opacity-90 ${AVAILABILITY_CELL_CLASS_NAMES[status]}`}
              title="Kliknutím změníte stav"
            >
              {formatAvailabilityStatusWithEmoji(status)}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function DefaultAvailabilityReadonly({ rows }: { rows: DefaultTemplateFormRow[] }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {DAY_LABELS.map((label, dayOfWeek) => {
        const row = rows.find((r) => r.dayOfWeek === dayOfWeek)!;

        return (
          <div
            key={dayOfWeek}
            className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-center"
          >
            <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
            <div
              className={`rounded-md px-1 py-1.5 text-[10px] leading-snug border ${AVAILABILITY_CELL_CLASS_NAMES[row.status]}`}
            >
              {formatAvailabilityStatusWithEmoji(row.status)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
