import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
