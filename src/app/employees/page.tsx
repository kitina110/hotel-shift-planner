"use client";

import { useEffect, useState } from "react";
import { DAY_LABELS, type Employee, type ShiftType } from "@/types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    contractHoursPerWeek: 40,
    maxConsecutiveDays: 6,
    shiftTypeIds: [] as string[],
  });

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({
      name: "",
      contractHoursPerWeek: 40,
      maxConsecutiveDays: 6,
      shiftTypeIds: [],
    });
    await load();
  }

  async function toggleQualification(employee: Employee, shiftTypeId: string) {
    const current = employee.qualifications.map((q) => q.shiftTypeId);
    const next = current.includes(shiftTypeId)
      ? current.filter((id) => id !== shiftTypeId)
      : [...current, shiftTypeId];

    await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shiftTypeIds: next }),
    });
    await load();
  }

  async function toggleAvailability(
    employee: Employee,
    dayOfWeek: number,
    field: "available" | "preferredOff",
  ) {
    const avail = employee.availabilities.find((a) => a.dayOfWeek === dayOfWeek);
    const availability = Array.from({ length: 7 }, (_, d) => {
      const existing = employee.availabilities.find((a) => a.dayOfWeek === d);
      return {
        dayOfWeek: d,
        available: existing?.available ?? true,
        preferredOff: existing?.preferredOff ?? false,
      };
    });

    const idx = availability.findIndex((a) => a.dayOfWeek === dayOfWeek);
    availability[idx] = {
      ...availability[idx],
      [field]: !availability[idx][field],
    };

    await fetch(`/api/employees/${employee.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Smazat zaměstnance?")) return;
    await fetch(`/api/employees/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="p-8 max-w-5xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Zaměstnanci</h2>

      <form
        onSubmit={handleCreate}
        className="rounded-xl border border-slate-200 bg-white p-5 mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Jméno</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Úvazek (h/týden)</span>
            <input
              type="number"
              min={1}
              value={form.contractHoursPerWeek}
              onChange={(e) =>
                setForm({ ...form, contractHoursPerWeek: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-600">Max. dní v kuse</span>
            <input
              type="number"
              min={1}
              max={8}
              value={form.maxConsecutiveDays}
              onChange={(e) =>
                setForm({ ...form, maxConsecutiveDays: Number(e.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-600">Kvalifikace</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {shiftTypes.map((st) => (
              <label
                key={st.id}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={form.shiftTypeIds.includes(st.id)}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      shiftTypeIds: e.target.checked
                        ? [...f.shiftTypeIds, st.id]
                        : f.shiftTypeIds.filter((id) => id !== st.id),
                    }));
                  }}
                />
                {st.name}
              </label>
            ))}
          </div>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Přidat zaměstnance
        </button>
      </form>

      <p className="text-sm text-slate-500 mb-4">{employees.length} zaměstnanců</p>

      <div className="space-y-2">
        {employees.map((emp) => (
          <div
            key={emp.id}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === emp.id ? null : emp.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
            >
              <div>
                <span className="font-medium text-slate-900">{emp.name}</span>
                <span className="ml-3 text-sm text-slate-500">
                  {emp.contractHoursPerWeek}h/týden · max {emp.maxConsecutiveDays} dní
                </span>
              </div>
              <span className="text-slate-400 text-sm">
                {expandedId === emp.id ? "▲" : "▼"}
              </span>
            </button>
            {expandedId === emp.id && (
              <div className="border-t border-slate-100 px-4 py-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Kvalifikace
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {shiftTypes.map((st) => {
                      const qualified = emp.qualifications.some(
                        (q) => q.shiftTypeId === st.id,
                      );
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => toggleQualification(emp, st.id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            qualified
                              ? "bg-indigo-100 text-indigo-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {st.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
                    Dostupnost
                  </p>
                  <div className="grid grid-cols-7 gap-2">
                    {DAY_LABELS.map((label, dayOfWeek) => {
                      const avail = emp.availabilities.find(
                        (a) => a.dayOfWeek === dayOfWeek,
                      );
                      const available = avail?.available ?? true;
                      const preferredOff = avail?.preferredOff ?? false;
                      return (
                        <div
                          key={dayOfWeek}
                          className="rounded-lg border border-slate-200 p-2 text-center"
                        >
                          <div className="text-xs font-medium text-slate-600 mb-1">
                            {label}
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              toggleAvailability(emp, dayOfWeek, "available")
                            }
                            className={`block w-full rounded px-1 py-0.5 text-[10px] mb-1 ${
                              available
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {available ? "Dostupný" : "Nedostupný"}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              toggleAvailability(emp, dayOfWeek, "preferredOff")
                            }
                            className={`block w-full rounded px-1 py-0.5 text-[10px] ${
                              preferredOff
                                ? "bg-amber-100 text-amber-700"
                                : "bg-slate-50 text-slate-400"
                            }`}
                          >
                            Volno?
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(emp.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Smazat zaměstnance
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
