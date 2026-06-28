import { addDays, format, startOfWeek } from "date-fns";
import { cs } from "date-fns/locale";

/** Monday-start week containing the given date. */
export function normalizeWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function formatWeekRangeLabel(weekStart: Date): string {
  const normalized = normalizeWeekStart(weekStart);
  const end = addDays(normalized, 6);
  return `${format(normalized, "d. MMMM yyyy", { locale: cs })} – ${format(end, "d. MMMM yyyy", { locale: cs })}`;
}

export function formatWeekInputValue(weekStart: Date): string {
  return format(normalizeWeekStart(weekStart), "yyyy-MM-dd");
}
