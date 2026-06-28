"use client";

import { useCallback, useEffect, useState } from "react";
import { CoverageZoneSection } from "@/components/coverage/CoverageZoneSection";
import { Button, Input } from "@/components/ui";
import {
  createCoverageZone,
  fetchCoverageZones,
  type CoverageZoneWithDetails,
} from "@/lib/coverage-client";

export default function StaffingRulesPage() {
  const [zones, setZones] = useState<CoverageZoneWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [newZoneName, setNewZoneName] = useState("");
  const [zoneFormError, setZoneFormError] = useState<string | null>(null);
  const [zoneSubmitting, setZoneSubmitting] = useState(false);

  const load = useCallback(async () => {
    setPageError(null);
    try {
      const data = await fetchCoverageZones();
      setZones(data);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Načtení se nezdařilo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateZone(e: React.FormEvent) {
    e.preventDefault();
    const name = newZoneName.trim();
    if (!name) {
      setZoneFormError("Zadejte název zóny");
      return;
    }
    setZoneFormError(null);
    setZoneSubmitting(true);
    try {
      await createCoverageZone(name);
      setNewZoneName("");
      await load();
    } catch (err) {
      setZoneFormError(err instanceof Error ? err.message : "Vytvoření se nezdařilo");
    } finally {
      setZoneSubmitting(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Obsazenost</h2>
      <p className="text-sm text-slate-500 mb-6">
        Požadované pokrytí provozu podle časových intervalů a počtu hostů v jednotlivých
        provozních zónách.
      </p>

      <form
        onSubmit={handleCreateZone}
        className="rounded-xl border border-slate-200 bg-white p-4 mb-8 flex flex-wrap items-end gap-3"
      >
        <label className="block flex-1 min-w-[200px]">
          <span className="text-sm font-medium text-slate-600">Nová provozní zóna</span>
          <Input
            value={newZoneName}
            onChange={(e) => setNewZoneName(e.target.value)}
            placeholder="např. Servis, Bar…"
            className="mt-1"
          />
        </label>
        <Button type="submit" disabled={zoneSubmitting}>
          {zoneSubmitting ? "Vytvářím…" : "Přidat zónu"}
        </Button>
        {zoneFormError && (
          <p className="w-full text-sm text-red-600">{zoneFormError}</p>
        )}
      </form>

      {loading ? (
        <p className="text-slate-500">Načítám zóny…</p>
      ) : pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pageError}
        </div>
      ) : zones.length === 0 ? (
        <p className="text-slate-400">
          Zatím nemáte žádné zóny. Vytvořte první provozní oblast výše.
        </p>
      ) : (
        <div className="space-y-6">
          {zones.map((zone) => (
            <CoverageZoneSection key={zone.id} zone={zone} onChanged={load} />
          ))}
        </div>
      )}
    </div>
  );
}
