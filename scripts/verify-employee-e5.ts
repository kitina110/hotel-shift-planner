/**
 * E5 verification — generator reads EmployeeWeeklyAvailability only (scenarios A–E).
 * Run: npx tsx scripts/verify-employee-e5.ts
 */
import assert from "node:assert/strict";
import { format, startOfWeek } from "date-fns";
import { writeLegacyAvailabilityWithDualSync } from "../src/lib/availability/legacy-sync";
import { resolveSchedulerAvailabilityInput } from "../src/lib/availability/scheduler-bridge";
import {
  updateWeeklyAvailabilityStatus,
  weekDayKeys,
} from "../src/lib/availability/weekly-availability";
import { ensureScheduleForWeek } from "../src/lib/schedule/ensure-schedule";
import { canAssign, scoreCandidate } from "../src/lib/scheduler/constraints";
import { runScheduleGeneration } from "../src/lib/scheduler/service";
import type { AvailabilityStatus } from "../src/types";
import { prisma } from "../src/lib/db";

const TEST_WEEK = startOfWeek(new Date("2098-06-01"), { weekStartsOn: 1 });
const TEST_NAME_PREFIX = "E5 Verify:";

type EmployeeSnapshot = { id: string; isActive: boolean };

async function setWeeklyStatusForWeek(
  scheduleId: string,
  employeeId: string,
  status: AvailabilityStatus,
) {
  for (const dateKey of weekDayKeys(TEST_WEEK)) {
    await updateWeeklyAvailabilityStatus(prisma, {
      scheduleId,
      employeeId,
      dateKey,
      status,
    });
  }
}

async function setLegacyWeek(
  employeeId: string,
  available: boolean,
  preferredOff = false,
) {
  await writeLegacyAvailabilityWithDualSync(
    prisma,
    employeeId,
    Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      available,
      preferredOff,
    })),
  );
}

async function assignmentCount(scheduleId: string, employeeId: string): Promise<number> {
  return prisma.scheduleAssignment.count({
    where: { scheduleId, employeeId },
  });
}

async function createTestEmployees(shiftTypeIds: string[]) {
  const target = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Target`,
      sortOrder: 9800,
      isActive: true,
      contractHoursPerWeek: 40,
      maxConsecutiveDays: 6,
      useDefaultAvailabilityTemplate: false,
      qualifications: {
        create: shiftTypeIds.map((shiftTypeId) => ({ shiftTypeId })),
      },
      availabilities: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          available: true,
          preferredOff: false,
        })),
      },
    },
  });

  const alternate = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Alternate`,
      sortOrder: 9801,
      isActive: true,
      contractHoursPerWeek: 40,
      maxConsecutiveDays: 6,
      useDefaultAvailabilityTemplate: false,
      qualifications: {
        create: shiftTypeIds.map((shiftTypeId) => ({ shiftTypeId })),
      },
      availabilities: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          available: true,
          preferredOff: false,
        })),
      },
    },
  });

  return { target, alternate };
}

async function isolateEmployees(keepIds: string[]) {
  await prisma.employee.updateMany({
    where: { id: { notIn: keepIds } },
    data: { isActive: false },
  });
}

async function restoreEmployeeStates(states: EmployeeSnapshot[]) {
  for (const { id, isActive } of states) {
    await prisma.employee.update({ where: { id }, data: { isActive } });
  }
}

async function cleanup(
  scheduleId: string | null,
  employeeIds: string[],
) {
  if (scheduleId) {
    await prisma.scheduleAssignment.deleteMany({ where: { scheduleId } });
    await prisma.employeeWeeklyAvailability.deleteMany({ where: { scheduleId } });
    await prisma.guestForecast.deleteMany({ where: { scheduleId } });
    await prisma.schedule.delete({ where: { id: scheduleId } }).catch(() => undefined);
  }

  if (employeeIds.length > 0) {
    await prisma.employeeQualification.deleteMany({
      where: { employeeId: { in: employeeIds } },
    });
    await prisma.availability.deleteMany({
      where: { employeeId: { in: employeeIds } },
    });
    await prisma.employee.deleteMany({ where: { id: { in: employeeIds } } });
  }

  await prisma.employee.deleteMany({
    where: { name: { startsWith: TEST_NAME_PREFIX } },
  });
}

function testResolveWeeklyOnlyIgnoresLegacy() {
  const mapped = resolveSchedulerAvailabilityInput({
    legacyRows: Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      available: true,
      preferredOff: false,
    })),
    weeklyRows: [{ date: TEST_WEEK, status: "VACATION" }],
  });

  assert.equal(mapped[0].available, false, "Monday VACATION blocks assignment");
  assert.equal(mapped[0].preferredOff, false);
}

