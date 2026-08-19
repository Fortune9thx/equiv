import Link from "next/link";
import { ScrollText } from "lucide-react";

export function PrecedentBadge({ hash, address }: { hash: string; address?: string }) {
  if (!hash) return null;
  const content = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/25 bg-[var(--primary-soft)] px-2.5 py-1 text-xs font-mono-tight text-[#00785A]">
      <ScrollText className="h-3 w-3" />
      {hash}
    </span>
  );
  if (!address) return content;
  return (
    <Link href={`/claims/${address}`} className="transition-opacity hover:opacity-80">
      {content}
    </Link>
  );
}
