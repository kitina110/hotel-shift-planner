import type { Employee } from "@/types";

export function formatEmployeeName(employee: Pick<Employee, "name">): string {
  return employee.name.trim();
}

export function isPlannableEmployee(
  employee: Pick<Employee, "isActive">,
): boolean {
  return employee.isActive;
}

export function employeeSortCompare(
  a: Pick<Employee, "sortOrder" | "contractHoursPerWeek" | "name">,
  b: Pick<Employee, "sortOrder" | "contractHoursPerWeek" | "name">,
): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  const hoursDiff = b.contractHoursPerWeek - a.contractHoursPerWeek;
  if (hoursDiff !== 0) return hoursDiff;
  return a.name.localeCompare(b.name, "cs");
}
