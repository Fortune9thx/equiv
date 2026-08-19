import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--card)] px-4 py-3.5 text-sm leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-subtle)] outline-none transition-colors focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary-soft)]",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export { Textarea };
