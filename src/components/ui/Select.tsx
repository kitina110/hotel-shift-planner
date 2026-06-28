import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldBaseClassName, inputSizeClassName } from "@/components/ui/field-styles";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  inputSize?: keyof typeof inputSizeClassName;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, inputSize = "md", ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        "w-full",
        fieldBaseClassName,
        inputSizeClassName[inputSize],
        className,
      )}
      {...props}
    />
  );
});
