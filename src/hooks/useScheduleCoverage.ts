"use client";

import { useMemo } from "react";
import type { CoverageZoneWithDetails } from "@/lib/coverage-client";
import {
  computeScheduleCoverage,
  type ScheduleCoverageResult,
} from "@/lib/coverage/schedule-coverage";
import type { Schedule, ShiftType } from "@/types";

export function useScheduleCoverage(params: {
  weekDayKeys: string[];
  guestCounts: Record<string, number>;
  schedule: Schedule | null;
  shiftTypes: ShiftType[];
  zones: CoverageZoneWithDetails[];
}): ScheduleCoverageResult {
  const { weekDayKeys, guestCounts, schedule, shiftTypes, zones } = params;

  const weekKey = weekDayKeys.join("|");
  const guestKey = useMemo(
    () => weekDayKeys.map((k) => `${k}:${guestCounts[k] ?? 0}`).join("|"),
    [weekDayKeys, guestCounts],
  );

  return useMemo(
    () =>
      computeScheduleCoverage({
        weekDayKeys,
        guestCounts,
        schedule,
        shiftTypes,
        zones,
      }),
    [weekKey, guestKey, schedule, shiftTypes, zones, weekDayKeys, guestCounts],
  );
}
