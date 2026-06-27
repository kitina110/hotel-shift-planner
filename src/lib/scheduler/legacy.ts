import { format, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";
import { canAssign, scoreCandidate, slotScarcity } from "./constraints";
import type {
  ScheduleAssignmentResult,
  ScheduleSlot,
  SchedulerInput,
  SchedulerResult,
  StaffingRuleInput,
} from "./types";

function getStaffCount(
  rules: StaffingRuleInput[],
  shiftTypeId: string,
  guestCount: number,
): number {
  const applicable = rules
    .filter(
      (r) =>
        r.shiftTypeId === shiftTypeId &&
        guestCount >= r.minGuests &&
        (r.maxGuests === null || guestCount <= r.maxGuests),
    )
    .sort((a, b) => b.minGuests - a.minGuests);

  return applicable[0]?.staffCount ?? 0;
}

function buildLegacySlots(
  input: SchedulerInput,
  shiftTypeIds: Set<string>,
): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];

  for (const forecast of input.guestForecasts) {
    const guestCount = forecast.guestCount;

    for (const shiftType of input.shiftTypes) {
      if (!shiftTypeIds.has(shiftType.id)) continue;

      const count = getStaffCount(input.staffingRules, shiftType.id, guestCount);
      for (let i = 0; i < count; i++) {
        slots.push({ date: forecast.date, shiftTypeId: shiftType.id });
      }
    }
  }

  return slots;
}

export function generateLegacySchedule(
  input: SchedulerInput,
  shiftTypeIds: string[],
  seedAssignments: ScheduleAssignmentResult[] = [],
): Pick<SchedulerResult, "assignments" | "warnings" | "unfilledSlots"> {
  const allowedIds = new Set(shiftTypeIds);
  const assignments: ScheduleAssignmentResult[] = [...seedAssignments];
  const warnings: string[] = [];
  const unfilledSlots: ScheduleSlot[] = [];

  const allSlots = buildLegacySlots(input, allowedIds);
  const slots = [...allSlots].sort((a, b) => {
    const scarcityA = slotScarcity(
      a,
      input.employees,
      assignments,
      input.historicalAssignments,
      input.shiftTypes,
    );
    const scarcityB = slotScarcity(
      b,
      input.employees,
      assignments,
      input.historicalAssignments,
      input.shiftTypes,
    );
    if (scarcityA !== scarcityB) return scarcityA - scarcityB;
    return a.date.getTime() - b.date.getTime();
  });

  const filledCount = new Map<string, number>();

  for (const slot of slots) {
    const slotKey = `${slot.date.toISOString()}-${slot.shiftTypeId}`;
    const currentForSlot = filledCount.get(slotKey) ?? 0;
    const needed = allSlots.filter(
      (s) =>
        isSameDay(s.date, slot.date) && s.shiftTypeId === slot.shiftTypeId,
    ).length;

    if (currentForSlot >= needed) continue;

    const candidates = input.employees
      .filter((e) =>
        canAssign(e, slot, assignments, input.historicalAssignments, input.shiftTypes).ok,
      )
      .map((e) => ({
        employee: e,
        score: scoreCandidate(
          e,
          slot,
          assignments,
          input.historicalAssignments,
          input.shiftTypes,
          input.weekStart,
        ),
      }))
      .sort((a, b) => b.score - a.score);

    if (candidates.length === 0) {
      unfilledSlots.push(slot);
      const shiftName =
        input.shiftTypes.find((s) => s.id === slot.shiftTypeId)?.name ?? "?";
      warnings.push(
        `Nepodařilo se obsadit ${shiftName} dne ${format(slot.date, "d. M.", { locale: cs })}`,
      );
      continue;
    }

    assignments.push({
      employeeId: candidates[0].employee.id,
      shiftTypeId: slot.shiftTypeId,
      date: slot.date,
    });
    filledCount.set(slotKey, currentForSlot + 1);
  }

  const newAssignments = assignments.slice(seedAssignments.length);

  return {
    assignments: newAssignments,
    warnings,
    unfilledSlots,
  };
}
