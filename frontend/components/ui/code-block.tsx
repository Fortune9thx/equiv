"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] bg-[var(--sidebar-dark)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <span className="text-xs text-[var(--foreground-on-dark-muted)]">{label ?? "TypeScript"}</span>
        <Button variant="ghost" size="sm" onClick={copy} className="text-[var(--foreground-on-dark-muted)] hover:text-[var(--foreground-on-dark)] hover:bg-white/10">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code className="font-mono-tight text-[var(--foreground-on-dark)]">{code}</code>
      </pre>
    </div>
  );
}
