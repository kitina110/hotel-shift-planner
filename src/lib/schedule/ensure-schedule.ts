import { addDays, eachDayOfInterval, startOfWeek } from "date-fns";
import { ensureWeeklyAvailabilityForSchedule } from "@/lib/availability/weekly-availability";
import { prisma } from "@/lib/db";

export async function ensureScheduleForWeek(weekStart: Date) {
  const normalizedWeek = startOfWeek(weekStart, { weekStartsOn: 1 });

  let schedule = await prisma.schedule.findUnique({
    where: { weekStart: normalizedWeek },
    include: { guestForecasts: true, assignments: true },
  });

  if (!schedule) {
    schedule = await prisma.schedule.create({
      data: {
        weekStart: normalizedWeek,
        guestForecasts: {
          create: eachDayOfInterval({
            start: normalizedWeek,
            end: addDays(normalizedWeek, 6),
          }).map((date) => ({ date, guestCount: 80 })),
        },
      },
      include: { guestForecasts: true, assignments: true },
    });
  }

  await ensureWeeklyAvailabilityForSchedule(
    prisma,
    schedule.id,
    normalizedWeek,
  );

  return schedule;
}
