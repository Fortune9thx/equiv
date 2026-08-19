"use client";

import { useFormContext } from "react-hook-form";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateClaimInput } from "@/lib/schemas";

export function StepCriteria() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CreateClaimInput>();
  const value = watch("criteria") ?? "";

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">Binding resolution criteria</h2>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        This is the contract the adjudicator follows — literally. Equiv&apos;s resolver is
        instructed to apply these words exactly, not its own judgment of what &quot;should&quot;
        be true. Precision here is the entire product.
      </p>
      <Label htmlFor="criteria">Criteria</Label>
      <Textarea
        id="criteria"
        rows={8}
        maxLength={4000}
        className="font-mono-tight"
        placeholder="Resolves YES if the official GenLayer blog or genlayer.com publishes a mainnet launch announcement dated before 2027-04-01. If no announcement exists by that date, resolves NO. If the source is ambiguous about mainnet vs. testnet, resolves INCONCLUSIVE."
        {...register("criteria")}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-[var(--danger)]">{errors.criteria?.message}</span>
        <span className="text-[var(--foreground-subtle)]">{value.length}/4000</span>
      </div>

      <div className="mt-5 flex gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-xs text-[var(--foreground-muted)]">
        <Info className="h-4 w-4 shrink-0 text-[var(--primary)]" />
        <p>
          Good criteria name a specific, checkable source and a specific date or threshold.
          Vague criteria (&quot;if it seems likely&quot;) push the resolver toward
          INCONCLUSIVE, since Equiv is instructed to prefer that over guessing.
        </p>
      </div>
    </div>
  );
}
