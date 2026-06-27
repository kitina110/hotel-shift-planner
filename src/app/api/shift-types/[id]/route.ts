import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildShiftUpdateDataFromExisting,
  normalizeShiftTypes,
} from "@/lib/shift-type-api";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, startTime, endTime } = body;

    const existing = await prisma.shiftType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Směna neexistuje" }, { status: 404 });
    }

    const built = buildShiftUpdateDataFromExisting(existing, {
      name,
      startTime,
      endTime,
    });

    if ("error" in built) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }

    const shiftType = await prisma.shiftType.update({
      where: { id },
      data: built.data,
    });

    return NextResponse.json(normalizeShiftTypes([shiftType])[0]);
  } catch (error) {
    console.error("PUT /api/shift-types/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se upravit směnu" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;

    const existing = await prisma.shiftType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Směna neexistuje" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.scheduleAssignment.deleteMany({ where: { shiftTypeId: id } }),
      prisma.shiftType.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/shift-types/[id] failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se smazat směnu" },
      { status: 500 },
    );
  }
}
