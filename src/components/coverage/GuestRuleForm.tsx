"use client";

import { validateGuestRuleInput } from "@/lib/coverage-display";
import { Button, Input } from "@/components/ui";

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
        <span className="text-xs font-medium text-slate-700">Min. hosté</span>
        <Input
          type="number"
          min={0}
          inputSize="sm"
          value={values.minGuests}
          onChange={(e) =>
            onChange({ ...values, minGuests: Number(e.target.value) })
          }
          className="mt-1 w-24"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-700">Max. hosté</span>
        <Input
          type="number"
          min={0}
          inputSize="sm"
          placeholder="∞"
          value={values.maxGuests}
          onChange={(e) => onChange({ ...values, maxGuests: e.target.value })}
          className="mt-1 w-24"
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-700">Počet lidí</span>
        <Input
          type="number"
          min={1}
          inputSize="sm"
          value={values.staffCount}
          onChange={(e) =>
            onChange({ ...values, staffCount: Number(e.target.value) })
          }
          className="mt-1 w-24"
        />
      </label>
      <Button type="submit" size="sm" disabled={loading || clientError !== null}>
        {loading ? "Ukládám…" : submitLabel}
      </Button>
      {onCancel && (
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Zrušit
        </Button>
      )}
      {(error || clientError) && (
        <p className="w-full text-xs text-red-800">{error ?? clientError}</p>
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
