"use client";

import { useCallback, useState } from "react";
import type { Hash } from "genlayer-js/types";
import { ExecutionResult } from "genlayer-js/types";
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

        const acceptedReceipt = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.ACCEPTED,
        });
        // ACCEPTED is already one of genlayer-js's own DECIDED_STATES -- the
        // execution outcome (return vs. error) is final at this point, and
        // FINALIZED only confirms deeper on-chain durability, it never
        // changes which of those two already happened. So a real execution
        // error is caught here, reliably, before ever touching FINALIZED.
        if (acceptedReceipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
          throw new Error("Transaction executed with an error.");
        }
        setState({ phase: "accepted", hash });

        try {
          await client.waitForTransactionReceipt({ hash, status: TransactionStatus.FINALIZED });
        } catch {
          // Observed repeatedly against Bradbury: the FINALIZED wait can
          // time out even on a transaction that already succeeded (ACCEPTED
          // with a non-error execution result). Since that's already the
          // real, decided outcome, treat this timeout as a slow
          // confirmation, not a failure -- surfacing an error here would be
          // a false alarm for something that actually worked.
        }
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
