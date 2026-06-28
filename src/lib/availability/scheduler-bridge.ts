import {
  legacyWeekFromDefaultTemplate,
  statusToLegacyAvailability,
  type LegacyAvailabilityDay,
} from "@/lib/availability/status";
import type { AvailabilityStatus } from "@/types";

/** Scheduler still expects legacy shape; weekly rows map into this via statusToLegacyAvailability. */
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
 * Resolve scheduler availability. When `weeklyRows` is provided (E5+ generator), weekly
 * data is authoritative and legacy rows are ignored. An empty weekly array defaults to
 * all days available. Omit `weeklyRows` to use legacy rows only (pre-E5 callers).
 */
export function resolveSchedulerAvailabilityInput(params: {
  legacyRows: LegacyAvailabilityDay[];
  weeklyRows?: Array<{ date: Date | string; status: AvailabilityStatus }>;
  weekDayIndex?: (date: Date) => number;
}): SchedulerAvailabilityByDay {
  if (params.weeklyRows !== undefined) {
    if (params.weeklyRows.length > 0) {
      const indexFn =
        params.weekDayIndex ??
        ((date: Date) => {
          const d = date.getDay();
          return d === 0 ? 6 : d - 1;
        });
      return mapWeeklyStatusToSchedulerAvailability(params.weeklyRows, indexFn);
    }

    return mapLegacyRowsToSchedulerAvailability(
      Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek,
        available: true,
        preferredOff: false,
      })),
    );
  }

  return mapLegacyRowsToSchedulerAvailability(params.legacyRows);
}
