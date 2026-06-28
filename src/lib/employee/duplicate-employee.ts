import {
  defaultTemplateRowsFromLegacy,
  legacyWeekFromDefaultTemplate,
  normalizeLegacyWeek,
  type LegacyAvailabilityDay,
} from "@/lib/availability/status";
import {
  legacyAvailabilityCreateInput,
} from "@/lib/availability/legacy-sync";
import type { PrismaClient } from "@/generated/prisma/client";

const employeeInclude = {
  qualifications: true,
  availabilities: true,
  defaultAvailabilityTemplate: true,
} as const;

type SourceEmployee = NonNullable<
  Awaited<
    ReturnType<
      PrismaClient["employee"]["findUnique"]
    >
  >
> & {
  qualifications: Array<{ shiftTypeId: string }>;
  availabilities: Array<{
    dayOfWeek: number;
    available: boolean;
    preferredOff: boolean;
  }>;
  defaultAvailabilityTemplate: Array<{
    dayOfWeek: number;
    status: import("@/types").AvailabilityStatus;
  }>;
};

function legacyDaysFromSource(source: SourceEmployee): LegacyAvailabilityDay[] {
  if (source.availabilities.length > 0) {
    return normalizeLegacyWeek(
      source.availabilities.map((row) => ({
        dayOfWeek: row.dayOfWeek,
        available: row.available,
        preferredOff: row.preferredOff,
      })),
    );
  }

  if (source.defaultAvailabilityTemplate.length > 0) {
    return legacyWeekFromDefaultTemplate(source.defaultAvailabilityTemplate);
  }

  return normalizeLegacyWeek();
}

function defaultTemplateCreateFromSource(source: SourceEmployee) {
  if (source.defaultAvailabilityTemplate.length > 0) {
    return {
      create: source.defaultAvailabilityTemplate.map((row) => ({
        dayOfWeek: row.dayOfWeek,
        status: row.status,
      })),
    };
  }

  return {
    create: defaultTemplateRowsFromLegacy(legacyDaysFromSource(source)),
  };
}

export function duplicateEmployeeName(sourceName: string): string {
  const trimmed = sourceName.trim();
  return `${trimmed} (kopie)`;
}

export async function duplicateEmployee(
  db: PrismaClient,
  sourceId: string,
) {
  const source = await db.employee.findUnique({
    where: { id: sourceId },
    include: employeeInclude,
  });

  if (!source) {
    return null;
  }

  const legacyDays = legacyDaysFromSource(source);
  const sortOrder = await db.employee.count();

  return db.employee.create({
    data: {
      name: duplicateEmployeeName(source.name),
      sortOrder,
      isActive: true,
      contractHoursPerWeek: source.contractHoursPerWeek,
      isTemporaryHelp: source.isTemporaryHelp,
      useDefaultAvailabilityTemplate: source.useDefaultAvailabilityTemplate,
      maxConsecutiveDays: source.maxConsecutiveDays,
      qualifications: {
        create: source.qualifications.map((qualification) => ({
          shiftTypeId: qualification.shiftTypeId,
        })),
      },
      defaultAvailabilityTemplate: defaultTemplateCreateFromSource(source),
      availabilities: legacyAvailabilityCreateInput(legacyDays),
    },
    include: employeeInclude,
  });
}
