"use client";

import { addDays, format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScheduleDndProvider } from "@/components/ScheduleDndProvider";
import { WeekNavigator } from "@/components/WeekNavigator";
import { Button } from "@/components/ui";
import { CoverageAlertsPanel } from "@/components/schedule/CoverageAlertsPanel";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { useEmployeeRowOrder } from "@/hooks/useEmployeeRowOrder";
import { useScheduleCoverage } from "@/hooks/useScheduleCoverage";
import { gapsToCoverageAlerts } from "@/lib/coverage/coverage-alerts";
import { normalizeWeekStart } from "@/lib/date/week-navigation";
import { isPlannableEmployee } from "@/lib/employee/display";
import type { CoverageAlert } from "@/lib/coverage/coverage-alerts";
import type { CoverageZoneWithDetails } from "@/lib/coverage-client";
import type { Employee, Schedule, ScheduleAssignment, ShiftType } from "@/types";

function mapAssignmentFromApi(raw: ScheduleAssignment): ScheduleAssignment {
  return {
    ...raw,
    date: typeof raw.date === "string" ? raw.date : new Date(raw.date).toISOString(),
  };
}

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() =>
    normalizeWeekStart(new Date()),
  );
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [zones, setZones] = useState<CoverageZoneWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});
  const [activeAlert, setActiveAlert] = useState<CoverageAlert | null>(null);

  const plannableEmployees = useMemo(
    () => employees.filter(isPlannableEmployee),
    [employees],
  );

  const applySortOrderFromIds = useCallback((orderedIds: string[]) => {
    setEmployees((prev) => {
      const sortMap = new Map(orderedIds.map((id, index) => [id, index]));
      return [...prev]
        .sort((a, b) => (sortMap.get(a.id) ?? 0) - (sortMap.get(b.id) ?? 0))
        .map((employee) => ({
          ...employee,
          sortOrder: sortMap.get(employee.id) ?? employee.sortOrder,
        }));
    });
  }, []);

  const {
    orderedEmployees: orderedPlannableEmployees,
    visibleIds: orderIds,
    isEditOrderMode,
    savingOrder,
    orderError,
    startEditOrder,
    finishEditOrder,
    reorderEmployees,
  } = useEmployeeRowOrder({
    allEmployees: employees,
    displayEmployees: plannableEmployees,
    onOrderSaved: applySortOrderFromIds,
  });

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekDayKeys = useMemo(
    () => weekDays.map((day) => format(day, "yyyy-MM-dd")),
    [weekDays],
  );

  const coverage = useScheduleCoverage({
    weekDayKeys,
    guestCounts,
    schedule,
    shiftTypes,
    zones,
  });

  const alerts = useMemo(
    () => gapsToCoverageAlerts(coverage.gaps),
    [coverage.gaps],
  );

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, typesRes, empRes, zonesRes] = await Promise.all([
        fetch(`/api/schedules?week=${weekStart.toISOString()}`),
        fetch("/api/shift-types"),
        fetch("/api/employees"),
        fetch("/api/coverage-zones"),
      ]);
      const sched = await schedRes.json();
      const types = await typesRes.json();
      const emps = await empRes.json();
      if (zonesRes.ok) {
        setZones(await zonesRes.json());
      }
      setSchedule({
        ...sched,
        assignments: (sched.assignments ?? []).map(mapAssignmentFromApi),
      });
      setShiftTypes(types);
      setEmployees(emps);
      const counts: Record<string, number> = {};
      for (const f of sched.guestForecasts ?? []) {
        counts[f.date.slice(0, 10)] = f.guestCount;
      }
      for (const day of weekDays) {
        const key = format(day, "yyyy-MM-dd");
        if (counts[key] == null) counts[key] = 80;
      }
      setGuestCounts(counts);
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekDays]);

  useEffect(() => {
    const weekParam = new URLSearchParams(window.location.search).get("week");
    if (!weekParam) return;
    setWeekStart(normalizeWeekStart(new Date(weekParam)));
  }, []);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    if (activeAlert && !alerts.some((alert) => alert.id === activeAlert.id)) {
      setActiveAlert(null);
    }
  }, [alerts, activeAlert]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStart.toISOString(),
          guestForecasts: weekDays.map((d) => ({
            date: d.toISOString(),
            guestCount: guestCounts[format(d, "yyyy-MM-dd")] ?? 80,
          })),
        }),
      });
      const data = await res.json();
      setSchedule({
        ...data.schedule,
        assignments: (data.schedule.assignments ?? []).map(mapAssignmentFromApi),
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleMove(
    assignmentId: string,
    targetDate: string,
    targetEmployeeId: string,
  ) {
    const assignment = schedule?.assignments.find((a) => a.id === assignmentId);
    if (!assignment || assignment.employeeId !== targetEmployeeId) return;

    const res = await fetch("/api/assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId,
        date: new Date(targetDate).toISOString(),
      }),
    });

    if (res.ok) {
      const updated = mapAssignmentFromApi(await res.json());
      setSchedule((prev) =>
        prev
          ? {
              ...prev,
              assignments: prev.assignments.map((a) =>
                a.id === assignmentId ? updated : a,
              ),
            }
          : prev,
      );
    }
  }

  async function handlePublish() {
    if (!schedule) return;
    await fetch(`/api/schedules/${schedule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "publish" }),
    });
    await loadSchedule();
  }

  function handleGuestCountChange(dayKey: string, value: number) {
    setGuestCounts((prev) => ({ ...prev, [dayKey]: value }));
  }

  function handleSelectAlert(alert: CoverageAlert | null) {
    setActiveAlert(alert);
  }

  const employeeOrderIds = orderIds;

  const shiftDnDEnabled = !isEditOrderMode;

  return (
    <div className="min-w-[1440px] p-6 lg:p-8">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Týdenní rozpis</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? "Generuji…" : "Vygenerovat rozpis"}
          </Button>

          {schedule?.status === "draft" && (
            <button
              type="button"
              onClick={handlePublish}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              Publikovat
            </button>
          )}

          {schedule?.status === "published" && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
              Publikováno
            </span>
          )}

          {orderError && (
            <span className="text-sm text-red-600">{orderError}</span>
          )}

          {isEditOrderMode ? (
            <button
              type="button"
              onClick={finishEditOrder}
              disabled={savingOrder}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors disabled:opacity-60"
            >
              {savingOrder ? "Ukládám…" : "✓ Hotovo — pořadí"}
            </button>
          ) : (
            <button
              type="button"
              onClick={startEditOrder}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
              title="Upravit pořadí zaměstnanců"
            >
              ✏️ Pořadí
            </button>
          )}

          <span className="hidden sm:inline w-px h-6 bg-slate-200 mx-1" aria-hidden />

          <WeekNavigator weekStart={weekStart} onWeekChange={setWeekStart} />
        </div>
      </header>

      {loading ? (
        <p className="text-slate-500 py-12 text-center">Načítám rozpis…</p>
      ) : (
        <>
          <CoverageAlertsPanel
            alerts={alerts}
            hasConfiguredIntervals={coverage.hasConfiguredIntervals}
            activeAlertId={activeAlert?.id ?? null}
            onSelectAlert={handleSelectAlert}
          />

          <ScheduleDndProvider
            shiftDnDEnabled={shiftDnDEnabled}
            rowDnDEnabled={isEditOrderMode}
            onMove={handleMove}
            onReorderRows={reorderEmployees}
          >
            <ScheduleTable
              weekDays={weekDays}
              schedule={schedule}
              employees={orderedPlannableEmployees}
              shiftTypes={shiftTypes}
              guestCounts={guestCounts}
              onGuestCountChange={handleGuestCountChange}
              isEditOrderMode={isEditOrderMode}
              shiftDnDEnabled={shiftDnDEnabled}
              employeeOrderIds={employeeOrderIds}
              highlightedDate={activeAlert?.date ?? null}
              highlightedEmployeeIds={activeAlert?.coveringEmployeeIds ?? []}
            />
            <p className="mt-3 text-xs text-slate-400">
              {isEditOrderMode
                ? "Přetáhněte řádek za úchyt ⋮⋮ pro změnu pořadí. Přesun směn je dočasně vypnut."
                : "Přetáhněte směnu pro manuální úpravu data. Sloupce Zaměstnanec a Soll Std. zůstávají při scrollování připnuté."}
            </p>
          </ScheduleDndProvider>
        </>
      )}
    </div>
  );
}
