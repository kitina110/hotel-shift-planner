export interface ShiftTypeInput {
  id: string;
  name: string;
  durationMinutes: number;
  startTime: string;
  endTime: string;
  zoneId?: string | null;
}

export interface EmployeeInput {
  id: string;
  name: string;
  contractHoursPerWeek: number;
  maxConsecutiveDays: number;
  qualifiedShiftTypeIds: string[];
  availability: Record<number, { available: boolean; preferredOff: boolean }>;
}

export interface StaffingRuleInput {
  shiftTypeId: string;
  minGuests: number;
  maxGuests: number | null;
  staffCount: number;
}

export interface CoverageRequirementRuleInput {
  minGuests: number;
  maxGuests: number | null;
  staffCount: number;
}

export interface CoverageIntervalInput {
  id: string;
  startTime: string;
  endTime: string;
  label?: string | null;
  rules: CoverageRequirementRuleInput[];
}

export interface CoverageZoneInput {
  id: string;
  name: string;
  intervals: CoverageIntervalInput[];
}

export interface HistoricalAssignment {
  employeeId: string;
  date: Date;
  shiftTypeId: string;
  startTime: string;
  durationMinutes: number;
}

export interface GuestForecastInput {
  date: Date;
  guestCount: number;
}

export interface ScheduleSlot {
  date: Date;
  shiftTypeId: string;
}

export interface ScheduleAssignmentResult {
  employeeId: string;
  shiftTypeId: string;
  date: Date;
}

export interface SchedulerInput {
  weekStart: Date;
  shiftTypes: ShiftTypeInput[];
  employees: EmployeeInput[];
  staffingRules: StaffingRuleInput[];
  guestForecasts: GuestForecastInput[];
  historicalAssignments: HistoricalAssignment[];
  coverageZones?: CoverageZoneInput[];
  existingAssignments?: ScheduleAssignmentResult[];
}

export interface SchedulerResult {
  assignments: ScheduleAssignmentResult[];
  warnings: string[];
  unfilledSlots: ScheduleSlot[];
  /** Which zone IDs used coverage-based planning (for diagnostics). */
  coverageZoneIds: string[];
  /** Which shift type IDs used legacy StaffingRule planning. */
  legacyShiftTypeIds: string[];
}
