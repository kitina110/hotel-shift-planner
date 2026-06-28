"use client";

import { useEffect, useMemo, useState } from "react";
import {
  EmployeeCard,
  employeeToEditDraft,
  type EmployeeEditDraft,
} from "@/components/employees/EmployeeCard";
import { QualificationPicker } from "@/components/employees/QualificationPicker";
import { ToastBanner } from "@/components/ToastBanner";
import { Button, Input } from "@/components/ui";
import { employeeListSortCompare } from "@/lib/employee/display";
import type { Employee, ShiftType } from "@/types";

const emptyCreateForm = {
  name: "",
  contractHoursPerWeek: 40,
  shiftTypeIds: [] as string[],
};

type ToastState = {
  message: string;
  variant: "info" | "success" | "error";
};

function sortEmployees(list: Employee[]): Employee[] {
  return [...list].sort(employeeListSortCompare);
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EmployeeEditDraft | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [focusNameOnEditId, setFocusNameOnEditId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const { activeEmployees, inactiveEmployees } = useMemo(() => {
    const sorted = sortEmployees(employees);
    return {
      activeEmployees: sorted.filter((employee) => employee.isActive),
      inactiveEmployees: sorted.filter((employee) => !employee.isActive),
    };
  }, [employees]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function load() {
    const [empRes, typesRes] = await Promise.all([
      fetch("/api/employees"),
      fetch("/api/shift-types"),
    ]);
    setEmployees(sortEmployees(await empRes.json()));
    setShiftTypes(await typesRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function replaceEmployee(updated: Employee) {
    setEmployees((prev) =>
      sortEmployees(
        prev.map((employee) => (employee.id === updated.id ? updated : employee)),
      ),
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
      setEmployees((prev) => sortEmployees([...prev, created]));
      setCreateForm(emptyCreateForm);
      setToast({
        message: `Zaměstnanec ${created.name} byl přidán.`,
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při vytváření");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(employee: Employee, options?: { focusName?: boolean }) {
    setEditingId(employee.id);
    setEditDraft(employeeToEditDraft(employee));
    if (options?.focusName) {
      setFocusNameOnEditId(employee.id);
    }
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
    try {
      const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Nepodařilo se smazat zaměstnance");
      }

      if (data.deactivated && data.employee) {
        replaceEmployee(data.employee);
        setToast({
          message:
            data.message ??
            "Zaměstnanec nemohl být smazán, protože je součástí historických rozpisů. Byl proto označen jako neaktivní.",
          variant: "info",
        });
        if (editingId === id) cancelEdit();
        return;
      }

      setEmployees((prev) => prev.filter((employee) => employee.id !== id));
      if (expandedId === id) setExpandedId(null);
      if (editingId === id) cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při mazání");
    }
  }

  async function setEmployeeActive(id: string, isActive: boolean) {
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error ?? "Nepodařilo se změnit stav zaměstnance");
    }
    return data as Employee;
  }

  async function handleReactivate(id: string) {
    setReactivatingId(id);
    setError(null);
    try {
      const updated = await setEmployeeActive(id, true);
      replaceEmployee(updated);
      setToast({
        message: `${updated.name} byl znovu aktivován.`,
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při obnovení");
    } finally {
      setReactivatingId(null);
    }
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deaktivovat zaměstnance? Nebude se zobrazovat v rozpisu.")) return;
    setDeactivatingId(id);
    setError(null);
    try {
      const updated = await setEmployeeActive(id, false);
      replaceEmployee(updated);
      if (editingId === id) cancelEdit();
      setToast({
        message: `${updated.name} byl deaktivován.`,
        variant: "info",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při deaktivaci");
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleDuplicate(id: string) {
    setDuplicatingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/employees/${id}/duplicate`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? "Nepodařilo se duplikovat zaměstnance");
      }
      const created: Employee = data;
      setEmployees((prev) => sortEmployees([...prev, created]));
      setExpandedId(created.id);
      startEdit(created, { focusName: true });
      setToast({
        message: "Byla vytvořena kopie — upravte jméno a uložte.",
        variant: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při duplikaci");
    } finally {
      setDuplicatingId(null);
    }
  }

  function renderEmployeeCard(emp: Employee) {
    return (
      <EmployeeCard
        key={emp.id}
        employee={emp}
        shiftTypes={shiftTypes}
        expanded={expandedId === emp.id}
        editing={editingId === emp.id}
        saving={savingId === emp.id}
        duplicating={duplicatingId === emp.id}
        reactivating={reactivatingId === emp.id}
        deactivating={deactivatingId === emp.id}
        focusNameOnEdit={focusNameOnEditId === emp.id}
        onNameFocusHandled={() => {
          if (focusNameOnEditId === emp.id) setFocusNameOnEditId(null);
        }}
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
        onDuplicate={() => handleDuplicate(emp.id)}
        onReactivate={() => handleReactivate(emp.id)}
        onDeactivate={() => handleDeactivate(emp.id)}
      />
    );
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
            <Input
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="mt-1"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Úvazek (h/týden)</span>
            <Input
              type="number"
              min={1}
              value={createForm.contractHoursPerWeek}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  contractHoursPerWeek: Number(e.target.value),
                })
              }
              className="mt-1"
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
        <Button type="submit" disabled={creating}>
          {creating ? "Ukládám…" : "Přidat zaměstnance"}
        </Button>
      </form>

      <p className="text-sm text-slate-500 mb-4">
        {activeEmployees.length} aktivní
        {inactiveEmployees.length > 0
          ? ` · ${inactiveEmployees.length} neaktivní`
          : ""}
      </p>

      <div className="space-y-2">
        {activeEmployees.map(renderEmployeeCard)}
      </div>

      {inactiveEmployees.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Neaktivní
          </h3>
          <div className="space-y-2">{inactiveEmployees.map(renderEmployeeCard)}</div>
        </div>
      )}

      {toast && (
        <ToastBanner
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
