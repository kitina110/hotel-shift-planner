import { addDays, eachDayOfInterval, format, startOfWeek } from "date-fns";
import { usesDefaultAvailabilityTemplate, defaultTemplateByDayOfWeek } from "@/lib/availability/default-template";
import type { AvailabilityStatus } from "@/lib/availability/status";
import { employeeSortCompare } from "@/lib/employee/display";
import type { PrismaClient } from "@/generated/prisma/client";

type DbClient = Pick<
  PrismaClient,
  | "employee"
  | "employeeWeeklyAvailability"
  | "schedule"
>;

export interface WeeklyAvailabilityCell {
  id: string;
  employeeId: string;
  date: string;
  status: AvailabilityStatus;
}

export interface WeeklyAvailabilityGrid {
  scheduleId: string;
  weekStart: string;
  weekDays: string[];
  employees: Array<{
    id: string;
    name: string;
    sortOrder: number;
    contractHoursPerWeek: number;
    useDefaultAvailabilityTemplate: boolean;
  }>;
  cells: Record<string, Record<string, WeeklyAvailabilityCell>>;
}

function normalizeWeekStart(weekStart: Date): Date {
  return startOfWeek(weekStart, { weekStartsOn: 1 });
}

export function weekDayKeys(weekStart: Date): string[] {
  const normalized = normalizeWeekStart(weekStart);
  return eachDayOfInterval({
    start: normalized,
    end: addDays(normalized, 6),
  }).map((day) => format(day, "yyyy-MM-dd"));
}

export function dateKeyToDayOfWeek(weekStart: Date, dateKey: string): number {
  const keys = weekDayKeys(weekStart);
  const index = keys.indexOf(dateKey);
  return index >= 0 ? index : 0;
}

function resolveStatusForEmployeeDay(
  employee: {
    useDefaultAvailabilityTemplate: boolean;
    defaultAvailabilityTemplate: Array<{ dayOfWeek: number; status: AvailabilityStatus }>;
  },
  dayOfWeek: number,
): AvailabilityStatus {
  if (!usesDefaultAvailabilityTemplate(employee)) {
    return "AVAILABLE";
  }

  const template = defaultTemplateByDayOfWeek(employee.defaultAvailabilityTemplate);
  return template.get(dayOfWeek) ?? "AVAILABLE";
}

export async function bootstrapWeeklyAvailabilityIfNeeded(
  db: DbClient,
  scheduleId: string,
  weekStart: Date,
): Promise<number> {
  const normalizedWeek = normalizeWeekStart(weekStart);
  const existing = await db.employeeWeeklyAvailability.count({
    where: { scheduleId },
  });
  if (existing > 0) {
    return 0;
  }

  const employees = await db.employee.findMany({
    where: { isActive: true },
    include: { defaultAvailabilityTemplate: true },
  });

  const days = eachDayOfInterval({
    start: normalizedWeek,
    end: addDays(normalizedWeek, 6),
  });

  const rows = employees.flatMap((employee) =>
    days.map((date, dayOfWeek) => ({
      scheduleId,
      employeeId: employee.id,
      date,
      status: resolveStatusForEmployeeDay(employee, dayOfWeek),
    })),
  );

  if (rows.length === 0) {
    return 0;
  }

  await db.employeeWeeklyAvailability.createMany({ data: rows });
  return rows.length;
}

/** Fill gaps when new active employees appear after schedule bootstrap. */
export async function syncMissingWeeklyRowsForActiveEmployees(
  db: DbClient,
  scheduleId: string,
  weekStart: Date,
): Promise<number> {
  const normalizedWeek = normalizeWeekStart(weekStart);
  const days = eachDayOfInterval({
    start: normalizedWeek,
    end: addDays(normalizedWeek, 6),
  });

  const employees = await db.employee.findMany({
    where: { isActive: true },
    include: { defaultAvailabilityTemplate: true },
  });

  const existing = await db.employeeWeeklyAvailability.findMany({
    where: { scheduleId },
    select: { employeeId: true, date: true },
  });

  const existingKeys = new Set(
    existing.map(
      (row) => `${row.employeeId}:${format(row.date, "yyyy-MM-dd")}`,
    ),
  );

  const missingRows = employees.flatMap((employee) =>
    days.flatMap((date, dayOfWeek) => {
      const key = `${employee.id}:${format(date, "yyyy-MM-dd")}`;
      if (existingKeys.has(key)) return [];
      return [
        {
          scheduleId,
          employeeId: employee.id,
          date,
          status: resolveStatusForEmployeeDay(employee, dayOfWeek),
        },
      ];
    }),
  );

  if (missingRows.length === 0) {
    return 0;
  }

  await db.employeeWeeklyAvailability.createMany({ data: missingRows });
  return missingRows.length;
}

