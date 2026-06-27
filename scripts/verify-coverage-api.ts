/**
 * Verifies coverage API validation helpers (Etapa 3).
 * Run: npx tsx scripts/verify-coverage-api.ts
 */
import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  assertNoIntervalOverlapInZone,
  validateCoverageIntervalTimes,
} from "../src/lib/coverage-api";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!url.startsWith("file:")) return url;
  const filePath = url.slice(5);
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  return `file:${resolved}`;
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: resolveDatabaseUrl() }),
});

async function main() {
  console.log("=== Time validation ===");
  console.log("invalid same time:", validateCoverageIntervalTimes("13:00", "13:00"));
  console.log("valid range:", validateCoverageIntervalTimes("13:00", "17:00"));

  const zone = await prisma.operationalZone.create({
    data: { name: `__api_test_${Date.now()}`, sortOrder: 999 },
  });

  try {
    const first = await prisma.coverageInterval.create({
      data: {
        zoneId: zone.id,
        startTime: "13:00",
        endTime: "17:00",
        sortOrder: 0,
      },
    });

    const touchOk = await assertNoIntervalOverlapInZone(zone.id, {
      startTime: "17:00",
      endTime: "22:00",
    });
    console.log("\n=== Overlap checks ===");
    console.log("touching 17–22 allowed:", touchOk);

    const overlapErr = await assertNoIntervalOverlapInZone(zone.id, {
      startTime: "15:00",
      endTime: "19:00",
    });
    console.log("overlap 15–19 rejected:", overlapErr);

    const second = await prisma.coverageInterval.create({
      data: {
        zoneId: zone.id,
        startTime: "17:00",
        endTime: "22:00",
        sortOrder: 1,
      },
    });

    const rule = await prisma.coverageRequirementRule.create({
      data: {
        intervalId: first.id,
        minGuests: 0,
        maxGuests: 80,
        staffCount: 2,
      },
    });

    const zones = await prisma.operationalZone.findMany({
      where: { name: { not: { startsWith: "__api_test_" } } },
      include: {
        intervals: { include: { rules: true }, orderBy: { sortOrder: "asc" } },
      },
      orderBy: { sortOrder: "asc" },
    });

    console.log("\n=== Production zones readable ===");
    console.log(
      zones.map((z) => `${z.name}: ${z.intervals.length} interval(s)`).join(", "),
    );

    await prisma.coverageRequirementRule.delete({ where: { id: rule.id } });
    await prisma.coverageInterval.delete({ where: { id: second.id } });
    await prisma.coverageInterval.delete({ where: { id: first.id } });

    const ok =
      validateCoverageIntervalTimes("13:00", "17:00") === null &&
      touchOk === null &&
      overlapErr !== null &&
      zones.length >= 3;

    console.log(ok ? "\n✔ All API validation checks passed" : "\n❌ Checks failed");
    process.exit(ok ? 0 : 1);
  } finally {
    await prisma.operationalZone.delete({ where: { id: zone.id } });
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
