"use client";

import { useEffect, useState } from "react";
import {
  EmployeeCard,
  employeeToEditDraft,
  type EmployeeEditDraft,
} from "@/components/employees/EmployeeCard";
import { QualificationPicker } from "@/components/employees/QualificationPicker";
import type { Employee, ShiftType } from "@/types";

const emptyCreateForm = {
  name: "",
  contractHoursPerWeek: 40,
  shiftTypeIds: [] as string[],
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EmployeeEditDraft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [empRes, typesRes] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/shift-types"),
    ]);
    setEmployees(await empRes.json());
    setShiftTypes(await typesRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function replaceEmployee(updated: Employee) {
    setEmployees((prev) =>
      prev.map((employee) => (employee.id === updated.id ? updated : employee)),
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Nepodařilo se vytvořit zaměstnance");
      }
      const created: Employee = await res.json();
      setEmployees((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setCreateForm(emptyCreateForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při vytváření");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(employee: Employee) {
    setEditingId(employee.id);
    setEditDraft(employeeToEditDraft(employee));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
    setError(null);
  }

  async function handleSave(employeeId: string) {
    if (!editDraft) return;
    setSavingId(employeeId);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          contractHoursPerWeek: editDraft.contractHoursPerWeek,
          isActive: editDraft.isActive,
          isTemporaryHelp: editDraft.isTemporaryHelp,
          useDefaultAvailabilityTemplate: editDraft.useDefaultAvailabilityTemplate,
          shiftTypeIds: editDraft.shiftTypeIds,
          availability: editDraft.availability,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Nepodařilo se uložit změny");
      }
      const updated: Employee = await res.json();
      replaceEmployee(updated);
      setEditingId(null);
      setEditDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při ukládání");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Smazat zaměstnance?")) return;
    setError(null);
    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Nepodařilo se smazat zaměstnance");
      return;
    }
    setEmployees((prev) => prev.filter((employee) => employee.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) cancelEdit();
  }

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Zaměstnanci</h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-5 mb-8 space-y-4"
      >
        <h3 className="text-sm font-semibold text-slate-800">Přidat zaměstnance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Jméno</span>
            <input
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Úvazek (h/týden)</span>
            <input
              type="number"
              min={1}
              value={createForm.contractHoursPerWeek}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  contractHoursPerWeek: Number(e.target.value),
                })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">Kvalifikace</span>
          <div className="mt-2">
            <QualificationPicker
              shiftTypes={shiftTypes}
              selectedIds={createForm.shiftTypeIds}
              onChange={(shiftTypeIds) =>
                setCreateForm((form) => ({ ...form, shiftTypeIds }))
              }
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={creating}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {creating ? "Ukládám…" : "Přidat zaměstnance"}
        </button>
      </form>

      <p className="text-sm text-slate-500 mb-4">{employees.length} zaměstnanců</p>

      <div className="space-y-2">
        {employees.map((emp) => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            shiftTypes={shiftTypes}
            expanded={expandedId === emp.id}
            editing={editingId === emp.id}
            saving={savingId === emp.id}
            draft={editingId === emp.id ? editDraft : null}
            onToggleExpand={() => {
              if (expandedId === emp.id) {
                setExpandedId(null);
                if (editingId === emp.id) cancelEdit();
              } else {
                setExpandedId(emp.id);
                if (editingId && editingId !== emp.id) cancelEdit();
              }
            }}
            onStartEdit={() => startEdit(emp)}
            onCancelEdit={cancelEdit}
            onDraftChange={setEditDraft}
            onSave={() => handleSave(emp.id)}
            onDelete={() => handleDelete(emp.id)}
          />
        ))}
      </div>
    </div>
  );
}
