"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactElement } from "react";

interface SortableEmployeeCardProps {
  employeeId: string;
  disabled?: boolean;
  children: (dragHandleProps: React.HTMLAttributes<HTMLButtonElement>) => ReactElement;
}

export function SortableEmployeeCard({
  employeeId,
  disabled = false,
  children,
}: SortableEmployeeCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: employeeId,
    disabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const dragHandleProps: React.HTMLAttributes<HTMLButtonElement> = {
    ...attributes,
    ...listeners,
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandleProps)}
    </div>
  );
}
