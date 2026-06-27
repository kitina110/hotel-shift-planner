import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findZoneOrNull } from "@/lib/coverage-api";
import {
  buildShiftWriteData,
  normalizeShiftTypes,
} from "@/lib/shift-type-api";

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

export async function GET() {
  try {
    const shiftTypes = await prisma.shiftType.findMany({
      include: {
        staffingRules: { orderBy: { minGuests: "asc" } },
        zone: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(normalizeShiftTypes(shiftTypes));
  } catch (error) {
    console.error("GET /api/shift-types failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se načíst směny" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, startTime, endTime, zoneId: rawZoneId } = body;

    if (!name?.trim() || !startTime || !endTime) {
      return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
    }

    const zoneResult = await resolveZoneId(parseOptionalZoneId(rawZoneId));
    if ("error" in zoneResult) {
      return NextResponse.json({ error: zoneResult.error }, { status: 400 });
    }

    const built = buildShiftWriteData({
      name,
      startTime,
      endTime,
    });

    if ("error" in built) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }

    const shiftType = await prisma.shiftType.create({
      data: {
        ...built.data,
        ...(zoneResult.zoneId !== undefined ? { zoneId: zoneResult.zoneId } : {}),
      },
      include: { zone: true },
    });

    return NextResponse.json(normalizeShiftTypes([shiftType])[0], { status: 201 });
  } catch (error) {
    console.error("POST /api/shift-types failed:", error);
    return NextResponse.json(
      { error: "Nepodařilo se vytvořit směnu" },
      { status: 500 },
    );
  }
}
