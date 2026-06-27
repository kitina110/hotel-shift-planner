"use client";

import { useDroppable } from "@dnd-kit/core";
import { AssignmentChip } from "./AssignmentChip";
import type { ScheduleAssignment } from "@/types";

interface DayCellProps {
  date: string;
  shiftTypeId: string;
  shiftTypeName: string;
  assignments: ScheduleAssignment[];
}

export function DayCell({ date, shiftTypeId, shiftTypeName, assignments }: DayCellProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}-${shiftTypeId}`,
    data: { date, shiftTypeId },
  });

  return (
    <td
      ref={setNodeRef}
      className={`align-top border border-slate-200 p-2 min-w-[120px] min-h-[80px] ${
        isOver ? "bg-indigo-50 ring-2 ring-inset ring-indigo-300" : "bg-white"
      }`}
    >
      <div className="text-[10px] font-medium text-slate-400 mb-1">{shiftTypeName}</div>
      <div className="space-y-1">
        {assignments.map((a) => (
          <AssignmentChip key={a.id} assignment={a} />
        ))}
      </div>
    </td>
  );
}
