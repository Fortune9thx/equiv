"use client";

import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import { ThemeProvider } from "next-themes";
import "@rainbow-me/rainbowkit/styles.css";

import { wagmiConfig } from "@/lib/wagmi";

const rainbowKitTheme = lightTheme({
  accentColor: "#00D68F",
  accentColorForeground: "#05231A",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 10_000, refetchOnWindowFocus: false },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider theme={rainbowKitTheme} initialChain={wagmiConfig.chains[0]}>
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
