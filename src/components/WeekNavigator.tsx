"use client";

import { addWeeks, parseISO, startOfWeek, subWeeks } from "date-fns";
import { useId, useRef } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  formatWeekInputValue,
  formatWeekRangeLabel,
  normalizeWeekStart,
} from "@/lib/date/week-navigation";

interface WeekNavigatorProps {
  weekStart: Date;
  onWeekChange: (weekStart: Date) => void;
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function WeekNavigator({ weekStart, onWeekChange }: WeekNavigatorProps) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const pickerId = useId();
  const normalizedWeek = normalizeWeekStart(weekStart);
  const weekLabel = formatWeekRangeLabel(normalizedWeek);

  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  }

  function handleDatePick(value: string) {
    if (!value) return;
    onWeekChange(normalizeWeekStart(parseISO(value)));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={() => onWeekChange(subWeeks(normalizedWeek, 1))}
      >
        ← Předchozí
      </Button>

      <button
        type="button"
        onClick={openDatePicker}
        title="Vybrat jiný týden"
        aria-label={`Vybrat jiný týden, aktuálně ${weekLabel}`}
        aria-controls={pickerId}
        className={cn(
          "group inline-flex max-w-[min(100%,280px)] sm:max-w-none items-center gap-2 rounded-md border border-slate-300",
          "bg-white px-3 py-1.5 text-sm text-slate-800 shadow-sm",
          "cursor-pointer transition-colors",
          "hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-900",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:ring-offset-1",
        )}
      >
        <CalendarIcon className="size-4 shrink-0 text-indigo-600 group-hover:text-indigo-700" />
        <span className="truncate">{weekLabel}</span>
      </button>
      <input
        id={pickerId}
        ref={dateInputRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        value={formatWeekInputValue(normalizedWeek)}
        onChange={(event) => handleDatePick(event.target.value)}
      />

      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
      >
        Tento týden
      </Button>

      <Button
        variant="secondary"
        size="sm"
        type="button"
        onClick={() => onWeekChange(addWeeks(normalizedWeek, 1))}
      >
        Další →
      </Button>
    </div>
  );
}
