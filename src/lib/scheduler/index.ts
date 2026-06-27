import {
  addDays,
  eachDayOfInterval,
  format,
  getDay,
  isSameDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { cs } from "date-fns/locale";
import { meetsMinimumRest } from "@/lib/german-labor-law";

export interface ShiftTypeInput {
  id: string;
  name: string;
  durationMinutes: number;
  startTime: string;
}

export interface EmployeeInput {
  id: string;
  name: string;
  contractHoursPerWeek: number;
  maxConsecutiveDays: number;
  qualifiedShiftTypeIds: string[];
  availability: Record<number, { available: boolean; preferredOff: boolean }>;
}

export interface StaffingRuleInput {
  shiftTypeId: string;
  minGuests: number;
  maxGuests: number | null;
  staffCount: number;
}

export interface HistoricalAssignment {
  employeeId: string;
  date: Date;
  shiftTypeId: string;
  startTime: string;
  durationMinutes: number;
}

export interface GuestForecastInput {
  date: Date;
  guestCount: number;
}

export interface ScheduleSlot {
  date: Date;
  shiftTypeId: string;
}

export interface ScheduleAssignmentResult {
  employeeId: string;
  shiftTypeId: string;
  date: Date;
}

export interface SchedulerInput {
  weekStart: Date;
  shiftTypes: ShiftTypeInput[];
  employees: EmployeeInput[];
  staffingRules: StaffingRuleInput[];
  guestForecasts: GuestForecastInput[];
  historicalAssignments: HistoricalAssignment[];
  existingAssignments?: ScheduleAssignmentResult[];
}

export interface SchedulerResult {
  assignments: ScheduleAssignmentResult[];
  warnings: string[];
  unfilledSlots: ScheduleSlot[];
}

const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

function isoDayOfWeek(date: Date): number {
  const d = getDay(date);
  return d === 0 ? 6 : d - 1;
}

function shiftDurationHours(shiftTypes: ShiftTypeInput[], shiftTypeId: string): number {
  const st = shiftTypes.find((s) => s.id === shiftTypeId);
  return st ? st.durationMinutes / 60 : 0;
}

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

function buildSlots(input: SchedulerInput): ScheduleSlot[] {
  const weekEnd = addDays(input.weekStart, 6);
  const days = eachDayOfInterval({ start: input.weekStart, end: weekEnd });
  const slots: ScheduleSlot[] = [];

  for (const day of days) {
    const forecast = input.guestForecasts.find((f) => isSameDay(f.date, day));
    const guestCount = forecast?.guestCount ?? 0;

    for (const shiftType of input.shiftTypes) {
      const count = getStaffCount(input.staffingRules, shiftType.id, guestCount);
      for (let i = 0; i < count; i++) {
        slots.push({ date: day, shiftTypeId: shiftType.id });
      }
    }
  }

  return slots;
}

function countConsecutiveWorkDays(
  employeeId: string,
  targetDate: Date,
  assignments: ScheduleAssignmentResult[],
  history: HistoricalAssignment[],
): number {
  let count = 0;
  let checkDate = addDays(targetDate, -1);

  while (true) {
    const worked =
      assignments.some(
        (a) => a.employeeId === employeeId && isSameDay(a.date, checkDate),
      ) ||
      history.some(
        (h) => h.employeeId === employeeId && isSameDay(h.date, checkDate),
      );

    if (!worked) break;
    count++;
    checkDate = addDays(checkDate, -1);
  }

  return count;
}

function countFutureConsecutiveWorkDays(
  employeeId: string,
  targetDate: Date,
  assignments: ScheduleAssignmentResult[],
): number {
  let count = 0;
  let checkDate = addDays(targetDate, 1);

  while (true) {
    const worked = assignments.some(
      (a) => a.employeeId === employeeId && isSameDay(a.date, checkDate),
    );
    if (!worked) break;
    count++;
    checkDate = addDays(checkDate, 1);
  }

  return count;
}

function getLastHistoricalShift(
  employeeId: string,
  beforeDate: Date,
  history: HistoricalAssignment[],
  currentAssignments: ScheduleAssignmentResult[],
  shiftTypes: ShiftTypeInput[],
): { startTime: string; durationMinutes: number; date: Date } | null {
  const all: { startTime: string; durationMinutes: number; date: Date }[] = [];

  for (const h of history) {
    if (h.employeeId === employeeId && h.date < beforeDate) {
      all.push({
        startTime: h.startTime,
        durationMinutes: h.durationMinutes,
        date: h.date,
      });
    }
  }

  for (const a of currentAssignments) {
    if (a.employeeId === employeeId && a.date < beforeDate) {
      const st = shiftTypes.find((s) => s.id === a.shiftTypeId);
      if (st) {
        all.push({
          startTime: st.startTime,
          durationMinutes: st.durationMinutes,
          date: a.date,
        });
      }
    }
  }

  if (all.length === 0) return null;
  all.sort((a, b) => b.date.getTime() - a.date.getTime());
  return all[0];
}

function getNextScheduledShift(
  employeeId: string,
  afterDate: Date,
  currentAssignments: ScheduleAssignmentResult[],
  shiftTypes: ShiftTypeInput[],
): { startTime: string; durationMinutes: number; date: Date } | null {
  const future = currentAssignments
    .filter((a) => a.employeeId === employeeId && a.date > afterDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (future.length === 0) return null;
  const st = shiftTypes.find((s) => s.id === future[0].shiftTypeId);
  if (!st) return null;
  return {
    startTime: st.startTime,
    durationMinutes: st.durationMinutes,
    date: future[0].date,
  };
}

function hasTwoConsecutiveDaysOff(
  employeeId: string,
  weekStart: Date,
  assignments: ScheduleAssignmentResult[],
  history: HistoricalAssignment[],
): boolean {
  const weekEnd = addDays(weekStart, 6);
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  for (let i = 0; i < days.length - 1; i++) {
    const off1 = !isWorking(employeeId, days[i], assignments, history);
    const off2 = !isWorking(employeeId, days[i + 1], assignments, history);
    if (off1 && off2) return true;
  }
  return false;
}

function isWorking(
  employeeId: string,
  date: Date,
  assignments: ScheduleAssignmentResult[],
  history: HistoricalAssignment[],
): boolean {
  return (
    assignments.some((a) => a.employeeId === employeeId && isSameDay(a.date, date)) ||
    history.some((h) => h.employeeId === employeeId && isSameDay(h.date, date))
  );
}

function scoreCandidate(
  employee: EmployeeInput,
  slot: ScheduleSlot,
  assignments: ScheduleAssignmentResult[],
  history: HistoricalAssignment[],
  shiftTypes: ShiftTypeInput[],
  weekStart: Date,
): number {
  let score = 100;

  const weekAssignments = assignments.filter((a) => a.employeeId === employee.id);
  const totalHistorical = history.filter((h) => h.employeeId === employee.id).length;

  score -= weekAssignments.length * 15;
  score -= totalHistorical * 0.5;

  const dayIdx = isoDayOfWeek(slot.date);
  const avail = employee.availability[dayIdx];
  if (avail?.preferredOff) score -= 40;

  const hoursThisWeek =
    weekAssignments.reduce(
      (sum, a) => sum + shiftDurationHours(shiftTypes, a.shiftTypeId),
      0,
    ) + shiftDurationHours(shiftTypes, slot.shiftTypeId);

  const contractRatio = hoursThisWeek / employee.contractHoursPerWeek;
  if (contractRatio > 1) score -= 100;
  else if (contractRatio > 0.9) score -= 20;
  else if (contractRatio < 0.5) score += 10;

  if (!hasTwoConsecutiveDaysOff(employee.id, weekStart, assignments, history)) {
    score -= 5;
  }

  const prevOff = !isWorking(employee.id, addDays(slot.date, -1), assignments, history);
  const nextOff = !isWorking(employee.id, addDays(slot.date, 1), assignments, history);
  if (prevOff && nextOff) score += 8;

  return score;
}

function canAssign(
  employee: EmployeeInput,
  slot: ScheduleSlot,
  assignments: ScheduleAssignmentResult[],
  history: HistoricalAssignment[],
  shiftTypes: ShiftTypeInput[],
): { ok: boolean; reason?: string } {
  if (!employee.qualifiedShiftTypeIds.includes(slot.shiftTypeId)) {
    return { ok: false, reason: "not qualified" };
  }

  const dayIdx = isoDayOfWeek(slot.date);
  const avail = employee.availability[dayIdx];
  if (!avail?.available) {
    return { ok: false, reason: "unavailable" };
  }

  if (
    assignments.some(
      (a) => a.employeeId === employee.id && isSameDay(a.date, slot.date),
    )
  ) {
    return { ok: false, reason: "already assigned today" };
  }

  const prevDays = countConsecutiveWorkDays(employee.id, slot.date, assignments, history);
  if (prevDays >= employee.maxConsecutiveDays) {
    return { ok: false, reason: "max consecutive days" };
  }

  const nextDays = countFutureConsecutiveWorkDays(employee.id, slot.date, assignments);
  if (prevDays + 1 + nextDays > employee.maxConsecutiveDays) {
    return { ok: false, reason: "would exceed consecutive days" };
  }

  const shiftType = shiftTypes.find((s) => s.id === slot.shiftTypeId);
  if (!shiftType) return { ok: false, reason: "unknown shift type" };

  const lastShift = getLastHistoricalShift(
    employee.id,
    slot.date,
    history,
    assignments,
    shiftTypes,
  );
  if (lastShift) {
    const daysApart = Math.round(
      (slot.date.getTime() - lastShift.date.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (
      !meetsMinimumRest(
        lastShift.startTime,
        lastShift.durationMinutes,
        shiftType.startTime,
        daysApart,
      )
    ) {
      return { ok: false, reason: "insufficient rest (DE law)" };
    }
  }

  const nextShift = getNextScheduledShift(employee.id, slot.date, assignments, shiftTypes);
  if (nextShift) {
    const daysApart = Math.round(
      (nextShift.date.getTime() - slot.date.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (
      !meetsMinimumRest(
        shiftType.startTime,
        shiftType.durationMinutes,
        nextShift.startTime,
        daysApart,
      )
    ) {
      return { ok: false, reason: "insufficient rest for next shift" };
    }
  }

  const hoursThisWeek =
    assignments
      .filter((a) => a.employeeId === employee.id)
      .reduce((sum, a) => sum + shiftDurationHours(shiftTypes, a.shiftTypeId), 0) +
    shiftType.durationMinutes / 60;

  if (hoursThisWeek > employee.contractHoursPerWeek + 2) {
    return { ok: false, reason: "contract hours exceeded" };
  }

  return { ok: true };
}

function slotScarcity(
  slot: ScheduleSlot,
  employees: EmployeeInput[],
  assignments: ScheduleAssignmentResult[],
  history: HistoricalAssignment[],
  shiftTypes: ShiftTypeInput[],
): number {
  const eligible = employees.filter(
    (e) => canAssign(e, slot, assignments, history, shiftTypes).ok,
  );
  return eligible.length;
}

export function generateSchedule(input: SchedulerInput): SchedulerResult {
  const assignments: ScheduleAssignmentResult[] = [
    ...(input.existingAssignments ?? []),
  ];
  const warnings: string[] = [];
  const unfilledSlots: ScheduleSlot[] = [];

  const allSlots = buildSlots(input);
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
      .filter((e) => canAssign(e, slot, assignments, input.historicalAssignments, input.shiftTypes).ok)
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
      const shiftName = input.shiftTypes.find((s) => s.id === slot.shiftTypeId)?.name ?? "?";
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

  return { assignments, warnings, unfilledSlots };
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getHistoricalWeeks(count: number): Date[] {
  const now = getWeekStart(new Date());
  return Array.from({ length: count }, (_, i) => subWeeks(now, i + 1));
}

export { DAY_NAMES, isoDayOfWeek };
