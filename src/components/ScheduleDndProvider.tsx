"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { ShiftAssignmentChip } from "@/components/schedule/ShiftAssignmentChip";
import type { ScheduleAssignment } from "@/types";

interface ScheduleDndProviderProps {
  children: React.ReactNode;
  onMove: (assignmentId: string, targetDate: string, targetEmployeeId: string) => void;
}

export function ScheduleDndProvider({ children, onMove }: ScheduleDndProviderProps) {
  const [activeAssignment, setActiveAssignment] = useState<ScheduleAssignment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveAssignment(
      (event.active.data.current?.assignment as ScheduleAssignment | undefined) ?? null,
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveAssignment(null);

    const { active, over } = event;
    if (!over) return;

    const dropData = over.data.current as { date: string; employeeId: string } | undefined;
    if (!dropData?.date || !dropData.employeeId) return;

    onMove(active.id as string, dropData.date, dropData.employeeId);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        {activeAssignment ? (
          <ShiftAssignmentChip assignment={activeAssignment} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
