/**
 * Abstraction for employee qualification by operational zone.
 *
 * Today: inferred from shift-type qualifications in the zone.
 * Future: direct EmployeeZoneQualification records (flip USE_ZONE_QUALIFICATION).
 */

export interface ShiftTypeZoneRef {
  id: string;
  zoneId?: string | null;
}

export interface EmployeeWithQualifications {
  id: string;
  qualifications?: { shiftTypeId: string }[];
  qualifiedShiftTypeIds?: string[];
  zoneQualifications?: { zoneId: string }[];
}

const USE_ZONE_QUALIFICATION = false;

function employeeShiftTypeIds(employee: EmployeeWithQualifications): string[] {
  if (employee.qualifiedShiftTypeIds?.length) {
    return employee.qualifiedShiftTypeIds;
  }
  return employee.qualifications?.map((q) => q.shiftTypeId) ?? [];
}

export function getShiftTypeIdsForZone(
  zoneId: string,
  shiftTypes: ShiftTypeZoneRef[],
): string[] {
  return shiftTypes.filter((st) => st.zoneId === zoneId).map((st) => st.id);
}

export function isQualifiedForZone(
  employee: EmployeeWithQualifications,
  zoneId: string,
  shiftTypes: ShiftTypeZoneRef[],
): boolean {
  if (USE_ZONE_QUALIFICATION && employee.zoneQualifications?.length) {
    return employee.zoneQualifications.some((q) => q.zoneId === zoneId);
  }

  const zoneShiftTypeIds = new Set(getShiftTypeIdsForZone(zoneId, shiftTypes));
  if (zoneShiftTypeIds.size === 0) return false;

  return employeeShiftTypeIds(employee).some((id) => zoneShiftTypeIds.has(id));
}

export function getQualifiedShiftTypeIdsForZone(
  employee: EmployeeWithQualifications,
  zoneId: string,
  shiftTypes: ShiftTypeZoneRef[],
): string[] {
  if (!isQualifiedForZone(employee, zoneId, shiftTypes)) return [];

  const zoneShiftTypeIds = new Set(getShiftTypeIdsForZone(zoneId, shiftTypes));
  return employeeShiftTypeIds(employee).filter((id) => zoneShiftTypeIds.has(id));
}

export function filterEmployeesQualifiedForZone<T extends EmployeeWithQualifications>(
  employees: T[],
  zoneId: string,
  shiftTypes: ShiftTypeZoneRef[],
): T[] {
  return employees.filter((e) => isQualifiedForZone(e, zoneId, shiftTypes));
}
