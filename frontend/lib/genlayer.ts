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
 * an EIP-1193 provider for signing. Wagmi / RainbowKit own the
 * connect-wallet UX (address display, network chrome); genlayer-js owns
 * the actual GenVM-aware read/write calls, since GenLayer is not a plain
 * EVM RPC target.
 *
 * `provider` should come from wagmi's active `connector.getProvider()`,
 * NOT the bare `window.ethereum` global -- with more than one wallet
 * extension installed (MetaMask + Coinbase Wallet, Rabby, etc., a very
 * common setup), `window.ethereum` is whichever extension last claimed the
 * global, which is not necessarily the one the user actually connected via
 * RainbowKit (wagmi resolves the correct provider per-connector using
 * EIP-6963, independent of that global). Falling back to `window.ethereum`
 * here only covers a connector that doesn't expose `getProvider()`.
 */
export function getGenlayerClient(account: Address, provider?: Eip1193Provider) {
  const resolvedProvider = provider ?? (typeof window !== "undefined" ? window.ethereum : undefined);
  if (!resolvedProvider) {
    throw new Error("No wallet provider available for the connected account.");
  }
  return createClient({
    chain: resolveChain(),
    account,
    provider: resolvedProvider,
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
