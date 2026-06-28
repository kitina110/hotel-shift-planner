"use client";

import { useEffect, useMemo, useRef } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { EmployeeRow } from "./EmployeeRow";
import { ScheduleTableHeader } from "./ScheduleTableHeader";
import {
  STICKY_COL_EMPLOYEE,
  STICKY_COL_SOLL,
  buildEmployeeRows,
} from "./schedule-utils";
import type { Employee, Schedule, ShiftType } from "@/types";

interface ScheduleTableProps {
  weekDays: Date[];
  schedule: Schedule | null;
  employees: Employee[];
  shiftTypes: ShiftType[];
  guestCounts: Record<string, number>;
  onGuestCountChange: (dayKey: string, value: number) => void;
  isEditOrderMode: boolean;
  shiftDnDEnabled: boolean;
  employeeOrderIds: string[] | null;
  highlightedDate: string | null;
  highlightedEmployeeIds: string[];
}

export function ScheduleTable({
  weekDays,
  schedule,
  employees,
  shiftTypes,
  guestCounts,
  onGuestCountChange,
  isEditOrderMode,
  shiftDnDEnabled,
  employeeOrderIds,
  highlightedDate,
  highlightedEmployeeIds,
}: ScheduleTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickySollLeft = STICKY_COL_EMPLOYEE;

  const rows = useMemo(
    () =>
      buildEmployeeRows(
        employees,
        schedule?.assignments ?? [],
        employeeOrderIds,
      ),
    [employees, schedule?.assignments, employeeOrderIds],
  );

  const sortableIds = useMemo(() => rows.map((row) => row.employee.id), [rows]);

  useEffect(() => {
    if (!highlightedDate || !scrollRef.current) return;

    const headerCell = scrollRef.current.querySelector(
      `[data-day-key="${highlightedDate}"]`,
    );
    if (headerCell instanceof HTMLElement) {
      headerCell.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [highlightedDate]);

  const totalCols = 2 + weekDays.length + 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div ref={scrollRef} className="overflow-auto max-h-[calc(100vh-200px)]">
        <table className="w-full min-w-[1200px] border-collapse text-sm table-fixed">
          <colgroup>
            <col style={{ width: STICKY_COL_EMPLOYEE }} />
            <col style={{ width: STICKY_COL_SOLL }} />
            {weekDays.map((day) => (
              <col key={day.toISOString()} style={{ minWidth: 128 }} />
            ))}
            <col style={{ width: 112 }} />
          </colgroup>
          <ScheduleTableHeader
            weekDays={weekDays}
            guestCounts={guestCounts}
            onGuestCountChange={onGuestCountChange}
            stickySollLeft={stickySollLeft}
            highlightedDate={highlightedDate}
          />
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={totalCols}
                    className="px-6 py-16 text-center text-slate-400"
                  >
                    Zatím žádní zaměstnanci. Přidejte je v modulu Zaměstnanci.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <EmployeeRow
                    key={row.employee.id}
                    row={row}
                    weekDays={weekDays}
                    shiftTypes={shiftTypes}
                    stickySollLeft={stickySollLeft}
                    isEditOrderMode={isEditOrderMode}
                    shiftDnDEnabled={shiftDnDEnabled}
                    highlightedDate={highlightedDate}
                    highlightedEmployeeIds={highlightedEmployeeIds}
                  />
                ))
              )}
            </tbody>
          </SortableContext>
        </table>
      </div>
    </div>
  );
}
