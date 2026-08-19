# Changelog

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
