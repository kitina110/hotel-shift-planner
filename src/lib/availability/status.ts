import type { AvailabilityStatus } from "@/types";

export type { AvailabilityStatus };

export interface LegacyAvailabilityDay {
  dayOfWeek: number;
  available: boolean;
  preferredOff?: boolean;
}

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: "Dostupný",
  PREFERRED_OFF: "Přání volna",
  UNAVAILABLE: "Nedostupný",
  VACATION: "Dovolená",
  SICK: "Nemoc",
};

const STATUS_EMOJI: Record<AvailabilityStatus, string> = {
  AVAILABLE: "🟢",
  PREFERRED_OFF: "🟡",
  UNAVAILABLE: "🔴",
  VACATION: "🏖️",
  SICK: "🤒",
};

/** Half-open week: 0 = Monday … 6 = Sunday (matches legacy Availability). */
export const WEEK_DAY_COUNT = 7;

export function formatAvailabilityStatus(status: AvailabilityStatus): string {
  return STATUS_LABELS[status];
}

export function formatAvailabilityStatusWithEmoji(status: AvailabilityStatus): string {
  return `${availabilityStatusEmoji(status)} ${formatAvailabilityStatus(status)}`;
}

export function availabilityStatusEmoji(status: AvailabilityStatus): string {
  return STATUS_EMOJI[status];
}

/** Map legacy UI/API row → new domain status. VACATION/SICK only from new model. */
export function legacyAvailabilityToStatus(day: LegacyAvailabilityDay): AvailabilityStatus {
  if (!day.available) return "UNAVAILABLE";
  if (day.preferredOff) return "PREFERRED_OFF";
  return "AVAILABLE";
}

/** Map new domain status → legacy row (lossy for VACATION/SICK → unavailable). */
export function statusToLegacyAvailability(status: AvailabilityStatus): {
  available: boolean;
  preferredOff: boolean;
} {
  switch (status) {
    case "UNAVAILABLE":
    case "VACATION":
    case "SICK":
      return { available: false, preferredOff: false };
    case "PREFERRED_OFF":
      return { available: true, preferredOff: true };
    case "AVAILABLE":
    default:
      return { available: true, preferredOff: false };
  }
}

export function isHardAvailabilityBlock(status: AvailabilityStatus): boolean {
  return status === "UNAVAILABLE" || status === "VACATION" || status === "SICK";
}

export function isSchedulerSoftPenalty(status: AvailabilityStatus): boolean {
  return status === "PREFERRED_OFF";
}

/** Ensure exactly 7 days Mon–Sun; fill missing with available defaults. */
export function normalizeLegacyWeek(
  input?: LegacyAvailabilityDay[],
): LegacyAvailabilityDay[] {
  const byDay = new Map<number, LegacyAvailabilityDay>();

  for (const row of input ?? []) {
    if (row.dayOfWeek >= 0 && row.dayOfWeek <= 6) {
      byDay.set(row.dayOfWeek, {
        dayOfWeek: row.dayOfWeek,
        available: row.available,
        preferredOff: row.preferredOff ?? false,
      });
    }
  }

  return Array.from({ length: WEEK_DAY_COUNT }, (_, dayOfWeek) => {
    const existing = byDay.get(dayOfWeek);
    return (
      existing ?? {
        dayOfWeek,
        available: true,
        preferredOff: false,
      }
    );
  });
}

export function defaultTemplateRowsFromLegacy(
  days: LegacyAvailabilityDay[],
): Array<{ dayOfWeek: number; status: AvailabilityStatus }> {
  return normalizeLegacyWeek(days).map((day) => ({
    dayOfWeek: day.dayOfWeek,
    status: legacyAvailabilityToStatus(day),
  }));
}

export function legacyWeekFromDefaultTemplate(
  rows: Array<{ dayOfWeek: number; status: AvailabilityStatus }>,
): LegacyAvailabilityDay[] {
  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row.status]));

  return Array.from({ length: WEEK_DAY_COUNT }, (_, dayOfWeek) => {
    const status = byDay.get(dayOfWeek) ?? "AVAILABLE";
    const legacy = statusToLegacyAvailability(status);
    return { dayOfWeek, ...legacy };
  });
}
