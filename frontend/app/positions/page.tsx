"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { useMyPositions } from "@/hooks/useMyPositions";
import { StatusBadge } from "@/components/claim/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function formatGen(wei: string): string {
  const value = Number(wei) / 1e18;
  return Number.isFinite(value) ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0";
}

export default function PositionsPage() {
  const { isConnected } = useAccount();
  const { data: rows, isLoading } = useMyPositions();

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Positions</h1>
      <p className="mb-8 text-sm text-[var(--foreground-muted)]">
        Every Claim you&apos;ve staked capital on, and what you can claim.
      </p>

      {!isConnected ? (
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-[var(--surface-border)] py-24 text-center">
          <Wallet className="h-8 w-8 text-[var(--foreground-subtle)]" />
          <p className="text-sm text-[var(--foreground-muted)]">
            Connect a wallet to see your positions.
          </p>
          <ConnectButton />
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : !rows || rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--surface-border)] py-24 text-center">
          <p className="text-sm text-[var(--foreground-muted)]">No open positions yet.</p>
          <Link href="/claims" className="text-sm text-[#00785A] hover:underline">
            Browse Claims
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Link
              key={row.meta.address}
              href={`/claims/${row.meta.address}`}
              className="card-surface card-hover flex items-center justify-between gap-4 rounded-[var(--radius-lg)] p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center gap-2">
                  <StatusBadge status={row.status} />
                  <Badge variant="neutral">{row.position.outcome}</Badge>
                </div>
                <p className="truncate text-sm font-medium">{row.meta.question}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono-tight text-sm">{formatGen(row.position.amount)} GEN</div>
                {row.position.claimed && (
                  <div className="text-xs text-[var(--success)]">
                    Claimed {formatGen(row.position.payout)} GEN
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
