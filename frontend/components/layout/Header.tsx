"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/claims", label: "Explorer" },
  { href: "/create", label: "Open a Claim" },
  { href: "/positions", label: "Positions" },
  { href: "/precedents", label: "Precedents" },
  { href: "/agents", label: "Agents" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <span className="text-lg font-bold tracking-tight text-[var(--primary)]">Equiv</span>
    </Link>
  );
}

/** Minimal top nav for the landing page: logo, Connect text button, Launch App pill. */
function LandingNav() {
  const { isConnected } = useAccount();
  return (
    <header className="relative z-20">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
        <Logo />
        <div className="flex items-center gap-6">
          <ConnectButton.Custom>
            {({ openConnectModal, account, mounted }) => (
              <button
                onClick={openConnectModal}
                className="hidden text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)] sm:inline"
                style={{ visibility: mounted ? "visible" : "hidden" }}
              >
                {account ? account.displayName : "Connect"}
              </button>
            )}
          </ConnectButton.Custom>
          <Button asChild size="sm">
            <Link href={isConnected ? "/create" : "/connect"}>Launch App</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Full app-shell nav for every other page. */
function AppNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--surface-border)] bg-[var(--background)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[var(--primary-soft)] text-[#00785A]"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <ConnectButton
          showBalance={false}
          chainStatus="icon"
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
        />
      </div>
    </header>
  );
}

export function Header() {
  const pathname = usePathname();
  return pathname === "/" ? <LandingNav /> : <AppNav />;
}
