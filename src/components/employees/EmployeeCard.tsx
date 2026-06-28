"use client";

import { useEffect, useRef } from "react";
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
import { Badge, Button, Checkbox, Input } from "@/components/ui";
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
  focusNameOnEdit?: boolean;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDraftChange: (draft: EmployeeEditDraft) => void;
  onSave: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onReactivate: () => void;
  onDeactivate: () => void;
  duplicating?: boolean;
  reactivating?: boolean;
  deactivating?: boolean;
  onNameFocusHandled?: () => void;
}

export function EmployeeCard({
  employee,
  shiftTypes,
  expanded,
  editing,
  saving,
  draft,
  focusNameOnEdit = false,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onDraftChange,
  onSave,
  onDelete,
  onDuplicate,
  onReactivate,
  onDeactivate,
  duplicating = false,
  reactivating = false,
  deactivating = false,
  onNameFocusHandled,
}: EmployeeCardProps) {
  const nameInputRef = useRef<HTMLInputElement>(null);
  const viewAvailability = buildAvailabilityFormRows(employee);
  const qualSummary = qualificationSummary(
    shiftTypes,
    employee.qualifications.map((q) => q.shiftTypeId),
  );
  const canDelete = !employee.hasScheduleHistory;

  useEffect(() => {
    if (!editing || !focusNameOnEdit || !nameInputRef.current) return;
    nameInputRef.current.focus();
    nameInputRef.current.select();
    onNameFocusHandled?.();
  }, [editing, focusNameOnEdit, onNameFocusHandled]);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white overflow-hidden ${
        !employee.isActive ? "opacity-90" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="min-w-0">
          <span className="font-medium text-slate-900">{employee.name}</span>
          <span className="ml-3 text-sm text-slate-600">
            {employee.contractHoursPerWeek} h/týden
          </span>
          {!employee.isActive && (
            <Badge variant="neutral" className="ml-2">
              Neaktivní
            </Badge>
          )}
          {employee.isTemporaryHelp && (
            <Badge variant="warning" className="ml-2">
              Výpomoc
            </Badge>
          )}
          {!expanded && (
            <span className="ml-2 text-xs text-slate-500 truncate">{qualSummary}</span>
          )}
        </div>
        <span className="text-slate-500 text-sm shrink-0 ml-2">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && !editing && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              Kvalifikace
            </p>
            <p className="text-sm text-slate-800">{qualSummary}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              Výchozí týdenní dostupnost
            </p>
            <DefaultAvailabilityReadonly rows={viewAvailability} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {!employee.isActive ? (
              <Button
                disabled={reactivating}
                onClick={onReactivate}
              >
                {reactivating ? "Obnovuji…" : "Obnovit"}
              </Button>
            ) : (
              <Button onClick={onStartEdit}>Upravit</Button>
            )}
            <Button variant="secondary" disabled={duplicating} onClick={onDuplicate}>
              {duplicating ? "Duplikuji…" : "Duplikovat"}
            </Button>
            {employee.isActive && (
              <Button variant="secondary" disabled={deactivating} onClick={onDeactivate}>
                {deactivating ? "Deaktivuji…" : "Deaktivovat"}
              </Button>
            )}
            {!employee.isActive && (
              <Button variant="secondary" onClick={onStartEdit}>
                Upravit
              </Button>
            )}
            {canDelete && (
              <Button variant="dangerOutline" onClick={onDelete}>
                Smazat
              </Button>
            )}
          </div>
        </div>
      )}

      {expanded && editing && draft && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Jméno</span>
              <Input
                ref={nameInputRef}
                required
                value={draft.name}
                onChange={(e) => onDraftChange({ ...draft, name: e.target.value })}
                className="mt-1"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Úvazek (h/týden)</span>
              <Input
                type="number"
                min={1}
                value={draft.contractHoursPerWeek}
                onChange={(e) =>
                  onDraftChange({
                    ...draft,
                    contractHoursPerWeek: Number(e.target.value),
                  })
                }
                className="mt-1"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-slate-800">
            <label className="inline-flex items-center gap-2">
              <Checkbox
                checked={draft.isTemporaryHelp}
                onChange={(e) =>
                  onDraftChange({ ...draft, isTemporaryHelp: e.target.checked })
                }
              />
              Výpomoc
            </label>
            <label className="inline-flex items-center gap-2">
              <Checkbox
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
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              Kvalifikace
            </p>
            <QualificationPicker
              shiftTypes={shiftTypes}
              selectedIds={draft.shiftTypeIds}
              onChange={(shiftTypeIds) => onDraftChange({ ...draft, shiftTypeIds })}
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              Výchozí týdenní dostupnost
            </p>
            <DefaultAvailabilityEditor
              rows={draft.availability}
              onChange={(availability) => onDraftChange({ ...draft, availability })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button disabled={saving} onClick={onSave}>
              {saving ? "Ukládám…" : "Uložit"}
            </Button>
            <Button variant="secondary" disabled={saving} onClick={onCancelEdit}>
              Zrušit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
