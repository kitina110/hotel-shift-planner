"use client";

import { useCallback, useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  endTimeFromStartAndDuration,
  formatDurationHours,
  formatShiftTimeRange,
} from "@/lib/shift-time";
import type { ShiftType } from "@/types";

const EMPTY_FORM = {
  name: "",
  startTime: "17:00",
  endTime: "01:00",
};

function displayEndTime(shift: ShiftType): string {
  return shift.endTime || endTimeFromStartAndDuration(shift.startTime, shift.durationMinutes);
}

export default function ShiftsPage() {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/shift-types");
    if (!res.ok) {
      setFormError("Nepodařilo se načíst seznam směn");
      return;
    }
    const data: ShiftType[] = await res.json();
    setShiftTypes(
      data.map((shift) => ({
        ...shift,
        endTime: shift.endTime || displayEndTime(shift),
      })),
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const payload = {
      name: form.name.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
    };

    try {
      const res = await fetch(
        editingId ? `/api/shift-types/${editingId}` : "/api/shift-types",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error ?? "Uložení se nezdařilo");
      }

      setEditingId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setSubmitting(false);
    }
  }

  function openDeleteDialog(shiftType: ShiftType) {
    setDeleteError(null);
    setSelectedShiftType(shiftType);
  }

  function closeDeleteDialog() {
    if (deleteLoading) return;
    setSelectedShiftType(null);
    setDeleteError(null);
  }

  async function deleteShiftType() {
    if (!selectedShiftType) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/shift-types/${selectedShiftType.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Smazání se nezdařilo");
      }

      if (editingId === selectedShiftType.id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }

      setSelectedShiftType(null);
      await load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Smazání se nezdařilo");
    } finally {
      setDeleteLoading(false);
    }
  }

  function startEdit(st: ShiftType) {
    setFormError(null);
    setEditingId(st.id);
    setForm({
      name: st.name,
      startTime: st.startTime,
      endTime: displayEndTime(st),
    });
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Směny</h2>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 mb-8 grid grid-cols-2 gap-4"
      >
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-sm font-medium text-slate-600">Název směny</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            placeholder="Bar, Servis…"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-600">Začátek směny</span>
          <input
            required
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-600">Konec směny</span>
          <input
            required
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        {formError && (
          <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}
        <div className="col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Ukládám…" : editingId ? "Uložit" : "Přidat směnu"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(EMPTY_FORM);
                setFormError(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            >
              Zrušit
            </button>
          )}
        </div>
      </form>

      {deleteError && !selectedShiftType && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      <div className="space-y-3">
        {shiftTypes.map((st) => {
          const endTime = displayEndTime(st);
          return (
            <div
              key={st.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <h3 className="font-semibold text-slate-900">{st.name}</h3>
                <p className="text-sm text-slate-600 mt-0.5 tabular-nums">
                  {formatShiftTimeRange(st.startTime, endTime)}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">
                  {formatDurationHours(st.durationMinutes)}
                  {" · "}
                  pauza {st.breakMinutes} min (DE)
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(st)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Upravit
                </button>
                <button
                  type="button"
                  onClick={() => openDeleteDialog(st)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Smazat
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={selectedShiftType !== null}
        title="Smazat směnu?"
        message={
          selectedShiftType
            ? `Opravdu chcete smazat směnu „${selectedShiftType.name}"? Tuto akci nelze vrátit.`
            : ""
        }
        confirmLabel="OK"
        cancelLabel="Zrušit"
        loading={deleteLoading}
        onConfirm={deleteShiftType}
        onCancel={closeDeleteDialog}
      />

      {deleteError && selectedShiftType && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
          {deleteError}
        </div>
      )}
    </div>
  );
}
