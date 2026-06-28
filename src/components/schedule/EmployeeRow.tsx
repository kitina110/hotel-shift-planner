"use client";

import { format } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmployeeDayCell } from "./EmployeeDayCell";
import {
  calcWorkedHours,
  formatWorkedHours,
  highlightRowClass,
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
  isEditOrderMode: boolean;
  shiftDnDEnabled: boolean;
  highlightedDate: string | null;
  highlightedEmployeeIds: string[];
}

export function EmployeeRow({
  row,
  weekDays,
  shiftTypes,
  stickySollLeft,
  isEditOrderMode,
  shiftDnDEnabled,
  highlightedDate,
  highlightedEmployeeIds,
}: EmployeeRowProps) {
  const worked = calcWorkedHours(row.assignments, shiftTypes);
  const isRowHighlighted =
    highlightedDate != null &&
    highlightedEmployeeIds.includes(row.employee.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: row.employee.id,
    data: { type: "employee-row" },
    disabled: !isEditOrderMode,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-slate-50/50 transition-colors ${
        isRowHighlighted ? highlightRowClass : ""
      }`}
    >
      <td
        className={`${stickyEmployeeClass} border-b border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-800 whitespace-nowrap ${
          isRowHighlighted ? highlightRowClass : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {isEditOrderMode && (
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 touch-none"
              aria-label="Přesunout řádek"
              {...attributes}
              {...listeners}
            >
              ⋮⋮
            </button>
          )}
          <span>{row.displayName}</span>
        </div>
      </td>
      <td
        className={`${stickySollClass} border-b border-slate-200 px-3 py-2.5 text-sm text-slate-600 text-right tabular-nums whitespace-nowrap ${
          isRowHighlighted ? highlightRowClass : ""
        }`}
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
            isDayHighlighted={highlightedDate === key}
            shiftDnDEnabled={shiftDnDEnabled}
          />
        );
      })}
      <td
        className={`${workedColClass} border-b border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 text-right tabular-nums whitespace-nowrap ${
          isRowHighlighted ? highlightRowClass : ""
        }`}
      >
        {formatWorkedHours(worked)}
      </td>
    </tr>
  );
}
