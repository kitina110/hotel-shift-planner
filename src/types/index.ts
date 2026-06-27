export interface ShiftType {
  id: string;
  name: string;
  durationMinutes: number;
  breakMinutes: number;
  startTime: string;
  endTime: string;
  staffingRules?: StaffingRule[];
}

export interface StaffingRule {
  id: string;
  shiftTypeId: string;
  minGuests: number;
  maxGuests: number | null;
  staffCount: number;
  shiftType?: ShiftType;
}

export interface Availability {
  id: string;
  dayOfWeek: number;
  available: boolean;
  preferredOff: boolean;
}

export interface Employee {
  id: string;
  name: string;
  contractHoursPerWeek: number;
  maxConsecutiveDays: number;
  qualifications: { shiftTypeId: string }[];
  availabilities: Availability[];
}

export interface GuestForecast {
  id: string;
  date: string;
  guestCount: number;
}

export interface ScheduleAssignment {
  id: string;
  employeeId: string;
  shiftTypeId: string;
  date: string;
  employee: { id: string; name: string };
  shiftType: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
  };
}

export interface Schedule {
  id: string;
  weekStart: string;
  status: string;
  guestForecasts: GuestForecast[];
  assignments: ScheduleAssignment[];
}

export interface WorkloadEntry {
  employeeId: string;
  name: string;
  totalShifts: number;
  totalHours: number;
  weeksWorked: number;
}

export const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
