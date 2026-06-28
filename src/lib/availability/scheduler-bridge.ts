import {
  legacyWeekFromDefaultTemplate,
  statusToLegacyAvailability,
  type LegacyAvailabilityDay,
} from "@/lib/availability/status";
import type { AvailabilityStatus } from "@/types";

/** Scheduler still expects legacy shape — prepared for E5 cutover, not wired yet. */
export interface SchedulerLegacyAvailability {
  available: boolean;
  preferredOff: boolean;
}

export type SchedulerAvailabilityByDay = Record<number, SchedulerLegacyAvailability>;

export function mapLegacyRowsToSchedulerAvailability(
  rows: LegacyAvailabilityDay[],
): SchedulerAvailabilityByDay {
  const result: SchedulerAvailabilityByDay = {};

  for (const row of rows) {
    result[row.dayOfWeek] = {
      available: row.available,
      preferredOff: row.preferredOff ?? false,
    };
  }

  return result;
}

export function mapDefaultTemplateToSchedulerAvailability(
  rows: Array<{ dayOfWeek: number; status: AvailabilityStatus }>,
): SchedulerAvailabilityByDay {
  return mapLegacyRowsToSchedulerAvailability(legacyWeekFromDefaultTemplate(rows));
}

export function mapWeeklyStatusToSchedulerAvailability(
  rows: Array<{ date: Date | string; status: AvailabilityStatus }>,
  weekDayIndex: (date: Date) => number,
): SchedulerAvailabilityByDay {
  const result: SchedulerAvailabilityByDay = {};

  for (const row of rows) {
    const date = typeof row.date === "string" ? new Date(row.date) : row.date;
    const dayOfWeek = weekDayIndex(date);
    result[dayOfWeek] = statusToLegacyAvailability(row.status);
  }

  return result;
}

/**
 * Future E5 entry point: choose weekly rows when present, else fall back to legacy.
 * Not used by generator in E2.
 */
export function resolveSchedulerAvailabilityInput(params: {
  legacyRows: LegacyAvailabilityDay[];
  weeklyRows?: Array<{ date: Date | string; status: AvailabilityStatus }>;
  weekDayIndex?: (date: Date) => number;
}): SchedulerAvailabilityByDay {
  if (params.weeklyRows?.length) {
    const indexFn =
      params.weekDayIndex ??
      ((date: Date) => {
        const d = date.getDay();
        return d === 0 ? 6 : d - 1;
      });
    return mapWeeklyStatusToSchedulerAvailability(params.weeklyRows, indexFn);
  }

  return mapLegacyRowsToSchedulerAvailability(params.legacyRows);
}
