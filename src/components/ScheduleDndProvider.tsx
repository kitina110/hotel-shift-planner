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
  shiftDnDEnabled: boolean;
  rowDnDEnabled: boolean;
  onMove: (assignmentId: string, targetDate: string, targetEmployeeId: string) => void;
  onReorderRows: (activeEmployeeId: string, overEmployeeId: string) => void;
}

export function ScheduleDndProvider({
  children,
  shiftDnDEnabled,
  rowDnDEnabled,
  onMove,
  onReorderRows,
}: ScheduleDndProviderProps) {
  const [activeAssignment, setActiveAssignment] = useState<ScheduleAssignment | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragStart(event: DragStartEvent) {
    const dragType = event.active.data.current?.type;
    if (dragType === "employee-row") return;

    setActiveAssignment(
      (event.active.data.current?.assignment as ScheduleAssignment | undefined) ?? null,
    );
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveAssignment(null);

    const { active, over } = event;
    if (!over) return;

    const dragType = active.data.current?.type;

    if (dragType === "employee-row") {
      if (!rowDnDEnabled) return;
      if (active.id !== over.id) {
        onReorderRows(String(active.id), String(over.id));
      }
      return;
    }

    if (!shiftDnDEnabled) return;

    const dropData = over.data.current as { date: string; employeeId: string } | undefined;
    if (!dropData?.date || !dropData.employeeId) return;

    onMove(active.id as string, dropData.date, dropData.employeeId);
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {children}
      <DragOverlay>
        {activeAssignment && shiftDnDEnabled ? (
          <ShiftAssignmentChip assignment={activeAssignment} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
