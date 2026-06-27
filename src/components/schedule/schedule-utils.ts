import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  endTimeFromStartAndDuration,
  formatShiftTimeRange,
} from "@/lib/shift-time";
import type { Employee, ScheduleAssignment, ShiftType } from "@/types";

export const STICKY_COL_EMPLOYEE = 180;
export const STICKY_COL_SOLL = 96;
export const DAY_COL_MIN = 128;
export const WORKED_COL = 112;

export const DEPARTMENTS = [
  { id: "service", label: "Service", match: (name: string) => /servis/i.test(name) },
  { id: "kuche", label: "Küche", match: (name: string) => /kuchyn/i.test(name) },
  { id: "recepce", label: "Recepce", match: (name: string) => /bar|recep/i.test(name) },
] as const;

export type DepartmentId = (typeof DEPARTMENTS)[number]["id"];

export interface DepartmentGroup {
  id: DepartmentId;
  label: string;
  employees: EmployeeRowData[];
}

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

function resolveDepartmentId(
  employee: Employee,
  assignments: ScheduleAssignment[],
  shiftTypes: ShiftType[],
): DepartmentId {
  if (assignments.length > 0) {
    const counts = new Map<DepartmentId, number>();
    for (const a of assignments) {
      const st = shiftTypes.find((s) => s.id === a.shiftTypeId);
      const name = st?.name ?? a.shiftType.name;
      const dept = DEPARTMENTS.find((d) => d.match(name));
      if (dept) counts.set(dept.id, (counts.get(dept.id) ?? 0) + 1);
    }
    let best: DepartmentId = "service";
    let bestCount = -1;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    if (bestCount > 0) return best;
  }

  for (const dept of DEPARTMENTS) {
    for (const q of employee.qualifications) {
      const st = shiftTypes.find((s) => s.id === q.shiftTypeId);
      if (st && dept.match(st.name)) return dept.id;
    }
  }

  return "service";
}

export function buildDepartmentGroups(
  employees: Employee[],
  assignments: ScheduleAssignment[],
  shiftTypes: ShiftType[],
): DepartmentGroup[] {
  const assignedEmployeeIds = new Set(assignments.map((a) => a.employeeId));
  const relevantEmployees = employees
    .filter((e) => assignedEmployeeIds.has(e.id))
    .sort((a, b) => a.name.localeCompare(b.name, "cs"));

  const rowById = new Map<string, EmployeeRowData>();

  relevantEmployees.forEach((employee, index) => {
    const empAssignments = assignments.filter((a) => a.employeeId === employee.id);
    const assignmentByDay = new Map<string, ScheduleAssignment>();
    for (const a of empAssignments) {
      assignmentByDay.set(a.date.slice(0, 10), a);
    }

    rowById.set(employee.id, {
      employee,
      displayName: `Zaměstnanec ${index + 1}`,
      assignments: empAssignments,
      assignmentByDay,
    });
  });

  const byDept = new Map<DepartmentId, EmployeeRowData[]>();
  for (const dept of DEPARTMENTS) {
    byDept.set(dept.id, []);
  }

  for (const employee of relevantEmployees) {
    const row = rowById.get(employee.id)!;
    const deptId = resolveDepartmentId(employee, row.assignments, shiftTypes);
    byDept.get(deptId)!.push(row);
  }

  return DEPARTMENTS.map((dept) => ({
    id: dept.id,
    label: dept.label,
    employees: byDept.get(dept.id) ?? [],
  })).filter((g) => g.employees.length > 0);
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
