"use client";

import { Button } from "@/components/ui";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "OK",
  cancelLabel = "Zrušit",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Zavřít dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onCancel}
        disabled={loading}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h3 id="confirm-dialog-title" className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
        <p id="confirm-dialog-message" className="mt-2 text-sm text-slate-700">
          {message}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Mažu…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
