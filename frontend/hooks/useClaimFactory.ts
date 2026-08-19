"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useReadOnlyClient } from "./useGenlayerClient";
import { useClaimTransaction } from "./useClaimTransaction";
import { CLAIM_FACTORY_ADDRESS, CLAIM_FACTORY_CONFIGURED, ClaimFactoryMethods } from "@/lib/contracts";
import type { ClaimMeta } from "@/lib/types";

export function useClaimAddresses() {
  const client = useReadOnlyClient();
  return useQuery({
    queryKey: ["claim-addresses"],
    queryFn: async () => {
      return (await client.readContract({
        address: CLAIM_FACTORY_ADDRESS,
        functionName: ClaimFactoryMethods.getClaims,
        args: [],
      })) as unknown as string[];
    },
    enabled: CLAIM_FACTORY_CONFIGURED,
  });
}

export function useClaimMeta(address: string | undefined) {
  const client = useReadOnlyClient();
  return useQuery({
    queryKey: ["claim-meta", address],
    queryFn: async () => {
      if (!address) throw new Error("useClaimMeta called without an address");
      return (await client.readContract({
        address: CLAIM_FACTORY_ADDRESS,
        functionName: ClaimFactoryMethods.getClaimMeta,
        args: [address],
      })) as unknown as ClaimMeta;
    },
    enabled: Boolean(CLAIM_FACTORY_CONFIGURED && address),
  });
}

export function useClaimsByTag(tag: string | undefined) {
  const client = useReadOnlyClient();
  return useQuery({
    queryKey: ["claims-by-tag", tag],
    queryFn: async () => {
      if (!tag) throw new Error("useClaimsByTag called without a tag");
      return (await client.readContract({
        address: CLAIM_FACTORY_ADDRESS,
        functionName: ClaimFactoryMethods.getClaimsByTag,
        args: [tag],
      })) as unknown as string[];
    },
    enabled: Boolean(CLAIM_FACTORY_CONFIGURED && tag),
  });
}

export interface DeployClaimInput {
  question: string;
  criteria: string;
  outcomes: string[];
  endTime: number;
  seedSources: string[];
  parentClaims: string[];
  tags: string[];
  stakeWei: bigint;
}

export function useDeployClaim() {
  const { state, run, reset, client: signerClient } = useClaimTransaction();
  const queryClient = useQueryClient();
  const { address: creatorAddress } = useAccount();

  const mutation = useMutation({
    mutationFn: async (input: DeployClaimInput): Promise<string | null> => {
      const hash = await run(async (client) =>
        client.writeContract({
          address: CLAIM_FACTORY_ADDRESS,
          functionName: ClaimFactoryMethods.deployClaim,
          args: [
            input.question,
            input.criteria,
            input.outcomes,
            input.endTime,
            input.seedSources,
            input.parentClaims,
            input.tags,
          ],
          value: input.stakeWei,
        })
      );
      if (!hash || !signerClient || !creatorAddress) return null;

      // deploy_claim's own return value (the new Claim's address) isn't the
      // same thing as the write transaction's hash -- reading it back from
      // the finalized receipt would mean decoding an internal calldata
      // field whose exact shape isn't confirmed. Reading the freshly
      // updated registry instead only relies on already-verified reads:
      // ClaimFactory.deploy_claim appends to claim_addresses before
      // returning, so the newest entry for this creator is the one just
      // deployed.
      const mine = (await signerClient.readContract({
        address: CLAIM_FACTORY_ADDRESS,
        functionName: ClaimFactoryMethods.getClaimsByCreator,
        args: [creatorAddress],
      })) as unknown as string[];
      return mine.at(-1) ?? null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim-addresses"] });
    },
  });

  return { ...mutation, txState: state, resetTx: reset };
}
