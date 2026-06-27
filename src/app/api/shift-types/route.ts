import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buildShiftWriteData,
  normalizeShiftTypes,
} from "@/lib/shift-type-api";

export async function GET() {
  try {
    const shiftTypes = await prisma.shiftType.findMany({
      include: { staffingRules: { orderBy: { minGuests: "asc" } } },
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
    const { name, startTime, endTime } = body;

    if (!name?.trim() || !startTime || !endTime) {
      return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
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
      data: built.data,
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
