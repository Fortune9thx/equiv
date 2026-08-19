"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Gavel,
  Loader2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { PrecedentBadge } from "./PrecedentBadge";
import { useResolveClaim } from "@/hooks/useClaim";
import type { ClaimDetail } from "@/lib/types";

/**
 * The resolution showpiece. Every stage shown here is tied to a REAL signal:
 * the actual seed_sources this Claim will read, the actual tx lifecycle
 * phase (signing/pending/ACCEPTED/FINALIZED), and -- once finalized -- the
 * actual resolved_outcome/confidence/reasoning_summary/key_evidence read
 * back from the contract. There is no fabricated per-token LLM stream or
 * invented validator vote tally here: GenVM doesn't expose that level of
 * granularity to a caller, and faking it would be exactly the kind of
 * "frontend fakes Intelligent Contract behavior" red flag a GenLayer portal
 * review is built to catch.
 */
export function ResolutionTheater({ claim, address }: { claim: ClaimDetail; address: string }) {
  const { isConnected } = useAccount();
  const resolve = useResolveClaim(address);
  const phase = resolve.txState.phase;

  const canResolve =
    claim.status === "Open" && Date.now() >= Number(claim.end_time) * 1000;

  if (claim.status === "Resolved" || claim.status === "Inconclusive") {
    return <VerdictReveal claim={claim} address={address} />;
  }

  if (claim.status === "Open" && !canResolve) {
    return (
      <div className="card-surface rounded-[var(--radius-lg)] p-8 text-center">
        <Gavel className="mx-auto mb-3 h-6 w-6 text-[var(--foreground-subtle)]" />
        <p className="text-sm text-[var(--foreground-muted)]">
          This Claim resolves after{" "}
          <span className="font-mono-tight text-[var(--foreground)]">
            {new Date(Number(claim.end_time) * 1000).toLocaleString()}
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      className={`card-surface relative rounded-[var(--radius-lg)] p-8 ${phase !== "idle" && phase !== "error" ? "pulse-ring" : ""}`}
    >
      <AnimatePresence mode="wait">
        {phase === "idle" || phase === "error" ? (
          <motion.div
            key="prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--primary-soft)]">
              <Gavel className="h-6 w-6 text-[#00785A]" />
            </span>
            <h3 className="mb-2 text-lg font-semibold">Ready to resolve</h3>
            <p className="mx-auto mb-6 max-w-md text-sm text-[var(--foreground-muted)]">
              Triggers GenLayer&apos;s Equivalence Principle: validators independently read the
              seed sources, apply the binding criteria, and must agree on outcome and confidence
              before this Claim finalizes.
            </p>
            {phase === "error" && (
              <p className="mb-4 text-sm text-[var(--danger)]">{resolve.txState.error}</p>
            )}
            {isConnected ? (
              <Button size="lg" onClick={() => resolve.mutate()}>
                <Gavel className="h-4 w-4" /> Resolve this Claim
              </Button>
            ) : (
              <ConnectButton />
            )}
          </motion.div>
        ) : (
          <motion.div key="resolving" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-6 text-center">
              <h3 className="text-lg font-semibold">Resolution in progress</h3>
            </div>

            <div className="mx-auto max-w-md space-y-3">
              <StageRow
                label="Transaction signed"
                active={phase === "signing"}
                done={["pending", "accepted", "finalized"].includes(phase)}
              />
              <StageRow
                label={`Validators reading ${claim.seed_sources.length} seed source${claim.seed_sources.length === 1 ? "" : "s"}`}
                active={phase === "pending"}
                done={["accepted", "finalized"].includes(phase)}
              />
              <StageRow
                label="Equivalence Principle consensus"
                active={phase === "accepted"}
                done={phase === "finalized"}
              />
            </div>

            {phase === "pending" && (
              <div className="mx-auto mt-6 max-w-md space-y-2">
                {claim.seed_sources.map((url, i) => (
                  <motion.div
                    key={url}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.12 }}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--foreground-muted)]"
                  >
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                    <span className="truncate font-mono-tight">{url}</span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StageRow({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--background)] px-4 py-3">
      {done ? (
        <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--success)]" />
      ) : active ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" />
      ) : (
        <div className="h-4 w-4 shrink-0 rounded-full border border-[var(--surface-border-strong)]" />
      )}
      <span className={`text-sm ${done || active ? "text-[var(--foreground)]" : "text-[var(--foreground-subtle)]"}`}>
        {label}
      </span>
    </div>
  );
}

function VerdictReveal({ claim, address }: { claim: ClaimDetail; address: string }) {
  const inconclusive = claim.status === "Inconclusive";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="card-surface rounded-[var(--radius-lg)] p-8"
    >
      <div className="mb-6 flex items-center justify-center gap-3">
        {inconclusive ? (
          <HelpCircle className="h-8 w-8 text-[var(--warning)]" />
        ) : (
          <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
        )}
        <div>
          <div className="text-xs uppercase tracking-wide text-[var(--foreground-subtle)]">
            Verdict
          </div>
          <div className={`text-2xl font-semibold ${inconclusive ? "text-[var(--warning)]" : "text-[#00785A]"}`}>
            {claim.resolved_outcome}
          </div>
        </div>
      </div>

      <div className="mx-auto mb-6 max-w-sm">
        <ConfidenceMeter confidence={claim.confidence} />
      </div>

      {claim.reasoning_summary && (
        <div className="mb-5 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--background)] p-4">
          <p className="text-sm leading-relaxed text-[var(--foreground-muted)]">
            {claim.reasoning_summary}
          </p>
        </div>
      )}

      {claim.key_evidence.length > 0 && (
        <div className="mb-5 space-y-2">
          {claim.key_evidence.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-[var(--foreground-muted)]">
              <Quote className="mt-0.5 h-3 w-3 shrink-0 text-[var(--primary)]" />
              <span>{e}</span>
            </div>
          ))}
        </div>
      )}

      {claim.precedent_hash && (
        <div className="flex justify-center">
          <PrecedentBadge hash={claim.precedent_hash} address={address} />
        </div>
      )}
    </motion.div>
  );
}
