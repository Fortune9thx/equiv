"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function ConfidenceMeter({
  confidence,
  size = "md",
  showLabel = true,
}: {
  /** Decimal string ("0.0".."1.0"), as returned by Claim.get_claim(). */
  confidence: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}) {
  const value = Math.max(0, Math.min(1, Number(confidence) || 0));
  const pct = Math.round(value * 100);

  const height = size === "sm" ? "h-1.5" : size === "lg" ? "h-2.5" : "h-2";

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[var(--foreground-subtle)]">Confidence</span>
          <span className="font-mono-tight text-[var(--foreground)]">{pct}%</span>
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full bg-[var(--surface-hover)]", height)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-[var(--primary)]"
        />
      </div>
    </div>
  );
}
