"use client";

import { format } from "date-fns";
import { Input } from "@/components/ui";
import {
  formatDayHeader,
  highlightDayClass,
  stickyEmployeeClass,
  stickySollClass,
  workedColClass,
} from "./schedule-utils";

interface ScheduleTableHeaderProps {
  weekDays: Date[];
  guestCounts: Record<string, number>;
  onGuestCountChange: (dayKey: string, value: number) => void;
  stickySollLeft: number;
  highlightedDate: string | null;
}

export function ScheduleTableHeader({
  weekDays,
  guestCounts,
  onGuestCountChange,
  stickySollLeft,
  highlightedDate,
}: ScheduleTableHeaderProps) {
  return (
    <thead className="sticky top-0 z-20 bg-white">
      <tr className="border-b border-slate-200">
        <th
          className={`${stickyEmployeeClass} z-30 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/90`}
        >
          Zaměstnanec
        </th>
        <th
          className={`${stickySollClass} z-30 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 bg-slate-50/90 whitespace-nowrap`}
          style={{ left: stickySollLeft }}
        >
          Soll Std.
        </th>
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const { weekday, dateLabel } = formatDayHeader(day);
          const isHighlighted = highlightedDate === key;

          return (
            <th
              key={day.toISOString()}
              data-day-key={key}
              className={`px-2 py-3 text-center text-xs font-semibold text-slate-600 min-w-[128px] ${
                isHighlighted ? highlightDayClass : "bg-slate-50/90"
              }`}
            >
              <div className="capitalize text-slate-800">{weekday}</div>
              <div className="mt-0.5 font-normal text-slate-400">{dateLabel}</div>
            </th>
          );
        })}
        <th
          className={`${workedColClass} px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap`}
        >
          Odpracováno
        </th>
      </tr>
      <tr className="border-b border-slate-200 bg-white">
        <th
          className={`${stickyEmployeeClass} z-30 px-4 py-2 text-left text-[11px] font-medium text-slate-500 bg-white`}
        >
          Gäste im Haus
        </th>
        <th
          className={`${stickySollClass} z-30 px-3 py-2 bg-white`}
          style={{ left: stickySollLeft }}
        />
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const isHighlighted = highlightedDate === key;

          return (
            <th
              key={`guest-${key}`}
              className={`px-2 py-2 font-normal ${isHighlighted ? highlightDayClass : "bg-white"}`}
            >
              <Input
                type="number"
                min={0}
                inputSize="sm"
                value={guestCounts[key] ?? 80}
                onChange={(e) => onGuestCountChange(key, Number(e.target.value))}
                className="text-center"
              />
            </th>
          );
        })}
        <th className={`${workedColClass} px-3 py-2 bg-slate-50/90`} />
      </tr>
    </thead>
  );
}
