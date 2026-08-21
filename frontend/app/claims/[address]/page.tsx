"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { useClaimDetail } from "@/hooks/useClaim";
import { useClaimMeta } from "@/hooks/useClaimFactory";
import { StatusBadge } from "@/components/claim/StatusBadge";
import { ResolutionTheater } from "@/components/claim/ResolutionTheater";
import { PositionPanel } from "@/components/claim/PositionPanel";
import { EvidenceStream } from "@/components/claim/EvidenceStream";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ClaimDetailPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;

  // ClaimFactory registers a Claim's metadata the instant deploy_claim
  // succeeds, but the Claim contract itself can take a long, unpredictable
  // time to become independently readable on Bradbury after that -- a real
  // network characteristic (see SECURITY.md's "Bradbury finalization
  // stalls"), not a sign anything is wrong. Checking the factory's registry
  // is how this page tells "still finalizing" apart from "genuinely never
  // existed" instead of showing the same dead-end error for both.
  const { data: claimMeta, isError: isMetaError } = useClaimMeta(address);
  const { data: claim, isError: isClaimError } = useClaimDetail(address, {
    keepPollingOnError: Boolean(claimMeta),
  });

  if (claim) {
    return <ClaimDetailContent claim={claim} address={address} />;
  }

  if (isClaimError && claimMeta) {
    return <ClaimFinalizingView meta={claimMeta} address={address} />;
  }

  if (isClaimError && isMetaError) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-2 text-xl font-semibold">Claim not found</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          No Claim contract could be read at{" "}
          <span className="font-mono-tight">{address}</span>, and ClaimFactory has no record of
          this address either. Double-check the address, or that it was created on the network
          this app currently points at.
        </p>
      </div>
    );
  }

  // Still loading (metadata check, first read attempt, or both).
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-14">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}

function ClaimFinalizingView({
  meta,
  address,
}: {
  meta: NonNullable<ReturnType<typeof useClaimMeta>["data"]>;
  address: string;
}) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <div className="mb-5 flex items-center justify-center gap-2 text-sm text-[var(--primary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="font-medium">Finalizing on the network</span>
      </div>
      <h1 className="mb-3 text-2xl font-semibold leading-tight">{meta.question}</h1>
      <p className="mx-auto mb-2 max-w-md text-sm text-[var(--foreground-muted)]">
        This Claim was created successfully and is registered on-chain, but the network hasn&apos;t
        finished finalizing its contract yet. This page will update automatically once it&apos;s
        ready -- on GenLayer&apos;s Bradbury testnet this can occasionally take a while. No action
        needed; your stake is safe.
      </p>
      <p className="font-mono-tight text-xs text-[var(--foreground-subtle)]">{address}</p>
    </div>
  );
}

function ClaimDetailContent({
  claim,
  address,
}: {
  claim: NonNullable<ReturnType<typeof useClaimDetail>["data"]>;
  address: string;
}) {
  return (
    <div className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={claim.status} />
          <span className="font-mono-tight text-xs text-[var(--foreground-subtle)]">
            {address}
          </span>
        </div>
        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {claim.question}
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <ResolutionTheater claim={claim} address={address} />

          <Card>
            <CardHeader>
              <CardTitle>Binding criteria</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono-tight text-sm leading-relaxed text-[var(--foreground-muted)]">
                {claim.criteria}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seed sources</CardTitle>
            </CardHeader>
            <CardContent>
              <EvidenceStream sources={claim.seed_sources} />
            </CardContent>
          </Card>

          {claim.parent_claims.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Cited precedents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {claim.parent_claims.map((parent) => (
                  <Link
                    key={parent}
                    href={`/claims/${parent}`}
                    className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs font-mono-tight text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                    {parent}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <PositionPanel claim={claim} address={address} />
        </div>
      </div>
    </div>
  );
}
