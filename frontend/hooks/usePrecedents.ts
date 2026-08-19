"use client";

import { useQuery } from "@tanstack/react-query";
import { useReadOnlyClient } from "./useGenlayerClient";
import { CLAIM_FACTORY_ADDRESS, CLAIM_FACTORY_CONFIGURED, ClaimFactoryMethods, ClaimMethods } from "@/lib/contracts";
import type { ClaimVerdict } from "@/lib/types";

export interface PrecedentRow {
  address: string;
  verdict: ClaimVerdict;
}

export function usePrecedents() {
  const client = useReadOnlyClient();

  return useQuery({
    queryKey: ["precedents"],
    queryFn: async (): Promise<PrecedentRow[]> => {
      const addresses = (await client.readContract({
        address: CLAIM_FACTORY_ADDRESS,
        functionName: ClaimFactoryMethods.getClaims,
        args: [],
      })) as unknown as string[];

      const rows = await Promise.all(
        addresses.map(async (address) => {
          const verdict = (await client.readContract({
            address: address as `0x${string}`,
            functionName: ClaimMethods.getVerdict,
            args: [],
          })) as unknown as ClaimVerdict;
          return { address, verdict };
        })
      );

      return rows.filter((row) => Boolean(row.verdict.precedent_hash));
    },
    enabled: CLAIM_FACTORY_CONFIGURED,
  });
}
