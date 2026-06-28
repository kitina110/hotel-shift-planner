/**
 * E6 verification — sortOrder persistence, default template model, reorder API.
 * Run: npx tsx scripts/verify-employee-e6.ts
 */
import assert from "node:assert/strict";
import {
  coerceTemplateInput,
  defaultTemplateRowsFromEmployee,
  writeDefaultTemplateWithLegacySync,
} from "../src/lib/availability/default-template-sync";
import {
  mergeVisibleReorder,
  reorderEmployeesByIds,
  validateReorderPayload,
} from "../src/lib/employee/reorder-employees";
import { employeeSortCompare } from "../src/lib/employee/display";
import { prisma } from "../src/lib/db";

const TEST_PREFIX = "E6 Verify:";

async function cleanup() {
  await prisma.employee.deleteMany({
    where: { name: { startsWith: TEST_PREFIX } },
  });
}

async function testReorderApi() {
  const a = await prisma.employee.create({
    data: {
      name: `${TEST_PREFIX} A`,
      sortOrder: 9900,
      contractHoursPerWeek: 40,
      isActive: true,
    },
  });
  const b = await prisma.employee.create({
    data: {
      name: `${TEST_PREFIX} B`,
      sortOrder: 9901,
      contractHoursPerWeek: 30,
      isActive: true,
    },
  });

  const allEmployees = await prisma.employee.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const orderedIds = allEmployees.map((employee) => employee.id);
  const indexA = orderedIds.indexOf(a.id);
  const indexB = orderedIds.indexOf(b.id);
  [orderedIds[indexA], orderedIds[indexB]] = [orderedIds[indexB]!, orderedIds[indexA]!];

  await reorderEmployeesByIds(prisma, orderedIds);

  const reloaded = await prisma.employee.findMany({
    where: { id: { in: [a.id, b.id] } },
  });
  const sorted = reloaded.sort(employeeSortCompare);
  assert.equal(sorted[0]?.id, b.id);
  assert.equal(sorted[1]?.id, a.id);

  await prisma.employee.delete({ where: { id: a.id } });
  await prisma.employee.delete({ where: { id: b.id } });
}

async function testDefaultTemplateDualWrite() {
  const employee = await prisma.employee.create({
    data: {
      name: `${TEST_PREFIX} Template`,
      sortOrder: 9902,
      contractHoursPerWeek: 20,
      isActive: true,
    },
  });

  await writeDefaultTemplateWithLegacySync(prisma, employee.id, [
    { dayOfWeek: 0, status: "VACATION" },
    { dayOfWeek: 1, status: "PREFERRED_OFF" },
  ]);

  const defaults = await prisma.employeeDefaultAvailability.findMany({
    where: { employeeId: employee.id },
    orderBy: { dayOfWeek: "asc" },
  });
  const legacy = await prisma.availability.findMany({
    where: { employeeId: employee.id },
    orderBy: { dayOfWeek: "asc" },
  });

  assert.equal(defaults.find((row) => row.dayOfWeek === 0)?.status, "VACATION");
  assert.equal(defaults.find((row) => row.dayOfWeek === 1)?.status, "PREFERRED_OFF");
  assert.equal(legacy.find((row) => row.dayOfWeek === 0)?.available, false);
  assert.equal(legacy.find((row) => row.dayOfWeek === 1)?.preferredOff, true);

  const rows = defaultTemplateRowsFromEmployee({
    defaultAvailabilityTemplate: defaults.map((row) => ({
      dayOfWeek: row.dayOfWeek,
      status: row.status as "VACATION",
    })),
  });
  assert.equal(rows[0]?.status, "VACATION");

  await prisma.employee.delete({ where: { id: employee.id } });
}

function testMergeVisibleReorder() {
  const merged = mergeVisibleReorder(["a", "b", "c", "d"], ["c", "a"]);
  assert.deepEqual(merged, ["c", "b", "a", "d"]);
}

function testCoerceTemplateInput() {
  const fromStatus = coerceTemplateInput([
    { dayOfWeek: 2, status: "SICK" },
  ]);
  assert.equal(fromStatus?.[2]?.status, "SICK");

  const fromLegacy = coerceTemplateInput([
    { dayOfWeek: 3, available: true, preferredOff: true },
  ]);
  assert.equal(fromLegacy?.[3]?.status, "PREFERRED_OFF");
}

async function main() {
  assert.equal(validateReorderPayload(["a", "a"]), null);
  testMergeVisibleReorder();
  testCoerceTemplateInput();

  await cleanup();
  try {
    await testReorderApi();
    await testDefaultTemplateDualWrite();
    console.log("E6 verification passed.");
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
