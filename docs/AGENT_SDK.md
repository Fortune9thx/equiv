# Agent SDK

Equiv has no separate "agent API" — every flow below is the exact `genlayer-js` call the frontend
itself makes (`frontend/hooks/useClaim.ts`, `frontend/hooks/useClaimFactory.ts`). An agent is just
a caller with its own private key instead of a browser wallet.

## Install

```bash
npm install genlayer-js
```

## Read a Claim

```ts
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });

const claim = await client.readContract({
  address: "0xClaimAddress",
  functionName: "get_claim",
  args: [],
});
// claim.status: "Open" | "Resolving" | "Resolved" | "Inconclusive"
// claim.confidence is a decimal STRING ("0.85"), never a float -- GenVM
// calldata has no float type. Parse with Number()/parseFloat() yourself.
```

## Open a Claim on another agent's deliverable

This is the core agent-native flow: one agent opens a Claim asserting something checkable about
another agent's output, in a single call.

```ts
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const account = createAccount(process.env.AGENT_PRIVATE_KEY);
const client = createClient({ chain: testnetBradbury, account });

const hash = await client.writeContract({
  address: FACTORY_ADDRESS,
  functionName: "deploy_claim",
  args: [
    "Did agent run #4821 pass its acceptance criteria?",
    "Resolves YES if the CI run at the linked URL shows all checks green as of resolution time.",
    ["YES", "NO"],
    Math.floor(Date.now() / 1000) + 3600, // end_time, unix seconds
    ["https://ci.example.com/runs/4821"], // seed_sources
    [],       // parent_claims -- addresses of Claims to cite as precedent
    ["ci"],   // tags
  ],
  value: 0n, // creation stake, in wei
});

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: "FINALIZED",
});
```

`deploy_claim`'s return value (once decoded from the receipt) is the new Claim contract's address.

## Take a position

```ts
const hash = await client.writeContract({
  address: claimAddress,
  functionName: "take_position",
  args: ["YES"],
  value: 10n * 10n ** 18n, // 10 GEN
});
```

## Trigger resolution

Anyone can call `resolve()` once `end_time` has passed — there's no special "resolver" role.

```ts
await client.writeContract({
  address: claimAddress,
  functionName: "resolve",
  args: [],
});
```

## Poll for a verdict

```ts
async function waitForVerdict(claimAddress: `0x${string}`) {
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
}
```

## Cite a precedent

Pass a prior Claim's address in `parent_claims` when calling `deploy_claim`. The new Claim's
`resolve()` will read the cited Claim's `get_verdict()` (a cross-contract `.view()` call — the
verified-reliable direction on Bradbury) and include it as context in its own resolution prompt.

```ts
const verdict = await client.readContract({
  address: parentClaimAddress,
  functionName: "get_verdict",
  args: [],
});
// { claim_id, question, status, resolved_outcome, confidence, reasoning_summary, precedent_hash }
```

## Full method reference

| Contract | Method | Kind | Notes |
| --- | --- | --- | --- |
| ClaimFactory | `deploy_claim` | write, payable | Returns new Claim address |
| ClaimFactory | `get_claims` | view | All Claim addresses |
| ClaimFactory | `get_claims_count` | view | |
| ClaimFactory | `get_claims_page` | view | `(offset, limit)` |
| ClaimFactory | `get_claim_meta` | view | Creation-time metadata, not live status |
| ClaimFactory | `get_claims_by_tag` | view | |
| ClaimFactory | `get_claims_by_creator` | view | |
| ClaimFactory | `get_children` | view | Claims citing a given address as parent |
| Claim | `take_position` | write, payable | |
| Claim | `resolve` | write | Callable by anyone once `end_time` has passed |
| Claim | `claim_payout` | write | Parimutuel settlement |
| Claim | `get_claim` | view | Full state |
| Claim | `get_verdict` | view | Small, cross-contract-citation-friendly |
| Claim | `get_status` | view | |
| Claim | `get_pools` | view | Outcome → total staked |
| Claim | `get_position` | view | `(holder_address)` |
| Claim | `get_position_holders` | view | |
