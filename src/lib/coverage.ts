import { formatShiftTimeRange, parseTimeToMinutes } from "@/lib/shift-time";
import type { CoverageInterval, CoverageRequirementRule } from "@/types";

// ─── Time range (half-open [start, end) on a single planning day) ─────────────

export interface TimeRangeInput {
  startTime: string;
  endTime: string;
}

/** End minute on the planning-day axis; overnight shifts extend past midnight. */
export function rangeEndMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end <= start) return end + 24 * 60;
  return end;
}

export function toHalfOpenRange(
  startTime: string,
  endTime: string,
): { start: number; end: number } {
  const start = parseTimeToMinutes(startTime);
  const end = rangeEndMinutes(startTime, endTime);
  if (start >= end) {
    throw new Error("Neplatný časový rozsah");
  }
  return { start, end };
}

/** True when [startA, endA) and [startB, endB) share at least one minute. */
export function timeRangesOverlap(
  a: TimeRangeInput,
  b: TimeRangeInput,
): boolean {
  const rangeA = toHalfOpenRange(a.startTime, a.endTime);
  const rangeB = toHalfOpenRange(b.startTime, b.endTime);
  return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
}

/** Overlap length in minutes (0 when ranges only touch at a boundary). */
export function overlapDurationMinutes(
  a: TimeRangeInput,
  b: TimeRangeInput,
): number {
  const rangeA = toHalfOpenRange(a.startTime, a.endTime);
  const rangeB = toHalfOpenRange(b.startTime, b.endTime);
  const start = Math.max(rangeA.start, rangeB.start);
  const end = Math.min(rangeA.end, rangeB.end);
  return Math.max(0, end - start);
}

/**
 * Validates that intervals within one zone do not overlap.
 * Touching boundaries (17:00 end / 17:00 start) are allowed.
 */
export function validateNonOverlappingIntervals(
  intervals: TimeRangeInput[],
): string | null {
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      if (timeRangesOverlap(intervals[i], intervals[j])) {
        return `Intervaly ${intervals[i].startTime}–${intervals[i].endTime} a ${intervals[j].startTime}–${intervals[j].endTime} se překrývají`;
      }
    }
  }
  return null;
}

// ─── Requirement resolution ───────────────────────────────────────────────────

export function resolveRequiredHeadcount(
  rules: Pick<CoverageRequirementRule, "minGuests" | "maxGuests" | "staffCount">[],
  guestCount: number,
): number {
  const applicable = rules
    .filter(
      (r) =>
        guestCount >= r.minGuests &&
        (r.maxGuests === null || guestCount <= r.maxGuests),
    )
    .sort((a, b) => b.minGuests - a.minGuests);

  return applicable[0]?.staffCount ?? 0;
}

// ─── Domain result types ──────────────────────────────────────────────────────

export interface CoverageTarget {
  date: string;
  zoneId: string;
  zoneName: string;
  intervalId: string;
  label?: string | null;
  startTime: string;
  endTime: string;
  guestCount: number;
  requiredHeadcount: number;
}

export interface CoveringStaffEntry {
  employeeId: string;
  displayName: string;
  shiftTypeId: string;
  shiftTimeLabel: string;
  startTime: string;
  endTime: string;
}

export interface CoverageSnapshot {
  target: CoverageTarget;
  coveredHeadcount: number;
  deficit: number;
  fulfilled: boolean;
  coveringStaff: CoveringStaffEntry[];
}

export type GapSeverity = "none" | "low" | "medium" | "critical";

export interface CoverageGap {
  snapshot: CoverageSnapshot;
  severity: GapSeverity;
}

// ─── Evaluation inputs (persistence-agnostic) ────────────────────────────────

export interface ZoneCoverageConfig {
  id: string;
  name: string;
  intervals: Array<
    Pick<CoverageInterval, "id" | "startTime" | "endTime" | "label"> & {
      rules?: CoverageRequirementRule[];
    }
  >;
}

export interface ShiftTemplateRef {
  id: string;
  zoneId?: string | null;
  startTime: string;
  endTime: string;
}

export interface AssignmentRef {
  employeeId: string;
  employeeName: string;
  shiftTypeId: string;
  date: string;
}

export interface DayCoverageInput {
  date: string;
  guestCount: number;
  zones: ZoneCoverageConfig[];
  shiftTypes: ShiftTemplateRef[];
  assignments: AssignmentRef[];
}

// ─── Target & snapshot builders ───────────────────────────────────────────────

export function buildCoverageTargets(
  date: string,
  zone: ZoneCoverageConfig,
  guestCount: number,
): CoverageTarget[] {
  return zone.intervals.map((interval) => ({
    date,
    zoneId: zone.id,
    zoneName: zone.name,
    intervalId: interval.id,
    label: interval.label,
    startTime: interval.startTime,
    endTime: interval.endTime,
    guestCount,
    requiredHeadcount: resolveRequiredHeadcount(interval.rules ?? [], guestCount),
  }));
}

function assignmentsForDate(
  assignments: AssignmentRef[],
  date: string,
): AssignmentRef[] {
  const dayKey = date.slice(0, 10);
  return assignments.filter((a) => a.date.slice(0, 10) === dayKey);
}

