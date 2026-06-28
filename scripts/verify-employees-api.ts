import { prisma } from "../src/lib/db";

async function main() {
  const employees = await prisma.employee.findMany({
    include: {
      qualifications: true,
      availabilities: true,
      defaultAvailabilityTemplate: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  console.log(`GET /api/employees query OK — ${employees.length} employees`);
  for (const e of employees) {
    console.log(`  ${e.sortOrder}: ${e.name}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
