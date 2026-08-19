"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;

function DialogContent({
  className,
  children,
  showClose = true,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { showClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--sidebar-dark)]/40 backdrop-blur-sm transition-opacity" />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] bg-[var(--card)] p-8 shadow-[var(--shadow-card)]",
          className
        )}
        {...props}
      >
        {children}
        {showClose && (
          <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-1.5 text-[var(--foreground-subtle)] transition-colors hover:bg-[var(--foreground)]/[0.06] hover:text-[var(--foreground)]">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

function DialogTitle({ className, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-xl font-semibold text-[var(--foreground)]", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-[var(--foreground-muted)]", className)}
      {...props}
    />
  );
}

export { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription };
