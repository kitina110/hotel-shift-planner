import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldBaseClassName, inputSizeClassName } from "@/components/ui/field-styles";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  inputSize?: keyof typeof inputSizeClassName;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize = "md", type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
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
