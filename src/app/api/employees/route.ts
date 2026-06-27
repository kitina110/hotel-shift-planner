import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: { qualifications: true, availabilities: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const body = await request.json();
  const {
    name,
    contractHoursPerWeek,
    maxConsecutiveDays = 6,
    shiftTypeIds = [],
    availability = [],
  } = body;

  if (!name || contractHoursPerWeek == null) {
    return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
  }

  const employee = await prisma.employee.create({
    data: {
      name,
      contractHoursPerWeek: Number(contractHoursPerWeek),
      maxConsecutiveDays: Number(maxConsecutiveDays),
      qualifications: {
        create: shiftTypeIds.map((shiftTypeId: string) => ({ shiftTypeId })),
      },
      availabilities: {
        create:
          availability.length > 0
            ? availability
            : Array.from({ length: 7 }, (_, dayOfWeek) => ({
                dayOfWeek,
                available: true,
                preferredOff: false,
              })),
      },
    },
    include: { qualifications: true, availabilities: true },
  });

  return NextResponse.json(employee, { status: 201 });
}
