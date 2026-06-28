import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { fieldBaseClassName, inputSizeClassName } from "@/components/ui/field-styles";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  inputSize?: keyof typeof inputSizeClassName;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, inputSize = "md", ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full min-h-[5rem]",
        fieldBaseClassName,
        inputSizeClassName[inputSize],
        className,
      )}
      {...props}
    />
  );
});
