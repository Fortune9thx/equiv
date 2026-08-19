/**
 * Contract addresses and method-name constants for Equiv.
 *
 * genlayer-js has no separate ABI artifact to import -- writeContract/
 * readContract take a plain `functionName` string that must match the
 * deployed contract's Python method name exactly (see lib/genlayer.ts).
 * Centralizing the method names here means a rename in contracts/*.py
 * only needs to be mirrored in one frontend file.
 */

/**
 * Typed as a plain `0x${string}` (not unioned with "") so every call site
 * that passes it straight into readContract/writeContract's `address`
 * param type-checks without a cast at every call. It CAN be an empty
 * string at runtime when unconfigured -- callers must gate on
 * CLAIM_FACTORY_CONFIGURED (or `enabled: false` in a query), never assume
 * the type alone guarantees a real address.
 */
export const CLAIM_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS ??
  "") as `0x${string}`;

export const CLAIM_FACTORY_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS);

export const ClaimFactoryMethods = {
  deployClaim: "deploy_claim",
  getClaims: "get_claims",
  getClaimsCount: "get_claims_count",
  getClaimsPage: "get_claims_page",
  getClaimMeta: "get_claim_meta",
  getClaimsByTag: "get_claims_by_tag",
  getClaimsByCreator: "get_claims_by_creator",
  getChildren: "get_children",
} as const;

export const ClaimMethods = {
  takePosition: "take_position",
  resolve: "resolve",
  claimPayout: "claim_payout",
  getPosition: "get_position",
  getPools: "get_pools",
  getPositionHolders: "get_position_holders",
  getClaim: "get_claim",
  getVerdict: "get_verdict",
  getStatus: "get_status",
} as const;

/** deploy_claim's declared outcomes cap -- mirrors MAX_OUTCOMES in Claim.py. */
export const MAX_OUTCOMES = 8;
export const MIN_OUTCOMES = 2;
export const MAX_SEED_SOURCES = 10;
export const MAX_PARENT_CLAIMS = 5;
export const MAX_TAGS = 6;
