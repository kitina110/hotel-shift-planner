import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const { scheduleId, employeeId, shiftTypeId, date, assignmentId } = body;

  if (assignmentId) {
    const updated = await prisma.scheduleAssignment.update({
      where: { id: assignmentId },
      data: {
        ...(employeeId && { employeeId }),
        ...(shiftTypeId && { shiftTypeId }),
        ...(date && { date: new Date(date) }),
      },
      include: { employee: true, shiftType: true },
    });
    return NextResponse.json(updated);
  }

  if (!scheduleId || !employeeId || !shiftTypeId || !date) {
    return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
  }

  const assignment = await prisma.scheduleAssignment.create({
    data: {
      scheduleId,
      employeeId,
      shiftTypeId,
      date: new Date(date),
    },
    include: { employee: true, shiftType: true },
  });

  return NextResponse.json(assignment, { status: 201 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Chybí id" }, { status: 400 });
  }

  await prisma.scheduleAssignment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
