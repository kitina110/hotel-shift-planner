import { startOfWeek, subWeeks } from "date-fns";
import {
  generateSchedule,
  type HistoricalAssignment,
  type SchedulerInput,
} from "@/lib/scheduler";
import { ensureScheduleForWeek } from "@/lib/schedule/ensure-schedule";
import { ensureWeeklyAvailabilityForSchedule } from "@/lib/availability/weekly-availability";
import { endTimeFromStartAndDuration } from "@/lib/shift-time";
import { zoneInclude } from "@/lib/coverage-api";
import { isPlannableEmployee } from "@/lib/employee";
import { prisma } from "@/lib/db";

export async function loadSchedulerInput(
  weekStart: Date,
  scheduleId?: string,
): Promise<SchedulerInput & { scheduleId: string }> {
  const normalizedWeek = startOfWeek(weekStart, { weekStartsOn: 1 });

  let schedule = scheduleId
    ? await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: { guestForecasts: true, assignments: true },
      })
    : await ensureScheduleForWeek(normalizedWeek);

  if (!schedule) {
    throw new Error("Schedule not found");
  }

  await ensureWeeklyAvailabilityForSchedule(
    prisma,
    schedule.id,
    schedule.weekStart,
  );

  const [shiftTypes, employees, staffingRules, operationalZones] = await Promise.all([
    prisma.shiftType.findMany(),
    prisma.employee.findMany({
      include: { qualifications: true, availabilities: true },
    }),
    prisma.staffingRule.findMany(),
    prisma.operationalZone.findMany({
      include: zoneInclude,
    }),
  ]);

  const historyStart = subWeeks(normalizedWeek, 8);
  const historicalRows = await prisma.scheduleAssignment.findMany({
    where: {
      date: { gte: historyStart, lt: normalizedWeek },
    },
    include: { shiftType: true },
  });

  const historicalAssignments: HistoricalAssignment[] = historicalRows.map((r) => ({
    employeeId: r.employeeId,
    date: r.date,
    shiftTypeId: r.shiftTypeId,
    startTime: r.shiftType.startTime,
    durationMinutes: r.shiftType.durationMinutes,
  }));

  return {
    scheduleId: schedule.id,
    weekStart: normalizedWeek,
    shiftTypes: shiftTypes.map((s) => ({
      id: s.id,
      name: s.name,
      durationMinutes: s.durationMinutes,
      startTime: s.startTime,
      endTime:
        s.endTime && s.endTime.length > 0
          ? s.endTime
          : endTimeFromStartAndDuration(s.startTime, s.durationMinutes),
      zoneId: s.zoneId,
    })),
    employees: employees.filter(isPlannableEmployee).map((e) => ({
      id: e.id,
      name: e.name,
      contractHoursPerWeek: e.contractHoursPerWeek,
      maxConsecutiveDays: e.maxConsecutiveDays,
      qualifiedShiftTypeIds: e.qualifications.map((q) => q.shiftTypeId),
      availability: Object.fromEntries(
        e.availabilities.map((a) => [
          a.dayOfWeek,
          { available: a.available, preferredOff: a.preferredOff },
        ]),
      ),
    })),
    staffingRules: staffingRules.map((r) => ({
      shiftTypeId: r.shiftTypeId,
      minGuests: r.minGuests,
      maxGuests: r.maxGuests,
      staffCount: r.staffCount,
    })),
    coverageZones: operationalZones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      intervals: zone.intervals.map((interval) => ({
        id: interval.id,
        startTime: interval.startTime,
        endTime: interval.endTime,
        label: interval.label,
        rules: interval.rules.map((rule) => ({
          minGuests: rule.minGuests,
          maxGuests: rule.maxGuests,
          staffCount: rule.staffCount,
        })),
      })),
    })),
    guestForecasts: schedule.guestForecasts.map((f) => ({
      date: f.date,
      guestCount: f.guestCount,
    })),
    historicalAssignments,
  };
}

export async function runScheduleGeneration(weekStart: Date, scheduleId?: string) {
  const input = await loadSchedulerInput(weekStart, scheduleId);
  const result = generateSchedule(input);

  await prisma.scheduleAssignment.deleteMany({
    where: { scheduleId: input.scheduleId },
  });

  if (result.assignments.length > 0) {
    await prisma.scheduleAssignment.createMany({
      data: result.assignments.map((a) => ({
        scheduleId: input.scheduleId,
        employeeId: a.employeeId,
        shiftTypeId: a.shiftTypeId,
        date: a.date,
      })),
    });
  }

  return { scheduleId: input.scheduleId, ...result };
}

export async function getEmployeeWorkload(weeksBack = 8) {
  const since = subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), weeksBack);

  const assignments = await prisma.scheduleAssignment.findMany({
    where: { date: { gte: since } },
    include: {
      employee: true,
      shiftType: true,
      schedule: true,
    },
    orderBy: { date: "desc" },
  });

  const byEmployee = new Map<
    string,
    { name: string; shifts: number; hours: number; weeks: Set<string> }
  >();

  for (const a of assignments) {
    const existing = byEmployee.get(a.employeeId) ?? {
      name: a.employee.name,
      shifts: 0,
      hours: 0,
      weeks: new Set<string>(),
    };
    existing.shifts++;
    existing.hours += a.shiftType.durationMinutes / 60;
    existing.weeks.add(a.schedule.weekStart.toISOString());
    byEmployee.set(a.employeeId, existing);
  }

  return Array.from(byEmployee.entries()).map(([id, data]) => ({
    employeeId: id,
    name: data.name,
    totalShifts: data.shifts,
    totalHours: Math.round(data.hours * 10) / 10,
    weeksWorked: data.weeks.size,
  }));
}
