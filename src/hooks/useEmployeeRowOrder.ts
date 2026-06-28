"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useMemo, useState } from "react";
import {
  applyEmployeeOrder,
  loadEmployeeOrderFromStorage,
  saveEmployeeOrderToStorage,
} from "@/lib/schedule/employee-order";
import type { Employee } from "@/types";

export function useEmployeeRowOrder(employees: Employee[]) {
  const [isEditOrderMode, setIsEditOrderMode] = useState(false);
  const [orderIds, setOrderIds] = useState<string[] | null>(() =>
    loadEmployeeOrderFromStorage(),
  );

  const orderedEmployees = useMemo(
    () => applyEmployeeOrder(employees, orderIds),
    [employees, orderIds],
  );

  const reorderEmployees = useCallback(
    (activeId: string, overId: string) => {
      const currentIds = applyEmployeeOrder(employees, orderIds).map(
        (employee) => employee.id,
      );
      const oldIndex = currentIds.indexOf(activeId);
      const newIndex = currentIds.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const nextIds = arrayMove(currentIds, oldIndex, newIndex);
      setOrderIds(nextIds);
      saveEmployeeOrderToStorage(nextIds);
    },
    [employees, orderIds],
  );

  const finishEditOrder = useCallback(() => {
    setIsEditOrderMode(false);
  }, []);

  const startEditOrder = useCallback(() => {
    setIsEditOrderMode(true);
  }, []);

  return {
    orderedEmployees,
    orderIds,
    isEditOrderMode,
    startEditOrder,
    finishEditOrder,
    reorderEmployees,
  };
}
