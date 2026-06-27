"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Rozpis směn" },
  { href: "/shift-types", label: "Směny" },
  { href: "/staffing-rules", label: "Obsazenost" },
  { href: "/employees", label: "Zaměstnanci" },
  { href: "/history", label: "Historie" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-full flex bg-slate-50">
      <aside className="w-56 shrink-0 border-r border-slate-200 bg-white">
        <div className="px-5 py-6 border-b border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Hotel
          </p>
          <h1 className="text-lg font-bold text-slate-900">Shift Planner</h1>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
