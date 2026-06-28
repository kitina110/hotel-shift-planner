import { NextResponse } from "next/server";
import { validateEmployeeProfileInput } from "@/lib/employee/profile-validation";
import { writeLegacyAvailabilityWithDualSync } from "@/lib/availability/legacy-sync";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

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
    include: {
      qualifications: true,
      availabilities: true,
      defaultAvailabilityTemplate: true,
    },
  });

  return NextResponse.json(employee);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
