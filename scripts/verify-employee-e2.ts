/**
 * E2 verification — legacy/default availability dual-write + domain libs.
 * Run: npx tsx scripts/verify-employee-e2.ts
 */
import assert from "node:assert/strict";
import {
  legacyAvailabilityToStatus,
  normalizeLegacyWeek,
  statusToLegacyAvailability,
  writeLegacyAvailabilityWithDualSync,
} from "../src/lib/availability";
import { groupShiftTypesByZone } from "../src/lib/qualification/group-shift-types-by-zone";
import { mapLegacyRowsToSchedulerAvailability } from "../src/lib/availability/scheduler-bridge";
import { prisma } from "../src/lib/db";

function testStatusMapping() {
  assert.equal(
    legacyAvailabilityToStatus({ dayOfWeek: 0, available: true, preferredOff: false }),
    "AVAILABLE",
  );
  assert.equal(
    legacyAvailabilityToStatus({ dayOfWeek: 0, available: true, preferredOff: true }),
    "PREFERRED_OFF",
  );
  assert.equal(
    legacyAvailabilityToStatus({ dayOfWeek: 0, available: false, preferredOff: false }),
    "UNAVAILABLE",
  );

  assert.deepEqual(statusToLegacyAvailability("PREFERRED_OFF"), {
    available: true,
    preferredOff: true,
  });
  assert.deepEqual(statusToLegacyAvailability("VACATION"), {
    available: false,
    preferredOff: false,
  });
}

function testGroupShiftTypesByZone() {
  const groups = groupShiftTypesByZone([
    {
      id: "s1",
      name: "Servis 13:00–17:00",
      startTime: "13:00",
      endTime: "17:00",
      zoneId: "z1",
      zone: { id: "z1", name: "Servis" },
    },
    {
      id: "s2",
      name: "Bar 20:00–02:00",
      startTime: "20:00",
      endTime: "02:00",
      zoneId: "z2",
      zone: { id: "z2", name: "Bar" },
    },
  ]);

  assert.equal(groups.length, 2);
  assert.equal(groups[0].zoneName, "Bar");
  assert.equal(groups[1].zoneName, "Servis");
}

function testSchedulerBridge() {
  const mapped = mapLegacyRowsToSchedulerAvailability(
    normalizeLegacyWeek([{ dayOfWeek: 2, available: false, preferredOff: false }]),
  );
  assert.equal(mapped[2].available, false);
}

async function testDualWrite() {
  const employee = await prisma.employee.findFirst({
    orderBy: { sortOrder: "asc" },
  });
  assert.ok(employee, "Need at least one employee");

  await writeLegacyAvailabilityWithDualSync(prisma, employee.id, [
    { dayOfWeek: 0, available: true, preferredOff: true },
    { dayOfWeek: 1, available: false, preferredOff: false },
  ]);

  const legacy = await prisma.availability.findMany({
    where: { employeeId: employee.id, dayOfWeek: { in: [0, 1] } },
    orderBy: { dayOfWeek: "asc" },
  });
  const defaults = await prisma.employeeDefaultAvailability.findMany({
    where: { employeeId: employee.id, dayOfWeek: { in: [0, 1] } },
    orderBy: { dayOfWeek: "asc" },
  });

  assert.equal(legacy[0]?.preferredOff, true);
  assert.equal(defaults[0]?.status, "PREFERRED_OFF");
  assert.equal(legacy[1]?.available, false);
  assert.equal(defaults[1]?.status, "UNAVAILABLE");

  // restore Monday/Tuesday to available defaults
  await writeLegacyAvailabilityWithDualSync(
    prisma,
    employee.id,
    [
      { dayOfWeek: 0, available: true, preferredOff: false },
      { dayOfWeek: 1, available: true, preferredOff: false },
    ],
  );
}

async function main() {
  testStatusMapping();
  testGroupShiftTypesByZone();
  testSchedulerBridge();
  await testDualWrite();
  console.log("verify-employee-e2: all checks passed");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
