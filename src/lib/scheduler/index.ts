import { startOfWeek, subWeeks } from "date-fns";
import {
  generateCoverageSchedule,
  isZoneCoverageReady,
} from "./coverage-planner";
import { generateLegacySchedule } from "./legacy";
import type { SchedulerInput, SchedulerResult } from "./types";

export function partitionPlanning(input: SchedulerInput) {
  const readyZones = (input.coverageZones ?? []).filter(isZoneCoverageReady);
  const readyZoneIds = new Set(readyZones.map((zone) => zone.id));

  const legacyShiftTypeIds = input.shiftTypes
    .filter((st) => !st.zoneId || !readyZoneIds.has(st.zoneId))
    .map((st) => st.id);

  return { readyZones, legacyShiftTypeIds };
}

export function generateSchedule(input: SchedulerInput): SchedulerResult {
  const seedAssignments = [...(input.existingAssignments ?? [])];
  const { readyZones, legacyShiftTypeIds } = partitionPlanning(input);

  let assignments = [...seedAssignments];
  const warnings: string[] = [];
  const unfilledSlots: SchedulerResult["unfilledSlots"] = [];

  if (legacyShiftTypeIds.length > 0) {
    const legacyResult = generateLegacySchedule(
      input,
      legacyShiftTypeIds,
      assignments,
    );
    assignments = [...assignments, ...legacyResult.assignments];
    warnings.push(...legacyResult.warnings);
    unfilledSlots.push(...legacyResult.unfilledSlots);
  }

  if (readyZones.length > 0) {
    const coverageResult = generateCoverageSchedule(
      input,
      readyZones,
      assignments,
    );
    assignments = [...assignments, ...coverageResult.assignments];
    warnings.push(...coverageResult.warnings);
  }

  return {
    assignments,
    warnings,
    unfilledSlots,
    coverageZoneIds: readyZones.map((zone) => zone.id),
    legacyShiftTypeIds,
  };
}

export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function getHistoricalWeeks(count: number): Date[] {
  const now = getWeekStart(new Date());
  return Array.from({ length: count }, (_, i) => subWeeks(now, i + 1));
}

export type {
  CoverageIntervalInput,
  CoverageRequirementRuleInput,
  CoverageZoneInput,
  EmployeeInput,
  GuestForecastInput,
  HistoricalAssignment,
  ScheduleAssignmentResult,
  ScheduleSlot,
  SchedulerInput,
  SchedulerResult,
  ShiftTypeInput,
  StaffingRuleInput,
} from "./types";

export { isoDayOfWeek } from "./constraints";

export const DAY_NAMES = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
