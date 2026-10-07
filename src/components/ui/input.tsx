import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-[12px] border border-line bg-raised px-3 text-base text-fg placeholder:text-subtle",
          "outline-none transition-[border-color,box-shadow] duration-150",
          "focus:border-accent focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_28%,transparent)]",
          className,
        )}
        {...props}
      />
    );
  },
);
