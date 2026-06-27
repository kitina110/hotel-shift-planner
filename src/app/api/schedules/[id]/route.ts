import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (body.action === "publish") {
    const schedule = await prisma.schedule.update({
      where: { id },
      data: { status: "published" },
    });
    return NextResponse.json(schedule);
  }

  return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.schedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