export async function ensureWeeklyAvailabilityForSchedule(
  db: DbClient,
  scheduleId: string,
  weekStart: Date,
): Promise<void> {
  await bootstrapWeeklyAvailabilityIfNeeded(db, scheduleId, weekStart);
  await syncMissingWeeklyRowsForActiveEmployees(db, scheduleId, weekStart);
}

export type WeeklyAvailabilityRow = {
  date: Date;
  status: AvailabilityStatus;
};

/** Weekly rows for one schedule, grouped by employee id (E5 scheduler input). */
export async function loadWeeklyAvailabilityByEmployee(
  db: DbClient,
  scheduleId: string,
): Promise<Map<string, WeeklyAvailabilityRow[]>> {
  const rows = await db.employeeWeeklyAvailability.findMany({
    where: { scheduleId },
    orderBy: [{ employeeId: "asc" }, { date: "asc" }],
  });

  const byEmployee = new Map<string, WeeklyAvailabilityRow[]>();

  for (const row of rows) {
    const list = byEmployee.get(row.employeeId) ?? [];
    list.push({
      date: row.date,
      status: row.status as AvailabilityStatus,
    });
    byEmployee.set(row.employeeId, list);
  }

  return byEmployee;
}

export async function loadWeeklyAvailabilityGrid(
  db: DbClient,
  weekStart: Date,
): Promise<WeeklyAvailabilityGrid | null> {
  const normalizedWeek = normalizeWeekStart(weekStart);
  const schedule = await db.schedule.findUnique({
    where: { weekStart: normalizedWeek },
  });

  if (!schedule) {
    return null;
  }

  await ensureWeeklyAvailabilityForSchedule(db, schedule.id, normalizedWeek);

  const [employees, rows] = await Promise.all([
    db.employee.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        sortOrder: true,
        contractHoursPerWeek: true,
        useDefaultAvailabilityTemplate: true,
      },
    }),
    db.employeeWeeklyAvailability.findMany({
      where: { scheduleId: schedule.id },
      orderBy: [{ employeeId: "asc" }, { date: "asc" }],
    }),
  ]);

  const sortedEmployees = employees.sort(employeeSortCompare);

  const keys = weekDayKeys(normalizedWeek);
  const cells: WeeklyAvailabilityGrid["cells"] = {};

  for (const employee of sortedEmployees) {
    cells[employee.id] = {};
  }

  for (const row of rows) {
    if (!cells[row.employeeId]) continue;
    const dateKey = format(row.date, "yyyy-MM-dd");
    cells[row.employeeId][dateKey] = {
      id: row.id,
      employeeId: row.employeeId,
      date: dateKey,
      status: row.status as AvailabilityStatus,
    };
  }

  return {
    scheduleId: schedule.id,
    weekStart: normalizedWeek.toISOString(),
    weekDays: keys,
    employees: sortedEmployees,
    cells,
  };
}

export async function updateWeeklyAvailabilityStatus(
  db: DbClient,
  params: {
    scheduleId: string;
    employeeId: string;
    dateKey: string;
    status: AvailabilityStatus;
  },
): Promise<WeeklyAvailabilityCell> {
  const date = new Date(`${params.dateKey}T12:00:00.000Z`);

  const row = await db.employeeWeeklyAvailability.upsert({
    where: {
      scheduleId_employeeId_date: {
        scheduleId: params.scheduleId,
        employeeId: params.employeeId,
        date,
      },
    },
    create: {
      scheduleId: params.scheduleId,
      employeeId: params.employeeId,
      date,
      status: params.status,
    },
    update: { status: params.status },
  });

  return {
    id: row.id,
    employeeId: row.employeeId,
    date: params.dateKey,
    status: row.status as AvailabilityStatus,
  };
}

export const AVAILABILITY_STATUSES: AvailabilityStatus[] = [
  "AVAILABLE",
  "PREFERRED_OFF",
  "UNAVAILABLE",
  "VACATION",
  "SICK",
];

export function nextAvailabilityStatus(
  current: AvailabilityStatus,
): AvailabilityStatus {
  const index = AVAILABILITY_STATUSES.indexOf(current);
  const nextIndex = index < 0 ? 0 : (index + 1) % AVAILABILITY_STATUSES.length;
  return AVAILABILITY_STATUSES[nextIndex]!;
}
