import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: {
      qualifications: true,
      availabilities: true,
      defaultAvailabilityTemplate: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
      sortOrder:
        body.sortOrder != null
          ? Number(body.sortOrder)
          : await prisma.employee.count(),
      isActive: body.isActive !== false,
      isTemporaryHelp: Boolean(body.isTemporaryHelp),
      useDefaultAvailabilityTemplate: Boolean(body.useDefaultAvailabilityTemplate),
      qualifications: {
        create: shiftTypeIds.map((shiftTypeId: string) => ({ shiftTypeId })),
      },
      defaultAvailabilityTemplate: {
        create: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          status: "AVAILABLE" as const,
        })),
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
    include: {
      qualifications: true,
      availabilities: true,
      defaultAvailabilityTemplate: true,
    },
  });

  return NextResponse.json(employee, { status: 201 });
}
