/** Shared, contrast-safe styles for form controls across the app. */
export const fieldBaseClassName =
  "border border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 " +
  "selection:bg-indigo-700 selection:text-white " +
  "focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 " +
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-600";

export const inputSizeClassName = {
  sm: "rounded-md px-2 py-1.5 text-sm",
  md: "rounded-lg px-3 py-2 text-sm",
  lg: "rounded-lg px-3 py-1.5 text-lg font-semibold",
} as const;

export const checkboxClassName =
  "size-4 shrink-0 rounded border-slate-300 text-indigo-600 accent-indigo-600 " +
  "focus:ring-2 focus:ring-indigo-200 focus:ring-offset-0 " +
  "disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100";
