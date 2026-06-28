"use client";

interface ToastBannerProps {
  message: string;
  variant?: "info" | "success" | "error";
  onDismiss: () => void;
}

const VARIANT_STYLES = {
  info: "border-amber-300 bg-amber-50 text-amber-950",
  success: "border-emerald-300 bg-emerald-50 text-emerald-950",
  error: "border-red-300 bg-red-50 text-red-900",
} as const;

export function ToastBanner({
  message,
  variant = "info",
  onDismiss,
}: ToastBannerProps) {
  return (
    <div
      role="status"
      className={`fixed bottom-6 right-6 z-50 max-w-md rounded-xl border px-4 py-3 shadow-lg ${VARIANT_STYLES[variant]}`}
    >
      <div className="flex items-start gap-3">
        <p className="text-sm leading-relaxed flex-1">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Zavřít"
          className="shrink-0 rounded px-1 text-lg leading-none text-current/70 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30"
        >
          ×
        </button>
      </div>
    </div>
  );
}
