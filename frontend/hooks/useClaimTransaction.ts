"use client";

import { useCallback, useState } from "react";
import type { Hash } from "genlayer-js/types";
import { TransactionStatus } from "@/lib/genlayer";
import { useSignerClient } from "./useGenlayerClient";

/**
 * Generic GenLayer write-transaction lifecycle: signing -> pending ->
 * ACCEPTED -> FINALIZED -> done, or error at any step. Every write path in
 * the app (deploy_claim, take_position, resolve, claim_payout) drives its
 * UI off this exact state machine so the "full transaction lifecycle" is
 * never faked or skipped -- see quality-bar note in ARCHITECTURE.md.
 */
export type TxPhase = "idle" | "signing" | "pending" | "accepted" | "finalized" | "error";

export interface TxState {
  phase: TxPhase;
  hash?: Hash;
  error?: string;
}

type SignerClient = NonNullable<ReturnType<typeof useSignerClient>>;

export function useClaimTransaction() {
  const client = useSignerClient();
  const [state, setState] = useState<TxState>({ phase: "idle" });

  const run = useCallback(
    async (fn: (client: SignerClient) => Promise<Hash>) => {
      if (!client) {
        setState({ phase: "error", error: "Connect a wallet to continue." });
        return null;
      }
      setState({ phase: "signing" });
      try {
        const hash = await fn(client);
        setState({ phase: "pending", hash });

        await client.waitForTransactionReceipt({ hash, status: TransactionStatus.ACCEPTED });
        setState({ phase: "accepted", hash });

        await client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED });
        setState({ phase: "finalized", hash });
        return hash;
      } catch (err) {
        setState({
          phase: "error",
          error: err instanceof Error ? err.message : "Transaction failed.",
        });
        return null;
      }
    },
    [client]
  );

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  return { state, run, reset, client };
}
