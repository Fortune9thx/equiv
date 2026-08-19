import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { testnetBradbury } from "genlayer-js/chains";

/**
 * RainbowKit is used purely for wallet-connect UX chrome (MetaMask, address
 * display, disconnect) -- actual contract reads/writes go through
 * genlayer-js (see lib/genlayer.ts), not wagmi's own contract hooks, since
 * GenLayer's consensus/write lifecycle isn't a plain EVM call.
 *
 * The chain object is genlayer-js's own `testnetBradbury` export (built with
 * viem's `defineChain`, so it's already wagmi/RainbowKit-compatible) rather
 * than a hand-rolled duplicate -- an earlier version of this file guessed at
 * the RPC/explorer URLs and got them wrong. Always take the real chain
 * object from genlayer-js/chains instead of re-deriving it.
 *
 * getDefaultConfig() throws synchronously on a falsy projectId, which
 * crashes the whole App Router build during static generation (any route
 * that imports this file, even indirectly via the root layout's provider,
 * gets executed server-side at build time). A real WalletConnect Cloud
 * project id requires an external account the user must create themselves,
 * so we fall back to a syntactically-valid placeholder -- injected wallets
 * work completely normally with it; only the WalletConnect-cloud-backed
 * QR/remote-config path degrades. See rainbowkit-wagmi-nextjs-gotchas.
 */
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "00000000000000000000000000000000";

export const wagmiConfig = getDefaultConfig({
  appName: "Equiv",
  projectId,
  chains: [testnetBradbury],
  ssr: true,
});
