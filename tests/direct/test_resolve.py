"""
Direct-mode tests for Claim.resolve().

Scope note: these tests exercise resolve() on a standalone Claim with no
parent_claims. Precedent citation (a cross-contract .view() call to another
deployed Claim) is NOT covered here -- gltest's direct-mode WASI mock has no
default handler for cross-contract calls (CallContract/DeployContract route
through an optional `_gl_call_hook` that only "glsim" mode installs; this
gltest version ships no default implementation of it, confirmed by reading
gltest/direct/wasi_mock.py). Building a hand-rolled mock for that protocol
would risk asserting behavior that doesn't match real GenVM rather than
proving anything -- so precedent citation and the full ClaimFactory ->
gl.deploy_contract flow are covered in tests/integration/test_full_lifecycle.py
against a real Studio/Bradbury deployment instead. See ARCHITECTURE.md.
"""

import time

from gltest.direct import VMContext, deploy_contract, create_test_addresses

from conftest import CLAIM_PATH, warp_now

QUESTION = "Did Team A win the 2026 championship?"
CRITERIA = "Resolves YES if the official league site names Team A champion."


def _future(seconds: int = 3600) -> int:
    return int(time.time()) + seconds


def _web(body: str) -> dict:
    return {"method": "GET", "status": 200, "body": body}


def _wrapped_json(payload: dict) -> str:
    """LLM responses are rarely bare JSON in practice -- wrap it in prose
    the way a real model would, forcing _parse_verdict_json's brace-stripping
    to actually do work rather than relying on the mock's own auto-parse."""
    import json
    return f"Here is my analysis.\n```json\n{json.dumps(payload)}\n```\nEnd of response."


def _deploy_resolvable_claim(vm, creator, end_time_delta=2):
    vm.sender = creator
    return deploy_contract(
        CLAIM_PATH, vm,
        QUESTION, CRITERIA, ["YES", "NO"], _future(end_time_delta),
        ["https://example.com/standings"], [],
    )


