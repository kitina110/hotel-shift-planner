/**
 * E4 verification — weekly availability bootstrap + API grid.
 * Run: npx tsx scripts/verify-employee-e4.ts
 */
import assert from "node:assert/strict";
import { addDays, format, startOfWeek } from "date-fns";
import {
  bootstrapWeeklyAvailabilityIfNeeded,
  loadWeeklyAvailabilityGrid,
  nextAvailabilityStatus,
  updateWeeklyAvailabilityStatus,
} from "../src/lib/availability/weekly-availability";
import { ensureScheduleForWeek } from "../src/lib/schedule/ensure-schedule";
import { isPlannableEmployee } from "../src/lib/employee";
import { prisma } from "../src/lib/db";

const TEST_WEEK = startOfWeek(new Date("2097-06-01"), { weekStartsOn: 1 });
const TEST_NAME_PREFIX = "E4 Verify:";

async function cleanup() {
  const schedule = await prisma.schedule.findUnique({
    where: { weekStart: TEST_WEEK },
  });
  if (!schedule) return;

  await prisma.employeeWeeklyAvailability.deleteMany({
    where: { scheduleId: schedule.id },
  });
  await prisma.guestForecast.deleteMany({ where: { scheduleId: schedule.id } });
  await prisma.schedule.delete({ where: { id: schedule.id } });

  await prisma.employee.deleteMany({
    where: { name: { startsWith: TEST_NAME_PREFIX } },
  });
}

async function testBootstrapFromTemplate() {
  const templateEmployee = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Template`,
      sortOrder: 9900,
      isActive: true,
      contractHoursPerWeek: 40,
      useDefaultAvailabilityTemplate: true,
      defaultAvailabilityTemplate: {
        create: [
          { dayOfWeek: 0, status: "PREFERRED_OFF" },
          { dayOfWeek: 1, status: "UNAVAILABLE" },
        ],
      },
    },
  });

  const plainEmployee = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Plain`,
      sortOrder: 9901,
      isActive: true,
      contractHoursPerWeek: 20,
      useDefaultAvailabilityTemplate: false,
    },
  });

  const schedule = await ensureScheduleForWeek(TEST_WEEK);
  const created = await bootstrapWeeklyAvailabilityIfNeeded(
    prisma,
    schedule.id,
    TEST_WEEK,
  );
  assert.equal(created, 0, "ensureScheduleForWeek already bootstrapped");

  const grid = await loadWeeklyAvailabilityGrid(prisma, TEST_WEEK);
  assert.ok(grid);

  const monTemplate =
    grid!.cells[templateEmployee.id]?.[format(TEST_WEEK, "yyyy-MM-dd")]?.status;
  assert.equal(monTemplate, "PREFERRED_OFF");

  const tueTemplate =
    grid!.cells[templateEmployee.id]?.[
      format(addDays(TEST_WEEK, 1), "yyyy-MM-dd")
    ]?.status;
  assert.equal(tueTemplate, "UNAVAILABLE");

  const wedTemplate =
    grid!.cells[templateEmployee.id]?.[
      format(addDays(TEST_WEEK, 2), "yyyy-MM-dd")
    ]?.status;
  assert.equal(wedTemplate, "AVAILABLE");

  for (let i = 0; i < 7; i++) {
    const key = format(addDays(TEST_WEEK, i), "yyyy-MM-dd");
    assert.equal(grid!.cells[plainEmployee.id]?.[key]?.status, "AVAILABLE");
  }

  await prisma.employee.delete({ where: { id: templateEmployee.id } });
  await prisma.employee.delete({ where: { id: plainEmployee.id } });
}

async function testInactiveExcluded() {
  const inactive = await prisma.employee.create({
    data: {
      name: `${TEST_NAME_PREFIX} Inactive`,
      sortOrder: 9902,
      isActive: false,
      contractHoursPerWeek: 10,
    },
  });

  const grid = await loadWeeklyAvailabilityGrid(prisma, TEST_WEEK);
  assert.ok(grid);
  assert.ok(!grid!.employees.some((employee) => employee.id === inactive.id));
  assert.equal(isPlannableEmployee(inactive), false);

  await prisma.employee.delete({ where: { id: inactive.id } });
}

async function testUpdateCell() {
  const schedule = await prisma.schedule.findUniqueOrThrow({
    where: { weekStart: TEST_WEEK },
  });
  const employee = await prisma.employee.findFirst({
    where: { isActive: true },
  });
  assert.ok(employee);

  const dateKey = format(TEST_WEEK, "yyyy-MM-dd");
  const updated = await updateWeeklyAvailabilityStatus(prisma, {
    scheduleId: schedule.id,
    employeeId: employee!.id,
    dateKey,
    status: "VACATION",
  });
  assert.equal(updated.status, "VACATION");
  assert.equal(nextAvailabilityStatus("VACATION"), "SICK");
}

async function main() {
  await cleanup();
  try {
    await testBootstrapFromTemplate();
    await testInactiveExcluded();
    await testUpdateCell();
    console.log("E4 verification passed.");
  } finally {
    await cleanup();
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
