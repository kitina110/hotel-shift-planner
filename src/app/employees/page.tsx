"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  EmployeeCard,
  employeeToEditDraft,
  type EmployeeEditDraft,
} from "@/components/employees/EmployeeCard";
import { EmployeeListOrderProvider } from "@/components/employees/EmployeeListOrderProvider";
import { QualificationPicker } from "@/components/employees/QualificationPicker";
import { SortableEmployeeCard } from "@/components/employees/SortableEmployeeCard";
import { ToastBanner } from "@/components/ToastBanner";
import { Button, Input } from "@/components/ui";
import { useEmployeeRowOrder, sortEmployeesBySortOrder } from "@/hooks/useEmployeeRowOrder";
import { formatEmployeeName } from "@/lib/employee/display";
import type { Employee, ShiftType } from "@/types";

const emptyCreateForm = {
  name: "",
  contractHoursPerWeek: 40,
  shiftTypeIds: [] as string[],
};

type ActiveFilter = "active" | "all";

type ToastState = {
  message: string;
  variant: "info" | "success" | "error";
};

function matchesSearch(employee: Employee, query: string): boolean {
  if (!query) return true;
  return formatEmployeeName(employee).toLowerCase().includes(query.toLowerCase());
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
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");

  const trimmedSearch = searchQuery.trim();
  const orderModeAllowed = trimmedSearch.length === 0;

  const filteredEmployees = useMemo(() => {
    const base =
      activeFilter === "active"
        ? employees.filter((employee) => employee.isActive)
        : employees;
    return sortEmployeesBySortOrder(
      base.filter((employee) => matchesSearch(employee, trimmedSearch)),
    );
  }, [employees, activeFilter, trimmedSearch]);

  const { activeEmployees, inactiveEmployees } = useMemo(() => {
    if (activeFilter === "active") {
      return { activeEmployees: filteredEmployees, inactiveEmployees: [] as Employee[] };
    }
    return {
      activeEmployees: filteredEmployees.filter((employee) => employee.isActive),
      inactiveEmployees: filteredEmployees.filter((employee) => !employee.isActive),
    };
  }, [activeFilter, filteredEmployees]);

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
    orderedEmployees: orderedFilteredEmployees,
    visibleIds: orderVisibleIds,
    isEditOrderMode,
    savingOrder,
    orderError,
    startEditOrder,
    finishEditOrder,
    reorderEmployees,
  } = useEmployeeRowOrder({
    allEmployees: employees,
    displayEmployees: filteredEmployees,
    onOrderSaved: applySortOrderFromIds,
  });

  const displayActiveEmployees = useMemo(() => {
    if (isEditOrderMode) {
      return orderedFilteredEmployees.filter((employee) => employee.isActive);
    }
    return activeEmployees;
  }, [activeEmployees, isEditOrderMode, orderedFilteredEmployees]);

  const displayInactiveEmployees = useMemo(() => {
    if (isEditOrderMode) {
      return orderedFilteredEmployees.filter((employee) => !employee.isActive);
    }
    return inactiveEmployees;
  }, [inactiveEmployees, isEditOrderMode, orderedFilteredEmployees]);

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
    setEmployees(sortEmployeesBySortOrder(await empRes.json()));
    setShiftTypes(await typesRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  function replaceEmployee(updated: Employee) {
    setEmployees((prev) =>
      sortEmployeesBySortOrder(
        prev.map((employee) => (employee.id === updated.id ? updated : employee)),
      ),
    );
  }

  function handleStartOrderMode() {
    if (!orderModeAllowed) return;
    setExpandedId(null);
    cancelEdit();
    startEditOrder();
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
      setEmployees((prev) => sortEmployeesBySortOrder([...prev, created]));
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
          defaultTemplate: editDraft.defaultTemplate,
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
      setEmployees((prev) => sortEmployeesBySortOrder([...prev, created]));
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
    const cardProps = {
      employee: emp,
      shiftTypes,
      expanded: isEditOrderMode ? false : expandedId === emp.id,
      editing: isEditOrderMode ? false : editingId === emp.id,
      saving: savingId === emp.id,
      duplicating: duplicatingId === emp.id,
      reactivating: reactivatingId === emp.id,
      deactivating: deactivatingId === emp.id,
      focusNameOnEdit: focusNameOnEditId === emp.id,
      isEditOrderMode,
      onNameFocusHandled: () => {
        if (focusNameOnEditId === emp.id) setFocusNameOnEditId(null);
      },
      draft: editingId === emp.id ? editDraft : null,
      onToggleExpand: () => {
        if (isEditOrderMode) return;
        if (expandedId === emp.id) {
          setExpandedId(null);
          if (editingId === emp.id) cancelEdit();
        } else {
          setExpandedId(emp.id);
          if (editingId && editingId !== emp.id) cancelEdit();
        }
      },
      onStartEdit: () => {
        if (!isEditOrderMode) startEdit(emp);
      },
      onCancelEdit: cancelEdit,
      onDraftChange: setEditDraft,
      onSave: () => handleSave(emp.id),
      onDelete: () => handleDelete(emp.id),
      onDuplicate: () => handleDuplicate(emp.id),
      onReactivate: () => handleReactivate(emp.id),
      onDeactivate: () => handleDeactivate(emp.id),
    };

    if (!isEditOrderMode) {
      return <EmployeeCard key={emp.id} {...cardProps} />;
    }

    return (
      <SortableEmployeeCard key={emp.id} employeeId={emp.id}>
        {(dragHandleProps) => (
          <EmployeeCard {...cardProps} dragHandleProps={dragHandleProps} />
        )}
      </SortableEmployeeCard>
    );
  }

  const listContent = (
    <>
      <div className="space-y-2">{displayActiveEmployees.map(renderEmployeeCard)}</div>
      {displayInactiveEmployees.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Neaktivní
          </h3>
          <div className="space-y-2">
            {displayInactiveEmployees.map(renderEmployeeCard)}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900">Zaměstnanci</h2>
        <div className="flex flex-wrap items-center gap-2">
          {isEditOrderMode ? (
            <Button onClick={finishEditOrder} disabled={savingOrder}>
              {savingOrder ? "Ukládám…" : "✓ Hotovo — pořadí"}
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={handleStartOrderMode}
              disabled={!orderModeAllowed || filteredEmployees.length < 2}
              title={
                orderModeAllowed
                  ? "Upravit pořadí zaměstnanců"
                  : "Pro úpravu pořadí nejdřív vymažte vyhledávání"
              }
            >
              ✏️ Pořadí
            </Button>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Hledat podle jména…"
            className="max-w-xs"
            disabled={isEditOrderMode}
          />
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setActiveFilter("active")}
              disabled={isEditOrderMode}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeFilter === "active"
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Aktivní
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              disabled={isEditOrderMode}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeFilter === "all"
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Všichni
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {filteredEmployees.filter((employee) => employee.isActive).length} aktivní
          {activeFilter === "all"
            ? ` · ${filteredEmployees.filter((employee) => !employee.isActive).length} neaktivní`
            : ""}
        </p>
      </div>

      {(error || orderError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? orderError}
        </div>
      )}

      {isEditOrderMode && (
        <p className="mb-4 text-sm text-slate-600">
          Přetáhněte zaměstnance za úchyt ⋮⋮. Pořadí se uloží do databáze a projeví se i v
          rozpisu a dostupnosti.
        </p>
      )}

      {!isEditOrderMode && (
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
      )}

      {filteredEmployees.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
          Žádní zaměstnanci neodpovídají filtru.
        </p>
      ) : isEditOrderMode ? (
        <EmployeeListOrderProvider
          employeeIds={orderVisibleIds}
          enabled={isEditOrderMode}
          onReorder={reorderEmployees}
        >
          {listContent}
        </EmployeeListOrderProvider>
      ) : (
        listContent
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
