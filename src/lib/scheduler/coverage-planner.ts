import { addDays, eachDayOfInterval, format, isSameDay } from "date-fns";
import { cs } from "date-fns/locale";
import {
  computeDayCoverage,
  shiftDeficitContribution,
  totalDeficitForZone,
  type CoverageSnapshot,
  type ZoneCoverageConfig,
} from "@/lib/coverage";
import { isQualifiedForZone } from "@/lib/qualification";
import { canAssign, scoreCandidate } from "./constraints";
import type {
  CoverageZoneInput,
  EmployeeInput,
  ScheduleAssignmentResult,
  ScheduleSlot,
  SchedulerInput,
  SchedulerResult,
  ShiftTypeInput,
} from "./types";

export function isZoneCoverageReady(zone: CoverageZoneInput): boolean {
  if (zone.intervals.length === 0) return false;
  return zone.intervals.some((interval) => interval.rules.length > 0);
}

function toZoneConfig(zone: CoverageZoneInput): ZoneCoverageConfig {
  return {
    id: zone.id,
    name: zone.name,
    intervals: zone.intervals.map((interval) => ({
      id: interval.id,
      startTime: interval.startTime,
      endTime: interval.endTime,
      label: interval.label,
      rules: interval.rules,
    })),
  };
}

function daySnapshots(
  date: Date,
  guestCount: number,
  zone: CoverageZoneInput,
  assignments: ScheduleAssignmentResult[],
  employees: EmployeeInput[],
  shiftTypes: ShiftTypeInput[],
): CoverageSnapshot[] {
  const dayKey = format(date, "yyyy-MM-dd");

  return computeDayCoverage({
    date: dayKey,
    guestCount,
    zones: [toZoneConfig(zone)],
    shiftTypes: shiftTypes.map((st) => ({
      id: st.id,
      zoneId: st.zoneId,
      startTime: st.startTime,
      endTime: st.endTime,
    })),
    assignments: assignments
      .filter((a) => isSameDay(a.date, date))
      .map((a) => ({
        employeeId: a.employeeId,
        employeeName:
          employees.find((e) => e.id === a.employeeId)?.name ?? a.employeeId,
        shiftTypeId: a.shiftTypeId,
        date: dayKey,
      })),
  });
}

function zoneShiftTypes(zoneId: string, shiftTypes: ShiftTypeInput[]): ShiftTypeInput[] {
  return shiftTypes.filter((st) => st.zoneId === zoneId);
}

function candidateScarcity(
  zoneId: string,
  snapshots: CoverageSnapshot[],
  employees: EmployeeInput[],
  shiftTypes: ShiftTypeInput[],
  assignments: ScheduleAssignmentResult[],
  history: SchedulerInput["historicalAssignments"],
  date: Date,
): number {
  const deficitSnapshots = snapshots.filter(
    (s) => s.target.zoneId === zoneId && s.deficit > 0,
  );
  if (deficitSnapshots.length === 0) return Number.MAX_SAFE_INTEGER;

  let minEligible = Number.MAX_SAFE_INTEGER;

  for (const snapshot of deficitSnapshots) {
    let eligible = 0;
    for (const employee of employees) {
      if (!isQualifiedForZone(employee, zoneId, shiftTypes)) continue;
      for (const shiftType of zoneShiftTypes(zoneId, shiftTypes)) {
        if (!employee.qualifiedShiftTypeIds.includes(shiftType.id)) continue;
        const slot: ScheduleSlot = { date, shiftTypeId: shiftType.id };
        if (!canAssign(employee, slot, assignments, history, shiftTypes).ok) continue;
        if (
          shiftDeficitContribution(
            shiftType,
            zoneId,
            snapshots,
            new Set(
              assignments
                .filter((a) => isSameDay(a.date, date))
                .map((a) => a.employeeId),
            ),
            employee.id,
          ) > 0
        ) {
          eligible++;
          break;
        }
      }
    }
    minEligible = Math.min(minEligible, eligible);
  }

  return minEligible;
}

