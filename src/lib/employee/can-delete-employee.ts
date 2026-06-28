import type { PrismaClient } from "@/generated/prisma/client";

type DbClient = Pick<PrismaClient, "scheduleAssignment">;

export const EMPLOYEE_DELETE_BLOCKED_MESSAGE =
  "Zaměstnance s historií nebo přiřazenými směnami nelze smazat. Použijte deaktivaci (isActive: false).";

export async function employeeHasScheduleHistory(
  db: DbClient,
  employeeId: string,
): Promise<boolean> {
  const count = await db.scheduleAssignment.count({
    where: { employeeId },
  });
  return count > 0;
}

export async function canDeleteEmployee(
  db: DbClient,
  employeeId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  if (await employeeHasScheduleHistory(db, employeeId)) {
    return {
      allowed: false,
      reason: EMPLOYEE_DELETE_BLOCKED_MESSAGE,
    };
  }
  return { allowed: true };
}
