"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useReadOnlyClient } from "./useGenlayerClient";
import { CLAIM_FACTORY_ADDRESS, CLAIM_FACTORY_CONFIGURED, ClaimFactoryMethods, ClaimMethods } from "@/lib/contracts";
import type { ClaimMeta, ClaimStatus, Position } from "@/lib/types";

export interface MyPositionRow {
  meta: ClaimMeta;
  status: ClaimStatus;
  position: Position;
}

/**
 * There is no global "positions by holder" index on-chain (each Claim only
 * tracks its own position_holders) -- so this walks every deployed Claim
 * and checks the connected wallet's position on each. Fine at testnet
 * scale; documented in ARCHITECTURE.md as a scaling item, not silently
 * pretending to be a real index.
 */
export function useMyPositions() {
  const { address } = useAccount();
  const client = useReadOnlyClient();

  return useQuery({
    queryKey: ["my-positions", address],
    queryFn: async (): Promise<MyPositionRow[]> => {
      if (!address) throw new Error("useMyPositions called without a connected wallet");
      const addresses = (await client.readContract({
        address: CLAIM_FACTORY_ADDRESS,
        functionName: ClaimFactoryMethods.getClaims,
        args: [],
      })) as unknown as string[];

      const rows = await Promise.all(
        addresses.map(async (claimAddress) => {
          const [meta, status, position] = await Promise.all([
            client.readContract({
              address: CLAIM_FACTORY_ADDRESS,
              functionName: ClaimFactoryMethods.getClaimMeta,
              args: [claimAddress],
            }) as unknown as Promise<ClaimMeta>,
            client.readContract({
              address: claimAddress as `0x${string}`,
              functionName: ClaimMethods.getStatus,
              args: [],
            }) as unknown as Promise<ClaimStatus>,
            client.readContract({
              address: claimAddress as `0x${string}`,
              functionName: ClaimMethods.getPosition,
              args: [address],
            }) as unknown as Promise<Position>,
          ]);
          return { meta, status, position };
        })
      );

      return rows.filter((row) => Number(row.position.amount) > 0);
    },
    enabled: Boolean(CLAIM_FACTORY_CONFIGURED && address),
  });
}
