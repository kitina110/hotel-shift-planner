import { formatShiftTimeRange } from "@/lib/shift-time";

export interface ShiftTypeZoneRef {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  zoneId?: string | null;
  zone?: { id: string; name: string } | null;
}

export interface ShiftTypeZoneGroup {
  zoneId: string | null;
  zoneName: string;
  shiftTypes: Array<ShiftTypeZoneRef & { timeLabel: string }>;
}

const UNASSIGNED_ZONE_NAME = "Bez zóny";

function shiftTimeLabel(shift: ShiftTypeZoneRef): string {
  return formatShiftTimeRange(shift.startTime, shift.endTime);
}

function shiftDisplayName(shift: ShiftTypeZoneRef): string {
  const time = shiftTimeLabel(shift);
  if (shift.name.includes(time) || shift.name.includes("–") || shift.name.includes("-")) {
    return shift.name;
  }
  return `${shift.name} ${time}`;
}

/** Group shift types by operational zone for qualification UI (E6). */
export function groupShiftTypesByZone(shiftTypes: ShiftTypeZoneRef[]): ShiftTypeZoneGroup[] {
  const byZone = new Map<string | null, ShiftTypeZoneRef[]>();

  for (const shift of shiftTypes) {
    const key = shift.zoneId ?? null;
    const list = byZone.get(key) ?? [];
    list.push(shift);
    byZone.set(key, list);
  }

  const groups: ShiftTypeZoneGroup[] = [];

  for (const [zoneId, shifts] of byZone.entries()) {
    const zoneName =
      zoneId == null
        ? UNASSIGNED_ZONE_NAME
        : (shifts[0]?.zone?.name ?? shifts.find((s) => s.zoneId === zoneId)?.zone?.name ?? zoneId);

    groups.push({
      zoneId,
      zoneName,
      shiftTypes: shifts
        .map((shift) => ({
          ...shift,
          name: shiftDisplayName(shift),
          timeLabel: shiftTimeLabel(shift),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "cs")),
    });
  }

  return groups.sort((a, b) => {
    if (a.zoneId == null) return 1;
    if (b.zoneId == null) return -1;
    return a.zoneName.localeCompare(b.zoneName, "cs");
  });
}

export function allShiftTypeIdsInZoneGroup(group: ShiftTypeZoneGroup): string[] {
  return group.shiftTypes.map((shift) => shift.id);
}

export function isZoneGroupFullySelected(
  group: ShiftTypeZoneGroup,
  selectedShiftTypeIds: Set<string>,
): boolean {
  return group.shiftTypes.every((shift) => selectedShiftTypeIds.has(shift.id));
}

export function toggleZoneGroupSelection(
  group: ShiftTypeZoneGroup,
  selectedShiftTypeIds: Set<string>,
  selectAll: boolean,
): string[] {
  const next = new Set(selectedShiftTypeIds);

  for (const shift of group.shiftTypes) {
    if (selectAll) next.add(shift.id);
    else next.delete(shift.id);
  }

  return Array.from(next);
}
