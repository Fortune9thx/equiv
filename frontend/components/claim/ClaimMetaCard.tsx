"use client";

import { useClaimMeta } from "@/hooks/useClaimFactory";
import { Skeleton } from "@/components/ui/skeleton";
import { ClaimCard } from "./ClaimCard";

export function ClaimMetaCard({ address, index }: { address: string; index: number }) {
  const { data: meta, isLoading } = useClaimMeta(address);

  if (isLoading || !meta) {
    return <Skeleton className="h-44 w-full rounded-[var(--radius-lg)]" />;
  }

  return <ClaimCard meta={meta} index={index} />;
}
