import type { Employee } from "@/types";

export const EMPLOYEE_ORDER_STORAGE_KEY = "schedule-employee-order";

export function defaultEmployeeSort(a: Employee, b: Employee): number {
  const diff = b.contractHoursPerWeek - a.contractHoursPerWeek;
  if (diff !== 0) return diff;
  return a.name.localeCompare(b.name, "cs");
}

export function applyEmployeeOrder(
  employees: Employee[],
  savedOrderIds: string[] | null,
): Employee[] {
  if (!savedOrderIds?.length) {
    return [...employees].sort(defaultEmployeeSort);
  }

  const byId = new Map(employees.map((employee) => [employee.id, employee]));
  const ordered: Employee[] = [];

  for (const id of savedOrderIds) {
    const employee = byId.get(id);
    if (employee) {
      ordered.push(employee);
      byId.delete(id);
    }
  }

  const remaining = [...byId.values()].sort(defaultEmployeeSort);
  return [...ordered, ...remaining];
}

export function loadEmployeeOrderFromStorage(): string[] | null {
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

export function saveEmployeeOrderToStorage(orderIds: string[]): void {
  localStorage.setItem(EMPLOYEE_ORDER_STORAGE_KEY, JSON.stringify(orderIds));
}
