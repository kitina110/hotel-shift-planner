"use client";

import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  GuestRuleForm,
  EMPTY_GUEST_RULE,
  guestRuleToPayload,
  type GuestRuleFormValues,
} from "@/components/coverage/GuestRuleForm";
import { Button, Input } from "@/components/ui";
import {
  createCoverageRequirementRule,
  deleteCoverageRequirementRule,
  updateCoverageInterval,
  deleteCoverageInterval,
  updateCoverageRequirementRule,
} from "@/lib/coverage-client";
import {
  formatGuestRuleLabel,
  formatIntervalRange,
} from "@/lib/coverage-display";
import type { CoverageInterval, CoverageRequirementRule } from "@/types";

type IntervalWithRules = CoverageInterval & { rules: CoverageRequirementRule[] };

interface CoverageIntervalBlockProps {
  interval: IntervalWithRules;
  onChanged: () => Promise<void>;
}

export function CoverageIntervalBlock({
  interval,
  onChanged,
}: CoverageIntervalBlockProps) {
  const [editingInterval, setEditingInterval] = useState(false);
  const [startTime, setStartTime] = useState(interval.startTime);
  const [endTime, setEndTime] = useState(interval.endTime);
  const [intervalError, setIntervalError] = useState<string | null>(null);
  const [intervalLoading, setIntervalLoading] = useState(false);

  const [ruleForm, setRuleForm] = useState<GuestRuleFormValues>(EMPTY_GUEST_RULE);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [ruleLoading, setRuleLoading] = useState(false);

  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editRuleForm, setEditRuleForm] = useState<GuestRuleFormValues>(EMPTY_GUEST_RULE);
  const [editRuleError, setEditRuleError] = useState<string | null>(null);
  const [editRuleLoading, setEditRuleLoading] = useState(false);

  const [deleteIntervalOpen, setDeleteIntervalOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!editingInterval) {
      setStartTime(interval.startTime);
      setEndTime(interval.endTime);
    }
  }, [interval.startTime, interval.endTime, editingInterval]);

  async function saveInterval() {
    setIntervalError(null);
    setIntervalLoading(true);
    try {
      await updateCoverageInterval(interval.id, { startTime, endTime });
      setEditingInterval(false);
      await onChanged();
    } catch (err) {
      setIntervalError(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setIntervalLoading(false);
    }
  }

  async function addRule() {
    setRuleError(null);
    setRuleLoading(true);
    try {
      const payload = guestRuleToPayload(ruleForm);
      await createCoverageRequirementRule({ intervalId: interval.id, ...payload });
      setRuleForm(EMPTY_GUEST_RULE);
      await onChanged();
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setRuleLoading(false);
    }
  }

  function startEditRule(rule: CoverageRequirementRule) {
    setEditingRuleId(rule.id);
    setEditRuleForm({
      minGuests: rule.minGuests,
      maxGuests: rule.maxGuests == null ? "" : String(rule.maxGuests),
      staffCount: rule.staffCount,
    });
    setEditRuleError(null);
  }

  async function saveEditRule() {
    if (!editingRuleId) return;
    setEditRuleError(null);
    setEditRuleLoading(true);
    try {
      const payload = guestRuleToPayload(editRuleForm);
      await updateCoverageRequirementRule(editingRuleId, payload);
      setEditingRuleId(null);
      await onChanged();
    } catch (err) {
      setEditRuleError(err instanceof Error ? err.message : "Uložení se nezdařilo");
    } finally {
      setEditRuleLoading(false);
    }
  }

  async function confirmDeleteInterval() {
    setDeleteLoading(true);
    try {
      await deleteCoverageInterval(interval.id);
      setDeleteIntervalOpen(false);
      await onChanged();
    } finally {
      setDeleteLoading(false);
    }
  }

  async function confirmDeleteRule() {
    if (!deleteRuleId) return;
    setDeleteLoading(true);
    try {
      await deleteCoverageRequirementRule(deleteRuleId);
      setDeleteRuleId(null);
      await onChanged();
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="ml-2 border-l-2 border-indigo-100 pl-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        {editingInterval ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-xs text-slate-500">Od</span>
              <Input
                type="time"
                inputSize="sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-0.5"
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Do</span>
              <Input
                type="time"
                inputSize="sm"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-0.5"
              />
            </label>
            <Button variant="link" disabled={intervalLoading} onClick={saveInterval}>
              {intervalLoading ? "Ukládám…" : "Uložit"}
            </Button>
            <Button
              variant="linkMuted"
              onClick={() => {
                setEditingInterval(false);
                setStartTime(interval.startTime);
                setEndTime(interval.endTime);
                setIntervalError(null);
              }}
            >
              Zrušit
            </Button>
          </div>
        ) : (
          <h4 className="text-base font-semibold text-slate-800 tabular-nums">
            {formatIntervalRange(interval.startTime, interval.endTime)}
          </h4>
        )}
        {!editingInterval && (
          <div className="flex gap-3 text-sm">
            <Button variant="link" onClick={() => setEditingInterval(true)}>
              Upravit
            </Button>
            <Button variant="linkDanger" onClick={() => setDeleteIntervalOpen(true)}>
              Smazat
            </Button>
          </div>
        )}
      </div>

      {intervalError && (
        <p className="mb-2 text-xs text-red-600">{intervalError}</p>
      )}

      <ul className="mb-3 space-y-1.5 text-sm text-slate-700">
        {interval.rules.length === 0 ? (
          <li className="text-slate-400 italic">Žádná pravidla</li>
        ) : (
          interval.rules.map((rule) =>
            editingRuleId === rule.id ? (
              <li key={rule.id}>
                <GuestRuleForm
                  values={editRuleForm}
                  onChange={setEditRuleForm}
                  onSubmit={saveEditRule}
                  submitLabel="Uložit pravidlo"
                  loading={editRuleLoading}
                  error={editRuleError}
                  onCancel={() => setEditingRuleId(null)}
                />
              </li>
            ) : (
              <li key={rule.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>• {formatGuestRuleLabel(rule.minGuests, rule.maxGuests, rule.staffCount)}</span>
                <Button variant="link" className="text-xs" onClick={() => startEditRule(rule)}>
                  Upravit
                </Button>
                <Button
                  variant="linkDanger"
                  className="text-xs"
                  onClick={() => setDeleteRuleId(rule.id)}
                >
                  Smazat
                </Button>
              </li>
            ),
          )
        )}
      </ul>

      <GuestRuleForm
        values={ruleForm}
        onChange={setRuleForm}
        onSubmit={addRule}
        submitLabel="Přidat pravidlo"
        loading={ruleLoading}
        error={ruleError}
      />

      <ConfirmDialog
        open={deleteIntervalOpen}
        title="Smazat interval?"
        message={`Opravdu smazat interval ${formatIntervalRange(interval.startTime, interval.endTime)} včetně všech pravidel?`}
        confirmLabel="Smazat"
        cancelLabel="Zrušit"
        loading={deleteLoading}
        onConfirm={confirmDeleteInterval}
        onCancel={() => !deleteLoading && setDeleteIntervalOpen(false)}
      />

      <ConfirmDialog
        open={deleteRuleId !== null}
        title="Smazat pravidlo?"
        message="Opravdu chcete smazat toto pravidlo pokrytí?"
        confirmLabel="Smazat"
        cancelLabel="Zrušit"
        loading={deleteLoading}
        onConfirm={confirmDeleteRule}
        onCancel={() => !deleteLoading && setDeleteRuleId(null)}
      />
    </div>
  );
}
