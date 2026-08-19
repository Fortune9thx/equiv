"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./StatusBadge";
import { useReadOnlyClient } from "@/hooks/useGenlayerClient";
import { ClaimMethods } from "@/lib/contracts";
import type { ClaimMeta, ClaimStatus } from "@/lib/types";

export function ClaimCard({ meta, index = 0 }: { meta: ClaimMeta; index?: number }) {
  const client = useReadOnlyClient();
  const { data: status } = useQuery({
    queryKey: ["claim-status", meta.address],
    queryFn: async () => {
      return (await client.readContract({
        address: meta.address as `0x${string}`,
        functionName: ClaimMethods.getStatus,
        args: [],
      })) as ClaimStatus;
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3) }}
    >
      <Link href={`/claims/${meta.address}`} className="block h-full">
        <div className="card-surface card-hover flex h-full flex-col rounded-[var(--radius-lg)] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <StatusBadge status={status ?? "unknown"} />
            <span className="font-mono-tight text-[11px] text-[var(--foreground-subtle)]">
              {meta.address.slice(0, 6)}…{meta.address.slice(-4)}
            </span>
          </div>

          <p className="mb-4 line-clamp-3 flex-1 text-sm font-medium leading-snug">
            {meta.question}
          </p>

          <div className="flex flex-wrap items-center gap-1.5">
            {meta.outcomes.slice(0, 4).map((o) => (
              <Badge key={o} variant="neutral">
                {o}
              </Badge>
            ))}
            {meta.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[11px] text-[#00785A]"
              >
                #{t}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
