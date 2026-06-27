import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { name, contractHoursPerWeek, maxConsecutiveDays, shiftTypeIds, availability } =
    body;

  await prisma.employeeQualification.deleteMany({ where: { employeeId: id } });
  if (shiftTypeIds?.length) {
    await prisma.employeeQualification.createMany({
      data: shiftTypeIds.map((shiftTypeId: string) => ({
        employeeId: id,
        shiftTypeId,
      })),
    });
  }

  if (availability?.length) {
    for (const a of availability) {
      await prisma.availability.upsert({
        where: {
          employeeId_dayOfWeek: {
            employeeId: id,
            dayOfWeek: a.dayOfWeek,
          },
        },
        create: {
          employeeId: id,
          dayOfWeek: a.dayOfWeek,
          available: a.available,
          preferredOff: a.preferredOff ?? false,
        },
        update: {
          available: a.available,
          preferredOff: a.preferredOff ?? false,
        },
      });
    }
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(contractHoursPerWeek != null && {
        contractHoursPerWeek: Number(contractHoursPerWeek),
      }),
      ...(maxConsecutiveDays != null && {
        maxConsecutiveDays: Number(maxConsecutiveDays),
      }),
    },
    include: { qualifications: true, availabilities: true },
  });

  return NextResponse.json(employee);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
