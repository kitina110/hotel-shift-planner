"use client";

import { format } from "date-fns";
import { EmployeeDayCell } from "./EmployeeDayCell";
import {
  calcWorkedHours,
  formatWorkedHours,
  stickyEmployeeClass,
  stickySollClass,
  workedColClass,
  type EmployeeRowData,
} from "./schedule-utils";
import type { ShiftType } from "@/types";

interface EmployeeRowProps {
  row: EmployeeRowData;
  weekDays: Date[];
  shiftTypes: ShiftType[];
  stickySollLeft: number;
}

export function EmployeeRow({ row, weekDays, shiftTypes, stickySollLeft }: EmployeeRowProps) {
  const worked = calcWorkedHours(row.assignments, shiftTypes);

  return (
    <tr className="hover:bg-slate-50/50 transition-colors">
      <td
        className={`${stickyEmployeeClass} border-b border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 whitespace-nowrap`}
      >
        {row.displayName}
      </td>
      <td
        className={`${stickySollClass} border-b border-slate-200 px-3 py-2.5 text-sm text-slate-600 text-right tabular-nums whitespace-nowrap`}
        style={{ left: stickySollLeft }}
      >
        {row.employee.contractHoursPerWeek.toFixed(0)}
      </td>
      {weekDays.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        return (
          <EmployeeDayCell
            key={key}
            employeeId={row.employee.id}
            date={day.toISOString()}
            assignment={row.assignmentByDay.get(key)}
          />
        );
      })}
      <td
        className={`${workedColClass} border-b border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 text-right tabular-nums whitespace-nowrap`}
      >
        {formatWorkedHours(worked)}
      </td>
    </tr>
  );
}
