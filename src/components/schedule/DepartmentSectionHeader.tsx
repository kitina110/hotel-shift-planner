"use client";

import { stickyEmployeeClass } from "./schedule-utils";

interface DepartmentSectionHeaderProps {
  label: string;
  dayCount: number;
  stickySollLeft: number;
}

export function DepartmentSectionHeader({
  label,
  dayCount,
  stickySollLeft,
}: DepartmentSectionHeaderProps) {
  return (
    <tr>
      <td
        colSpan={2}
        className={`${stickyEmployeeClass} border-b border-slate-200 p-0`}
        style={{ left: 0 }}
      >
        <div
          className="flex items-center border-l-4 border-indigo-500 bg-indigo-50/70 px-4 py-2"
          style={{ minWidth: stickySollLeft + 96 }}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            {label}
          </span>
        </div>
      </td>
      <td
        colSpan={dayCount + 1}
        className="border-b border-slate-200 bg-indigo-50/40"
      />
    </tr>
  );
}
