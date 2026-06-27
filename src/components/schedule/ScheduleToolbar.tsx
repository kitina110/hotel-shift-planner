interface ScheduleToolbarProps {
  generating: boolean;
  scheduleStatus?: string;
  warnings: string[];
  onGenerate: () => void;
  onPublish: () => void;
}

export function ScheduleToolbar({
  generating,
  scheduleStatus,
  warnings,
  onGenerate,
  onPublish,
}: ScheduleToolbarProps) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
      >
        {generating ? "Generuji…" : "Vygenerovat rozpis"}
      </button>
      {scheduleStatus === "draft" && (
        <button
          type="button"
          onClick={onPublish}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          Publikovat rozpis
        </button>
      )}
      {scheduleStatus === "published" && (
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          Publikováno
        </span>
      )}
      {warnings.length > 0 && (
        <div className="w-full rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 mt-1">
          <p className="text-sm font-medium text-amber-800">Upozornění při generování:</p>
          <ul className="mt-1 text-sm text-amber-700 list-disc list-inside">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
