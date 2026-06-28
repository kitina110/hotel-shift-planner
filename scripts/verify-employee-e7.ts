/**
 * E7 verification — reset from template, copy from week.
 * Run: npx tsx scripts/verify-employee-e7.ts
 */
import assert from "node:assert/strict";
import { addWeeks, format, startOfWeek } from "date-fns";
import { writeDefaultTemplateWithLegacySync } from "../src/lib/availability/default-template-sync";
import {
  copyWeeklyAvailabilityFromWeek,
  loadWeeklyAvailabilityGrid,
  resetWeeklyAvailabilityFromTemplate,
  updateWeeklyAvailabilityStatus,
} from "../src/lib/availability/weekly-availability";
import { ensureScheduleForWeek } from "../src/lib/schedule/ensure-schedule";
import { prisma } from "../src/lib/db";

const TEST_PREFIX = "E7 Verify:";

async function cleanup() {
  const employees = await prisma.employee.findMany({
    where: { name: { startsWith: TEST_PREFIX } },
    select: { id: true },
  });
  const ids = employees.map((employee) => employee.id);
  if (ids.length === 0) return;

  await prisma.employeeWeeklyAvailability.deleteMany({
    where: { employeeId: { in: ids } },
  });
  await prisma.employeeDefaultAvailability.deleteMany({
    where: { employeeId: { in: ids } },
  });
  await prisma.employee.deleteMany({
    where: { id: { in: ids } },
  });
}

async function createTestEmployee(name: string) {
  return prisma.employee.create({
    data: {
      name: `${TEST_PREFIX} ${name}`,
      sortOrder: 9950,
      contractHoursPerWeek: 40,
      isActive: true,
    },
  });
}

async function testResetFromTemplate() {
  const employee = await createTestEmployee("Reset");
  await writeDefaultTemplateWithLegacySync(prisma, employee.id, [
    { dayOfWeek: 0, status: "VACATION" },
    { dayOfWeek: 1, status: "PREFERRED_OFF" },
    { dayOfWeek: 2, status: "AVAILABLE" },
  ]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const schedule = await ensureScheduleForWeek(weekStart);
  const monday = format(weekStart, "yyyy-MM-dd");

  await updateWeeklyAvailabilityStatus(prisma, {
    scheduleId: schedule.id,
    employeeId: employee.id,
    dateKey: monday,
    status: "UNAVAILABLE",
  });

  const updated = await resetWeeklyAvailabilityFromTemplate(
    prisma,
    schedule.id,
    weekStart,
  );
  assert.ok(updated >= 7);

  const grid = await loadWeeklyAvailabilityGrid(prisma, weekStart);
  assert.ok(grid);
  assert.equal(grid.cells[employee.id]?.[monday]?.status, "VACATION");

  const weekDays = grid.weekDays;
  const tuesdayKey = weekDays[1];
  assert.equal(grid.cells[employee.id]?.[tuesdayKey!]?.status, "PREFERRED_OFF");
}

async function testCopyFromWeek() {
  const employee = await createTestEmployee("Copy");
  const sourceWeek = startOfWeek(addWeeks(new Date(), -2), { weekStartsOn: 1 });
  const targetWeek = startOfWeek(addWeeks(new Date(), -1), { weekStartsOn: 1 });

  const sourceSchedule = await ensureScheduleForWeek(sourceWeek);
  const targetSchedule = await ensureScheduleForWeek(targetWeek);

  const sourceGrid = await loadWeeklyAvailabilityGrid(prisma, sourceWeek);
  assert.ok(sourceGrid);
  const sourceWednesday = sourceGrid.weekDays[2]!;

  await updateWeeklyAvailabilityStatus(prisma, {
    scheduleId: sourceSchedule.id,
    employeeId: employee.id,
    dateKey: sourceWednesday,
    status: "UNAVAILABLE",
  });
  await updateWeeklyAvailabilityStatus(prisma, {
    scheduleId: sourceSchedule.id,
    employeeId: employee.id,
    dateKey: sourceGrid.weekDays[4]!,
    status: "VACATION",
  });

  const targetGridBefore = await loadWeeklyAvailabilityGrid(prisma, targetWeek);
  assert.ok(targetGridBefore);
  const targetWednesday = targetGridBefore.weekDays[2]!;
  await updateWeeklyAvailabilityStatus(prisma, {
    scheduleId: targetSchedule.id,
    employeeId: employee.id,
    dateKey: targetWednesday,
    status: "AVAILABLE",
  });

  const copied = await copyWeeklyAvailabilityFromWeek(
    prisma,
    targetSchedule.id,
    targetWeek,
    sourceSchedule.id,
    sourceWeek,
  );
  assert.ok(copied >= 2);

  const targetGrid = await loadWeeklyAvailabilityGrid(prisma, targetWeek);
  assert.ok(targetGrid);
  assert.equal(
    targetGrid.cells[employee.id]?.[targetWednesday]?.status,
    "UNAVAILABLE",
  );
  assert.equal(
    targetGrid.cells[employee.id]?.[targetGridBefore.weekDays[4]!]?.status,
    "VACATION",
  );
}

async function testCopySameWeekRejected() {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const schedule = await ensureScheduleForWeek(weekStart);

  await assert.rejects(
    () =>
      copyWeeklyAvailabilityFromWeek(
        prisma,
        schedule.id,
        weekStart,
        schedule.id,
        weekStart,
      ),
    /rozdílné/,
  );
}

async function main() {
  await cleanup();
  try {
    await testResetFromTemplate();
    console.log("✓ reset from template");
    await testCopyFromWeek();
    console.log("✓ copy from week");
    await testCopySameWeekRejected();
    console.log("✓ same week rejected");
    console.log("\nE7 verification passed.");
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
