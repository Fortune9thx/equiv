"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const STEPS = ["Question", "Criteria", "Outcomes", "Sources", "Composition", "Review"];

export function WizardProgress({ current }: { current: number }) {
  return (
    <div className="mb-10 flex items-center justify-center gap-2">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                i < current &&
                  "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
                i === current &&
                  "border-[var(--primary)] bg-[var(--card)] text-[var(--foreground)]",
                i > current &&
                  "border-[var(--surface-border)] bg-[var(--card)] text-[var(--foreground-subtle)]"
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "hidden text-[11px] sm:block",
                i === current ? "text-[var(--foreground)]" : "text-[var(--foreground-subtle)]"
              )}
            >
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={cn(
                "h-px w-6 sm:w-10",
                i < current ? "bg-[var(--primary)]" : "bg-[var(--surface-border)]"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function WizardStepTransition({ stepKey, children }: { stepKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export const WIZARD_STEP_COUNT = STEPS.length;
