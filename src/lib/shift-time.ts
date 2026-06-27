import { requiredBreakMinutes } from "./german-labor-law";

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutesAsTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Duration in minutes; supports overnight shifts when end <= start. */
export function durationFromTimes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start === end) {
    throw new Error("Začátek a konec směny nemohou být stejné");
  }

  if (end < start) {
    return 24 * 60 - start + end;
  }

  return end - start;
}

export function endTimeFromStartAndDuration(
  startTime: string,
  durationMinutes: number,
): string {
  return formatMinutesAsTime(parseTimeToMinutes(startTime) + durationMinutes);
}

export function formatShiftTimeRange(startTime: string, endTime?: string | null): string {
  if (!endTime) return startTime;
  return `${startTime} – ${endTime}`;
}

export function formatDurationHours(durationMinutes: number): string {
  const hours = durationMinutes / 60;
  if (Number.isInteger(hours)) {
    return `${hours} h`;
  }
  return `${hours.toFixed(1).replace(".", ",")} h`;
}

export interface ComputedShiftFields {
  durationMinutes: number;
  breakMinutes: number;
}

export function computeShiftFields(
  startTime: string,
  endTime: string,
): ComputedShiftFields {
  const durationMinutes = durationFromTimes(startTime, endTime);
  return {
    durationMinutes,
    breakMinutes: requiredBreakMinutes(durationMinutes),
  };
}

export function validateShiftTimes(startTime: string, endTime: string): string | null {
  try {
    durationFromTimes(startTime, endTime);
    return null;
  } catch {
    return "Neplatný rozsah směny";
  }
}
