import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { computeShiftFields } from "../src/lib/shift-time";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!url.startsWith("file:")) return url;
  const filePath = url.slice(5);
  const resolved = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);
  return `file:${resolved}`;
}

const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
const prisma = new PrismaClient({ adapter });

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

function defaultAvailabilityCreate(status: "AVAILABLE" | "PREFERRED_OFF" | "UNAVAILABLE" = "AVAILABLE") {
  return ALL_DAYS.map((dayOfWeek) => ({ dayOfWeek, status }));
}

async function main() {
  await prisma.employeeWeeklyAvailability.deleteMany();
  await prisma.scheduleAssignment.deleteMany();
  await prisma.guestForecast.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.staffingRule.deleteMany();
  await prisma.coverageRequirementRule.deleteMany();
  await prisma.coverageInterval.deleteMany();
  await prisma.employeeDefaultAvailability.deleteMany();
  await prisma.employeeZoneQualification.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.employeeQualification.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.shiftType.deleteMany();
  await prisma.operationalZone.deleteMany();
  await prisma.demandProfile.deleteMany();

  await prisma.demandProfile.create({
    data: {
      name: "Běžný provoz",
      description: "Standardní provoz hotelu",
      isDefault: true,
    },
  });

  const zoneServis = await prisma.operationalZone.create({
    data: { name: "Servis", sortOrder: 0 },
  });
  const zoneBar = await prisma.operationalZone.create({
    data: { name: "Bar", sortOrder: 1 },
  });
  const zoneKuchyne = await prisma.operationalZone.create({
    data: { name: "Kuchyně", sortOrder: 2 },
  });

  const servis1317 = await prisma.shiftType.create({
    data: {
      name: "Servis 13:00–17:00",
      startTime: "13:00",
      endTime: "17:00",
      zoneId: zoneServis.id,
      ...computeShiftFields("13:00", "17:00"),
    },
  });

  const servis1722 = await prisma.shiftType.create({
    data: {
      name: "Servis 17:00–22:00",
      startTime: "17:00",
      endTime: "22:00",
      zoneId: zoneServis.id,
      ...computeShiftFields("17:00", "22:00"),
    },
  });

  const bar2002 = await prisma.shiftType.create({
    data: {
      name: "Bar 20:00–02:00",
      startTime: "20:00",
      endTime: "02:00",
      zoneId: zoneBar.id,
      ...computeShiftFields("20:00", "02:00"),
    },
  });

  const kuchyn = await prisma.shiftType.create({
    data: {
      name: "Kuchyně",
      startTime: "16:00",
      endTime: "23:00",
      zoneId: zoneKuchyne.id,
      ...computeShiftFields("16:00", "23:00"),
    },
  });

  for (const [shiftTypeId, rules] of [
    [
      bar2002.id,
      [
        { minGuests: 0, maxGuests: 50, staffCount: 1 },
        { minGuests: 51, maxGuests: 100, staffCount: 2 },
        { minGuests: 101, maxGuests: null, staffCount: 3 },
      ],
    ],
    [
      servis1722.id,
      [
        { minGuests: 0, maxGuests: 40, staffCount: 2 },
        { minGuests: 41, maxGuests: 80, staffCount: 4 },
        { minGuests: 81, maxGuests: null, staffCount: 6 },
      ],
    ],
    [
      kuchyn.id,
      [
        { minGuests: 0, maxGuests: 60, staffCount: 2 },
        { minGuests: 61, maxGuests: null, staffCount: 4 },
      ],
    ],
  ] as const) {
    for (const rule of rules) {
      await prisma.staffingRule.create({
        data: { shiftTypeId, ...rule },
      });
    }
  }

  const demoEmployees = [
    {
      name: "Jan Novák",
      sortOrder: 0,
      contractHoursPerWeek: 40,
      isTemporaryHelp: false,
      shiftTypeIds: [servis1317.id, servis1722.id, bar2002.id],
    },
    {
      name: "Petra Svobodová",
      sortOrder: 1,
      contractHoursPerWeek: 30,
      isTemporaryHelp: false,
      shiftTypeIds: [servis1722.id],
    },
    {
      name: "Martin Dvořák",
      sortOrder: 2,
      contractHoursPerWeek: 20,
      isTemporaryHelp: true,
      shiftTypeIds: [bar2002.id, kuchyn.id],
    },
  ] as const;

  for (const demo of demoEmployees) {
    await prisma.employee.create({
      data: {
        name: demo.name,
        sortOrder: demo.sortOrder,
        contractHoursPerWeek: demo.contractHoursPerWeek,
        isTemporaryHelp: demo.isTemporaryHelp,
        isActive: true,
        useDefaultAvailabilityTemplate: true,
        qualifications: {
          create: demo.shiftTypeIds.map((shiftTypeId) => ({ shiftTypeId })),
        },
        defaultAvailabilityTemplate: {
          create: defaultAvailabilityCreate(),
        },
        availabilities: {
          create: ALL_DAYS.map((dayOfWeek) => ({
            dayOfWeek,
            available: true,
            preferredOff: false,
          })),
        },
      },
    });
  }

  console.log(
    "Seeded 3 demo employees, 4 shift types, 3 zones (Employee 2.0 baseline).",
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
