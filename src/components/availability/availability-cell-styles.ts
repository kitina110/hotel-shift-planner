import type { AvailabilityStatus } from "@/types";

/** Visual styles only — labels come from formatAvailabilityStatus() in status.ts */
export const AVAILABILITY_CELL_CLASS_NAMES: Record<AvailabilityStatus, string> = {
  AVAILABLE:
    "bg-emerald-100 text-emerald-950 border-emerald-200 hover:bg-emerald-200",
  PREFERRED_OFF:
    "bg-amber-100 text-amber-950 border-amber-200 hover:bg-amber-200",
  UNAVAILABLE: "bg-red-100 text-red-950 border-red-200 hover:bg-red-200",
  VACATION: "bg-sky-100 text-sky-950 border-sky-200 hover:bg-sky-200",
  SICK: "bg-orange-100 text-orange-950 border-orange-200 hover:bg-orange-200",
};
