"use client";

import {
  buildAvailabilityFormRows,
  DefaultAvailabilityEditor,
  DefaultAvailabilityReadonly,
  type AvailabilityFormRow,
} from "@/components/employees/DefaultAvailabilityEditor";
import {
  QualificationPicker,
  qualificationSummary,
} from "@/components/employees/QualificationPicker";
import type { Employee, ShiftType } from "@/types";

export interface EmployeeEditDraft {
  name: string;
  contractHoursPerWeek: number;
  isActive: boolean;
  isTemporaryHelp: boolean;
  useDefaultAvailabilityTemplate: boolean;
  shiftTypeIds: string[];
  availability: AvailabilityFormRow[];
}

export function employeeToEditDraft(employee: Employee): EmployeeEditDraft {
  return {
    name: employee.name,
    contractHoursPerWeek: employee.contractHoursPerWeek,
    isActive: employee.isActive,
    isTemporaryHelp: employee.isTemporaryHelp,
    useDefaultAvailabilityTemplate: employee.useDefaultAvailabilityTemplate,
    shiftTypeIds: employee.qualifications.map((q) => q.shiftTypeId),
    availability: buildAvailabilityFormRows(employee),
  };
}

interface EmployeeCardProps {
  employee: Employee;
  shiftTypes: ShiftType[];
  expanded: boolean;
  editing: boolean;
  saving: boolean;
  draft: EmployeeEditDraft | null;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (draft: EmployeeEditDraft) => void;
  onSave: () => void;
  onDelete: () => void;
}

export function EmployeeCard({
  employee,
  shiftTypes,
  expanded,
  editing,
  saving,
  draft,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSave,
  onDelete,
}: EmployeeCardProps) {
  const viewAvailability = buildAvailabilityFormRows(employee);
  const qualSummary = qualificationSummary(
    shiftTypes,
    employee.qualifications.map((q) => q.shiftTypeId),
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="min-w-0">
          <span className="font-medium text-slate-900">{employee.name}</span>
          <span className="ml-3 text-sm text-slate-500">
            {employee.contractHoursPerWeek} h/týden
          </span>
          {!employee.isActive && (
            <span className="ml-2 text-xs rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
              Neaktivní
            </span>
          )}
          {employee.isTemporaryHelp && (
            <span className="ml-2 text-xs rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">
              Výpomoc
            </span>
          )}
          {!expanded && (
            <span className="ml-2 text-xs text-slate-400 truncate">{qualSummary}</span>
          )}
        </div>
        <span className="text-slate-400 text-sm shrink-0 ml-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && !editing && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
              Kvalifikace
            </p>
            <p className="text-sm text-slate-700">{qualSummary}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
              Výchozí týdenní dostupnost
            </p>
            <DefaultAvailabilityReadonly rows={viewAvailability} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onStartEdit}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Upravit
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Smazat
            </button>
          </div>
        </div>
      )}

      {expanded && editing && draft && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Jméno</span>
              <input
                required
                value={draft.name}
                onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Úvazek (h/týden)</span>
              <input
                type="number"
                min={1}
                value={draft.contractHoursPerWeek}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    contractHoursPerWeek: Number(e.target.value),
                  })
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) =>
                  onDraftChange({ ...draft, isActive: e.target.checked })
                }
              />
              Aktivní
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isTemporaryHelp}
                onChange={(e) =>
                  onDraftChange({ ...draft, isTemporaryHelp: e.target.checked })
                }
              />
              Výpomoc
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.useDefaultAvailabilityTemplate}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    useDefaultAvailabilityTemplate: e.target.checked,
                  })
                }
              />
              Používat jako výchozí týdenní dostupnost
            </label>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
              Kvalifikace
            </p>
            <QualificationPicker
              shiftTypes={shiftTypes}
              selectedIds={draft.shiftTypeIds}
              onChange={(shiftTypeIds) => onDraftChange({ ...draft, shiftTypeIds })}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
              Výchozí týdenní dostupnost
            </p>
            <DefaultAvailabilityEditor
              rows={draft.availability}
              onChange={(availability) => onDraftChange({ ...draft, availability })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? "Ukládám…" : "Uložit"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onCancelEdit}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
