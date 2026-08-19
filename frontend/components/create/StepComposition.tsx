"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MAX_PARENT_CLAIMS, MAX_TAGS } from "@/lib/contracts";
import type { CreateClaimInput } from "@/lib/schemas";

export function StepComposition() {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<CreateClaimInput>();
  const parentClaims = useFieldArray({ control, name: "parentClaims" as never });
  const tags = useFieldArray({ control, name: "tags" as never });

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">Composition (optional)</h2>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        Claims can cite other resolved Claims as precedent — their verdicts feed directly into
        this one&apos;s resolution prompt. Both fields are optional.
      </p>

      <Label>Parent Claims ({parentClaims.fields.length}/{MAX_PARENT_CLAIMS})</Label>
      <div className="space-y-2.5">
        {parentClaims.fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-2">
            <Input
              className="font-mono-tight"
              placeholder="0x…"
              {...register(`parentClaims.${index}` as const)}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => parentClaims.remove(index)}
              aria-label="Remove parent claim"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      {parentClaims.fields.length < MAX_PARENT_CLAIMS && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => parentClaims.append("")}
        >
          <Plus className="h-3.5 w-3.5" /> Cite a parent Claim
        </Button>
      )}
      <p className="mt-2 text-xs text-[var(--danger)]">{errors.parentClaims?.message}</p>

      <div className="mt-8">
        <Label>Tags ({tags.fields.length}/{MAX_TAGS})</Label>
        <div className="flex flex-wrap gap-2">
          {tags.fields.map((field, index) => (
            <div
              key={field.id}
              className="flex items-center gap-1.5 rounded-full border border-[var(--surface-border)] bg-[var(--surface)] py-1 pl-3 pr-1.5"
            >
              <input
                className="w-24 bg-transparent text-sm outline-none placeholder:text-[var(--foreground-subtle)]"
                placeholder="tag"
                {...register(`tags.${index}` as const)}
              />
              <button
                type="button"
                onClick={() => tags.remove(index)}
                className="rounded-full p-0.5 text-[var(--foreground-subtle)] hover:text-[var(--foreground)]"
                aria-label="Remove tag"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {tags.fields.length < MAX_TAGS && (
            <Button type="button" variant="secondary" size="sm" onClick={() => tags.append("")}>
              <Plus className="h-3.5 w-3.5" /> Add tag
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-[var(--danger)]">{errors.tags?.message}</p>
      </div>
    </div>
  );
}
