/**
 * E3 verification — duplicate, deactivation, delete guard.
 * Run: npx tsx scripts/verify-employee-e3.ts
 */
import assert from "node:assert/strict";
import {
  canDeleteEmployee,
  duplicateEmployee,
  duplicateEmployeeName,
  isPlannableEmployee,
  resolveEmployeeDelete,
} from "../src/lib/employee";
import { prisma } from "../src/lib/db";

/** Isolated test employees — never left in the app database. */
const TEST_NAME_PREFIX = "E3 Verify:";

async function cleanupTestEmployees(): Promise<void> {
  const testEmployees = await prisma.employee.findMany({
    where: { name: { startsWith: TEST_NAME_PREFIX } },
    select: { id: true },
  });

  if (testEmployees.length === 0) return;

  const ids = testEmployees.map((employee) => employee.id);
  await prisma.scheduleAssignment.deleteMany({
    where: { employeeId: { in: ids } },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: ids } },
  });
}

async function testDuplicate() {
  const source = await prisma.employee.findFirst({
    orderBy: { sortOrder: "asc" },
    include: {
      qualifications: true,
      availabilities: true,
      defaultAvailabilityTemplate: true,
    },
  });
  assert.ok(source, "Need at least one employee");

  const beforeWeekly = await prisma.employeeWeeklyAvailability.count({
    where: { employeeId: source.id },
  });

  let copyId: string | null = null;
  try {
    const copy = await duplicateEmployee(prisma, source.id);
    assert.ok(copy);
    copyId = copy!.id;
    assert.equal(copy!.name, duplicateEmployeeName(source.name));
    assert.equal(copy!.isActive, true);
    assert.equal(copy!.contractHoursPerWeek, source.contractHoursPerWeek);
    assert.equal(copy!.isTemporaryHelp, source.isTemporaryHelp);
    assert.equal(
      copy!.useDefaultAvailabilityTemplate,
      source.useDefaultAvailabilityTemplate,
    );
    assert.equal(copy!.qualifications.length, source.qualifications.length);
    assert.equal(
      copy!.defaultAvailabilityTemplate.length,
      source.defaultAvailabilityTemplate.length > 0
        ? source.defaultAvailabilityTemplate.length
        : 7,
    );
    assert.equal(copy!.availabilities.length, 7);

    const copyWeekly = await prisma.employeeWeeklyAvailability.count({
      where: { employeeId: copy!.id },
    });
    assert.equal(copyWeekly, 0, "Weekly availability must not be copied");

    const copyAssignments = await prisma.scheduleAssignment.count({
      where: { employeeId: copy!.id },
    });
    assert.equal(copyAssignments, 0, "Schedule history must not be copied");
  } finally {
    if (copyId) {
      await prisma.employee.delete({ where: { id: copyId } }).catch(() => {});
    }
  }

  void beforeWeekly;
}

async function testDeactivation() {
  const employee = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Deactivate`,
      sortOrder: 9999,
      isActive: true,
      contractHoursPerWeek: 20,
    },
  });

  try {
    assert.equal(isPlannableEmployee(employee), true);

    const deactivated = await prisma.employee.update({
      where: { id: employee.id },
      data: { isActive: false },
    });
    assert.equal(isPlannableEmployee(deactivated), false);
  } finally {
    await prisma.employee.delete({ where: { id: employee.id } }).catch(() => {});
  }
}

async function testDeleteGuard() {
  const employee = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Delete Guard`,
      sortOrder: 9998,
      isActive: true,
      contractHoursPerWeek: 20,
    },
  });

  let scheduleId: string | null = null;

  try {
    let check = await canDeleteEmployee(prisma, employee.id);
    assert.equal(check.allowed, true);

    const shiftType = await prisma.shiftType.findFirst();
    assert.ok(shiftType, "Need a shift type");

    const schedule = await prisma.schedule.create({
      data: { weekStart: new Date("2099-01-04T00:00:00.000Z") },
    });
    scheduleId = schedule.id;

    await prisma.scheduleAssignment.create({
      data: {
        scheduleId: schedule.id,
        employeeId: employee.id,
        shiftTypeId: shiftType.id,
        date: schedule.weekStart,
      },
    });

    check = await canDeleteEmployee(prisma, employee.id);
    assert.equal(check.allowed, false);
    assert.ok(check.reason?.includes("deaktivaci"));
  } finally {
    await prisma.scheduleAssignment.deleteMany({ where: { employeeId: employee.id } });
    if (scheduleId) {
      await prisma.schedule.delete({ where: { id: scheduleId } }).catch(() => {});
    }
    await prisma.employee.delete({ where: { id: employee.id } }).catch(() => {});
  }
}

async function testDeleteDeactivatesWithHistory() {
  const employee = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Delete Deactivate`,
      sortOrder: 9997,
      isActive: true,
      contractHoursPerWeek: 20,
    },
  });

  let scheduleId: string | null = null;

  try {
    const shiftType = await prisma.shiftType.findFirst();
    assert.ok(shiftType, "Need a shift type");

    const schedule = await prisma.schedule.create({
      data: { weekStart: new Date("2098-01-04T00:00:00.000Z") },
    });
    scheduleId = schedule.id;

    await prisma.scheduleAssignment.create({
      data: {
        scheduleId: schedule.id,
        employeeId: employee.id,
        shiftTypeId: shiftType.id,
        date: schedule.weekStart,
      },
    });

    const result = await resolveEmployeeDelete(prisma, employee.id);
    assert.equal(result.action, "deactivated");
    if (result.action === "deactivated") {
      assert.equal(result.employee.isActive, false);
    }

    const stillExists = await prisma.employee.findUnique({
      where: { id: employee.id },
    });
    assert.ok(stillExists, "Employee with history must remain in database");
  } finally {
    await prisma.scheduleAssignment.deleteMany({ where: { employeeId: employee.id } });
    if (scheduleId) {
      await prisma.schedule.delete({ where: { id: scheduleId } }).catch(() => {});
    }
    await prisma.employee.delete({ where: { id: employee.id } }).catch(() => {});
  }
}

async function main() {
  await cleanupTestEmployees();
  try {
    await testDuplicate();
    await testDeactivation();
    await testDeleteGuard();
    await testDeleteDeactivatesWithHistory();
    console.log("E3 verification passed.");
  } finally {
    await cleanupTestEmployees();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
