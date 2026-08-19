import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_1px_2px_rgba(11,46,31,0.08),0_10px_24px_-10px_rgba(0,214,143,0.55)] hover:bg-[var(--primary-hover)] active:brightness-95",
        secondary:
          "border border-[var(--surface-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--surface-hover)] hover:border-[var(--surface-border-strong)]",
        outline:
          "border-2 border-[var(--foreground)]/15 bg-transparent text-[var(--foreground)] hover:border-[var(--foreground)]/30 hover:bg-[var(--foreground)]/[0.03]",
        ghost: "text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--foreground)]/[0.04]",
        danger: "bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/25 hover:bg-[var(--danger)]/15",
        onDark:
          "bg-[var(--card)] text-[var(--sidebar-dark)] hover:bg-white/90 shadow-[0_8px_20px_-8px_rgba(0,0,0,0.4)]",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5",
        lg: "h-13 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
