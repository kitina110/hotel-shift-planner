import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findZoneOrNull } from "@/lib/coverage-api";
import {
  buildShiftUpdateDataFromExisting,
  normalizeShiftTypes,
} from "@/lib/shift-type-api";

type Params = { params: Promise<{ id: string }> };

function parseOptionalZoneId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return String(value);
}

async function resolveZoneId(zoneId: string | null | undefined) {
  if (zoneId === undefined) return { zoneId: undefined as string | null | undefined };
  if (zoneId === null) return { zoneId: null };

  const zone = await findZoneOrNull(zoneId);
  if (!zone) {
    return { error: "Zóna neexistuje" } as const;
  }
  return { zoneId };
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, startTime, endTime, zoneId: rawZoneId } = body;

    const existing = await prisma.shiftType.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Směna neexistuje" }, { status: 404 });
    }

    const zoneResult = await resolveZoneId(parseOptionalZoneId(rawZoneId));
    if ("error" in zoneResult) {
      return NextResponse.json({ error: zoneResult.error }, { status: 400 });
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
      data: {
        ...built.data,
        ...(zoneResult.zoneId !== undefined ? { zoneId: zoneResult.zoneId } : {}),
      },
      include: { zone: true },
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
