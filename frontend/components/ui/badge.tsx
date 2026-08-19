import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
  {
    variants: {
      variant: {
        neutral: "border-[var(--surface-border)] bg-[var(--foreground)]/[0.04] text-[var(--foreground-muted)]",
        open: "border-transparent bg-[var(--primary-soft)] text-[#00785A]",
        resolving: "border-transparent bg-[var(--warning-soft)] text-[#8A6A00]",
        resolved: "border-transparent bg-[var(--success-soft)] text-[#00785A]",
        inconclusive: "border-transparent bg-[var(--foreground)]/[0.06] text-[var(--foreground-muted)]",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };
