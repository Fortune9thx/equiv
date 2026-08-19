/**
 * Types mirror the real on-chain return shapes of contracts/ClaimFactory.py
 * and contracts/Claim.py exactly -- not an idealized API. Notably:
 *  - `confidence`, `amount`, `payout`, timestamps are all decimal STRINGS,
 *    never numbers: GenVM calldata has no float type, and Claim.py
 *    deliberately stringifies every numeric field that crosses a public
 *    method boundary (see contracts/Claim.py's _stringify_confidence).
 *    Parse with Number()/parseFloat() at the UI edge, not before.
 *  - addresses are EIP-55 checksummed 0x-hex strings (Address.as_hex).
 */

export type ClaimStatus = "Open" | "Resolving" | "Resolved" | "Inconclusive";

export interface ClaimDetail {
  claim_id: string;
  question: string;
  criteria: string;
  outcomes: string[];
  creator: string;
  end_time: string;
  status: ClaimStatus;
  seed_sources: string[];
  parent_claims: string[];
  created_at: string;
  resolved_outcome: string;
  confidence: string;
  reasoning_summary: string;
  key_evidence: string[];
  precedent_hash: string;
  resolved_at: string;
  total_positions: number;
}

export interface ClaimVerdict {
  claim_id: string;
  question: string;
  status: ClaimStatus;
  resolved_outcome: string;
  confidence: string;
  reasoning_summary: string;
  precedent_hash: string;
}

export interface Position {
  outcome: string;
  amount: string;
  claimed: boolean;
  payout: string;
}

export interface ClaimMeta {
  address: string;
  question: string;
  criteria: string;
  outcomes: string[];
  creator: string;
  end_time: string;
  seed_sources: string[];
  parent_claims: string[];
  tags: string[];
  created_at: string;
  stake: string;
}

/** Explorer-card view: factory metadata (cheap, one call) merged with
 * a live status read from the Claim contract itself (authoritative,
 * since the factory never mirrors post-deploy state changes). */
export interface ClaimSummary extends ClaimMeta {
  status: ClaimStatus | "unknown";
}

export const OUTCOME_COLORS: Record<string, string> = {
  YES: "var(--success)",
  NO: "var(--danger)",
  INCONCLUSIVE: "var(--warning)",
};

export function outcomeColor(outcome: string, index: number): string {
  if (OUTCOME_COLORS[outcome]) return OUTCOME_COLORS[outcome];
  const palette = ["var(--accent-violet)", "var(--accent-cyan)", "#f472b6", "#fb923c", "#a3e635"];
  return palette[index % palette.length] ?? "var(--accent-violet)";
}
