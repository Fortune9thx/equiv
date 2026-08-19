"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { getGenlayerClient, getReadOnlyClient } from "@/lib/genlayer";
import type { Address } from "genlayer-js/types";

/** Read-only client, safe to use with no wallet connected. */
export function useReadOnlyClient() {
  return useMemo(() => getReadOnlyClient(), []);
}

type SigningClient = ReturnType<typeof getGenlayerClient>;

/**
 * Signing client bound to the connected wallet, or null if disconnected
 * (or still resolving). Resolves the actual EIP-1193 provider via wagmi's
 * `connector.getProvider()` rather than the bare `window.ethereum` global
 * -- with more than one wallet extension installed, `window.ethereum` is
 * not reliably the one the user connected through RainbowKit, which
 * previously surfaced as "Connect a wallet to continue" even while the UI
 * showed a connected address. `getProvider()` is async, so this resolves
 * in an effect rather than a plain useMemo.
 */
export function useSignerClient() {
  const { address, isConnected, connector } = useAccount();
  const [client, setClient] = useState<SigningClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isConnected || !address || !connector) {
      setClient(null);
      return;
    }
    (async () => {
      try {
        const provider = await connector.getProvider();
        if (cancelled) return;
        setClient(getGenlayerClient(address as Address, provider as never));
      } catch {
        if (!cancelled) setClient(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, isConnected, connector]);

  return client;
}
