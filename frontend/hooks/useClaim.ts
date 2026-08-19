"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { useReadOnlyClient } from "./useGenlayerClient";
import { useClaimTransaction } from "./useClaimTransaction";
import { ClaimMethods } from "@/lib/contracts";
import type { ClaimDetail, Position } from "@/lib/types";

export function useClaimDetail(address: string | undefined) {
  const client = useReadOnlyClient();
  return useQuery({
    queryKey: ["claim-detail", address],
    queryFn: async () => {
      return (await client.readContract({
        address: address as `0x${string}`,
        functionName: ClaimMethods.getClaim,
        args: [],
      })) as unknown as ClaimDetail;
    },
    enabled: Boolean(address),
    // Resolution can be mid-flight (status "Resolving") -- poll while a
    // claim isn't in a terminal state so the UI reflects consensus landing
    // without the user needing to refresh.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "Resolving" ? 4000 : false;
    },
  });
}

export function usePools(address: string | undefined) {
  const client = useReadOnlyClient();
  return useQuery({
    queryKey: ["claim-pools", address],
    queryFn: async () => {
      return (await client.readContract({
        address: address as `0x${string}`,
        functionName: ClaimMethods.getPools,
        args: [],
      })) as unknown as Record<string, string>;
    },
    enabled: Boolean(address),
  });
}

export function usePosition(address: string | undefined, holder: string | undefined) {
  const client = useReadOnlyClient();
  return useQuery({
    queryKey: ["claim-position", address, holder],
    queryFn: async () => {
      if (!address || !holder) {
        throw new Error("usePosition called without address/holder");
      }
      return (await client.readContract({
        address: address as `0x${string}`,
        functionName: ClaimMethods.getPosition,
        args: [holder],
      })) as unknown as Position;
    },
    enabled: Boolean(address && holder),
  });
}

export function useMyPosition(claimAddress: string | undefined) {
  const { address } = useAccount();
  return usePosition(claimAddress, address);
}

export function useTakePosition(claimAddress: string) {
  const { state, run, reset } = useClaimTransaction();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ outcome, stakeWei }: { outcome: string; stakeWei: bigint }) => {
      return run(async (client) =>
        client.writeContract({
          address: claimAddress as `0x${string}`,
          functionName: ClaimMethods.takePosition,
          args: [outcome],
          value: stakeWei,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim-pools", claimAddress] });
      queryClient.invalidateQueries({ queryKey: ["claim-position", claimAddress] });
      queryClient.invalidateQueries({ queryKey: ["claim-detail", claimAddress] });
    },
  });

  return { ...mutation, txState: state, resetTx: reset };
}

export function useResolveClaim(claimAddress: string) {
  const { state, run, reset } = useClaimTransaction();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return run(async (client) =>
        client.writeContract({
          address: claimAddress as `0x${string}`,
          functionName: ClaimMethods.resolve,
          args: [],
          value: 0n,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim-detail", claimAddress] });
    },
  });

  return { ...mutation, txState: state, resetTx: reset };
}

export function useClaimPayout(claimAddress: string) {
  const { state, run, reset } = useClaimTransaction();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return run(async (client) =>
        client.writeContract({
          address: claimAddress as `0x${string}`,
          functionName: ClaimMethods.claimPayout,
          args: [],
          value: 0n,
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claim-position", claimAddress] });
    },
  });

  return { ...mutation, txState: state, resetTx: reset };
}
