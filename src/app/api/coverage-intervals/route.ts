import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  assertNoIntervalOverlapInZone,
  findZoneOrNull,
  intervalInclude,
  validateCoverageIntervalTimes,
} from "@/lib/coverage-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const zoneId = searchParams.get("zoneId");

    const intervals = await prisma.coverageInterval.findMany({
      where: zoneId ? { zoneId } : undefined,
      include: intervalInclude,
      orderBy: [{ zoneId: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(intervals);
  } catch (error) {
    console.error("GET /api/coverage-intervals failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst intervaly" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { zoneId, startTime, endTime, label, sortOrder } = body;

    if (!zoneId || !startTime || !endTime) {
      return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
    }

    const zone = await findZoneOrNull(zoneId);
    if (!zone) {
      return NextResponse.json({ error: "Zóna neexistuje" }, { status: 404 });
    }

    const timeError = validateCoverageIntervalTimes(startTime, endTime);
    if (timeError) {
      return NextResponse.json({ error: timeError }, { status: 400 });
    }

    const overlapError = await assertNoIntervalOverlapInZone(zoneId, {
      startTime,
      endTime,
    });
    if (overlapError) {
      return NextResponse.json({ error: overlapError }, { status: 400 });
    }

    const interval = await prisma.coverageInterval.create({
      data: {
        zoneId,
        startTime,
        endTime,
        label: label?.trim() || null,
        sortOrder: sortOrder != null ? Number(sortOrder) : 0,
      },
      include: intervalInclude,
    });

    return NextResponse.json(interval, { status: 201 });
  } catch (error) {
    console.error("POST /api/coverage-intervals failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit interval" },
      { status: 500 },
    );
  }
}
