import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variantClassName = {
  neutral: "border-slate-200 bg-slate-100 text-slate-800",
  warning: "border-amber-200 bg-amber-100 text-amber-950",
  success: "border-emerald-200 bg-emerald-100 text-emerald-950",
  danger: "border-red-200 bg-red-100 text-red-900",
  info: "border-indigo-200 bg-indigo-100 text-indigo-950",
} as const;

export type BadgeVariant = keyof typeof variantClassName;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        variantClassName[variant],
        className,
      )}
      {...props}
    />
  );
}
