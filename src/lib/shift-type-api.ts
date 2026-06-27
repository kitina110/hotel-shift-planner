import type { ShiftType } from "@/types";
import {
  computeShiftFields,
  endTimeFromStartAndDuration,
  validateShiftTimes,
} from "@/lib/shift-time";

type ShiftRecord = {
  id: string;
  name: string;
  durationMinutes: number;
  breakMinutes: number;
  startTime: string;
  endTime?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  staffingRules?: ShiftType["staffingRules"];
};

/** Ensures endTime is always present (handles stale Prisma client or legacy rows). */
export function normalizeShiftType<T extends ShiftRecord>(shift: T): T & { endTime: string } {
  const endTime =
    shift.endTime && shift.endTime.length > 0
      ? shift.endTime
      : endTimeFromStartAndDuration(shift.startTime, shift.durationMinutes);

  return { ...shift, endTime };
}

export function normalizeShiftTypes<T extends ShiftRecord>(shifts: T[]) {
  return shifts.map(normalizeShiftType);
}

export function buildShiftWriteData(input: {
  name: string;
  startTime: string;
  endTime: string;
}) {
  const validationError = validateShiftTimes(input.startTime, input.endTime);
  if (validationError) {
    return { error: validationError } as const;
  }

  const { durationMinutes, breakMinutes } = computeShiftFields(
    input.startTime,
    input.endTime,
  );

  return {
    data: {
      name: input.name.trim(),
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      breakMinutes,
    },
  } as const;
}

export function buildShiftUpdateDataFromExisting(
  existing: {
    name: string;
    startTime: string;
    endTime?: string | null;
    durationMinutes: number;
  },
  input: { name?: string; startTime?: string; endTime?: string },
) {
  const nextStart = input.startTime ?? existing.startTime;
  const nextEnd =
    input.endTime ??
    (existing.endTime && existing.endTime.length > 0
      ? existing.endTime
      : endTimeFromStartAndDuration(existing.startTime, existing.durationMinutes));

  return buildShiftWriteData({
    name: (input.name ?? existing.name).trim(),
    startTime: nextStart,
    endTime: nextEnd,
  });
}
