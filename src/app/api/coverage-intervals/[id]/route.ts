import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertNoIntervalOverlapInZone,
  intervalInclude,
  validateCoverageIntervalTimes,
} from "@/lib/coverage-api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const interval = await prisma.coverageInterval.findUnique({
      where: { id },
      include: intervalInclude,
    });

    if (!interval) {
      return NextResponse.json({ error: "Interval neexistuje" }, { status: 404 });
    }

    return NextResponse.json(interval);
  } catch (error) {
    console.error("GET /api/coverage-intervals/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst interval" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.coverageInterval.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Interval neexistuje" }, { status: 404 });
    }

    const startTime = body.startTime ?? existing.startTime;
    const endTime = body.endTime ?? existing.endTime;

    const timeError = validateCoverageIntervalTimes(startTime, endTime);
    if (timeError) {
      return NextResponse.json({ error: timeError }, { status: 400 });
    }

    const overlapError = await assertNoIntervalOverlapInZone(
      existing.zoneId,
      { startTime, endTime },
      id,
    );
    if (overlapError) {
      return NextResponse.json({ error: overlapError }, { status: 400 });
    }

    const interval = await prisma.coverageInterval.update({
      where: { id },
      data: {
        ...(body.startTime != null ? { startTime } : {}),
        ...(body.endTime != null ? { endTime } : {}),
        ...(body.label !== undefined
          ? { label: body.label?.trim() || null }
          : {}),
        ...(body.sortOrder != null ? { sortOrder: Number(body.sortOrder) } : {}),
      },
      include: intervalInclude,
    });

    return NextResponse.json(interval);
  } catch (error) {
    console.error("PUT /api/coverage-intervals/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se upravit interval" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.coverageInterval.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Interval neexistuje" }, { status: 404 });
    }

    await prisma.coverageInterval.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/coverage-intervals/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se smazat interval" },
      { status: 500 },
    );
  }
}