def test_resolve_reaches_consensus_and_resolves():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won the 2026 championship on record."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES",
                "confidence": "0.92",
                "reasoning_summary": "Official standings confirm Team A as champion.",
                "key_evidence": ["Team A won the 2026 championship on record."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        data = claim.get_claim()
        assert data["status"] == "Resolved"
        assert data["resolved_outcome"] == "YES"
        assert data["confidence"] == "0.92"
        assert isinstance(data["precedent_hash"], str) and len(data["precedent_hash"]) == 16
        assert data["reasoning_summary"]


def test_resolve_confidence_bare_float_never_crashes():
    """Regression test for the calldata-has-no-float class of bug: even if
    the LLM returns confidence as a bare JSON number (not a quoted string,
    despite the prompt's explicit instruction), the contract must coerce it
    to a string before it can ever cross a calldata boundary."""
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES",
                "confidence": 0.77,  # bare float, not a string -- the failure mode
                "reasoning_summary": "Team A won per standings.",
                "key_evidence": ["Team A won."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        data = claim.get_claim()
        assert data["confidence"] == "0.77"
        assert isinstance(data["confidence"], str)


def test_resolve_clamps_out_of_range_confidence():
    """A hallucinating or adversarial leader can return a confidence outside
    the prompt's requested [0.0, 1.0] range -- nothing in the validator's
    fixed-width tolerance check rejects that on its own, since both leader
    and validator independently re-run the same prompt and could agree with
    each other while still being out of range. The contract must clamp
    before persisting, so a permanently-stored confidence is always
    meaningful regardless of what the model returned."""
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES",
                "confidence": "1.7",  # out of range, both leader and validator agree
                "reasoning_summary": "Team A won per standings.",
                "key_evidence": ["Team A won."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        data = claim.get_claim()
        assert data["confidence"] == "1.0"


def test_resolve_inconclusive_when_evidence_insufficient():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Page under maintenance."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "INCONCLUSIVE",
                "confidence": "0.2",
                "reasoning_summary": "Source unavailable; cannot confirm outcome.",
                "key_evidence": [],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        data = claim.get_claim()
        assert data["status"] == "Inconclusive"
        assert data["resolved_outcome"] == "INCONCLUSIVE"
        assert data["precedent_hash"] == ""


def test_resolve_rejects_outcome_not_in_declared_set():
    """If the LLM hallucinates an outcome string outside the declared set,
    the contract must fall back to INCONCLUSIVE rather than storing garbage."""
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Ambiguous result."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "MAYBE",  # not in ["YES", "NO"]
                "confidence": "0.5",
                "reasoning_summary": "Unclear.",
                "key_evidence": [],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        assert claim.get_status() == "Inconclusive"


def test_resolve_before_end_time_reverts():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator, end_time_delta=3600)
        with vm.expect_revert("end_time"):
            claim.resolve()


def test_resolve_twice_reverts():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES", "confidence": "0.9",
                "reasoning_summary": "Won.", "key_evidence": ["Won."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()
        with vm.expect_revert("not open"):
            claim.resolve()


def test_validator_agrees_on_matching_outcome_and_close_confidence():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES", "confidence": "0.80",
                "reasoning_summary": "Won.", "key_evidence": ["Won."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        # Validator independently re-runs leader_fn against the SAME mocks
        # and should agree: same outcome, confidence within the 0.15 band.
        agrees = vm.run_validator()
        assert agrees is True


def test_validator_disagrees_on_confidence_outside_tolerance():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES", "confidence": "0.90",
                "reasoning_summary": "Won.", "key_evidence": ["Won."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        # Simulate a leader claiming a confidence far outside the tolerance
        # band our own re-run of leader_fn (against the same mocks) would
        # produce -- the validator must reject this as disagreement.
        disagrees = vm.run_validator(leader_result={
            "outcome": "YES", "confidence": "0.10",
            "reasoning_summary": "Won, barely.", "key_evidence": ["Won."],
        })
        assert disagrees is False


def test_validator_disagrees_on_different_outcome():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES", "confidence": "0.80",
                "reasoning_summary": "Won.", "key_evidence": ["Won."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        disagrees = vm.run_validator(leader_result={
            "outcome": "NO", "confidence": "0.80",
            "reasoning_summary": "Lost.", "key_evidence": ["Lost."],
        })
        assert disagrees is False


def test_get_verdict_shape_after_resolution():
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES", "confidence": "0.85",
                "reasoning_summary": "Won convincingly.", "key_evidence": ["Won."],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        verdict = claim.get_verdict()
        assert set(verdict.keys()) == {
            "claim_id", "question", "status", "resolved_outcome",
            "confidence", "reasoning_summary", "precedent_hash",
        }
        assert verdict["status"] == "Resolved"
        assert verdict["precedent_hash"]


def test_resolve_large_key_evidence_never_produces_unreadable_claim():
    """Regression test: key_evidence used to be serialized to JSON and then
    truncated by raw character count. If the cut landed mid-token, the
    stored self.key_evidence became invalid JSON, and get_claim() (a public
    view method) raised JSONDecodeError forever afterward for that claim --
    a real data-availability bug, not hypothetical, since 20 evidence items
    at realistic LLM-output lengths comfortably exceeds the 4000-char cap.
    Feed exactly that many long items and confirm get_claim() stays
    readable and returns a valid, non-corrupted list either way."""
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_resolvable_claim(vm, creator)
        vm.mock_web(r"example\.com/standings", _web("Team A won."))
        # 20 items x 300 raw chars -> raw JSON well over 4000 chars, which
        # is what actually exercised the old bug (mid-token truncation).
        # Each item alone also exceeds the new 180-char per-item cap, so
        # this exercises that cap too, not just the item-count cap.
        long_item = "x" * 300
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES",
                "confidence": "0.9",
                "reasoning_summary": "Won.",
                "key_evidence": [long_item] * 20,
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        # Must not raise -- this is exactly the call path that used to
        # crash with JSONDecodeError on a claim like this.
        data = claim.get_claim()
        assert isinstance(data["key_evidence"], list)
        assert all(isinstance(e, str) for e in data["key_evidence"])
        assert all(len(e) <= 180 for e in data["key_evidence"])
