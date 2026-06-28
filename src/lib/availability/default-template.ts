import type { AvailabilityStatus } from "@/lib/availability/status";

export interface DefaultTemplateDay {
  dayOfWeek: number;
  status: AvailabilityStatus;
}

/** Returns true when employee opted into using default template for new weeks (E4+). */
export function usesDefaultAvailabilityTemplate(employee: {
  useDefaultAvailabilityTemplate: boolean;
}): boolean {
  return employee.useDefaultAvailabilityTemplate;
}

export function sortDefaultTemplateDays(
  days: DefaultTemplateDay[],
): DefaultTemplateDay[] {
  return [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

export function defaultTemplateByDayOfWeek(
  days: DefaultTemplateDay[],
): Map<number, AvailabilityStatus> {
  return new Map(days.map((day) => [day.dayOfWeek, day.status]));
}
