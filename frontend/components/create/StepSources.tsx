"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, X, Link2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_SEED_SOURCES } from "@/lib/contracts";
import type { CreateClaimInput } from "@/lib/schemas";

export function StepSources() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateClaimInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "seedSources" as never,
  });

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">Seed sources</h2>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        Live URLs the resolver reads as evidence when this Claim resolves. Point at the most
        authoritative source that will actually carry the answer — official pages, primary
        documentation, not aggregators.
      </p>

      <Label>Sources ({fields.length}/{MAX_SEED_SOURCES})</Label>
      <div className="space-y-2.5">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-subtle)]" />
              <Input
                className="pl-10"
                placeholder="https://example.com/authoritative-source"
                {...register(`seedSources.${index}` as const)}
              />
            </div>
            {fields.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label="Remove source"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {fields.length < MAX_SEED_SOURCES && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => append("")}
        >
          <Plus className="h-3.5 w-3.5" /> Add source
        </Button>
      )}

      <p className="mt-2 text-xs text-[var(--danger)]">
        {errors.seedSources?.message || errors.seedSources?.root?.message}
      </p>
    </div>
  );
}
