"use client";

import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensors,
  useSensor,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

interface EmployeeListOrderProviderProps {
  employeeIds: string[];
  enabled: boolean;
  onReorder: (activeId: string, overId: string) => void;
  children: React.ReactNode;
}

export function EmployeeListOrderProvider({
  employeeIds,
  enabled,
  onReorder,
  children,
}: EmployeeListOrderProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!enabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onReorder(String(active.id), String(over.id));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={employeeIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}
