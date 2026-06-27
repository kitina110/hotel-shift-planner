"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatShiftRange } from "./schedule-utils";
import type { ScheduleAssignment } from "@/types";

interface ShiftAssignmentChipProps {
  assignment: ScheduleAssignment;
  isDragging?: boolean;
}

export function ShiftAssignmentChip({ assignment, isDragging }: ShiftAssignmentChipProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: assignment.id,
    data: { assignment },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`inline-block rounded-md px-2.5 py-1 text-xs font-medium tabular-nums cursor-grab active:cursor-grabbing ${
        isDragging
          ? "border border-indigo-400 bg-indigo-100 text-indigo-900 shadow-md"
          : "border border-indigo-100 bg-indigo-50/80 text-indigo-800 hover:border-indigo-300 hover:bg-indigo-50"
      }`}
    >
      {formatShiftRange(assignment)}
    </div>
  );
}
