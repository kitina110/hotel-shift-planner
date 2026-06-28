import { NextResponse } from "next/server";
import { duplicateEmployee } from "@/lib/employee/duplicate-employee";
import {
  employeeApiInclude,
  mapEmployeeToApi,
} from "@/lib/employee/api-response";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { id } = await params;

  const employee = await duplicateEmployee(prisma, id);
  if (!employee) {
    return NextResponse.json({ error: "Zaměstnanec nenalezen" }, { status: 404 });
  }

  const created = await prisma.employee.findUniqueOrThrow({
    where: { id: employee.id },
    include: employeeApiInclude,
  });

  return NextResponse.json(mapEmployeeToApi(created), { status: 201 });
}
