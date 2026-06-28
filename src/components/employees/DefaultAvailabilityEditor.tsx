"use client";

import { DAY_LABELS, type Employee } from "@/types";

export interface AvailabilityFormRow {
  dayOfWeek: number;
  available: boolean;
  preferredOff: boolean;
}

export function buildAvailabilityFormRows(employee: Employee): AvailabilityFormRow[] {
  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const existing = employee.availabilities.find((a) => a.dayOfWeek === dayOfWeek);
    return {
      dayOfWeek,
      available: existing?.available ?? true,
      preferredOff: existing?.preferredOff ?? false,
    };
  });
}

interface DefaultAvailabilityEditorProps {
  rows: AvailabilityFormRow[];
  onChange: (rows: AvailabilityFormRow[]) => void;
}

export function DefaultAvailabilityEditor({
  rows,
  onChange,
}: DefaultAvailabilityEditorProps) {
  function updateRow(dayOfWeek: number, patch: Partial<AvailabilityFormRow>) {
    onChange(
      rows.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row)),
    );
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {DAY_LABELS.map((label, dayOfWeek) => {
        const row = rows.find((r) => r.dayOfWeek === dayOfWeek)!;
        return (
          <div
            key={dayOfWeek}
            className="rounded-lg border border-slate-200 p-2 text-center"
          >
            <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
            <button
              type="button"
              onClick={() =>
                updateRow(dayOfWeek, {
                  available: !row.available,
                  preferredOff: row.available ? false : row.preferredOff,
                })
              }
              className={`block w-full rounded px-1 py-0.5 text-[10px] mb-1 border ${
                row.available
                  ? "border-emerald-200 bg-emerald-100 text-emerald-950"
                  : "border-red-200 bg-red-100 text-red-900"
              }`}
            >
              {row.available ? "Dostupný" : "Nedostupný"}
            </button>
            <button
              type="button"
              disabled={!row.available}
              onClick={() =>
                updateRow(dayOfWeek, { preferredOff: !row.preferredOff })
              }
              className={`block w-full rounded px-1 py-0.5 text-[10px] border ${
                !row.available
                  ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                  : row.preferredOff
                    ? "border-amber-200 bg-amber-100 text-amber-950"
                    : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              Preferuje volno
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function DefaultAvailabilityReadonly({ rows }: { rows: AvailabilityFormRow[] }) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {DAY_LABELS.map((label, dayOfWeek) => {
        const row = rows.find((r) => r.dayOfWeek === dayOfWeek)!;
        let status = "🟢 Dostupný";
        if (!row.available) status = "🔴 Nedostupný";
        else if (row.preferredOff) status = "🟡 Preferuje volno";

        return (
          <div
            key={dayOfWeek}
            className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-center"
          >
            <div className="text-xs font-medium text-slate-600 mb-1">{label}</div>
            <div className="text-[10px] text-slate-600">{status}</div>
          </div>
        );
      })}
    </div>
  );
}
