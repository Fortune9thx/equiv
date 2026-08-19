"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Compass, ScrollText, Wallet, MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { id: "create", icon: Gavel, label: "Open a Claim", href: "/create" },
  { id: "explore", icon: Compass, label: "Explore open Claims", href: "/claims" },
  { id: "precedents", icon: ScrollText, label: "Browse past verdicts", href: "/precedents" },
  { id: "positions", icon: Wallet, label: "Check my positions", href: "/positions" },
  { id: "other", icon: MoreHorizontal, label: "Just looking around", href: "/claims" },
] as const;

/**
 * Two-step first-connection onboarding: a branded welcome splash, then an
 * action chooser that routes to the relevant page. Shown once per browser
 * (tracked in sessionStorage) right after a wallet connects successfully.
 */
export function OnboardingFlow({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"welcome" | "choose">("welcome");
  const [selected, setSelected] = useState<(typeof ACTIONS)[number]["id"]>("create");

  function handleClose(next: boolean) {
    if (!next) setStep("welcome");
    onOpenChange(next);
  }

  function handleContinue() {
    const action = ACTIONS.find((a) => a.id === selected) ?? ACTIONS[0];
    onOpenChange(false);
    setStep("welcome");
    router.push(action.href);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showClose={step === "choose"}>
        {step === "welcome" ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--sidebar-dark)]">
              <span className="text-2xl font-bold text-[var(--primary)]">E</span>
            </div>
            <DialogTitle className="mb-2">Welcome to Equiv</DialogTitle>
            <DialogDescription className="mb-8">
              One resolution layer for claims defined in language — built for your agents, your
              team, and the agentic economy.
            </DialogDescription>
            <Button size="lg" className="w-full" onClick={() => setStep("choose")}>
              Get Started
            </Button>
          </div>
        ) : (
          <div>
            <DialogTitle className="mb-1">What do you want to do today?</DialogTitle>
            <DialogDescription className="mb-6">Pick a starting point — you can always change direction later.</DialogDescription>

            <div className="space-y-2">
              {ACTIONS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setSelected(id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-sm)] border px-4 py-3 text-left text-sm font-medium transition-colors",
                    selected === id
                      ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--foreground)]"
                      : "border-[var(--surface-border)] text-[var(--foreground-muted)] hover:border-[var(--surface-border-strong)]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            <Button size="lg" className="mt-6 w-full" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
