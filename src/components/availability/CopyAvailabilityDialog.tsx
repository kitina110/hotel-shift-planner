"use client";

/** Reserved for future use — not exposed in production UI. */
import { WeekNavigator } from "@/components/WeekNavigator";
import { Button } from "@/components/ui";
import { formatWeekRangeLabel, normalizeWeekStart } from "@/lib/date/week-navigation";

interface CopyAvailabilityDialogProps {
  open: boolean;
  targetWeekStart: Date;
  sourceWeekStart: Date;
  busy: boolean;
  onSourceWeekChange: (weekStart: Date) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function CopyAvailabilityDialog({
  open,
  targetWeekStart,
  sourceWeekStart,
  busy,
  onSourceWeekChange,
  onClose,
  onConfirm,
}: CopyAvailabilityDialogProps) {
  if (!open) return null;

  const sameWeek =
    normalizeWeekStart(sourceWeekStart).getTime() ===
    normalizeWeekStart(targetWeekStart).getTime();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-availability-title"
        className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="copy-availability-title" className="text-lg font-semibold text-slate-900">
          Kopírovat dostupnost z jiného týdne
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Cílový týden:{" "}
          <span className="font-medium text-slate-800">
            {formatWeekRangeLabel(targetWeekStart)}
          </span>
        </p>
        <p className="mt-4 text-sm text-slate-600">
          Vyberte týden, ze kterého se má dostupnost zkopírovat:
        </p>

        <div className="mt-3">
          <WeekNavigator weekStart={sourceWeekStart} onWeekChange={onSourceWeekChange} />
        </div>

        {sameWeek && (
          <p className="mt-3 text-sm text-amber-800">
            Zdrojový týden musí být jiný než aktuální týden.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Zrušit
          </Button>
          <Button onClick={onConfirm} disabled={busy || sameWeek}>
            {busy ? "Kopíruji…" : "Kopírovat"}
          </Button>
        </div>
      </div>
    </div>
  );
}
