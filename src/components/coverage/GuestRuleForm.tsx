"use client";

import { validateGuestRuleInput } from "@/lib/coverage-display";

export interface GuestRuleFormValues {
  minGuests: number;
  maxGuests: string;
  staffCount: number;
}

export const EMPTY_GUEST_RULE: GuestRuleFormValues = {
  minGuests: 0,
  maxGuests: "",
  staffCount: 1,
};

interface GuestRuleFormProps {
  values: GuestRuleFormValues;
  onChange: (values: GuestRuleFormValues) => void;
  onSubmit: () => void;
  submitLabel: string;
  loading?: boolean;
  error?: string | null;
  onCancel?: () => void;
}

export function GuestRuleForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  loading,
  error,
  onCancel,
}: GuestRuleFormProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  const clientError = validateGuestRuleInput(values);

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3"
    >
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Min. hosté</span>
        <input
          type="number"
          min={0}
          value={values.minGuests}
          onChange={(e) =>
            onChange({ ...values, minGuests: Number(e.target.value) })
          }
          className="mt-1 w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Max. hosté</span>
        <input
          type="number"
          min={0}
          placeholder="∞"
          value={values.maxGuests}
          onChange={(e) => onChange({ ...values, maxGuests: e.target.value })}
          className="mt-1 w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Počet lidí</span>
        <input
          type="number"
          min={1}
          value={values.staffCount}
          onChange={(e) =>
            onChange({ ...values, staffCount: Number(e.target.value) })
          }
          className="mt-1 w-24 rounded-md border border-slate-200 px-2 py-1.5 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={loading || clientError !== null}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {loading ? "Ukládám…" : submitLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-white"
        >
          Zrušit
        </button>
      )}
      {(error || clientError) && (
        <p className="w-full text-xs text-red-600">{error ?? clientError}</p>
      )}
    </form>
  );
}

export function guestRuleToPayload(values: GuestRuleFormValues) {
  const validationError = validateGuestRuleInput(values);
  if (validationError) throw new Error(validationError);

  return {
    minGuests: values.minGuests,
    maxGuests: values.maxGuests === "" ? null : Number(values.maxGuests),
    staffCount: values.staffCount,
  };
}
