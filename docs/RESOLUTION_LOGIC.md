# Resolution logic

This document walks through `Claim.resolve()` in `contracts/Claim.py` step by step, and explains
every deliberate deviation from the naive/obvious implementation.

## Preconditions

```python
if self.status != STATUS_OPEN:
    raise gl.vm.UserError("Claim is not open; it is already resolving or resolved.")
if _consensus_now() < int(self.end_time):
    raise gl.vm.UserError("Cannot resolve before end_time.")
```

`_consensus_now()` reads `gl.message_raw["datetime"]` — the transaction's own canonical
timestamp, identical for every validator replaying the transaction — rather than calling Python's
`datetime.now()` directly. `gl.message_raw["datetime"]` is an **ISO-8601 string**, not a unix int;
naively doing `int(gl.message_raw["datetime"])` raises immediately. Parsed correctly with
`datetime.fromisoformat(...)`.

## Preparing local state before the nondet block

```python
question = self.question
criteria = self.criteria
outcomes = list(self.outcomes)
seed_sources = list(self.seed_sources)
parent_claims = list(self.parent_claims)
```

Non-deterministic blocks (`run_nondet_unsafe`'s `leader_fn`/`validator_fn`) cannot touch `self.*`
storage — everything the closures need is copied into locals first.

## Precedent lookup — outside the nondet block, deliberately

```python
precedents = []
for parent_address in parent_claims:
    try:
        verdict = gl.get_contract_at(Address(parent_address)).view().get_verdict()
        precedents.append(verdict)
    except Exception:
        continue
```

Cross-contract calls are **forbidden inside a nondet/eq_principle closure** — GenVM raises
`SystemError: 6` (confirmed via `gltest`'s own mock enforcement, which mirrors real GenVM). The
precedent lookup happens here, before `leader_fn`/`validator_fn` are even defined, and the results
are captured by closure into the prompt text.

## The leader function

```python
def leader_fn():
    evidence = []
    for url in seed_sources:
        try:
            content = gl.nondet.web.render(url, mode="text", wait_after_loaded="5s") or ""
            evidence.append({"url": url, "excerpt": content[:4000]})
        except Exception:
            continue

    prompt = f"""...binding criteria, declared outcomes, cited precedents, live evidence..."""
    raw = gl.nondet.exec_prompt(prompt)
    parsed = _parse_verdict_json(raw)
    parsed["confidence"] = _stringify_confidence(parsed.get("confidence"))
    ...
    return parsed
```

Two deliberate choices here, both regression-tested:

1. **`gl.nondet.exec_prompt(prompt)` is called without `response_format="json"`, and the response
   is parsed manually** via `_parse_verdict_json` (brace-stripping, trailing-comma removal —
   mirrors `genlayerlabs/intelligent-oracle`'s own `_parse_json_dict`). Real LLM output is rarely
   bare JSON; it's usually wrapped in prose or a markdown fence. Manual parsing after the model
   call, rather than trusting an auto-parse at the SDK boundary, is the pattern the verified
   reference contract uses.
2. **Confidence is force-stringified before the function returns**, via `_stringify_confidence`.
   GenVM's calldata encoding has no float type — a bare JSON number like `"confidence": 0.85`
   becomes a Python `float`, and `float` is not calldata-encodable. The prompt explicitly instructs
   the model to quote confidence as a string, and the contract *also* defensively coerces it
   regardless of what the model actually returns — belt and suspenders, because trusting a prompt
   instruction alone is not a safety guarantee. `tests/direct/test_resolve.py::test_resolve_confidence_bare_float_never_crashes`
   feeds the mock LLM a **bare float** on purpose and asserts the contract still returns a clean
   string.

## The validator function

```python
def validator_fn(leader_result) -> bool:
    if not isinstance(leader_result, gl.vm.Return):
        return False
    leader_data = leader_result.calldata
    mine = leader_fn()
    outcome_agrees = mine.get("outcome") == leader_data.get("outcome")
    my_confidence = float(mine.get("confidence", "0.0"))
    their_confidence = float(leader_data.get("confidence", "0.0"))
    confidence_agrees = abs(my_confidence - their_confidence) < 0.15
    return outcome_agrees and confidence_agrees
```

Only two fields gate agreement: `outcome` (exact match) and `confidence` (within 0.15). Wording of
`reasoning_summary`/`key_evidence` is allowed to vary between the leader and each validator's own
LLM call — expecting verbatim agreement on free-text reasoning would make consensus nearly
impossible, since models paraphrase. This mirrors the original spec's intent ("semantic
equivalence on the decisive fields only") but implements it as **exact Python arithmetic**, not an
LLM-judged natural-language equivalence check — auditable and deterministic given the same two
numbers, appropriate for a contract that gates real capital movement.

`tests/direct/test_resolve.py` includes both directions: a validator that agrees when confidence is
close (`test_validator_agrees_on_matching_outcome_and_close_confidence`) and one that correctly
rejects when confidence diverges past the tolerance
(`test_validator_disagrees_on_confidence_outside_tolerance`) or the outcome differs
(`test_validator_disagrees_on_different_outcome`).

## After consensus

```python
result = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)

outcome = result.get("outcome", "INCONCLUSIVE")
if outcome != "INCONCLUSIVE" and outcome not in outcomes:
    outcome = "INCONCLUSIVE"
...
if outcome == "INCONCLUSIVE":
    self.status = STATUS_INCONCLUSIVE
    self.precedent_hash = ""
else:
    self.status = STATUS_RESOLVED
    digest_input = f"{claim_id}|{outcome}|{self.confidence}|{criteria}"
    self.precedent_hash = hashlib.sha256(digest_input.encode("utf-8")).hexdigest()[:16]
```

Two more deliberate choices:

- **A hallucinated outcome outside the declared set is coerced to `INCONCLUSIVE`**, never stored
  as-is. `test_resolve_rejects_outcome_not_in_declared_set` covers this directly.
- **`precedent_hash` is computed in plain contract code, never asked of the LLM.** The original
  design brief asked the resolver prompt to return `"precedent_hash": "<a deterministic short hash
  of the verdict>"` as one of the JSON fields. That's not actually achievable: an LLM cannot
  execute a real hash function deterministically, so the leader's and each validator's independent
  model calls would almost certainly produce *different* ad-hoc "hash-looking" strings — which
  would then fail the equivalence check on a field that was never supposed to be a substantive
  disagreement, breaking consensus on nearly every real resolution for a reason that has nothing to
  do with whether the *actual verdict* was agreed on. Computing it deterministically, after
  consensus, from data validators already agreed on (`outcome`, `confidence`) avoids this problem
  entirely. `test_get_verdict_precedent_hash_deterministic_not_llm_supplied` asserts the resulting
  hash is a clean 16-character hex digest, not arbitrary LLM output.

## Settlement (`claim_payout`)

Parimutuel payout: a winning position receives `(their_stake * total_pool) // winning_pool`. An
`INCONCLUSIVE` result refunds each position's full stake (no winners to redistribute to). State is
mutated (`claimed = True`) **before** the value transfer (`_Recipient(...).emit_transfer(...)`) —
checks-effects-interactions, regardless of whether GenVM's execution model actually has a
reentrancy analogue to Solidity's.
