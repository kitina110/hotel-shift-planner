import { NextResponse } from "next/server";
import { startOfWeek } from "date-fns";
import {
  AVAILABILITY_STATUSES,
  loadWeeklyAvailabilityGrid,
  nextAvailabilityStatus,
  updateWeeklyAvailabilityStatus,
} from "@/lib/availability/weekly-availability";
import { ensureScheduleForWeek } from "@/lib/schedule/ensure-schedule";
import { prisma } from "@/lib/db";
import type { AvailabilityStatus } from "@/types";

function isAvailabilityStatus(value: unknown): value is AvailabilityStatus {
  return (
    typeof value === "string" &&
    AVAILABILITY_STATUSES.includes(value as AvailabilityStatus)
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const week = searchParams.get("week");

  if (!week) {
    return NextResponse.json({ error: "Chybí parametr week" }, { status: 400 });
  }

  const weekStart = startOfWeek(new Date(week), { weekStartsOn: 1 });
  await ensureScheduleForWeek(weekStart);

  const grid = await loadWeeklyAvailabilityGrid(prisma, weekStart);
  if (!grid) {
    return NextResponse.json({ error: "Rozpis nenalezen" }, { status: 404 });
  }

  return NextResponse.json(grid);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { scheduleId, employeeId, date, status, cycle } = body;

  if (!scheduleId || !employeeId || !date) {
    return NextResponse.json(
      { error: "Chybí scheduleId, employeeId nebo date" },
      { status: 400 },
    );
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { isActive: true },
  });

  if (!employee?.isActive) {
    return NextResponse.json(
      { error: "Neaktivní zaměstnanec nelze upravovat" },
      { status: 400 },
    );
  }

  let nextStatus: AvailabilityStatus;

  if (cycle) {
    const existing = await prisma.employeeWeeklyAvailability.findUnique({
      where: {
        scheduleId_employeeId_date: {
          scheduleId,
          employeeId,
          date: new Date(`${date}T12:00:00.000Z`),
        },
      },
    });
    nextStatus = nextAvailabilityStatus(
      (existing?.status as AvailabilityStatus | undefined) ?? "AVAILABLE",
    );
  } else if (isAvailabilityStatus(status)) {
    nextStatus = status;
  } else {
    return NextResponse.json({ error: "Neplatný status dostupnosti" }, { status: 400 });
  }

  const cell = await updateWeeklyAvailabilityStatus(prisma, {
    scheduleId,
    employeeId,
    dateKey: date,
    status: nextStatus,
  });

  return NextResponse.json(cell);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { scheduleId, updates } = body;

  if (!scheduleId || !Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { error: "Chybí scheduleId nebo updates" },
      { status: 400 },
    );
  }

  const results = [];

  for (const update of updates) {
    if (
      !update?.employeeId ||
      !update?.date ||
      !isAvailabilityStatus(update.status)
    ) {
      return NextResponse.json({ error: "Neplatná položka v updates" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: update.employeeId },
      select: { isActive: true },
    });

    if (!employee?.isActive) {
      continue;
    }

    const cell = await updateWeeklyAvailabilityStatus(prisma, {
      scheduleId,
      employeeId: update.employeeId,
      dateKey: update.date,
      status: update.status,
    });
    results.push(cell);
  }

  return NextResponse.json({ updated: results.length, cells: results });
}
