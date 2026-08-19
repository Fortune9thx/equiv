"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ScrollText } from "lucide-react";
import { usePrecedents } from "@/hooks/usePrecedents";
import { ConfidenceMeter } from "@/components/claim/ConfidenceMeter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrecedentsPage() {
  const [search, setSearch] = useState("");
  const { data: rows, isLoading } = usePrecedents();

  const filtered = (rows ?? []).filter((row) =>
    search ? row.verdict.question.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <h1 className="mb-1 text-3xl font-semibold tracking-tight">Precedents</h1>
      <p className="mb-8 text-sm text-[var(--foreground-muted)]">
        Every resolved verdict on Equiv — citable by any new Claim as reasoning context.
      </p>

      <div className="relative mb-8 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-subtle)]" />
        <Input
          className="pl-10"
          placeholder="Search past verdicts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-[var(--radius-lg)]" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--surface-border)] py-24 text-center">
          <ScrollText className="h-8 w-8 text-[var(--foreground-subtle)]" />
          <p className="text-sm text-[var(--foreground-muted)]">No resolved verdicts yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((row) => (
            <Link
              key={row.address}
              href={`/claims/${row.address}`}
              className="card-surface card-hover block rounded-[var(--radius-lg)] p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <Badge variant={row.verdict.status === "Resolved" ? "resolved" : "inconclusive"}>
                  {row.verdict.resolved_outcome || row.verdict.status}
                </Badge>
                <span className="font-mono-tight text-[11px] text-[var(--foreground-subtle)]">
                  {row.verdict.precedent_hash}
                </span>
              </div>
              <p className="mb-3 text-sm font-medium">{row.verdict.question}</p>
              <p className="mb-3 text-xs text-[var(--foreground-muted)] line-clamp-2">
                {row.verdict.reasoning_summary}
              </p>
              <div className="max-w-xs">
                <ConfidenceMeter confidence={row.verdict.confidence} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
