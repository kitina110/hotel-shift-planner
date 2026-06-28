import type { AvailabilityStatus } from "@/lib/availability/status";
import {
  defaultTemplateRowsFromLegacy,
  legacyWeekFromDefaultTemplate,
  type LegacyAvailabilityDay,
} from "@/lib/availability/status";
import { upsertLegacyAvailabilityWeek } from "@/lib/availability/legacy-sync";
import type { PrismaClient } from "@/generated/prisma/client";

type DbClient = Pick<
  PrismaClient,
  "availability" | "employeeDefaultAvailability"
>;

export interface DefaultTemplateDayInput {
  dayOfWeek: number;
  status: AvailabilityStatus;
}

function normalizeTemplateInput(
  rows: DefaultTemplateDayInput[],
): DefaultTemplateDayInput[] {
  const byDay = new Map<number, AvailabilityStatus>();

  for (const row of rows) {
    if (row.dayOfWeek >= 0 && row.dayOfWeek <= 6) {
      byDay.set(row.dayOfWeek, row.status);
    }
  }

  return Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    status: byDay.get(dayOfWeek) ?? "AVAILABLE",
  }));
}

/** E6: default template is authoritative in UI; legacy Availability stays in sync until E8. */
export async function writeDefaultTemplateWithLegacySync(
  db: DbClient,
  employeeId: string,
  input: DefaultTemplateDayInput[],
): Promise<DefaultTemplateDayInput[]> {
  const days = normalizeTemplateInput(input);

  for (const day of days) {
    await db.employeeDefaultAvailability.upsert({
      where: {
        employeeId_dayOfWeek: {
          employeeId,
          dayOfWeek: day.dayOfWeek,
        },
      },
      create: {
        employeeId,
        dayOfWeek: day.dayOfWeek,
        status: day.status,
      },
      update: {
        status: day.status,
      },
    });
  }

  const legacyDays = legacyWeekFromDefaultTemplate(days);
  await upsertLegacyAvailabilityWeek(
    db,
    employeeId,
    legacyDays.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      available: row.available,
      preferredOff: row.preferredOff,
    })),
  );

  return days;
}

export function coerceTemplateInput(input: unknown): DefaultTemplateDayInput[] | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const first = input[0];
  if (
    first &&
    typeof first === "object" &&
    "status" in first &&
    typeof (first as { status: unknown }).status === "string"
  ) {
    return normalizeTemplateInput(input as DefaultTemplateDayInput[]);
  }
  return normalizeTemplateInput(
    defaultTemplateRowsFromLegacy(input as LegacyAvailabilityDay[]),
  );
}

export function legacyDaysFromTemplateInput(
  input: DefaultTemplateDayInput[],
): LegacyAvailabilityDay[] {
  return legacyWeekFromDefaultTemplate(normalizeTemplateInput(input));
}

export function defaultTemplateCreateInputFromStatus(input?: unknown) {
  const rows = coerceTemplateInput(input) ?? normalizeTemplateInput([]);
  return {
    create: rows.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      status: day.status,
    })),
  };
}

export function defaultTemplateRowsFromEmployee(employee: {
  defaultAvailabilityTemplate?: Array<{ dayOfWeek: number; status: AvailabilityStatus }>;
}): DefaultTemplateDayInput[] {
  return normalizeTemplateInput(employee.defaultAvailabilityTemplate ?? []);
}
