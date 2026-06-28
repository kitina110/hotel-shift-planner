import type { Prisma } from "@/generated/prisma/client";

export const employeeApiInclude = {
  qualifications: true,
  availabilities: true,
  defaultAvailabilityTemplate: true,
  _count: { select: { assignments: true } },
} satisfies Prisma.EmployeeInclude;

export type EmployeeApiRecord = Prisma.EmployeeGetPayload<{
  include: typeof employeeApiInclude;
}>;

export function mapEmployeeToApi(employee: EmployeeApiRecord) {
  const { _count, ...rest } = employee;
  return {
    ...rest,
    hasScheduleHistory: _count.assignments > 0,
  };
}
