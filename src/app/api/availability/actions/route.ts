import { NextResponse } from "next/server";
import { startOfWeek } from "date-fns";
import {
  copyWeeklyAvailabilityFromWeek,
  loadWeeklyAvailabilityGrid,
  resetWeeklyAvailabilityFromTemplate,
} from "@/lib/availability/weekly-availability";
import { ensureScheduleForWeek } from "@/lib/schedule/ensure-schedule";
import { prisma } from "@/lib/db";

/** Internal API — not linked from UI; reserved for future use or scripts. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { action, week, sourceWeek } = body;

  if (!week || typeof week !== "string") {
    return NextResponse.json({ error: "Chybí parametr week" }, { status: 400 });
  }

  const weekStart = startOfWeek(new Date(week), { weekStartsOn: 1 });
  const targetSchedule = await ensureScheduleForWeek(weekStart);

  try {
    if (action === "reset-from-template") {
      const updated = await resetWeeklyAvailabilityFromTemplate(
        prisma,
        targetSchedule.id,
        weekStart,
      );
      const grid = await loadWeeklyAvailabilityGrid(prisma, weekStart);
      return NextResponse.json({
        action,
        updated,
        grid,
        message: `Dostupnost byla obnovena ze šablony (${updated} buněk).`,
      });
    }

    if (action === "copy-from-week") {
      if (!sourceWeek || typeof sourceWeek !== "string") {
        return NextResponse.json({ error: "Chybí parametr sourceWeek" }, { status: 400 });
      }

      const sourceWeekStart = startOfWeek(new Date(sourceWeek), { weekStartsOn: 1 });
      const sourceSchedule = await ensureScheduleForWeek(sourceWeekStart);

      const updated = await copyWeeklyAvailabilityFromWeek(
        prisma,
        targetSchedule.id,
        weekStart,
        sourceSchedule.id,
        sourceWeekStart,
      );
      const grid = await loadWeeklyAvailabilityGrid(prisma, weekStart);
      return NextResponse.json({
        action,
        updated,
        grid,
        message: `Dostupnost byla zkopírována z jiného týdne (${updated} buněk).`,
      });
    }

    return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Operace se nezdařila";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