function appendCoverageWarnings(
  zone: CoverageZoneInput,
  date: Date,
  snapshots: CoverageSnapshot[],
  warnings: string[],
  warnedKeys: Set<string>,
): void {
  for (const snapshot of snapshots) {
    if (snapshot.deficit <= 0) continue;

    const key = `${format(date, "yyyy-MM-dd")}-${snapshot.target.intervalId}`;
    if (warnedKeys.has(key)) continue;
    warnedKeys.add(key);

    warnings.push(
      `V zóně ${zone.name} chybí ${snapshot.deficit} zaměstnanců v intervalu ${snapshot.target.startTime}–${snapshot.target.endTime} dne ${format(date, "d. M.", { locale: cs })}`,
    );
  }
}

export function generateCoverageSchedule(
  input: SchedulerInput,
  zones: CoverageZoneInput[],
  seedAssignments: ScheduleAssignmentResult[] = [],
): Pick<SchedulerResult, "assignments" | "warnings"> {
  const assignments: ScheduleAssignmentResult[] = [...seedAssignments];
  const warnings: string[] = [];
  const warnedKeys = new Set<string>();
  const newAssignments: ScheduleAssignmentResult[] = [];

  const weekDays = eachDayOfInterval({
    start: input.weekStart,
    end: addDays(input.weekStart, 6),
  });

  for (const date of weekDays) {
    const forecast = input.guestForecasts.find((f) => isSameDay(f.date, date));
    const guestCount = forecast?.guestCount ?? 0;

    const zonesByDeficit = [...zones].sort((a, b) => {
      const deficitA = totalDeficitForZone(
        daySnapshots(date, guestCount, a, assignments, input.employees, input.shiftTypes),
        a.id,
      );
      const deficitB = totalDeficitForZone(
        daySnapshots(date, guestCount, b, assignments, input.employees, input.shiftTypes),
        b.id,
      );
      return deficitB - deficitA;
    });

    for (const zone of zonesByDeficit) {
      let snapshots = daySnapshots(
        date,
        guestCount,
        zone,
        assignments,
        input.employees,
        input.shiftTypes,
      );

      while (totalDeficitForZone(snapshots, zone.id) > 0) {
        const assignedToday = new Set(
          assignments.filter((a) => isSameDay(a.date, date)).map((a) => a.employeeId),
        );

        const candidates: {
          employee: EmployeeInput;
          shiftType: ShiftTypeInput;
          contribution: number;
          scarcity: number;
          score: number;
        }[] = [];

        for (const employee of input.employees) {
          if (!isQualifiedForZone(employee, zone.id, input.shiftTypes)) continue;

          for (const shiftType of zoneShiftTypes(zone.id, input.shiftTypes)) {
            if (!employee.qualifiedShiftTypeIds.includes(shiftType.id)) continue;

            const slot: ScheduleSlot = { date, shiftTypeId: shiftType.id };
            if (
              !canAssign(
                employee,
                slot,
                assignments,
                input.historicalAssignments,
                input.shiftTypes,
              ).ok
            ) {
              continue;
            }

            const contribution = shiftDeficitContribution(
              shiftType,
              zone.id,
              snapshots,
              assignedToday,
              employee.id,
            );

            if (contribution <= 0) continue;

            candidates.push({
              employee,
              shiftType,
              contribution,
              scarcity: candidateScarcity(
                zone.id,
                snapshots,
                input.employees,
                input.shiftTypes,
                assignments,
                input.historicalAssignments,
                date,
              ),
              score: scoreCandidate(
                employee,
                slot,
                assignments,
                input.historicalAssignments,
                input.shiftTypes,
                input.weekStart,
              ),
            });
          }
        }

        if (candidates.length === 0) {
          appendCoverageWarnings(zone, date, snapshots, warnings, warnedKeys);
          break;
        }

        candidates.sort((a, b) => {
          if (b.contribution !== a.contribution) return b.contribution - a.contribution;
          if (a.scarcity !== b.scarcity) return a.scarcity - b.scarcity;
          return b.score - a.score;
        });

        const best = candidates[0];
        const assignment: ScheduleAssignmentResult = {
          employeeId: best.employee.id,
          shiftTypeId: best.shiftType.id,
          date,
        };

        assignments.push(assignment);
        newAssignments.push(assignment);

        snapshots = daySnapshots(
          date,
          guestCount,
          zone,
          assignments,
          input.employees,
          input.shiftTypes,
        );
      }

      appendCoverageWarnings(zone, date, snapshots, warnings, warnedKeys);
    }
  }

  return { assignments: newAssignments, warnings };
}
