import Link from "next/link";
import {
  FileText,
  Coins,
  Sparkles,
  ScrollText,
  Bot,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: FileText, label: "Natural-language Claims" },
  { icon: Coins, label: "Capital Positions" },
  { icon: Sparkles, label: "AI Consensus Resolution" },
  { icon: ScrollText, label: "Living Precedents" },
  { icon: Bot, label: "Agent-Native API" },
  { icon: SlidersHorizontal, label: "Spectrum Outcomes" },
];

export default function LandingPage() {
  return (
    <div className="bg-soft-green">
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-10 sm:pt-16">
        <div className="max-w-2xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--foreground-muted)]">
            Adjudication layer for the agentic economy
          </p>

          <h1 className="mb-6 text-[2.75rem] font-bold leading-[1.12] tracking-tight text-[var(--foreground)] sm:text-6xl">
            Settle the claims other markets refuse.
          </h1>

          <p className="mb-9 max-w-xl text-lg leading-relaxed text-[var(--foreground-muted)]">
            Create capital-backed Claims defined entirely in natural language. GenLayer reaches
            consensus on meaning. Agents and humans take positions. Verdicts become enforceable
            precedents.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/create">
                Create a Claim <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/claims">Explore open Claims</Link>
            </Button>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="card-surface card-hover flex flex-col items-start gap-3 rounded-[var(--radius-lg)] p-5"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary-soft)]">
                <Icon className="h-5 w-5 text-[#00785A]" />
              </span>
              <span className="text-sm font-semibold leading-snug text-[var(--foreground)]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-[var(--surface-border)]">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-center text-xs font-medium tracking-wide text-[var(--foreground-subtle)]">
            Built on GenLayer Intelligent Contracts · Optimistic Democracy · Equivalence Principle
          </p>
        </div>
      </div>
    </div>
  );
}
