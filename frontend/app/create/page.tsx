"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";

import { WizardProgress, WizardStepTransition, WIZARD_STEP_COUNT } from "@/components/create/WizardShell";
import { StepQuestion } from "@/components/create/StepQuestion";
import { StepCriteria } from "@/components/create/StepCriteria";
import { StepOutcomes } from "@/components/create/StepOutcomes";
import { StepSources } from "@/components/create/StepSources";
import { StepComposition } from "@/components/create/StepComposition";
import { StepReview } from "@/components/create/StepReview";
import { Button } from "@/components/ui/button";
import { createClaimSchema, type CreateClaimInput } from "@/lib/schemas";
import { useDeployClaim } from "@/hooks/useClaimFactory";
import { CLAIM_FACTORY_CONFIGURED } from "@/lib/contracts";

const STEP_FIELDS: (keyof CreateClaimInput)[][] = [
  ["question"],
  ["criteria"],
  ["outcomes"],
  ["seedSources"],
  ["parentClaims", "tags"],
  ["endTime", "stakeGen"],
];

const GEN_DECIMALS = 18n;

function toWei(value: string): bigint {
  const [whole, frac = ""] = value.split(".");
  const paddedFrac = (frac + "0".repeat(Number(GEN_DECIMALS))).slice(0, Number(GEN_DECIMALS));
  return BigInt(whole || "0") * 10n ** GEN_DECIMALS + BigInt(paddedFrac || "0");
}

export default function CreateClaimPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const isLastStep = step === WIZARD_STEP_COUNT - 1;

  const methods = useForm<CreateClaimInput>({
    resolver: zodResolver(createClaimSchema),
    mode: "onBlur",
    defaultValues: {
      question: "",
      criteria: "",
      outcomes: ["YES", "NO"],
      seedSources: [""],
      parentClaims: [],
      tags: [],
      stakeGen: "0",
    },
  });

  const { trigger, handleSubmit } = methods;
  const deploy = useDeployClaim();

  async function goNext() {
    const fields = STEP_FIELDS[step];
    const valid = fields ? await trigger(fields as never) : true;
    if (valid) setStep((s) => Math.min(s + 1, WIZARD_STEP_COUNT - 1));
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  const onSubmit = handleSubmit(async (data) => {
    const claimAddress = await deploy.mutateAsync({
      question: data.question,
      criteria: data.criteria,
      outcomes: data.outcomes.map((o) => o.trim()),
      endTime: Math.floor(data.endTime.getTime() / 1000),
      seedSources: data.seedSources.map((s) => s.trim()),
      parentClaims: data.parentClaims,
      tags: data.tags,
      stakeWei: toWei(data.stakeGen || "0"),
    });
    if (claimAddress) {
      router.push(`/claims/${claimAddress}`);
    }
  });

  if (!CLAIM_FACTORY_CONFIGURED) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-3 text-2xl font-semibold">ClaimFactory not configured</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          Set <code className="font-mono-tight">NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS</code> after
          deploying <code className="font-mono-tight">contracts/ClaimFactory.py</code>. See
          deploy/deploy.mjs.
        </p>
      </div>
    );
  }

  const txPhase = deploy.txState.phase;
  const isSubmitting = txPhase !== "idle" && txPhase !== "error" && txPhase !== "finalized";

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <WizardProgress current={step} />

      <FormProvider {...methods}>
        <form onSubmit={onSubmit}>
          <WizardStepTransition stepKey={String(step)}>
            {step === 0 && <StepQuestion />}
            {step === 1 && <StepCriteria />}
            {step === 2 && <StepOutcomes />}
            {step === 3 && <StepSources />}
            {step === 4 && <StepComposition />}
            {step === 5 && <StepReview />}
          </WizardStepTransition>

          {txPhase !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 text-sm"
            >
              {txPhase === "error" ? (
                <>
                  <XCircle className="h-4 w-4 shrink-0 text-[var(--danger)]" />
                  <span className="text-[var(--danger)]">{deploy.txState.error}</span>
                </>
              ) : txPhase === "finalized" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--success)]" />
                  <span>Claim finalized. Redirecting…</span>
                </>
              ) : (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" />
                  <span className="capitalize">
                    {txPhase === "signing" && "Waiting for wallet signature…"}
                    {txPhase === "pending" && "Transaction submitted, awaiting consensus…"}
                    {txPhase === "accepted" && "Accepted — waiting for finalization…"}
                  </span>
                </>
              )}
            </motion.div>
          )}

          <div className="mt-10 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={step === 0 || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>

            {isLastStep ? (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Open Claim
              </Button>
            ) : (
              <Button type="button" onClick={goNext}>
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
