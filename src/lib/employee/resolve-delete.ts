import { canDeleteEmployee } from "@/lib/employee/can-delete-employee";
import { employeeApiInclude } from "@/lib/employee/api-response";
import type { PrismaClient } from "@/generated/prisma/client";

export type ResolvedEmployeeDelete =
  | { action: "not_found" }
  | { action: "deleted" }
  | {
      action: "deactivated";
      employee: Awaited<ReturnType<typeof deactivateEmployee>>;
    };

export const EMPLOYEE_DEACTIVATED_INSTEAD_MESSAGE =
  "Zaměstnanec nemohl být smazán, protože je součástí historických rozpisů. Byl proto označen jako neaktivní.";

async function deactivateEmployee(db: PrismaClient, employeeId: string) {
  return db.employee.update({
    where: { id: employeeId },
    data: { isActive: false },
    include: employeeApiInclude,
  });
}

export async function resolveEmployeeDelete(
  db: PrismaClient,
  employeeId: string,
): Promise<ResolvedEmployeeDelete> {
  const existing = await db.employee.findUnique({ where: { id: employeeId } });
  if (!existing) {
    return { action: "not_found" };
  }

  const deleteCheck = await canDeleteEmployee(db, employeeId);
  if (deleteCheck.allowed) {
    await db.employee.delete({ where: { id: employeeId } });
    return { action: "deleted" };
  }

  const employee = await deactivateEmployee(db, employeeId);
  return { action: "deactivated", employee };
}
