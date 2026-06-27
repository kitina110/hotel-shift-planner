import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { endTimeFromStartAndDuration } from "../src/lib/shift-time";

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
  const shifts = await prisma.shiftType.findMany();
  for (const shift of shifts) {
    const endTime = endTimeFromStartAndDuration(shift.startTime, shift.durationMinutes);
    await prisma.shiftType.update({
      where: { id: shift.id },
      data: { endTime },
    });
    console.log(`Updated ${shift.name}: ${shift.startTime} → ${endTime}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
