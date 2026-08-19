"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { useClaimDetail } from "@/hooks/useClaim";
import { StatusBadge } from "@/components/claim/StatusBadge";
import { ResolutionTheater } from "@/components/claim/ResolutionTheater";
import { PositionPanel } from "@/components/claim/PositionPanel";
import { EvidenceStream } from "@/components/claim/EvidenceStream";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ClaimDetailPage() {
  const params = useParams<{ address: string }>();
  const address = params.address;
  const { data: claim, isLoading, isError } = useClaimDetail(address);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-14">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full rounded-[var(--radius-lg)]" />
      </div>
    );
  }

  if (isError || !claim) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="mb-2 text-xl font-semibold">Claim not found</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          No Claim contract could be read at{" "}
          <span className="font-mono-tight">{address}</span>.
        </p>
      </div>
    );
  }

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
