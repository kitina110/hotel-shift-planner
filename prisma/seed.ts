import "dotenv/config";
import path from "node:path";
import { addDays, startOfWeek, subWeeks } from "date-fns";
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

async function main() {
  await prisma.scheduleAssignment.deleteMany();
  await prisma.guestForecast.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.staffingRule.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.employeeQualification.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.shiftType.deleteMany();

  const barFields = computeShiftFields("17:00", "00:00");
  const bar = await prisma.shiftType.create({
    data: {
      name: "Bar",
      startTime: "17:00",
      endTime: "00:00",
      ...barFields,
    },
  });

  const servisFields = computeShiftFields("17:00", "01:00");
  const servis = await prisma.shiftType.create({
    data: {
      name: "Servis",
      startTime: "17:00",
      endTime: "01:00",
      ...servisFields,
    },
  });

  const kuchynFields = computeShiftFields("16:00", "23:00");
  const kuchyn = await prisma.shiftType.create({
    data: {
      name: "Kuchyně",
      startTime: "16:00",
      endTime: "23:00",
      ...kuchynFields,
    },
  });

  for (const [shiftTypeId, rules] of [
    [
      bar.id,
      [
        { minGuests: 0, maxGuests: 50, staffCount: 1 },
        { minGuests: 51, maxGuests: 100, staffCount: 2 },
        { minGuests: 101, maxGuests: null, staffCount: 3 },
      ],
    ],
    [
      servis.id,
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

  const firstNames = [
    "Anna", "Ben", "Clara", "David", "Eva", "Felix", "Greta", "Hans",
    "Ines", "Jonas", "Klara", "Lukas", "Mia", "Noah", "Olga", "Paul",
    "Rosa", "Stefan", "Tina", "Uwe", "Vera", "Wolf", "Xenia", "Yann",
    "Zara", "Amelie", "Bruno", "Carla", "Dennis", "Emma", "Florian",
    "Gisela", "Henrik", "Iris", "Jan", "Katrin", "Leon", "Monika",
    "Nils", "Petra", "Quentin", "Rita", "Simon", "Theresa", "Ulrich",
    "Vanessa", "Werner", "Yvonne", "Zoe", "Adrian", "Bianca", "Chris",
    "Diana", "Erik", "Franz", "Helena", "Ivan", "Julia",
  ];

  const contracts = [40, 40, 30, 30, 20, 20, 40, 30];

  for (let i = 0; i < firstNames.length; i++) {
    const name = `${firstNames[i]} ${String.fromCharCode(65 + (i % 26))}.`;
    const contractHoursPerWeek = contracts[i % contracts.length];

    const canBar = i % 3 !== 0;
    const canServis = i % 2 === 0;
    const canKuchyn = i % 4 !== 0;

    const quals: string[] = [];
    if (canBar) quals.push(bar.id);
    if (canServis) quals.push(servis.id);
    if (canKuchyn) quals.push(kuchyn.id);
    if (quals.length === 0) quals.push(servis.id);

    await prisma.employee.create({
      data: {
        name,
        contractHoursPerWeek,
        maxConsecutiveDays: 6,
        qualifications: {
          create: quals.map((shiftTypeId) => ({ shiftTypeId })),
        },
        availabilities: {
          create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            available: Math.random() > 0.15,
            preferredOff: dayOfWeek === 0 || (dayOfWeek === 6 && i % 3 === 0),
          })),
        },
      },
    });
  }

  const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
  for (let w = 1; w <= 4; w++) {
    const weekStart = subWeeks(thisWeek, w);
    const schedule = await prisma.schedule.create({
      data: {
        weekStart,
        status: "published",
        guestForecasts: {
          create: Array.from({ length: 7 }, (_, d) => ({
            date: addDays(weekStart, d),
            guestCount: 60 + Math.floor(Math.random() * 80),
          })),
        },
      },
    });

    const employees = await prisma.employee.findMany({
      include: { qualifications: true },
    });

    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const guestCount = 60 + Math.floor(Math.random() * 80);
      const shuffled = [...employees].sort(() => Math.random() - 0.5);
      const assigned = new Set<string>();

      for (const shiftType of [bar, servis, kuchyn]) {
        const rules = await prisma.staffingRule.findMany({
          where: { shiftTypeId: shiftType.id },
        });
        const rule = rules
          .filter(
            (r) =>
              guestCount >= r.minGuests &&
              (r.maxGuests === null || guestCount <= r.maxGuests),
          )
          .sort((a, b) => b.minGuests - a.minGuests)[0];
        const count = rule?.staffCount ?? 1;

        let filled = 0;
        for (const emp of shuffled) {
          if (filled >= count) break;
          if (assigned.has(emp.id)) continue;
          if (!emp.qualifications.some((q) => q.shiftTypeId === shiftType.id))
            continue;
          assigned.add(emp.id);
          await prisma.scheduleAssignment.create({
            data: {
              scheduleId: schedule.id,
              employeeId: emp.id,
              shiftTypeId: shiftType.id,
              date,
            },
          });
          filled++;
        }
      }
    }
  }

  console.log(`Seeded ${firstNames.length} employees, 3 shift types, 4 weeks of history.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
