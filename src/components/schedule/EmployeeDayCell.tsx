"use client";

import { useDroppable } from "@dnd-kit/core";
import { ShiftAssignmentChip } from "./ShiftAssignmentChip";
import type { ScheduleAssignment } from "@/types";

interface EmployeeDayCellProps {
  employeeId: string;
  date: string;
  assignment?: ScheduleAssignment;
}

export function EmployeeDayCell({ employeeId, date, assignment }: EmployeeDayCellProps) {
  const dayKey = date.slice(0, 10);
  const { setNodeRef, isOver } = useDroppable({
    id: `${employeeId}-${dayKey}`,
    data: { date, employeeId },
  });

  return (
    <td
      ref={setNodeRef}
      className={`border-b border-slate-200 px-2 py-2.5 text-center align-middle min-w-[128px] ${
        isOver ? "bg-indigo-50 ring-2 ring-inset ring-indigo-200" : "bg-white"
      }`}
    >
      {assignment ? (
        <ShiftAssignmentChip assignment={assignment} />
      ) : (
        <span className="text-slate-300 select-none">—</span>
      )}
    </td>
  );
}
