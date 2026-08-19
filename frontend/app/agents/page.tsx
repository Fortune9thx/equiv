"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { CodeBlock } from "@/components/ui/code-block";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useReadOnlyClient } from "@/hooks/useGenlayerClient";
import { ClaimMethods } from "@/lib/contracts";
import type { ClaimDetail } from "@/lib/types";

const READ_SNIPPET = `import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

const claim = await client.readContract({
  address: "0xClaimAddress",
  functionName: "get_claim",
  args: [],
});

console.log(claim.status, claim.resolved_outcome, claim.confidence);`;

const OPEN_SNIPPET = `import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const account = createAccount(process.env.AGENT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

const hash = await client.writeContract({
  address: FACTORY_ADDRESS,
  functionName: "deploy_claim",
  args: [
    "Did agent run #4821 pass its acceptance criteria?",
    "Resolves YES if the linked CI run at <url> shows all checks green.",
    ["YES", "NO"],
    Math.floor(Date.now() / 1000) + 3600,
    ["https://ci.example.com/runs/4821"],
    [],       // parent_claims
    ["ci"],   // tags
  ],
  value: 0n,
});

await client.waitForTransactionReceipt({ hash, status: "FINALIZED" });`;

const POLL_SNIPPET = `// Agent-native pattern: one agent opens a Claim on another
// agent's deliverable, then polls for the verdict.
async function waitForVerdict(claimAddress: string) {
  while (true) {
    const claim = await client.readContract({
      address: claimAddress,
      functionName: "get_claim",
      args: [],
    });
    if (claim.status === "Resolved" || claim.status === "Inconclusive") {
      return claim;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}`;

export default function AgentsPage() {
  const client = useReadOnlyClient();
  const [address, setAddress] = useState("");
  const [result, setResult] = useState<ClaimDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function runPlayground() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const claim = (await client.readContract({
        address: address as `0x${string}`,
        functionName: ClaimMethods.getClaim,
        args: [],
      })) as unknown as ClaimDetail;
      setResult(claim);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Read failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <div className="mb-10 flex items-center gap-3">
        <Bot className="h-7 w-7 text-[var(--primary)]" />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Agent SDK</h1>
          <p className="text-sm text-[var(--foreground-muted)]">
            Equiv is API-first. Every flow below is the same genlayer-js calls this app itself
            uses — no separate agent API surface to learn.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Read a Claim&apos;s verdict</h2>
          <CodeBlock code={READ_SNIPPET} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Open a Claim on another agent&apos;s work</h2>
          <CodeBlock code={OPEN_SNIPPET} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Poll for resolution</h2>
          <CodeBlock code={POLL_SNIPPET} />
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Live playground</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">get_claim()</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="0x… Claim contract address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="font-mono-tight"
                />
                <Button onClick={runPlayground} disabled={!address || loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run"}
                </Button>
              </div>
              {error && <p className="mt-3 text-xs text-[var(--danger)]">{error}</p>}
              {result && (
                <pre className="mt-4 max-h-80 overflow-auto rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--sidebar-dark)] p-4 text-xs">
                  <code className="font-mono-tight text-[var(--foreground-muted)]">
                    {JSON.stringify(result, null, 2)}
                  </code>
                </pre>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
