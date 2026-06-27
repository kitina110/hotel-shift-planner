"use client";

import { useEffect, useState } from "react";
import { type ShiftType, type StaffingRule } from "@/types";

type RuleWithType = StaffingRule & { shiftType?: ShiftType };

export default function StaffingRulesPage() {
  const [rules, setRules] = useState<RuleWithType[]>([]);
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [form, setForm] = useState({
    shiftTypeId: "",
    minGuests: 0,
    maxGuests: "",
    staffCount: 1,
  });

  async function load() {
    const [rulesRes, typesRes] = await Promise.all([
      fetch("/api/staffing-rules"),
      fetch("/api/shift-types"),
    ]);
    setRules(await rulesRes.json());
    const types = await typesRes.json();
    setShiftTypes(types);
    if (!form.shiftTypeId && types[0]) {
      setForm((f) => ({ ...f, shiftTypeId: types[0].id }));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/staffing-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        maxGuests: form.maxGuests === "" ? null : Number(form.maxGuests),
      }),
    });
    setForm((f) => ({ ...f, minGuests: 0, maxGuests: "", staffCount: 1 }));
    await load();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/staffing-rules/${id}`, { method: "DELETE" });
    await load();
  }

  const grouped = shiftTypes.map((st) => ({
    shiftType: st,
    rules: rules.filter((r) => r.shiftTypeId === st.id),
  }));

  return (
    <div className="p-8 max-w-4xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Pravidla obsazenosti</h2>
      <p className="text-sm text-slate-500 mb-6">
        Počet zaměstnanců podle očekávaného počtu hostů pro každou roli.
      </p>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 mb-8 grid grid-cols-2 sm:grid-cols-5 gap-3 items-end"
      >
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-xs font-medium text-slate-600">Směna</span>
          <select
            value={form.shiftTypeId}
            onChange={(e) => setForm({ ...form, shiftTypeId: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          >
            {shiftTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Min. hosté</span>
          <input
            type="number"
            min={0}
            value={form.minGuests}
            onChange={(e) => setForm({ ...form, minGuests: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Max. hosté</span>
          <input
            type="number"
            min={0}
            placeholder="∞"
            value={form.maxGuests}
            onChange={(e) => setForm({ ...form, maxGuests: e.target.value })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Počet lidí</span>
          <input
            type="number"
            min={1}
            value={form.staffCount}
            onChange={(e) => setForm({ ...form, staffCount: Number(e.target.value) })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Přidat
        </button>
      </form>

      {grouped.map(({ shiftType, rules: typeRules }) => (
        <section key={shiftType.id} className="mb-8">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">{shiftType.name}</h3>
          <table className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Hosté od</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Hosté do</th>
                <th className="px-4 py-2 text-left font-medium text-slate-600">Personál</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {typeRules.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-slate-400">
                    Žádná pravidla
                  </td>
                </tr>
              ) : (
                typeRules.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">{r.minGuests}</td>
                    <td className="px-4 py-2">{r.maxGuests ?? "∞"}</td>
                    <td className="px-4 py-2 font-medium">{r.staffCount}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        className="text-red-600 text-xs hover:underline"
                      >
                        Smazat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
