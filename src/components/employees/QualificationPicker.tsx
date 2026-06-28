"use client";

import {
  groupShiftTypesByZone,
  isZoneGroupFullySelected,
  toggleZoneGroupSelection,
} from "@/lib/qualification/group-shift-types-by-zone";
import { Checkbox } from "@/components/ui";
import type { ShiftType } from "@/types";

interface QualificationPickerProps {
  shiftTypes: ShiftType[];
  selectedIds: string[];
  onChange: (shiftTypeIds: string[]) => void;
}

export function QualificationPicker({
  shiftTypes,
  selectedIds,
  onChange,
}: QualificationPickerProps) {
  const groups = groupShiftTypesByZone(shiftTypes);
  const selected = new Set(selectedIds);

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const zoneFullySelected = isZoneGroupFullySelected(group, selected);
        return (
          <div key={group.zoneId ?? "unassigned"}>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                {group.zoneName}
              </p>
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                <Checkbox
                  checked={zoneFullySelected}
                  onChange={(e) =>
                    onChange(
                      toggleZoneGroupSelection(group, selected, e.target.checked),
                    )
                  }
                />
                Vybrat všechny směny
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {group.shiftTypes.map((shift) => (
                <label
                  key={shift.id}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm cursor-pointer ${
                    selected.has(shift.id)
                      ? "border-indigo-300 bg-indigo-50 text-indigo-950"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selected.has(shift.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(shift.id)) next.delete(shift.id);
                      else next.add(shift.id);
                      onChange(Array.from(next));
                    }}
                  />
                  {shift.name}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      {groups.length === 0 && (
        <p className="text-sm text-slate-500">Nejsou definovány žádné směny.</p>
      )}
    </div>
  );
}

export function qualificationSummary(
  shiftTypes: ShiftType[],
  shiftTypeIds: string[],
): string {
  if (shiftTypeIds.length === 0) return "bez kvalifikace";
  const names = shiftTypeIds
    .map((id) => shiftTypes.find((st) => st.id === id)?.name)
    .filter(Boolean);
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}
