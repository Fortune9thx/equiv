"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { getGenlayerClient, getReadOnlyClient } from "@/lib/genlayer";
import type { Address } from "genlayer-js/types";

/** Read-only client, safe to use with no wallet connected. */
export function useReadOnlyClient() {
  return useMemo(() => getReadOnlyClient(), []);
}

/** Signing client bound to the connected wallet, or null if disconnected. */
export function useSignerClient() {
  const { address, isConnected } = useAccount();
  return useMemo(() => {
    if (!isConnected || !address) return null;
    try {
      return getGenlayerClient(address as Address);
    } catch {
      return null;
    }
  }, [address, isConnected]);
}
