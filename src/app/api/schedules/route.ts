import { NextResponse } from "next/server";
import { startOfWeek } from "date-fns";
import { prisma } from "@/lib/db";
import { loadSchedulerInput, runScheduleGeneration } from "@/lib/scheduler/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week");

  if (!week) {
    const schedules = await prisma.schedule.findMany({
      orderBy: { weekStart: "desc" },
      include: {
        _count: { select: { assignments: true } },
      },
    });
    return NextResponse.json(schedules);
  }

  const weekStart = startOfWeek(new Date(week), { weekStartsOn: 1 });
  const input = await loadSchedulerInput(weekStart);

  const schedule = await prisma.schedule.findUnique({
    where: { id: input.scheduleId },
    include: {
      guestForecasts: { orderBy: { date: "asc" } },
      assignments: {
        include: { employee: true, shiftType: true },
        orderBy: [{ date: "asc" }, { shiftType: { name: "asc" } }],
      },
    },
  });

  return NextResponse.json(schedule);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { weekStart, guestForecasts } = body;

  if (!weekStart) {
    return NextResponse.json({ error: "Chybí weekStart" }, { status: 400 });
  }

  const normalized = startOfWeek(new Date(weekStart), { weekStartsOn: 1 });
  const input = await loadSchedulerInput(normalized);

  if (guestForecasts?.length) {
    for (const f of guestForecasts) {
      await prisma.guestForecast.upsert({
        where: {
          scheduleId_date: {
            scheduleId: input.scheduleId,
            date: new Date(f.date),
          },
        },
        create: {
          scheduleId: input.scheduleId,
          date: new Date(f.date),
          guestCount: Number(f.guestCount),
        },
        update: { guestCount: Number(f.guestCount) },
      });
    }
  }

  const result = await runScheduleGeneration(normalized, input.scheduleId);

  const schedule = await prisma.schedule.findUnique({
    where: { id: result.scheduleId },
    include: {
      guestForecasts: { orderBy: { date: "asc" } },
      assignments: {
        include: { employee: true, shiftType: true },
        orderBy: [{ date: "asc" }, { shiftType: { name: "asc" } }],
      },
    },
  });

  return NextResponse.json({ schedule, warnings: result.warnings, unfilled: result.unfilledSlots.length });
}
