"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CreateClaimInput } from "@/lib/schemas";

export function StepQuestion() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CreateClaimInput>();
  const value = watch("question") ?? "";

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">What&apos;s the Claim?</h2>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        State it as a plain-language question. This is what capital gets allocated for or
        against — the binding rules for resolving it come next.
      </p>
      <Label htmlFor="question">Question</Label>
      <Textarea
        id="question"
        rows={4}
        maxLength={600}
        placeholder="Will the GenLayer mainnet launch before Q2 2027?"
        {...register("question")}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className="text-[var(--danger)]">{errors.question?.message}</span>
        <span className="text-[var(--foreground-subtle)]">{value.length}/600</span>
      </div>
    </div>
  );
}
