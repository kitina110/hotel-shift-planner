import {
  defaultTemplateRowsFromLegacy,
  normalizeLegacyWeek,
  type LegacyAvailabilityDay,
} from "@/lib/availability/status";
import type { PrismaClient } from "@/generated/prisma/client";

type DbClient = Pick<
  PrismaClient,
  "availability" | "employeeDefaultAvailability"
>;

/** Upsert legacy Availability rows (still SSOT for current UI + generator). */
export async function upsertLegacyAvailabilityWeek(
  db: DbClient,
  employeeId: string,
  input?: LegacyAvailabilityDay[],
): Promise<LegacyAvailabilityDay[]> {
  const days = normalizeLegacyWeek(input);

  for (const day of days) {
    await db.availability.upsert({
      where: {
        employeeId_dayOfWeek: {
          employeeId,
          dayOfWeek: day.dayOfWeek,
        },
      },
      create: {
        employeeId,
        dayOfWeek: day.dayOfWeek,
        available: day.available,
        preferredOff: day.preferredOff ?? false,
      },
      update: {
        available: day.available,
        preferredOff: day.preferredOff ?? false,
      },
    });
  }

  return days;
}

/** Dual-write: mirror legacy week into EmployeeDefaultAvailability. */
export async function syncDefaultTemplateFromLegacy(
  db: DbClient,
  employeeId: string,
  input?: LegacyAvailabilityDay[],
): Promise<void> {
  const days = normalizeLegacyWeek(input);
  const templateRows = defaultTemplateRowsFromLegacy(days);

  for (const row of templateRows) {
    await db.employeeDefaultAvailability.upsert({
      where: {
        employeeId_dayOfWeek: {
          employeeId,
          dayOfWeek: row.dayOfWeek,
        },
      },
      create: {
        employeeId,
        dayOfWeek: row.dayOfWeek,
        status: row.status,
      },
      update: {
        status: row.status,
      },
    });
  }
}

/**
 * Write legacy availability and keep default template in sync.
 * Legacy remains SSOT until E5/E6 cutover.
 */
export async function writeLegacyAvailabilityWithDualSync(
  db: DbClient,
  employeeId: string,
  input?: LegacyAvailabilityDay[],
): Promise<LegacyAvailabilityDay[]> {
  const days = await upsertLegacyAvailabilityWeek(db, employeeId, input);
  await syncDefaultTemplateFromLegacy(db, employeeId, days);
  return days;
}

export function defaultTemplateCreateInputFromLegacy(input?: LegacyAvailabilityDay[]) {
  return {
    create: defaultTemplateRowsFromLegacy(normalizeLegacyWeek(input)),
  };
}

export function legacyAvailabilityCreateInput(input?: LegacyAvailabilityDay[]) {
  return {
    create: normalizeLegacyWeek(input).map((day) => ({
      dayOfWeek: day.dayOfWeek,
      available: day.available,
      preferredOff: day.preferredOff ?? false,
    })),
  };
}
