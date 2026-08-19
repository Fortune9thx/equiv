"use client";

import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CreateClaimInput } from "@/lib/schemas";

export function StepReview() {
  const {
    register,
    watch,
    formState: { errors },
  } = useFormContext<CreateClaimInput>();
  const values = watch();

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">Review &amp; open</h2>
      <p className="mb-6 text-sm text-[var(--foreground-muted)]">
        This creates a new on-chain Claim contract via ClaimFactory.deploy_claim. Positions can
        be taken the moment it&apos;s live.
      </p>

      <div className="space-y-5 rounded-[var(--radius-lg)] border border-[var(--surface-border)] bg-[var(--surface)] p-5">
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-[var(--foreground-subtle)]">
            Question
          </div>
          <p className="text-sm">{values.question || "—"}</p>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-[var(--foreground-subtle)]">
            Criteria
          </div>
          <p className="font-mono-tight text-sm text-[var(--foreground-muted)]">
            {values.criteria || "—"}
          </p>
        </div>
        <div>
          <div className="mb-1.5 text-xs uppercase tracking-wide text-[var(--foreground-subtle)]">
            Outcomes
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(values.outcomes ?? []).filter(Boolean).map((o) => (
              <Badge key={o} variant="neutral">
                {o}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs uppercase tracking-wide text-[var(--foreground-subtle)]">
            Seed sources
          </div>
          <ul className="space-y-1 text-sm text-[#00785A]">
            {(values.seedSources ?? []).filter(Boolean).map((s) => (
              <li key={s} className="truncate">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="endTime">Resolves after</Label>
          <Input
            id="endTime"
            type="datetime-local"
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value) : undefined;
              if (date) {
                register("endTime").onChange({ target: { value: date, name: "endTime" } });
              }
            }}
          />
          <p className="mt-1 text-xs text-[var(--danger)]">{errors.endTime?.message}</p>
        </div>
        <div>
          <Label htmlFor="stakeGen">Creation stake (GEN)</Label>
          <Input id="stakeGen" type="number" step="0.01" min="0" {...register("stakeGen")} />
          <p className="mt-1 text-xs text-[var(--danger)]">{errors.stakeGen?.message}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-xs text-[var(--foreground-muted)]">
        <span>Estimated cost</span>
        <span className="font-mono-tight text-[var(--foreground)]">
          {values.stakeGen || "0"} GEN creation stake + network gas
        </span>
      </div>
    </div>
  );
}
