import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variantClassName = {
  primary:
    "border border-transparent bg-indigo-600 text-white hover:bg-indigo-700 " +
    "focus-visible:ring-indigo-300 disabled:bg-slate-300 disabled:text-slate-700 disabled:hover:bg-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 " +
    "focus-visible:ring-indigo-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:bg-slate-100",
  danger:
    "border border-transparent bg-red-600 text-white hover:bg-red-700 " +
    "focus-visible:ring-red-300 disabled:bg-slate-300 disabled:text-slate-700 disabled:hover:bg-slate-300",
  ghost:
    "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 " +
    "focus-visible:ring-indigo-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500",
  dangerOutline:
    "border border-red-200 bg-white text-red-700 hover:bg-red-50 " +
    "focus-visible:ring-red-200 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500",
  link:
    "border border-transparent bg-transparent text-indigo-700 hover:text-indigo-800 hover:underline " +
    "focus-visible:ring-indigo-200 disabled:text-slate-500 disabled:no-underline",
  linkMuted:
    "border border-transparent bg-transparent text-slate-600 hover:text-slate-800 hover:underline " +
    "focus-visible:ring-slate-200 disabled:text-slate-400 disabled:no-underline",
  linkDanger:
    "border border-transparent bg-transparent text-red-700 hover:text-red-800 hover:underline " +
    "focus-visible:ring-red-200 disabled:text-slate-400 disabled:no-underline",
} as const;

const sizeClassName = {
  sm: "rounded-md px-3 py-1.5 text-sm",
  md: "rounded-lg px-4 py-2 text-sm font-medium",
} as const;

export type ButtonVariant = keyof typeof variantClassName;
export type ButtonSize = keyof typeof sizeClassName;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", type = "button", ...props },
  ref,
) {
  const isLink = variant === "link" || variant === "linkMuted" || variant === "linkDanger";

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed",
        isLink ? "rounded-md px-0 py-0 font-normal" : sizeClassName[size],
        variantClassName[variant],
        className,
      )}
      {...props}
    />
  );
});
