import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  endTimeFromStartAndDuration,
  formatShiftTimeRange,
} from "@/lib/shift-time";
import { applyEmployeeOrder, sortEmployeesBySortOrder } from "@/lib/schedule/employee-order";
import type { Employee, ScheduleAssignment, ShiftType } from "@/types";

export const STICKY_COL_EMPLOYEE = 180;
export const STICKY_COL_SOLL = 96;
export const DAY_COL_MIN = 128;
export const WORKED_COL = 112;

export interface EmployeeRowData {
  employee: Employee;
  displayName: string;
  assignments: ScheduleAssignment[];
  assignmentByDay: Map<string, ScheduleAssignment>;
}

export function formatShiftRange(assignment: ScheduleAssignment): string {
  const { startTime, endTime, durationMinutes } = assignment.shiftType;
  if (endTime) {
    return formatShiftTimeRange(startTime, endTime);
  }
  return formatShiftTimeRange(
    startTime,
    endTimeFromStartAndDuration(startTime, durationMinutes),
  );
}

export function formatWorkedHours(hours: number): string {
  return `${hours.toFixed(2).replace(".", ",")} h`;
}

export function calcWorkedHours(
  assignments: ScheduleAssignment[],
  shiftTypes: ShiftType[],
): number {
  const breakById = new Map(shiftTypes.map((s) => [s.id, s.breakMinutes]));

  return assignments.reduce((sum, a) => {
    const gross = a.shiftType.durationMinutes / 60;
    const breakMin = breakById.get(a.shiftTypeId) ?? 0;
    return sum + gross - breakMin / 60;
  }, 0);
}

export function buildEmployeeRows(
  employees: Employee[],
  assignments: ScheduleAssignment[],
  orderIds: string[] | null = null,
): EmployeeRowData[] {
  const ordered =
    orderIds != null
      ? applyEmployeeOrder(employees, orderIds)
      : sortEmployeesBySortOrder(employees);

  return ordered.map((employee) => {
    const empAssignments = assignments.filter((a) => a.employeeId === employee.id);
    const assignmentByDay = new Map<string, ScheduleAssignment>();
    for (const assignment of empAssignments) {
      assignmentByDay.set(assignment.date.slice(0, 10), assignment);
    }

    return {
      employee,
      displayName: employee.name,
      assignments: empAssignments,
      assignmentByDay,
    };
  });
}

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function formatDayHeader(date: Date): { weekday: string; dateLabel: string } {
  return {
    weekday: format(date, "EEEE", { locale: cs }),
    dateLabel: format(date, "d.M."),
  };
}

export const stickyEmployeeClass =
  "sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]";

export const stickySollClass =
  "sticky z-10 bg-white border-r border-slate-200 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.06)]";

export const workedColClass = "bg-slate-50/90 border-l border-slate-200";

export const highlightDayClass = "bg-amber-50 ring-2 ring-inset ring-amber-300/80";

export const highlightRowClass = "bg-amber-50/70";
