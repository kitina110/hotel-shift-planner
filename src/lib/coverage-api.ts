import { prisma } from "@/lib/db";
import {
  validateNonOverlappingIntervals,
  type TimeRangeInput,
} from "@/lib/coverage";
import { parseTimeToMinutes } from "@/lib/shift-time";

export function validateCoverageIntervalTimes(
  startTime: string,
  endTime: string,
): string | null {
  if (!startTime || !endTime) {
    return "Chybí začátek nebo konec intervalu";
  }

  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  if (start >= end) {
    return "Konec intervalu musí být po začátku";
  }

  return null;
}

export async function findZoneOrNull(zoneId: string) {
  return prisma.operationalZone.findUnique({ where: { id: zoneId } });
}

export async function assertNoIntervalOverlapInZone(
  zoneId: string,
  candidate: TimeRangeInput,
  excludeIntervalId?: string,
): Promise<string | null> {
  const siblings = await prisma.coverageInterval.findMany({
    where: {
      zoneId,
      ...(excludeIntervalId ? { id: { not: excludeIntervalId } } : {}),
    },
    select: { startTime: true, endTime: true },
  });

  const allRanges = [...siblings, candidate];
  return validateNonOverlappingIntervals(allRanges);
}

export const zoneInclude = {
  intervals: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      rules: { orderBy: { minGuests: "asc" as const } },
    },
  },
} as const;

export const intervalInclude = {
  zone: true,
  rules: { orderBy: { minGuests: "asc" as const } },
} as const;

export const requirementRuleInclude = {
  interval: {
    include: { zone: true },
  },
} as const;
