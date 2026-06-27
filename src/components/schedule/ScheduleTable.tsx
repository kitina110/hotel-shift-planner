"use client";

import { Fragment, useMemo } from "react";
import { DepartmentSectionHeader } from "./DepartmentSectionHeader";
import { EmployeeRow } from "./EmployeeRow";
import { ScheduleTableHeader } from "./ScheduleTableHeader";
import {
  STICKY_COL_EMPLOYEE,
  STICKY_COL_SOLL,
  buildDepartmentGroups,
} from "./schedule-utils";
import type { Employee, Schedule, ShiftType } from "@/types";

interface ScheduleTableProps {
  weekDays: Date[];
  schedule: Schedule | null;
  employees: Employee[];
  shiftTypes: ShiftType[];
  guestCounts: Record<string, number>;
  onGuestCountChange: (dayKey: string, value: number) => void;
}

export function ScheduleTable({
  weekDays,
  schedule,
  employees,
  shiftTypes,
  guestCounts,
  onGuestCountChange,
}: ScheduleTableProps) {
  const stickySollLeft = STICKY_COL_EMPLOYEE;

  const departments = useMemo(
    () =>
      buildDepartmentGroups(
        employees,
        schedule?.assignments ?? [],
        shiftTypes,
      ),
    [employees, schedule?.assignments, shiftTypes],
  );

  const totalCols = 2 + weekDays.length + 1;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-240px)]">
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
          />
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-6 py-16 text-center text-slate-400"
                >
                  Zatím žádné směny. Nastavte hosty a klikněte na „Vygenerovat rozpis“.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <Fragment key={dept.id}>
                  <DepartmentSectionHeader
                    label={dept.label}
                    dayCount={weekDays.length}
                    stickySollLeft={stickySollLeft}
                  />
                  {dept.employees.map((row) => (
                    <EmployeeRow
                      key={row.employee.id}
                      row={row}
                      weekDays={weekDays}
                      shiftTypes={shiftTypes}
                      stickySollLeft={stickySollLeft}
                    />
                  ))}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
