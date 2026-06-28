import { NextResponse } from "next/server";
import { validateEmployeeProfileInput } from "@/lib/employee/profile-validation";
import {
  employeeApiInclude,
  mapEmployeeToApi,
} from "@/lib/employee/api-response";
import {
  defaultTemplateCreateInputFromLegacy,
  legacyAvailabilityCreateInput,
} from "@/lib/availability/legacy-sync";
import { prisma } from "@/lib/db";

export async function GET() {
  const employees = await prisma.employee.findMany({
    include: employeeApiInclude,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return NextResponse.json(employees.map(mapEmployeeToApi));
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

  const validationError = validateEmployeeProfileInput({
    name,
    contractHoursPerWeek: contractHoursPerWeek != null ? Number(contractHoursPerWeek) : undefined,
    sortOrder: body.sortOrder != null ? Number(body.sortOrder) : undefined,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  if (!name || contractHoursPerWeek == null) {
    return NextResponse.json({ error: "Chybí povinná pole" }, { status: 400 });
  }

  const legacyAvailabilityInput = legacyAvailabilityCreateInput(availability);

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
      defaultAvailabilityTemplate: defaultTemplateCreateInputFromLegacy(availability),
      availabilities: legacyAvailabilityInput,
    },
    include: employeeApiInclude,
  });

  return NextResponse.json(mapEmployeeToApi(employee), { status: 201 });
}
