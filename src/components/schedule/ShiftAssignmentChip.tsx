"use client";

import { format } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { formatShiftRange } from "./schedule-utils";
import type { ScheduleAssignment } from "@/types";

interface ShiftAssignmentChipProps {
  assignment: ScheduleAssignment;
  isDragging?: boolean;
  disabled?: boolean;
}

export function ShiftAssignmentChip({
  assignment,
  isDragging,
  disabled = false,
}: ShiftAssignmentChipProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: assignment.id,
    data: { assignment },
    disabled,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      className={`inline-block rounded-md px-2.5 py-1 text-xs font-medium tabular-nums ${
        disabled
          ? "border border-slate-200 bg-slate-50 text-slate-600 cursor-default"
          : "cursor-grab active:cursor-grabbing border border-indigo-100 bg-indigo-50/80 text-indigo-800 hover:border-indigo-300 hover:bg-indigo-50"
      } ${
        isDragging
          ? "border border-indigo-400 bg-indigo-100 text-indigo-900 shadow-md"
          : ""
      }`}
    >
      {formatShiftRange(assignment)}
    </div>
  );
}
