import type { GapSeverity } from "@/lib/coverage";

const SEVERITY_LABELS: Record<Exclude<GapSeverity, "none">, string> = {
  low: "Nízká",
  medium: "Střední",
  critical: "Kritická",
};

export function formatGapSeverity(severity: GapSeverity): string | null {
  if (severity === "none") return null;
  return SEVERITY_LABELS[severity];
}

export function gapSeverityClass(severity: GapSeverity): string {
  switch (severity) {
    case "low":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "medium":
      return "bg-orange-50 border-orange-200 text-orange-800";
    case "critical":
      return "bg-red-50 border-red-200 text-red-800";
    default:
      return "bg-emerald-50 border-emerald-200 text-emerald-800";
  }
}
