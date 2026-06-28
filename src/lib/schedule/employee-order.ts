import type { Employee } from "@/types";
import { employeeSortCompare } from "@/lib/employee/display";

/** @deprecated E6 — migrate once then remove. */
export const EMPLOYEE_ORDER_STORAGE_KEY = "schedule-employee-order";

export function sortEmployeesBySortOrder(employees: Employee[]): Employee[] {
  return [...employees].sort(employeeSortCompare);
}

export function employeeIdsInSortOrder(employees: Employee[]): string[] {
  return sortEmployeesBySortOrder(employees).map((employee) => employee.id);
}

export function applyEmployeeOrder(
  employees: Employee[],
  orderedIds: string[],
): Employee[] {
  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const ordered: Employee[] = [];

  for (const id of orderedIds) {
    const employee = byId.get(id);
    if (employee) {
      ordered.push(employee);
      byId.delete(id);
    }
  }

  const remaining = sortEmployeesBySortOrder([...byId.values()]);
  return [...ordered, ...remaining];
}

/** One-time migration from UX Sprint localStorage order to DB sortOrder. */
export function loadLegacyEmployeeOrderFromStorage(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(EMPLOYEE_ORDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return null;
  }
}

export function clearLegacyEmployeeOrderStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(EMPLOYEE_ORDER_STORAGE_KEY);
}
