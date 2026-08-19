import { Link2 } from "lucide-react";

export function EvidenceStream({ sources }: { sources: string[] }) {
  if (sources.length === 0) return null;
  return (
    <div className="space-y-2">
      {sources.map((url) => (
        <a
          key={url}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--card)] px-3.5 py-2.5 text-xs text-[var(--foreground-muted)] transition-colors hover:border-[var(--primary)]/30 hover:text-[var(--foreground)]"
        >
          <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
          <span className="truncate font-mono-tight">{url}</span>
        </a>
      ))}
    </div>
  );
}
