import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { CoverageGap, GapSeverity } from "@/lib/coverage";

export interface CoverageAlert {
  id: string;
  date: string;
  weekdayLabel: string;
  zoneName: string;
  startTime: string;
  endTime: string;
  requiredHeadcount: number;
  coveredHeadcount: number;
  deficit: number;
  severity: GapSeverity;
  coveringEmployeeIds: string[];
}

const SEVERITY_RANK: Record<GapSeverity, number> = {
  none: 0,
  low: 1,
  medium: 2,
  critical: 3,
};

export function gapsToCoverageAlerts(gaps: CoverageGap[]): CoverageAlert[] {
  return gaps
    .map((gap) => {
      const { target, coveredHeadcount, deficit, coveringStaff } = gap.snapshot;
      const dayDate = new Date(`${target.date}T12:00:00`);

      return {
        id: `${target.date}|${target.zoneId}|${target.intervalId}`,
        date: target.date,
        weekdayLabel: format(dayDate, "EEEE", { locale: cs }),
        zoneName: target.zoneName,
        startTime: target.startTime,
        endTime: target.endTime,
        requiredHeadcount: target.requiredHeadcount,
        coveredHeadcount,
        deficit,
        severity: gap.severity,
        coveringEmployeeIds: coveringStaff.map((staff) => staff.employeeId),
      };
    })
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      const byZone = a.zoneName.localeCompare(b.zoneName, "cs");
      if (byZone !== 0) return byZone;
      const byTime = a.startTime.localeCompare(b.startTime);
      if (byTime !== 0) return byTime;
      return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    });
}