async function runBlockedScenario(
  label: string,
  status: AvailabilityStatus,
  scheduleId: string,
  targetId: string,
) {
  await setWeeklyStatusForWeek(scheduleId, targetId, status);
  await setLegacyWeek(targetId, true, false);

  await runScheduleGeneration(TEST_WEEK, scheduleId);

  const count = await assignmentCount(scheduleId, targetId);
  assert.equal(count, 0, `${label}: employee must receive no shifts`);
  console.log(`OK scenario ${label} — 0 assignments`);
}

function testPreferredOffScoresBelowAvailable(shiftTypeId: string) {
  const slot = { date: TEST_WEEK, shiftTypeId };
  const shiftTypes = [
    {
      id: shiftTypeId,
      name: "Test shift",
      durationMinutes: 300,
      startTime: "09:00",
      endTime: "14:00",
      zoneId: null,
    },
  ];

  const base = {
    contractHoursPerWeek: 40,
    maxConsecutiveDays: 6,
    qualifiedShiftTypeIds: [shiftTypeId],
  };

  const preferred = {
    ...base,
    id: "preferred",
    name: "Preferred",
    availability: resolveSchedulerAvailabilityInput({
      legacyRows: [],
      weeklyRows: weekDayKeys(TEST_WEEK).map((dateKey) => ({
        date: dateKey,
        status: "PREFERRED_OFF" as const,
      })),
    }),
  };

  const available = {
    ...base,
    id: "available",
    name: "Available",
    availability: resolveSchedulerAvailabilityInput({
      legacyRows: [],
      weeklyRows: weekDayKeys(TEST_WEEK).map((dateKey) => ({
        date: dateKey,
        status: "AVAILABLE" as const,
      })),
    }),
  };

  assert.equal(
    canAssign(preferred, slot, [], [], shiftTypes).ok,
    true,
    "PREFERRED_OFF is not a hard block",
  );
  assert.equal(canAssign(available, slot, [], [], shiftTypes).ok, true);

  const preferredScore = scoreCandidate(
    preferred,
    slot,
    [],
    [],
    shiftTypes,
    TEST_WEEK,
  );
  const availableScore = scoreCandidate(
    available,
    slot,
    [],
    [],
    shiftTypes,
    TEST_WEEK,
  );
  assert.ok(
    availableScore > preferredScore,
    "AVAILABLE must outrank PREFERRED_OFF when both can work",
  );
  console.log("OK scenario D (score) — AVAILABLE preferred over PREFERRED_OFF");
}

async function main() {
  testResolveWeeklyOnlyIgnoresLegacy();

  const employeeStates = await prisma.employee.findMany({
    select: { id: true, isActive: true },
  });

  const shiftTypes = await prisma.shiftType.findMany({
    select: { id: true },
    take: 3,
  });
  assert.ok(shiftTypes.length > 0, "Need shift types in database");

  const { target, alternate } = await createTestEmployees(
    shiftTypes.map((shiftType) => shiftType.id),
  );
  const employeeIds = [target.id, alternate.id];

  let scheduleId: string | null = null;

  try {
    const schedule = await ensureScheduleForWeek(TEST_WEEK);
    scheduleId = schedule.id;

    await setWeeklyStatusForWeek(scheduleId, alternate.id, "AVAILABLE");

    await isolateEmployees([target.id]);
    await runBlockedScenario("A (VACATION)", "VACATION", scheduleId, target.id);
    await runBlockedScenario("B (SICK)", "SICK", scheduleId, target.id);
    await runBlockedScenario("C (UNAVAILABLE)", "UNAVAILABLE", scheduleId, target.id);

    await setWeeklyStatusForWeek(scheduleId, target.id, "PREFERRED_OFF");
    await setLegacyWeek(target.id, true, false);
    await runScheduleGeneration(TEST_WEEK, scheduleId);
    const soloPreferredCount = await assignmentCount(scheduleId, target.id);
    assert.ok(
      soloPreferredCount > 0,
      "Scenario D (solo): PREFERRED_OFF employee can still be scheduled",
    );
    console.log(
      `OK scenario D (solo) — ${soloPreferredCount} assignment(s) when only candidate`,
    );

    testPreferredOffScoresBelowAvailable(shiftTypes[0]!.id);

    await prisma.scheduleAssignment.deleteMany({ where: { scheduleId } });
    await setWeeklyStatusForWeek(scheduleId, target.id, "AVAILABLE");
    await setLegacyWeek(target.id, false, false);

    await isolateEmployees([target.id]);
    await runScheduleGeneration(TEST_WEEK, scheduleId);
    const availableCount = await assignmentCount(scheduleId, target.id);
    assert.ok(
      availableCount > 0,
      "Scenario E: weekly AVAILABLE must win over legacy UNAVAILABLE",
    );
    console.log(`OK scenario E — ${availableCount} assignment(s) from weekly AVAILABLE`);
  } finally {
    await restoreEmployeeStates(employeeStates);
    await cleanup(scheduleId, employeeIds);
  }

  console.log("E5 verification passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
