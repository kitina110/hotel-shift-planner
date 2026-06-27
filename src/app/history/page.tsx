"use client";

import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useEffect, useState } from "react";
import { type WorkloadEntry } from "@/types";

interface ScheduleSummary {
  id: string;
  weekStart: string;
  status: string;
  _count: { assignments: number };
}

export default function HistoryPage() {
  const [schedules, setSchedules] = useState<ScheduleSummary[]>([]);
  const [workload, setWorkload] = useState<WorkloadEntry[]>([]);

  useEffect(() => {
    Promise.all([fetch("/api/schedules"), fetch("/api/history")]).then(
      async ([schedRes, workRes]) => {
        setSchedules(await schedRes.json());
        setWorkload(await workRes.json());
      },
    );
  }, []);

  const maxShifts = Math.max(...workload.map((w) => w.totalShifts), 1);

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Historie plánů</h2>

      <section className="mb-10">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Uložené týdny</h3>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Týden od</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Stav</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Přiřazení</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-slate-400">
                    Zatím žádné rozpisy
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      {format(new Date(s.weekStart), "d. MMMM yyyy", { locale: cs })}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.status === "published"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {s.status === "published" ? "Publikováno" : "Koncept"}
                      </span>
                    </td>
                    <td className="px-4 py-2">{s._count.assignments}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-800 mb-1">
          Zatížení zaměstnanců (8 týdnů)
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Přehled pro férové plánování a kontrolu kumulace směn.
        </p>
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Zaměstnanec</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Směny</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Hodiny</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Týdny</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Rozložení</th>
              </tr>
            </thead>
            <tbody>
              {workload
                .sort((a, b) => b.totalShifts - a.totalShifts)
                .map((w) => (
                  <tr key={w.employeeId} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium">{w.name}</td>
                    <td className="px-4 py-2">{w.totalShifts}</td>
                    <td className="px-4 py-2">{w.totalHours}h</td>
                    <td className="px-4 py-2">{w.weeksWorked}</td>
                    <td className="px-4 py-2 w-48">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{
                            width: `${(w.totalShifts / maxShifts) * 100}%`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
