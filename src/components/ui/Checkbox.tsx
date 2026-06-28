import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { checkboxClassName } from "@/components/ui/field-styles";

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(checkboxClassName, className)}
      {...props}
    />
  );
});
