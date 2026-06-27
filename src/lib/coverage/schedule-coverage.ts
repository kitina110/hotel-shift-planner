import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  computeWeekCoverage,
  extractCoverageGaps,
  snapshotToGap,
  type CoverageGap,
  type CoverageSnapshot,
  type DayCoverageInput,
  type ShiftTemplateRef,
  type ZoneCoverageConfig,
} from "@/lib/coverage";
import { endTimeFromStartAndDuration } from "@/lib/shift-time";
import type { CoverageZoneWithDetails } from "@/lib/coverage-client";
import type { Schedule, ShiftType } from "@/types";

export interface IntervalCoverageView {
  snapshot: CoverageSnapshot;
  gap: CoverageGap | null;
}

export interface ZoneCoverageDayView {
  zoneId: string;
  zoneName: string;
  intervals: IntervalCoverageView[];
}

export interface DayCoverageView {
  date: string;
  weekdayLabel: string;
  dateLabel: string;
  guestCount: number;
  zones: ZoneCoverageDayView[];
}

export interface ScheduleCoverageResult {
  snapshots: CoverageSnapshot[];
  gaps: CoverageGap[];
  days: DayCoverageView[];
  hasConfiguredIntervals: boolean;
}

export interface ScheduleCoverageInput {
  weekDayKeys: string[];
  guestCounts: Record<string, number>;
  schedule: Schedule | null;
  shiftTypes: ShiftType[];
  zones: CoverageZoneWithDetails[];
}

function toZoneConfigs(zones: CoverageZoneWithDetails[]): ZoneCoverageConfig[] {
  return zones
    .filter((zone) => zone.intervals.length > 0)
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      intervals: zone.intervals.map((interval) => ({
        id: interval.id,
        startTime: interval.startTime,
        endTime: interval.endTime,
        label: interval.label,
        rules: (interval.rules ?? []).map((rule) => ({
          minGuests: rule.minGuests,
          maxGuests: rule.maxGuests,
          staffCount: rule.staffCount,
        })),
      })),
    }));
}

function toShiftTemplates(shiftTypes: ShiftType[]): ShiftTemplateRef[] {
  return shiftTypes.map((st) => ({
    id: st.id,
    zoneId: st.zoneId,
    startTime: st.startTime,
    endTime:
      st.endTime && st.endTime.length > 0
        ? st.endTime
        : endTimeFromStartAndDuration(st.startTime, st.durationMinutes),
  }));
}

function buildDayInputs(input: ScheduleCoverageInput): DayCoverageInput[] {
  const zoneConfigs = toZoneConfigs(input.zones);
  if (zoneConfigs.length === 0) return [];

  const shiftTemplates = toShiftTemplates(input.shiftTypes);
  const assignments =
    input.schedule?.assignments.map((a) => ({
      employeeId: a.employeeId,
      employeeName: a.employee.name,
      shiftTypeId: a.shiftTypeId,
      date: a.date,
    })) ?? [];

  return input.weekDayKeys.map((dayKey) => ({
    date: dayKey,
    guestCount: input.guestCounts[dayKey] ?? 0,
    zones: zoneConfigs,
    shiftTypes: shiftTemplates,
    assignments,
  }));
}

function groupSnapshotsByDayAndZone(
  snapshots: CoverageSnapshot[],
): DayCoverageView[] {
  const byDate = new Map<string, CoverageSnapshot[]>();

  for (const snapshot of snapshots) {
    const list = byDate.get(snapshot.target.date) ?? [];
    list.push(snapshot);
    byDate.set(snapshot.target.date, list);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, daySnapshots]) => {
      const byZone = new Map<string, CoverageSnapshot[]>();
      for (const snapshot of daySnapshots) {
        const list = byZone.get(snapshot.target.zoneId) ?? [];
        list.push(snapshot);
        byZone.set(snapshot.target.zoneId, list);
      }

      const zones: ZoneCoverageDayView[] = Array.from(byZone.entries()).map(
        ([zoneId, zoneSnapshots]) => ({
          zoneId,
          zoneName: zoneSnapshots[0]?.target.zoneName ?? zoneId,
          intervals: zoneSnapshots
            .sort((a, b) => a.target.startTime.localeCompare(b.target.startTime))
            .map((snapshot) => ({
              snapshot,
              gap: snapshotToGap(snapshot),
            })),
        }),
      );

      const dayDate = new Date(`${date}T12:00:00`);

      return {
        date,
        weekdayLabel: format(dayDate, "EEEE", { locale: cs }),
        dateLabel: format(dayDate, "d. MMMM", { locale: cs }),
        guestCount: daySnapshots[0]?.target.guestCount ?? 0,
        zones,
      };
    });
}

/** Pure function — compute full schedule coverage once per input change. */
export function computeScheduleCoverage(
  input: ScheduleCoverageInput,
): ScheduleCoverageResult {
  const hasConfiguredIntervals = input.zones.some(
    (zone) => zone.intervals.length > 0,
  );

  if (!hasConfiguredIntervals) {
    return {
      snapshots: [],
      gaps: [],
      days: [],
      hasConfiguredIntervals: false,
    };
  }

  const dayInputs = buildDayInputs(input);
  const snapshots = computeWeekCoverage(dayInputs);
  const gaps = extractCoverageGaps(snapshots);
  const days = groupSnapshotsByDayAndZone(snapshots);

  return {
    snapshots,
    gaps,
    days,
    hasConfiguredIntervals: true,
  };
}
