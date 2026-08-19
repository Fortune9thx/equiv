import { Circle, Loader2, CheckCircle2, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ClaimStatus } from "@/lib/types";

const STATUS_META: Record<ClaimStatus, { variant: "open" | "resolving" | "resolved" | "inconclusive"; icon: typeof Circle }> = {
  Open: { variant: "open", icon: Circle },
  Resolving: { variant: "resolving", icon: Loader2 },
  Resolved: { variant: "resolved", icon: CheckCircle2 },
  Inconclusive: { variant: "inconclusive", icon: HelpCircle },
};

export function StatusBadge({ status }: { status: ClaimStatus | "unknown" }) {
  if (status === "unknown") {
    return <Badge variant="neutral">Unknown</Badge>;
  }
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant}>
      <Icon className={Icon === Loader2 ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
      {status}
    </Badge>
  );
}
