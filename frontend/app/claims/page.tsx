"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, PlusCircle, Inbox } from "lucide-react";
import { useClaimAddresses } from "@/hooks/useClaimFactory";
import { ClaimMetaCard } from "@/components/claim/ClaimMetaCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CLAIM_FACTORY_CONFIGURED } from "@/lib/contracts";

export default function ClaimsExplorerPage() {
  const [search, setSearch] = useState("");
  const { data: addresses, isLoading } = useClaimAddresses();

  const filtered = (addresses ?? []).filter((addr) =>
    search ? addr.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Claims Explorer</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">
            Every Claim ever opened on Equiv, live from ClaimFactory&apos;s on-chain registry.
          </p>
        </div>
        <Button asChild>
          <Link href="/create">
            <PlusCircle className="h-4 w-4" /> Open a Claim
          </Link>
        </Button>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-subtle)]" />
        <Input
          className="pl-10"
          placeholder="Search by contract address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {!CLAIM_FACTORY_CONFIGURED ? (
        <EmptyState
          title="ClaimFactory not configured"
          body="Set NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS to browse live Claims."
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No Claims yet"
          body="Be the first to open a Claim on Equiv."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((address, i) => (
            <ClaimMetaCard key={address} address={address} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--surface-border)] py-24 text-center">
      <Inbox className="mb-4 h-8 w-8 text-[var(--foreground-subtle)]" />
      <h3 className="mb-1 font-medium">{title}</h3>
      <p className="max-w-xs text-sm text-[var(--foreground-muted)]">{body}</p>
    </div>
  );
}
