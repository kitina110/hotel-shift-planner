/** German labor law helpers for evening shift planning (MVP). */

import { parseTimeToMinutes } from "./shift-time";

export const MIN_REST_HOURS = 11;

export const MAX_CONSECUTIVE_WORK_DAYS_DEFAULT = 6;

/** Required break minutes based on Arbeitszeitgesetz (ArbZG). */
export function requiredBreakMinutes(durationMinutes: number): number {
  if (durationMinutes > 9 * 60) return 45;
  if (durationMinutes > 6 * 60) return 30;
  return 0;
}

export function shiftEndMinutes(startTime: string, durationMinutes: number): number {
  return parseTimeToMinutes(startTime) + durationMinutes;
}

/** Rest hours between end of one shift and start of the next (same-day overlap = 0). */
export function restHoursBetweenShifts(
  prevStart: string,
  prevDuration: number,
  nextStart: string,
  daysApart: number,
): number {
  const prevEnd = shiftEndMinutes(prevStart, prevDuration);
  const nextStartMin = parseTimeToMinutes(nextStart) + daysApart * 24 * 60;
  return (nextStartMin - prevEnd) / 60;
}

export function meetsMinimumRest(
  prevStart: string,
  prevDuration: number,
  nextStart: string,
  daysApart: number,
): boolean {
  return restHoursBetweenShifts(prevStart, prevDuration, nextStart, daysApart) >= MIN_REST_HOURS;
}