function buildCoveringStaffForInterval(
  interval: TimeRangeInput,
  zoneId: string,
  dayAssignments: AssignmentRef[],
  shiftTypes: ShiftTemplateRef[],
): CoveringStaffEntry[] {
  const byEmployee = new Map<string, CoveringStaffEntry>();

  for (const assignment of dayAssignments) {
    const shift = shiftTypes.find((st) => st.id === assignment.shiftTypeId);
    if (!shift || shift.zoneId !== zoneId) continue;

    const workRange: TimeRangeInput = {
      startTime: shift.startTime,
      endTime: shift.endTime,
    };

    if (overlapDurationMinutes(workRange, interval) <= 0) continue;

    if (!byEmployee.has(assignment.employeeId)) {
      byEmployee.set(assignment.employeeId, {
        employeeId: assignment.employeeId,
        displayName: assignment.employeeName,
        shiftTypeId: shift.id,
        shiftTimeLabel: formatShiftTimeRange(shift.startTime, shift.endTime),
        startTime: shift.startTime,
        endTime: shift.endTime,
      });
    }
  }

  return Array.from(byEmployee.values());
}

export function computeCoverageSnapshot(
  target: CoverageTarget,
  dayAssignments: AssignmentRef[],
  shiftTypes: ShiftTemplateRef[],
): CoverageSnapshot {
  const intervalRange: TimeRangeInput = {
    startTime: target.startTime,
    endTime: target.endTime,
  };

  const coveringStaff = buildCoveringStaffForInterval(
    intervalRange,
    target.zoneId,
    dayAssignments,
    shiftTypes,
  );

  const coveredHeadcount = coveringStaff.length;
  const deficit = Math.max(0, target.requiredHeadcount - coveredHeadcount);

  return {
    target,
    coveredHeadcount,
    deficit,
    fulfilled: deficit === 0,
    coveringStaff,
  };
}

export function computeDayCoverage(input: DayCoverageInput): CoverageSnapshot[] {
  const dayKey = input.date.slice(0, 10);
  const dayAssignments = assignmentsForDate(input.assignments, dayKey);
  const snapshots: CoverageSnapshot[] = [];

  for (const zone of input.zones) {
    const targets = buildCoverageTargets(dayKey, zone, input.guestCount);
    for (const target of targets) {
      snapshots.push(
        computeCoverageSnapshot(target, dayAssignments, input.shiftTypes),
      );
    }
  }

  return snapshots;
}

export function computeWeekCoverage(
  days: DayCoverageInput[],
): CoverageSnapshot[] {
  return days.flatMap((day) => computeDayCoverage(day));
}

// ─── Coverage gaps ────────────────────────────────────────────────────────────

export function gapSeverity(deficit: number): GapSeverity {
  if (deficit <= 0) return "none";
  if (deficit === 1) return "low";
  if (deficit === 2) return "medium";
  return "critical";
}

export function snapshotToGap(snapshot: CoverageSnapshot): CoverageGap | null {
  if (snapshot.fulfilled) return null;
  return {
    snapshot,
    severity: gapSeverity(snapshot.deficit),
  };
}

export function extractCoverageGaps(
  snapshots: CoverageSnapshot[],
): CoverageGap[] {
  return snapshots
    .map(snapshotToGap)
    .filter((gap): gap is CoverageGap => gap !== null);
}

export function totalDeficit(snapshots: CoverageSnapshot[]): number {
  return snapshots.reduce((sum, s) => sum + s.deficit, 0);
}

export function totalDeficitForZone(
  snapshots: CoverageSnapshot[],
  zoneId: string,
): number {
  return snapshots
    .filter((s) => s.target.zoneId === zoneId)
    .reduce((sum, s) => sum + s.deficit, 0);
}

// ─── Shift contribution (for planning — stage 4) ───────────────────────────

/**
 * How many interval deficits a shift would reduce if assigned,
 * given current coverage on that day.
 */
export function shiftDeficitContribution(
  shift: ShiftTemplateRef,
  zoneId: string,
  snapshots: CoverageSnapshot[],
  alreadyAssignedEmployeeIds: Set<string>,
  candidateEmployeeId: string,
): number {
  if (shift.zoneId !== zoneId) return 0;
  if (alreadyAssignedEmployeeIds.has(candidateEmployeeId)) return 0;

  const workRange: TimeRangeInput = {
    startTime: shift.startTime,
    endTime: shift.endTime,
  };

  let contribution = 0;

  for (const snapshot of snapshots) {
    if (snapshot.target.zoneId !== zoneId) continue;
    if (snapshot.deficit <= 0) continue;

    const intervalRange: TimeRangeInput = {
      startTime: snapshot.target.startTime,
      endTime: snapshot.target.endTime,
    };

    const alreadyCovering = snapshot.coveringStaff.some(
      (s) => s.employeeId === candidateEmployeeId,
    );
    if (alreadyCovering) continue;

    if (overlapDurationMinutes(workRange, intervalRange) > 0) {
      contribution += 1;
    }
  }

  return contribution;
}
