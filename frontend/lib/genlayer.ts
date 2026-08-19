import { createClient } from "genlayer-js";
import { studionet, testnetAsimov, testnetBradbury, localnet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import type { Address } from "genlayer-js/types";

export { TransactionStatus };

const CHAIN_BY_NAME = {
  localnet,
  studionet,
  "testnet-asimov": testnetAsimov,
  "testnet-bradbury": testnetBradbury,
} as const;

export type GenlayerChainName = keyof typeof CHAIN_BY_NAME;

export function resolveChain(): (typeof CHAIN_BY_NAME)[GenlayerChainName] {
  const name = (process.env.NEXT_PUBLIC_GENLAYER_CHAIN ??
    "testnet-bradbury") as GenlayerChainName;
  return CHAIN_BY_NAME[name] ?? testnetBradbury;
}

/**
 * Build a genlayer-js client bound to the connected wallet address, using
 * the injected EIP-1193 provider (MetaMask, etc.) for signing. Wagmi /
 * RainbowKit own the connect-wallet UX (address display, network chrome);
 * genlayer-js owns the actual GenVM-aware read/write calls, since GenLayer
 * is not a plain EVM RPC target.
 */
export function getGenlayerClient(account: Address) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No injected wallet provider found (window.ethereum).");
  }
  return createClient({
    chain: resolveChain(),
    account,
    provider: window.ethereum,
  });
}

/** Read-only client for pages that don't require a connected wallet
 * (Explorer, Claim Detail, Precedents) -- still needs SOME account context
 * per genlayer-js's client shape, but never signs anything. */
export function getReadOnlyClient() {
  return createClient({ chain: resolveChain() });
}

/** Minimal EIP-1193 provider shape -- genlayer-js's `provider` option just
 * needs a `request({ method, params })` call, same as any injected wallet. */
interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}
