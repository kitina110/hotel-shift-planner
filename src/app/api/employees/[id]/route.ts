import { NextResponse } from "next/server";
import { validateEmployeeProfileInput } from "@/lib/employee/profile-validation";
import {
  employeeApiInclude,
  mapEmployeeToApi,
} from "@/lib/employee/api-response";
import {
  EMPLOYEE_DEACTIVATED_INSTEAD_MESSAGE,
  resolveEmployeeDelete,
} from "@/lib/employee/resolve-delete";
import { writeLegacyAvailabilityWithDualSync } from "@/lib/availability/legacy-sync";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  if (body.isActive === undefined) {
    return NextResponse.json(
      { error: "Chybí pole isActive pro aktivaci nebo deaktivaci" },
      { status: 400 },
    );
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: { isActive: Boolean(body.isActive) },
    include: employeeApiInclude,
  });

  return NextResponse.json(mapEmployeeToApi(employee));
}

export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const {
    name,
    contractHoursPerWeek,
    maxConsecutiveDays,
    shiftTypeIds,
    availability,
    isActive,
    isTemporaryHelp,
    useDefaultAvailabilityTemplate,
  } = body;

  const validationError = validateEmployeeProfileInput({
    name,
    contractHoursPerWeek:
      contractHoursPerWeek != null ? Number(contractHoursPerWeek) : undefined,
  });
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
  }

  if (shiftTypeIds !== undefined) {
    await prisma.employeeQualification.deleteMany({ where: { employeeId: id } });
    if (Array.isArray(shiftTypeIds) && shiftTypeIds.length > 0) {
      await prisma.employeeQualification.createMany({
        data: shiftTypeIds.map((shiftTypeId: string) => ({
          employeeId: id,
          shiftTypeId,
        })),
      });
    }
  }

  if (availability?.length) {
    await writeLegacyAvailabilityWithDualSync(prisma, id, availability);
  }

  const employee = await prisma.employee.update({
    where: { id },
    data: {
      ...(name && { name: String(name).trim() }),
      ...(contractHoursPerWeek != null && {
        contractHoursPerWeek: Number(contractHoursPerWeek),
      }),
      ...(maxConsecutiveDays != null && {
        maxConsecutiveDays: Number(maxConsecutiveDays),
      }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      ...(isTemporaryHelp !== undefined && {
        isTemporaryHelp: Boolean(isTemporaryHelp),
      }),
      ...(useDefaultAvailabilityTemplate !== undefined && {
        useDefaultAvailabilityTemplate: Boolean(useDefaultAvailabilityTemplate),
      }),
    },
    include: employeeApiInclude,
  });

  return NextResponse.json(mapEmployeeToApi(employee));
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const result = await resolveEmployeeDelete(prisma, id);

  if (result.action === "not_found") {
    return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
  }

  if (result.action === "deleted") {
    return NextResponse.json({ ok: true, deleted: true });
  }

  return NextResponse.json({
    ok: true,
    deleted: false,
    deactivated: true,
    message: EMPLOYEE_DEACTIVATED_INSTEAD_MESSAGE,
    employee: mapEmployeeToApi(result.employee),
  });
}
