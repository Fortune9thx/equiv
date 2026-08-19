import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Header } from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Equiv — The resolution layer for language-defined Claims",
  description:
    "Equiv is a capital market and resolution layer for high-ambiguity, language-defined Claims, adjudicated by GenLayer's Equivalence Principle consensus.",
};

// Wallet-dependent providers execute on the server during static generation;
// there's nothing meaningful to prerender in a wallet-first app, so every
// route opts out of it as a second line of defense alongside the projectId
// fallback in lib/wagmi.ts.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
