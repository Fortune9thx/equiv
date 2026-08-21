# Changelog

## 0.1.12 — redeployed ClaimFactory after the prior one's registry became unreadable

- **Fixed a real, reviewer-reported issue: the live `ClaimFactory` had become completely
  unreadable.** External feedback said "the frontend isn't reading the on-chain registry." Verified
  directly against the contract, not the frontend: every view method on
  `0x3912627184B178d6a23b15F42C252609b6f4945C` (`get_owner`, `get_balance`, `get_claims_count`,
  `get_claims`) failed identically with a contract-state RPC error, reproduced from a plain Node
  script with no frontend code involved — confirming this was never a frontend bug. Likely cause:
  that factory's `withdraw_fees()` call had been stuck unfinalized for many hours, the longest any
  transaction against this project has remained pending, and a transaction stuck that long appears
  able to block all reads to its own contract (see SECURITY.md's new "ClaimFactory registry became
  unreadable" section for the full account and the GenLayer-team-report candidate this points to).
- **Fix:** deployed a fresh `ClaimFactory` (fifth deployment,
  `0xDF4AA4ddB47454899554291ba83Bc564D11536AF`) — no contract-code changes needed, since the source
  itself was never the problem. Confirmed clean immediately: all four view methods succeed on the
  new address. Updated `frontend/.env.local` and both Vercel `production`/`preview` environments,
  redeployed the frontend, and verified live (`https://equiv-x9.vercel.app/claims` now correctly
  shows "No Claims yet" with a clean read, no errors, in a fresh browser session).
- The two Claims and 2 GEN of accumulated fees on the broken factory are no longer reachable
  through the app — the same permanent-supersession trade-off every prior redeploy has made.

## 0.1.11 — fix "Claim not found" dead-end for freshly-created Claims (frontend only)

- **Fixed a real UX bug, reported live by a user hitting it during testing:** a Claim's detail
  page (`/claims/[address]`) could show a hard "Claim not found" error for a Claim that had *just*
  been created successfully — indistinguishable from an address that never existed. The real cause
  is the documented Bradbury finalization lag (see "Bradbury finalization stalls" in SECURITY.md):
  `ClaimFactory` registers a Claim's metadata the instant `deploy_claim` succeeds, but the Claim
  contract itself can take a long, unpredictable time afterward to become independently readable.
  The page now checks `ClaimFactory.get_claim_meta` to tell "still finalizing" apart from
  "genuinely never existed": a confirmed-real Claim that isn't independently readable yet now
  shows a reassuring "Finalizing on the network" state (with its real question, pulled from the
  factory's metadata) and keeps polling automatically; only an address the factory has no record
  of shows the harder "not found" message.
- Root-causing this took an unusually long detour: verifying the fix live surfaced a series of
  false leads (suspected HMR corruption, an orphaned dev-server process, a stale `.next` build
  cache, a React Strict Mode theory) before the real explanation emerged — TanStack Query's
  focus-manager pauses retries in full while `document.visibilityState === "hidden"`, which is
  simply always true for the automated browser tool used to test this, not for a real user's
  visible tab. Confirmed conclusively by forcing `document.visibilityState` to `"visible"` in that
  same tab, at which point the fix rendered exactly as intended. Verified against a real
  production build (`next build && next start`), not just dev mode, and against the user's actual
  affected Claim address live.
- No contract changes; frontend-only, deployed straight to production.

## 0.1.10 — redeployed ClaimFactory (0.1.9 fund-safety fixes now live)

- Deployed a fresh `ClaimFactory` to GenLayer Bradbury Testnet at
  `0x3912627184B178d6a23b15F42C252609b6f4945C` (fourth deployment), embedding the 0.1.9-fixed
  `contracts/Claim.py`/`ClaimFactory.py` source (zero-stake refund path, `withdraw_fees()`,
  `get_balance()`). Prior address `0x65880E6a4dD9561a6acC4C275958D710c391eDf2` (0.1.5 fixes) is
  now superseded.
- Deployed during an active Bradbury-wide finalization backlog: the first broadcast attempt was
  rejected outright by the RPC node (`-32005 transaction gas rate limit exceeded: node is at
  capacity`, no GEN spent since nothing was ever sent); the retry broadcast successfully and sat at
  `COMMITTING`/`NOT_VOTED` before reaching `ACCEPTED` with `FINISHED_WITH_RETURN`.
- Verified post-deploy: `deploy/verify-deploy.mjs` confirms `get_claims_count()` reads `0` on the
  fresh factory; direct `get_owner()` and `get_balance()` reads confirm both new getters work.
- Updated `frontend/.env.local` and both Vercel `production`/`preview` environments'
  `NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS` to the new address, and redeployed the frontend so the
  build-time-baked env var takes effect.
- Updated `README.md`'s "Deployed contracts" section and `SECURITY.md`'s deployment status note.
- **Not yet done:** the automated `tests/integration/test_full_lifecycle.py` suite has not been
  executed against this (or any) live deployment — no `gltest.config.yaml`/funded test-account
  keys exist in this repo yet. The contract-level fixes themselves are live and manually verified;
  the pytest-level proof is still pending.

## 0.1.9 — fix two fund-safety gaps flagged by steward review (source only; not yet redeployed)

- **Fixed:** `claim_payout` permanently stranded every position's funds if the resolved outcome had
  zero stakers (winning_pool == 0) — a realistic scenario, not an edge case, since everyone can
  legitimately bet the same (wrong) way. Now refunds each position its own stake in that case, same
  as `INCONCLUSIVE`. Tested in both direct-mode (mocked consensus) and a new live integration test
  (real `resolve()` consensus).
- **Fixed:** `ClaimFactory` collected creation fees into its own balance with no way to ever
  withdraw them. Added owner-only `withdraw_fees()` and a public `get_balance()` getter. This is
  the one and only owner-gated write across both contracts — deliberately scoped to the factory's
  own fee revenue, never touching a Claim's positions, resolution, or payouts (see SECURITY.md's
  "Trust model and access control" for why this doesn't reopen the no-admin-writes design). Tested
  for access control and the zero-balance no-op path in direct-mode; the real value-movement happy
  path is covered by a new live integration test.
- **Also found and fixed while writing the new tests:** `tests/integration/test_full_lifecycle.py`'s
  entire calling convention didn't match the installed `genlayer-test` SDK — every method call was
  missing the `.call()`/`.transact()` the schema-bound `ContractFunction` API actually requires,
  confirmed by reproducing the exact `TypeError` directly. That file had never been executed against
  a live node in this project, so the bug was invisible until now. Fixed throughout, along with a
  second bug in the same file (`.lower()` called directly on a `LocalAccount` object instead of
  `.address.lower()`).
- 39/39 direct-mode tests passing (new: 1 in `test_precedent.py`, 4 in the new
  `test_claim_factory.py`). Two new integration tests added but **not yet run against a live
  node** — Bradbury's finalization pipeline has been stuck for this project's own transactions for
  hours at the time of this fix (see SECURITY.md), making a fresh live run uninformative right now.
- **Not yet done:** as with every prior contract-source round, these fixes require a fresh
  `ClaimFactory` deployment to reach the live contract — deferred until the network stabilizes
  enough for a deploy to actually finalize.

## 0.1.8 — fix false "Timed out" errors on transactions that already succeeded (frontend only)

- **Fixed a second real bug found during the same live test session:** `useClaimTransaction`
  waited for `FINALIZED` status and treated any failure to reach it (including a timeout) as a
  hard error — even though `ACCEPTED` (reached first, and already one of genlayer-js's own
  `DECIDED_STATES`) had already returned a successful `FINISHED_WITH_RETURN` execution result. On
  Bradbury, `FINALIZED` can take longer to confirm than any reasonable client-side wait window even
  on a transaction that fully succeeded — a pattern observed repeatedly in this project's own
  deploy tooling all session, but never hardened against in the frontend itself until now.
  Reproduced live: a real `deploy_claim` call signed, executed, and persisted correctly (confirmed
  directly via `genlayer trace` and `get_claims_by_creator` — the Claim existed on-chain the whole
  time), while the UI showed a scary "Timed out waiting for transaction ... to reach status
  FINALIZED" error and never redirected to the new Claim.
- Fixed by checking the `ACCEPTED` receipt's `txExecutionResultName` directly: a genuine
  `FINISHED_WITH_ERROR` still surfaces as a real error immediately, but a timeout on the subsequent
  `FINALIZED` wait is now treated as a slow confirmation of an already-decided success, not a
  failure. This affects every write in the app (`deploy_claim`, `take_position`, `resolve`,
  `claim_payout`) since they all share this one hook.
- No contract changes; frontend-only, deployed straight to production.

## 0.1.7 — fix wallet provider resolution for multi-wallet-extension browsers (frontend only)

- **Fixed a real bug found during live manual testing:** `useSignerClient()` built the signing
  client from the bare `window.ethereum` global, but a browser with more than one wallet extension
  installed (MetaMask + Coinbase Wallet, Rabby, etc. — a common setup) can have `window.ethereum`
  pointing at a *different* provider than the one the user actually connected through RainbowKit.
  Symptom: the header shows a connected wallet, but submitting any write (Create, Take Position,
  Resolve, Claim Payout) fails immediately with "Connect a wallet to continue."
- Fixed by resolving the provider from wagmi's own `connector.getProvider()` (the canonical,
  connector-specific EIP-1193 provider, resolved independently of the `window.ethereum` global via
  EIP-6963) instead of assuming a single global provider. `getGenlayerClient()` now accepts an
  explicit `provider` argument; `useSignerClient()` resolves it asynchronously (matching
  `getProvider()`'s async signature) and falls back to `window.ethereum` only if a connector
  doesn't expose `getProvider()`.
- No contract changes; frontend-only, deployed straight to production.

## 0.1.6 — redeployed ClaimFactory (0.1.5 fixes now live)

- Deployed a fresh `ClaimFactory` to GenLayer Bradbury Testnet at
  `0x65880E6a4dD9561a6acC4C275958D710c391eDf2` (third deployment), embedding the 0.1.5-fixed
  `contracts/Claim.py`/`ClaimFactory.py` source (confidence clamping, tag length bound,
  `get_owner()`). Prior addresses `0x306Cf15AB31ceD28f65d28d43179FB3aE349ABaE` (0.1.3 fixes) and
  `0xC62245f05Abcf2f763E298641Ff2D97ED8865F30` (pre-fix) are now superseded.
- Same known `FINALIZED`-wait timeout as every prior deploy on this project recurred and was
  resolved the same way: `genlayer trace` on the deploy transaction confirmed `result_code: 0`
  with real return data before `waitForTransactionReceipt` ever resolved.
- Verified post-deploy: `deploy/verify-deploy.mjs` confirms `get_claims_count()` reads `0` on the
  fresh factory; a direct `get_owner()` read confirms the new getter works and returns the
  deploying account's address (`0xC6E6d3b2acCaECeCeB40Ad4bD3dF123DDCB4e537`).
- Updated `frontend/.env.local` and both Vercel `production`/`preview` environments'
  `NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS` to the new address, and redeployed the frontend so the
  build-time-baked env var takes effect.
- Updated `README.md`'s "Deployed contracts" section and `SECURITY.md`'s deployment status note —
  all 0.1.5 findings are now fixed in source *and* live on the deployed contract.

## 0.1.5 — strict pre-submission audit against canonical GenLayer sources (source only; not yet redeployed)

- Ran a strict, adversarial pre-submission review against a reviewer-style checklist, verifying
  every checkable claim against canonical sources (`genlayer-docs` raw markdown,
  `genlayer-project-boilerplate`, `genlayerlabs/intelligent-oracle`, live `genlayer code`/
  `genlayer trace`) rather than trusting the checklist or the existing code. See
  `genlayer-strict-audit-canonical-verification` memory for the reusable pattern.
- **Confirmed, not assumed:** `claim_payout`'s `_Recipient(...).emit_transfer(...)` payout pattern
  matches GenLayer's own documented `Faucet` example verbatim — not the confirmed-broken IC→IC
  cross-contract write pattern. `resolve()`'s custom `run_nondet_unsafe` leader/validator is the
  pattern GenLayer's own docs and boilerplate call "recommended for most cases" for settlement
  decisions, not a deviation to fix. Neither changed.
- **Fixed:** confidence values from the LLM are now clamped to `[0.0, 1.0]` before they can ever be
  returned from the leader or persisted — previously a hallucinating/adversarial leader could store
  an out-of-range confidence undetected. `ClaimFactory.deploy_claim` now bounds each tag's length
  (`MAX_TAG_LEN = 40`), not just the tag count. `ClaimFactory.owner` (stored, previously
  unreachable) is now exposed via a purely informational `get_owner()` getter.
- **Rejected, with reasoning:** the checklist's "two-phase strict_eq → prompt_non_comparative"
  suggestion (would weaken, not strengthen, settlement-decision validation per GenLayer's own
  guidance), a "from genlayer import \* must be line 3" claim (false — checked against
  `intelligent-oracle`'s own source), and an "upgrade the dependency hash" suggestion (the newer
  hash is an unreleased `genvm-main` runner GenLayer's own linter can't fully load yet).
- Added a "Trust model and access control" section to `SECURITY.md` documenting why neither
  contract has an owner-gated write (deliberate — a permissionless capital market), with an access
  matrix and a live test
  (`test_unauthorized_wallet_cannot_claim_a_position_it_never_took`) proving the real per-position
  ownership boundary against a funded, uninvolved wallet on Bradbury.
- 35/35 direct-mode tests passing (new: `test_resolve_clamps_out_of_range_confidence`). New
  integration tests added (`test_factory_owner_is_informational_and_matches_deployer`,
  `test_deploy_claim_rejects_oversized_tag`,
  `test_unauthorized_wallet_cannot_claim_a_position_it_never_took`) — not yet run against a live
  node in this pass; see `SECURITY.md`'s "Known, unresolved risks" for what remains genuinely
  unproven live (full `resolve()` end-to-end).
- **Not yet done:** as with 0.1.2–0.1.4, this round's contract fixes require a fresh `ClaimFactory`
  deployment to reach the live contract.

## 0.1.4 — redeployed ClaimFactory (all 0.1.2/0.1.3 fixes now live)

- Deployed a fresh `ClaimFactory` to GenLayer Bradbury Testnet at
  `0x306Cf15AB31ceD28f65d28d43179FB3aE349ABaE`, embedding the current, fixed `contracts/Claim.py`
  source — this is what 0.1.2 and 0.1.3 built in source but explicitly deferred. The prior address
  `0xC62245f05Abcf2f763E298641Ff2D97ED8865F30` ran pre-fix source and is now superseded.
- Confirmed readable post-deploy via `deploy/verify-deploy.mjs` (`get_claims_count()` returns 0).
- Same `FINALIZED`-wait timeout pattern as the first deployment recurred and was resolved the same
  way: `client.getTransaction({hash})` directly confirmed `statusName: ACCEPTED` and
  `txExecutionResultName: FINISHED_WITH_RETURN` (real success) even though the client-side wait for
  `FINALIZED` timed out.
- Updated `frontend/.env.local` and both Vercel `production`/`preview` environments'
  `NEXT_PUBLIC_CLAIM_FACTORY_ADDRESS` to the new address, and redeployed the frontend so the
  build-time-baked env var takes effect.
- Updated `README.md`'s "Deployed contracts" section and `SECURITY.md`'s deployment status note to
  reflect that all fixes through 0.1.3 are now live on-chain, not just in source.

## 0.1.3 — address checksum case-sensitivity fix (checked against real GenLayer rejection feedback)

- Fixed a real, high-severity bug: `positions` and `claim_meta` were keyed by `Address.as_hex`
  (EIP-55 checksum, mixed case) but every public view method compared that key against raw,
  unnormalized caller input — any caller using a differently-cased (but equally valid) address got
  a **silent** "not found" instead of their real data. Confirmed against real GenLayer review
  feedback describing the identical root cause on a prior project. Fixed with a
  `_normalize_address()` helper applied consistently on every write and read in both contracts.
  New regression test proves a position written under a checksummed address is found via lowercase
  and mixed-case lookups.
- Checked two more patterns from that same review feedback and confirmed, with direct evidence
  (not assumption), that neither applies here: the write client already binds
  `window.ethereum`, and the read client never generates a random ephemeral account (verified by
  reading `genlayer-js`'s own source). See `SECURITY.md`'s new "Checked against real GenLayer
  review feedback" section for the full detail, including a residual, honestly-reported open
  question about nested nondeterministic blocks that lint can't fully settle.
- Confirmed the live `ClaimFactory` deploy transaction has since reached true `FINALIZED` status
  (not just `ACCEPTED`), addressed directly rather than left as an inferred success.
- 33/33 direct-mode tests passing.
- **Not yet done:** as with 0.1.2, this fix requires a fresh `ClaimFactory` deployment to reach the
  live contract.

## 0.1.2 — security audit fixes (source only; not yet redeployed)

- Fixed a real bug where long `key_evidence` could produce invalid JSON via mid-token string
  truncation, permanently breaking `get_claim()` for that Claim. Added a regression test.
- Added defense-in-depth input validation directly in `Claim.py`'s own constructor (question/
  criteria length, outcome length, seed source URL format) — previously some of these lived only
  in `ClaimFactory`, which a direct deploy of `Claim.py` bypasses entirely.
- Hardened the `resolve()` prompt against injected instructions in fetched evidence/precedent
  text with explicit untrusted-data framing (mitigates, does not eliminate, prompt injection).
- Made the `INCONCLUSIVE` reserved-outcome check case-insensitive.
- Full frontend redesign (Expensify-inspired light/green system, `/connect` split-screen wallet
  flow, onboarding modals) — see git history / this changelog's next entry for detail if tracked
  separately.
- Full security review completed; see `SECURITY.md` for the complete findings list, including
  architectural risks (evidence-source manipulation, precedent poisoning) that have no clean fix
  and are documented as conscious, unresolved trade-offs rather than bugs.
- **Not yet done:** the live `ClaimFactory` at `0xC62245f05Abcf2f763E298641Ff2D97ED8865F30` still
  runs the pre-fix `Claim.py` source. These fixes require a fresh `ClaimFactory` deployment to
  take effect on-chain.

## 0.1.1 — live deployment

- `ClaimFactory` deployed to GenLayer Bradbury Testnet at
  `0xC62245f05Abcf2f763E298641Ff2D97ED8865F30` (1 GEN creation stake), confirmed readable via
  `deploy/verify-deploy.mjs`.
- `deploy/deploy.mjs` gained `KEYSTORE_PATH`/`KEYSTORE_PASSWORD` support to deploy from an
  encrypted `genlayer` CLI keystore without ever writing the raw private key to disk or logs.
- Noted: the deploy transaction's `waitForTransactionReceipt` timed out waiting for `FINALIZED`
  even though the transaction had already reached `ACCEPTED` with
  `txExecutionResultName: FINISHED_WITH_RETURN` (i.e. real success) -- `FINALIZED` appears to take
  longer than a short client-side poll window on Bradbury. Always check `txExecutionResultName`
  on the transaction directly rather than only trusting `waitForTransactionReceipt` resolving.

## 0.1.0 — initial build

- `contracts/ClaimFactory.py` and `contracts/Claim.py`: on-chain factory + per-Claim lifecycle
  (positions, Equivalence Principle resolution, parimutuel settlement).
- 31 passing direct-mode tests (`tests/direct/`) covering creation validation, position/pool
  accounting, resolution consensus (including a float-safety regression test), validator
  agreement/disagreement, and payout math.
- Integration test skeleton (`tests/integration/test_full_lifecycle.py`) for the factory-deploy and
  precedent-citation flows that require a live GenLayer node.
- Next.js 15 frontend: landing page, Create Claim wizard, Claims Explorer, Claim Detail with the
  Resolution Theater, Positions, Precedents, and an Agent SDK page with a live read playground.
- `deploy/deploy.mjs`: deploys `ClaimFactory` with `Claim.py`'s source embedded as its constructor
  argument.
- Full documentation set: `README.md`, `docs/ARCHITECTURE.md`, `docs/RESOLUTION_LOGIC.md`,
  `docs/AGENT_SDK.md`, `SECURITY.md`.
