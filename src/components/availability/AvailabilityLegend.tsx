"use client";

import {
  availabilityStatusEmoji,
  formatAvailabilityStatus,
} from "@/lib/availability/status";
import { AVAILABILITY_STATUSES } from "@/lib/availability/weekly-availability";
import { AVAILABILITY_CELL_CLASS_NAMES } from "@/components/availability/availability-cell-styles";

export function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {AVAILABILITY_STATUSES.map((status) => (
        <span
          key={status}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${AVAILABILITY_CELL_CLASS_NAMES[status]}`}
        >
          <span aria-hidden>{availabilityStatusEmoji(status)}</span>
          {formatAvailabilityStatus(status)}
        </span>
      ))}
      <span className="text-xs text-slate-500 self-center ml-1">
        Kliknutím na buňku změníte stav
      </span>
    </div>
  );
}
