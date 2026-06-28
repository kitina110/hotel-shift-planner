"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { mergeVisibleReorder } from "@/lib/employee/reorder-employees";
import { employeeSortCompare } from "@/lib/employee/display";
import {
  applyEmployeeOrder,
  clearLegacyEmployeeOrderStorage,
  employeeIdsInSortOrder,
  loadLegacyEmployeeOrderFromStorage,
  sortEmployeesBySortOrder,
} from "@/lib/schedule/employee-order";
import type { Employee } from "@/types";

async function persistEmployeeOrder(orderedIds: string[]): Promise<void> {
  const res = await fetch("/api/employees/reorder", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Nepodařilo se uložit pořadí zaměstnanců");
  }
}

interface UseEmployeeRowOrderOptions {
  /** Full employee list from API (used when persisting global order). */
  allEmployees: Employee[];
  /** Subset shown in the current view (e.g. active only on schedule). */
  displayEmployees: Employee[];
  onOrderSaved?: (orderedIds: string[]) => void;
}

export function useEmployeeRowOrder({
  allEmployees,
  displayEmployees,
  onOrderSaved,
}: UseEmployeeRowOrderOptions) {
  const [isEditOrderMode, setIsEditOrderMode] = useState(false);
  const [pendingVisibleIds, setPendingVisibleIds] = useState<string[] | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const migratedRef = useRef(false);

  const allIdsInOrder = useMemo(
    () => employeeIdsInSortOrder(allEmployees),
    [allEmployees],
  );

  const visibleIds = useMemo(
    () =>
      pendingVisibleIds ??
      sortEmployeesBySortOrder(displayEmployees).map((employee) => employee.id),
    [displayEmployees, pendingVisibleIds],
  );

  const orderedDisplayEmployees = useMemo(
    () => applyEmployeeOrder(displayEmployees, visibleIds),
    [displayEmployees, visibleIds],
  );

  const saveOrder = useCallback(
    async (nextVisibleIds: string[]) => {
      const merged = mergeVisibleReorder(allIdsInOrder, nextVisibleIds);
      setSavingOrder(true);
      setOrderError(null);
      try {
        await persistEmployeeOrder(merged);
        setPendingVisibleIds(nextVisibleIds);
        onOrderSaved?.(merged);
      } catch (error) {
        setOrderError(
          error instanceof Error ? error.message : "Nepodařilo se uložit pořadí",
        );
        throw error;
      } finally {
        setSavingOrder(false);
      }
    },
    [allIdsInOrder, onOrderSaved],
  );

  useEffect(() => {
    if (migratedRef.current || allEmployees.length === 0) return;
    migratedRef.current = true;

    const legacyIds = loadLegacyEmployeeOrderFromStorage();
    if (!legacyIds?.length) return;

    const currentIds = employeeIdsInSortOrder(allEmployees);
    const legacyMatchesCurrent =
      legacyIds.length === currentIds.length &&
      legacyIds.every((id, index) => id === currentIds[index]);

    if (legacyMatchesCurrent) {
      clearLegacyEmployeeOrderStorage();
      return;
    }

    const knownLegacy = legacyIds.filter((id) =>
      allEmployees.some((employee) => employee.id === id),
    );
    if (knownLegacy.length === 0) {
      clearLegacyEmployeeOrderStorage();
      return;
    }

    const rest = currentIds.filter((id) => !knownLegacy.includes(id));
    const merged = [...knownLegacy, ...rest];

    void persistEmployeeOrder(merged)
      .then(() => {
        clearLegacyEmployeeOrderStorage();
        onOrderSaved?.(merged);
      })
      .catch(() => {
        migratedRef.current = false;
      });
  }, [allEmployees, onOrderSaved]);

  useEffect(() => {
    setPendingVisibleIds(null);
  }, [allIdsInOrder.join("|")]);

  const reorderEmployees = useCallback(
    async (activeId: string, overId: string) => {
      const currentVisible = orderedDisplayEmployees.map((employee) => employee.id);
      const oldIndex = currentVisible.indexOf(activeId);
      const newIndex = currentVisible.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const nextVisible = arrayMove(currentVisible, oldIndex, newIndex);
      setPendingVisibleIds(nextVisible);
      await saveOrder(nextVisible);
    },
    [orderedDisplayEmployees, saveOrder],
  );

  const finishEditOrder = useCallback(() => {
    setIsEditOrderMode(false);
    setOrderError(null);
  }, []);

  const startEditOrder = useCallback(() => {
    setIsEditOrderMode(true);
    setOrderError(null);
  }, []);

  return {
    orderedEmployees: orderedDisplayEmployees,
    visibleIds,
    isEditOrderMode,
    savingOrder,
    orderError,
    startEditOrder,
    finishEditOrder,
    reorderEmployees,
  };
}

export { employeeSortCompare, sortEmployeesBySortOrder };
