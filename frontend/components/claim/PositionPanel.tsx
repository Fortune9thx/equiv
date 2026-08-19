"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Loader2, CheckCircle2, XCircle, Coins } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePools, useMyPosition, useTakePosition, useClaimPayout } from "@/hooks/useClaim";
import { cn } from "@/lib/utils";
import type { ClaimDetail } from "@/lib/types";

function formatGen(wei: string): string {
  const value = Number(wei) / 1e18;
  if (!Number.isFinite(value)) return "0";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export function PositionPanel({ claim, address }: { claim: ClaimDetail; address: string }) {
  const { isConnected } = useAccount();
  const { data: pools } = usePools(address);
  const { data: myPosition } = useMyPosition(address);
  const [selectedOutcome, setSelectedOutcome] = useState(claim.outcomes[0] ?? "");
  const [stake, setStake] = useState("1");

  const takePosition = useTakePosition(address);
  const payout = useClaimPayout(address);

  const totalPool = Object.values(pools ?? {}).reduce((sum, v) => sum + Number(v), 0);
  const isOpen = claim.status === "Open";
  const isTerminal = claim.status === "Resolved" || claim.status === "Inconclusive";

  const takeState = takePosition.txState.phase;
  const payoutState = payout.txState.phase;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {claim.outcomes.map((outcome) => {
          const amount = pools?.[outcome] ?? "0";
          const pct = totalPool > 0 ? (Number(amount) / totalPool) * 100 : 0;
          const isSelected = selectedOutcome === outcome;
          return (
            <button
              key={outcome}
              type="button"
              disabled={!isOpen}
              onClick={() => setSelectedOutcome(outcome)}
              className={cn(
                "w-full rounded-[var(--radius-sm)] border p-3.5 text-left transition-colors disabled:cursor-default",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                  : "border-[var(--surface-border)] bg-[var(--card)] hover:border-[var(--surface-border-strong)]"
              )}
            >
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium">{outcome}</span>
                <span className="font-mono-tight text-[var(--foreground-muted)]">
                  {formatGen(amount)} GEN
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  className="h-full rounded-full bg-[var(--primary)]"
                />
              </div>
            </button>
          );
        })}

        {!isConnected ? (
          <div className="flex flex-col items-center gap-3 pt-2 text-center">
            <p className="text-sm text-[var(--foreground-muted)]">
              Connect a wallet to take a position.
            </p>
            <ConnectButton />
          </div>
        ) : isOpen ? (
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={stake}
                onChange={(e) => setStake(e.target.value)}
                placeholder="GEN amount"
              />
              <Button
                onClick={() =>
                  takePosition.mutate({
                    outcome: selectedOutcome,
                    stakeWei: BigInt(Math.round(Number(stake || "0") * 1e18)),
                  })
                }
                disabled={takeState !== "idle" && takeState !== "error" && takeState !== "finalized"}
              >
                {takeState === "signing" || takeState === "pending" || takeState === "accepted" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Coins className="h-4 w-4" />
                )}
                Stake
              </Button>
            </div>
            <TxStatusLine phase={takeState} error={takePosition.txState.error} />
          </div>
        ) : null}

        {myPosition && Number(myPosition.amount) > 0 && (
          <div className="rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[var(--foreground-muted)]">Your position</span>
              <span className="font-mono-tight">
                {formatGen(myPosition.amount)} GEN on {myPosition.outcome}
              </span>
            </div>
            {isTerminal && !myPosition.claimed && (
              <Button
                size="sm"
                className="mt-3 w-full"
                onClick={() => payout.mutate()}
                disabled={payoutState !== "idle" && payoutState !== "error" && payoutState !== "finalized"}
              >
                {payoutState === "signing" || payoutState === "pending" || payoutState === "accepted" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Claim payout
              </Button>
            )}
            {myPosition.claimed && (
              <p className="mt-2 text-xs text-[var(--success)]">
                Claimed {formatGen(myPosition.payout)} GEN
              </p>
            )}
            <TxStatusLine phase={payoutState} error={payout.txState.error} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TxStatusLine({ phase, error }: { phase: string; error?: string }) {
  if (phase === "idle") return null;
  if (phase === "error") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[var(--danger)]">
        <XCircle className="h-3.5 w-3.5" /> {error}
      </p>
    );
  }
  if (phase === "finalized") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-[var(--success)]">
        <CheckCircle2 className="h-3.5 w-3.5" /> Finalized
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      {phase === "signing" && "Waiting for signature…"}
      {phase === "pending" && "Submitted, awaiting consensus…"}
      {phase === "accepted" && "Accepted, waiting for finalization…"}
    </p>
  );
}
