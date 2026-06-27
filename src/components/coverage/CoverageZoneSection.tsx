"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CoverageIntervalBlock } from "@/components/coverage/CoverageIntervalBlock";
import {
  createCoverageInterval,
  deleteCoverageZone,
  updateCoverageZone,
  type CoverageZoneWithDetails,
} from "@/lib/coverage-client";

interface CoverageZoneSectionProps {
  zone: CoverageZoneWithDetails;
  onChanged: () => Promise<void>;
}

export function CoverageZoneSection({ zone, onChanged }: CoverageZoneSectionProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(zone.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameLoading, setNameLoading] = useState(false);

  const [showAddInterval, setShowAddInterval] = useState(false);
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("17:00");
  const [intervalError, setIntervalError] = useState<string | null>(null);
  const [intervalLoading, setIntervalLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!editingName) setName(zone.name);
  }, [zone.name, editingName]);

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Název zóny nesmí být prázdný");
      return;
    }
    setNameError(null);
    setNameLoading(true);
    try {
      await updateCoverageZone(zone.id, { name: trimmed });
      setEditingName(false);
      await onChanged();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setNameLoading(false);
    }
  }

  async function addInterval() {
    setIntervalError(null);
    setIntervalLoading(true);
    try {
      await createCoverageInterval({
        zoneId: zone.id,
        startTime,
        endTime,
      });
      setShowAddInterval(false);
      setStartTime("13:00");
      setEndTime("17:00");
      await onChanged();
    } catch (err) {
      setIntervalError(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setIntervalLoading(false);
    }
  }

  async function confirmDeleteZone() {
    setDeleteLoading(true);
    try {
      await deleteCoverageZone(zone.id);
      setDeleteOpen(false);
      await onChanged();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Smazání se nezdařilo");
      setDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        {editingName ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs text-slate-500">Název zóny</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-0.5 block rounded-lg border border-slate-200 px-3 py-1.5 text-lg font-semibold"
              />
            </label>
            <button
              type="button"
              onClick={saveName}
              disabled={nameLoading}
              className="text-sm text-indigo-600 hover:underline disabled:opacity-50"
            >
              {nameLoading ? "Ukládám…" : "Uložit"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditingName(false);
                setName(zone.name);
                setNameError(null);
              }}
              className="text-sm text-slate-500 hover:underline"
            >
              Zrušit
            </button>
          </div>
        ) : (
          <h3 className="text-xl font-bold text-slate-900">{zone.name}</h3>
        )}
        {!editingName && (
          <div className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-indigo-600 hover:underline"
            >
              Upravit
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="text-red-600 hover:underline"
            >
              Smazat zónu
            </button>
          </div>
        )}
      </div>

      {nameError && <p className="mb-3 text-sm text-red-600">{nameError}</p>}

      <div className="space-y-4">
        {zone.intervals.length === 0 ? (
          <p className="text-sm text-slate-400 italic">Zatím žádné intervaly pokrytí</p>
        ) : (
          zone.intervals.map((interval) => (
            <CoverageIntervalBlock
              key={interval.id}
              interval={{ ...interval, rules: interval.rules ?? [] }}
              onChanged={onChanged}
            />
          ))
        )}
      </div>

      {showAddInterval ? (
        <div className="mt-4 rounded-lg border border-dashed border-indigo-200 bg-indigo-50/30 p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Nový interval</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs text-slate-500">Od</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-0.5 block rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-500">Do</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-0.5 block rounded-md border border-slate-200 px-2 py-1.5 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={addInterval}
              disabled={intervalLoading}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {intervalLoading ? "Ukládám…" : "Vytvořit interval"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddInterval(false);
                setIntervalError(null);
              }}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600"
            >
              Zrušit
            </button>
          </div>
          {intervalError && (
            <p className="mt-2 text-xs text-red-600">{intervalError}</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddInterval(true)}
          className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          + Přidat interval
        </button>
      )}

      <ConfirmDialog
        open={deleteOpen}
        title="Smazat provozní zónu?"
        message={`Opravdu smazat zónu „${zone.name}" včetně všech intervalů a pravidel? Směny přiřazené k této zóně zůstanou, ale ztratí vazbu na zónu.`}
        confirmLabel="Smazat"
        cancelLabel="Zrušit"
        loading={deleteLoading}
        onConfirm={confirmDeleteZone}
        onCancel={() => !deleteLoading && setDeleteOpen(false)}
      />
    </section>
  );
}
