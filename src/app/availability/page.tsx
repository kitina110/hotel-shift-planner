"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AvailabilityGrid } from "@/components/availability/AvailabilityGrid";
import { AvailabilityLegend } from "@/components/availability/AvailabilityLegend";
import { WeekNavigator } from "@/components/WeekNavigator";
import { normalizeWeekStart } from "@/lib/date/week-navigation";
import { nextAvailabilityStatus } from "@/lib/availability/weekly-availability";
import type { WeeklyAvailabilityGrid } from "@/lib/availability/weekly-availability";
import type { AvailabilityStatus } from "@/types";

export default function AvailabilityPage() {
  const [weekStart, setWeekStart] = useState(() =>
    normalizeWeekStart(new Date()),
  );
  const [grid, setGrid] = useState<WeeklyAvailabilityGrid | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const loadGrid = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/availability?week=${weekStart.toISOString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Nepodařilo se načíst dostupnost");
      }
      setGrid(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při načítání");
      setGrid(null);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadGrid();
  }, [loadGrid]);

  async function handleCycleCell(employeeId: string, dateKey: string) {
    if (!grid) return;

    const currentStatus: AvailabilityStatus =
      grid.cells[employeeId]?.[dateKey]?.status ?? "AVAILABLE";
    const optimisticStatus = nextAvailabilityStatus(currentStatus);
    const cellKey = `${employeeId}:${dateKey}`;

    setSavingKey(cellKey);
    setGrid((prev) => {
      if (!prev) return prev;
      const nextCells = {
        ...prev.cells,
        [employeeId]: {
          ...prev.cells[employeeId],
          [dateKey]: {
            ...(prev.cells[employeeId]?.[dateKey] ?? {
              id: "",
              employeeId,
              date: dateKey,
            }),
            status: optimisticStatus,
          },
        },
      };
      return { ...prev, cells: nextCells };
    });

    try {
      const res = await fetch("/api/availability", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: grid.scheduleId,
          employeeId,
          date: dateKey,
          cycle: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Uložení se nezdařilo");
      }

      setGrid((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cells: {
            ...prev.cells,
            [employeeId]: {
              ...prev.cells[employeeId],
              [dateKey]: data,
            },
          },
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při ukládání");
      await loadGrid();
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="p-8 max-w-[1200px]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Dostupnost</h2>
          <p className="mt-1 text-xs text-slate-500">
            Nový týden se předvyplní podle výchozí šablony každého zaměstnance.
            Upravte jen konkrétní výjimky pro daný týden.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <WeekNavigator weekStart={weekStart} onWeekChange={setWeekStart} />
          <Link
            href={`/?week=${weekStart.toISOString()}`}
            className="text-sm text-indigo-700 hover:text-indigo-800 hover:underline"
          >
            Otevřít rozpis →
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="mb-4">
        <AvailabilityLegend />
      </div>

      {loading ? (
        <p className="text-slate-500 py-12 text-center">Načítám dostupnost…</p>
      ) : grid ? (
        <AvailabilityGrid
          grid={grid}
          savingKey={savingKey}
          onCycleCell={handleCycleCell}
        />
      ) : null}
    </div>
  );
}
