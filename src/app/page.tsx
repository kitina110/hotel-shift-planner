"use client";

import { addDays, addWeeks, format, startOfWeek, subWeeks } from "date-fns";
import { cs } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScheduleDndProvider } from "@/components/ScheduleDndProvider";
import { ScheduleTable } from "@/components/schedule/ScheduleTable";
import { ScheduleToolbar } from "@/components/schedule/ScheduleToolbar";
import type { Employee, Schedule, ShiftType } from "@/types";

export default function SchedulePage() {
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [guestCounts, setGuestCounts] = useState<Record<string, number>>({});

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const [schedRes, typesRes, empRes] = await Promise.all([
        fetch(`/api/schedules?week=${weekStart.toISOString()}`),
        fetch("/api/shift-types"),
        fetch("/api/employees"),
      ]);
      const sched = await schedRes.json();
      const types = await typesRes.json();
      const emps = await empRes.json();
      setSchedule(sched);
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
    loadSchedule();
  }, [loadSchedule]);

  async function handleGenerate() {
    setGenerating(true);
    setWarnings([]);
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
      setSchedule(data.schedule);
      setWarnings(data.warnings ?? []);
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
      await loadSchedule();
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

  return (
    <div className="min-w-[1440px] p-6 lg:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Týdenní rozpis</h2>
          <p className="mt-1 text-sm text-slate-500">
            {format(weekStart, "d. MMMM yyyy", { locale: cs })} –{" "}
            {format(addDays(weekStart, 6), "d. MMMM yyyy", { locale: cs })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            ← Předchozí
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Tento týden
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            Další →
          </button>
        </div>
      </header>

      <ScheduleToolbar
        generating={generating}
        scheduleStatus={schedule?.status}
        warnings={warnings}
        onGenerate={handleGenerate}
        onPublish={handlePublish}
      />

      {loading ? (
        <p className="text-slate-500 py-12 text-center">Načítám rozpis…</p>
      ) : (
        <ScheduleDndProvider onMove={handleMove}>
          <ScheduleTable
            weekDays={weekDays}
            schedule={schedule}
            employees={employees}
            shiftTypes={shiftTypes}
            guestCounts={guestCounts}
            onGuestCountChange={handleGuestCountChange}
          />
          <p className="mt-3 text-xs text-slate-400">
            Přetáhněte směnu pro manuální úpravu data. Sloupce Zaměstnanec a Soll Std. zůstávají
            při scrollování připnuté.
          </p>
        </ScheduleDndProvider>
      )}
    </div>
  );
}
