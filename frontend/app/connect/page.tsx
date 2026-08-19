"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount, useConnect } from "wagmi";
import { ChevronRight, Loader2 } from "lucide-react";
import {
  FileText,
  Coins,
  Sparkles,
  ScrollText,
  Bot,
  SlidersHorizontal,
} from "lucide-react";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";

const ONBOARDING_SEEN_KEY = "equiv-onboarding-seen";

const FEATURES = [
  { icon: FileText, label: "Natural-language Claims" },
  { icon: Coins, label: "Capital Positions" },
  { icon: Sparkles, label: "AI Consensus Resolution" },
  { icon: ScrollText, label: "Living Precedents" },
  { icon: Bot, label: "Agent-Native API" },
  { icon: SlidersHorizontal, label: "Spectrum Outcomes" },
];

export default function ConnectPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { connectors, connect, isPending, variables } = useConnect();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    const alreadySeen = sessionStorage.getItem(ONBOARDING_SEEN_KEY);
    if (alreadySeen) {
      router.push("/create");
    } else {
      sessionStorage.setItem(ONBOARDING_SEEN_KEY, "1");
      setShowOnboarding(true);
    }
  }, [isConnected, router]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col lg:flex-row">
      {/* Left: dark connect panel */}
      <div className="flex w-full flex-col justify-between bg-[var(--sidebar-dark)] px-8 py-10 sm:px-14 sm:py-14 lg:w-[38%]">
        <div>
          <Link href="/" className="mb-14 inline-block text-lg font-bold text-[var(--primary)]">
            Equiv
          </Link>

          <h1 className="mb-8 text-2xl font-semibold text-[var(--foreground-on-dark)]">
            Welcome. How would you like to connect?
          </h1>

          <div className="space-y-2.5">
            {connectors.map((connector) => {
              const pendingConnector = variables?.connector;
              const connecting =
                isPending &&
                !!pendingConnector &&
                "uid" in pendingConnector &&
                pendingConnector.uid === connector.uid;
              return (
                <button
                  key={connector.uid}
                  onClick={() => connect({ connector })}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-full bg-white/[0.06] px-5 py-3.5 text-sm font-medium text-[var(--foreground-on-dark)] transition-colors hover:bg-white/[0.12] disabled:opacity-50"
                >
                  <span className="flex items-center gap-3">
                    {connector.icon ? (
                      <Image
                        src={connector.icon}
                        alt=""
                        width={20}
                        height={20}
                        className="rounded-sm"
                      />
                    ) : null}
                    {connector.name}
                  </span>
                  {connecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--foreground-on-dark-muted)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-6">
          <p className="mb-3 text-sm text-[var(--foreground-on-dark-muted)]">
            Want to look around first?
          </p>
          <Link
            href="/claims"
            className="flex items-center justify-between rounded-full bg-white/[0.06] px-5 py-3.5 text-sm font-medium text-[var(--foreground-on-dark)] transition-colors hover:bg-white/[0.12]"
          >
            Browse open Claims
            <ChevronRight className="h-4 w-4 text-[var(--foreground-on-dark-muted)]" />
          </Link>
        </div>
      </div>

      {/* Right: soft green value panel */}
      <div className="bg-soft-green flex flex-1 flex-col items-center justify-center px-8 py-16 text-center sm:px-14">
        <h2 className="mx-auto mb-10 max-w-lg text-3xl font-bold leading-tight text-[var(--foreground)] sm:text-4xl">
          The resolution layer for claims language alone can settle.
        </h2>

        <div className="grid w-full max-w-xl grid-cols-2 gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2.5 rounded-[var(--radius-lg)] bg-white/60 p-4"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-sm)] bg-white">
                <Icon className="h-4 w-4 text-[#00785A]" />
              </span>
              <span className="text-xs font-semibold leading-snug text-[var(--foreground)]">
                {label}
              </span>
            </div>
          ))}
        </div>

        <p className="mt-10 max-w-md text-sm text-[var(--foreground-muted)]">
          Save time settling ambiguity. Get a verdict, backed by capital and consensus, on Equiv
          today.
        </p>
      </div>

      <OnboardingFlow
        open={showOnboarding}
        onOpenChange={(next) => {
          setShowOnboarding(next);
          if (!next) router.push("/create");
        }}
      />
    </div>
  );
}
