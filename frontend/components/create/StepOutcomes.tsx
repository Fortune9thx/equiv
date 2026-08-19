"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_OUTCOMES, MIN_OUTCOMES } from "@/lib/contracts";
import type { CreateClaimInput } from "@/lib/schemas";

export function StepOutcomes() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateClaimInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "outcomes" as never,
  });

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">Declared outcomes</h2>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        Equiv supports more than YES/NO — declare a spectrum of outcomes if the question is
        genuinely multi-valued. The resolver always has a third option it can reach on its own:
        INCONCLUSIVE, if evidence is insufficient.
      </p>

      <Label>Outcomes ({fields.length}/{MAX_OUTCOMES})</Label>
      <div className="space-y-2.5">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              placeholder={index === 0 ? "YES" : index === 1 ? "NO" : `Outcome ${index + 1}`}
              {...register(`outcomes.${index}` as const)}
            />
            {fields.length > MIN_OUTCOMES && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label="Remove outcome"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {fields.length < MAX_OUTCOMES && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => append("")}
        >
          <Plus className="h-3.5 w-3.5" /> Add outcome
        </Button>
      )}

      <p className="mt-2 text-xs text-[var(--danger)]">
        {errors.outcomes?.message || errors.outcomes?.root?.message}
      </p>
    </div>
  );
}
