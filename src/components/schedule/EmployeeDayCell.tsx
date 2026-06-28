"use client";

import { useDroppable } from "@dnd-kit/core";
import { ShiftAssignmentChip } from "./ShiftAssignmentChip";
import { highlightDayClass } from "./schedule-utils";
import type { ScheduleAssignment } from "@/types";

interface EmployeeDayCellProps {
  employeeId: string;
  date: string;
  assignment?: ScheduleAssignment;
  isDayHighlighted?: boolean;
  shiftDnDEnabled?: boolean;
}

export function EmployeeDayCell({
  employeeId,
  date,
  assignment,
  isDayHighlighted = false,
  shiftDnDEnabled = true,
}: EmployeeDayCellProps) {
  const dayKey = date.slice(0, 10);
  const { setNodeRef, isOver } = useDroppable({
    id: `${employeeId}-${dayKey}`,
    data: { date, employeeId },
    disabled: !shiftDnDEnabled,
  });

  return (
    <td
      ref={setNodeRef}
      className={`border-b border-slate-200 px-2 py-2.5 text-center align-middle min-w-[128px] ${
        isDayHighlighted ? highlightDayClass : "bg-white"
      } ${isOver && shiftDnDEnabled ? "ring-2 ring-inset ring-indigo-200 bg-indigo-50" : ""}`}
    >
      {assignment ? (
        <ShiftAssignmentChip assignment={assignment} disabled={!shiftDnDEnabled} />
      ) : (
        <span className="text-slate-300 select-none">—</span>
      )}
    </td>
  );
}
