import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const rule = await prisma.staffingRule.update({
    where: { id },
    data: {
      ...(body.minGuests != null && { minGuests: Number(body.minGuests) }),
      ...(body.maxGuests !== undefined && {
        maxGuests: body.maxGuests != null ? Number(body.maxGuests) : null,
      }),
      ...(body.staffCount != null && { staffCount: Number(body.staffCount) }),
    },
    include: { shiftType: true },
  });

  return NextResponse.json(rule);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.staffingRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
