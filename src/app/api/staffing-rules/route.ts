import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const rules = await prisma.staffingRule.findMany({
    include: { shiftType: true },
    orderBy: [{ shiftTypeId: "asc" }, { minGuests: "asc" }],
  });
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { shiftTypeId, minGuests, maxGuests, staffCount } = body;

  if (!shiftTypeId || minGuests == null || staffCount == null) {
    return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
  }

  const rule = await prisma.staffingRule.create({
    data: {
      shiftTypeId,
      minGuests: Number(minGuests),
      maxGuests: maxGuests != null ? Number(maxGuests) : null,
      staffCount: Number(staffCount),
    },
    include: { shiftType: true },
  });

  return NextResponse.json(rule, { status: 201 });
}
