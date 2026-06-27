"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface AssignmentChipProps {
  assignment: {
    id: string;
    employee: { name: string };
    shiftType: { name: string };
  };
  isDragging?: boolean;
}

export function AssignmentChip({ assignment, isDragging }: AssignmentChipProps) {
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
      className={`rounded-md border px-2 py-1 text-xs cursor-grab active:cursor-grabbing ${
        isDragging
          ? "border-indigo-400 bg-indigo-100 shadow-lg opacity-90"
          : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm"
      }`}
    >
      <div className="font-medium text-slate-800 truncate">{assignment.employee.name}</div>
      <div className="text-slate-500">{assignment.shiftType.name}</div>
    </div>
  );
}
