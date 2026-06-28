export interface OperationalZone {
  id: string;
  name: string;
  sortOrder: number;
  intervals?: CoverageInterval[];
}

export interface CoverageInterval {
  id: string;
  zoneId: string;
  label?: string | null;
  startTime: string;
  endTime: string;
  sortOrder: number;
  rules?: CoverageRequirementRule[];
  zone?: OperationalZone;
}

export interface CoverageRequirementRule {
  id: string;
  intervalId: string;
  minGuests: number;
  maxGuests: number | null;
  staffCount: number;
}

export interface DemandProfile {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
}

export interface ShiftType {
  id: string;
  name: string;
  durationMinutes: number;
  breakMinutes: number;
  startTime: string;
  endTime: string;
  zoneId?: string | null;
  zone?: OperationalZone;
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

export type AvailabilityStatus =
  | "AVAILABLE"
  | "PREFERRED_OFF"
  | "UNAVAILABLE"
  | "VACATION"
  | "SICK";

export interface EmployeeDefaultAvailability {
  id: string;
  dayOfWeek: number;
  status: AvailabilityStatus;
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
  sortOrder: number;
  isActive: boolean;
  contractHoursPerWeek: number;
  isTemporaryHelp: boolean;
  useDefaultAvailabilityTemplate: boolean;
  /** Rezervováno — v1 se nezobrazuje v UI ani v generátoru. */
  maxConsecutiveDays: number;
  qualifications: { shiftTypeId: string }[];
  /** @deprecated E8 — dočasně pro zpětnou kompatibilitu */
  availabilities: Availability[];
  defaultAvailabilityTemplate?: EmployeeDefaultAvailability[];
  /** Má alespoň jedno přiřazení směny v historii rozpisů. */
  hasScheduleHistory?: boolean;
}

export interface GuestForecast {
  id: string;
  date: string;
  guestCount: number;
  demandProfileId?: string | null;
  notes?: string | null;
  demandProfile?: DemandProfile;
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

export type {
  CoverageTarget,
  CoverageSnapshot,
  CoverageGap,
  CoveringStaffEntry,
  GapSeverity,
  GapAction,
  GapActionType,
  ZoneCoverageConfig,
  ShiftTemplateRef,
  AssignmentRef,
  DayCoverageInput,
} from "@/lib/coverage";

export const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
