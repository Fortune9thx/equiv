"""
Direct-mode tests for settlement/payout math and precedent-verdict shape.

Cross-contract precedent citation (Claim A's resolved verdict feeding into
Claim B's resolve() prompt via .view()) requires two independently addressed
contracts and a working cross-contract call path, which gltest's direct-mode
mock does not provide by default (see test_resolve.py's module docstring).
That flow is covered in tests/integration/test_full_lifecycle.py instead.
This file covers what direct-mode CAN prove reliably: the parimutuel payout
arithmetic and double-claim protection in Claim.claim_payout(), which is the
highest financial-risk code path in the contract.
"""

import time

import pytest
from gltest.direct import VMContext, deploy_contract, create_test_addresses

from conftest import CLAIM_PATH, to_hex, warp_now


def _future(seconds: int = 3600) -> int:
    return int(time.time()) + seconds


def _web(body: str) -> dict:
    return {"method": "GET", "status": 200, "body": body}


def _wrapped_json(payload: dict) -> str:
    import json
    return f"```json\n{json.dumps(payload)}\n```"


def _deploy_and_resolve(vm, creator, outcome="YES", confidence="0.9", end_time_delta=2):
    vm.sender = creator
    claim = deploy_contract(
        CLAIM_PATH, vm,
        "Q?", "criteria", ["YES", "NO"], _future(end_time_delta),
        ["https://example.com/source"], [],
    )
    vm.mock_web(r"example\.com/source", _web("evidence"))
    vm.mock_llm(
        r"Equivalence Principle",
        _wrapped_json({
            "outcome": outcome, "confidence": confidence,
            "reasoning_summary": "r", "key_evidence": ["e"],
        }),
    )
    warp_now(vm, "2099-01-01T00:00:00Z")
    claim.resolve()
    return claim


def test_winning_position_receives_parimutuel_share():
    vm = VMContext()
    creator, alice, bob = create_test_addresses(3)
    with vm.activate():
        vm.sender = creator
        claim = deploy_contract(
            CLAIM_PATH, vm,
            "Q?", "criteria", ["YES", "NO"], _future(2),
            ["https://example.com/source"], [],
        )
        vm.sender = alice
        vm.value = 100
        claim.take_position("YES")
        vm.sender = bob
        vm.value = 100
        claim.take_position("NO")

        vm.mock_web(r"example\.com/source", _web("evidence"))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES", "confidence": "0.9",
                "reasoning_summary": "r", "key_evidence": ["e"],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        vm.sender = alice
        claim.claim_payout()
        alice_pos = claim.get_position(to_hex(alice))
        # Sole winner of a 200-total pool with a 100-stake winning side gets
        # the entire pool: (100 * 200) // 100 == 200.
        assert alice_pos["payout"] == "200"
        assert alice_pos["claimed"] is True


def test_losing_position_gets_zero_payout():
    vm = VMContext()
    creator, alice, bob = create_test_addresses(3)
    with vm.activate():
        vm.sender = creator
        claim = deploy_contract(
            CLAIM_PATH, vm,
            "Q?", "criteria", ["YES", "NO"], _future(2),
            ["https://example.com/source"], [],
        )
        vm.sender = alice
        vm.value = 100
        claim.take_position("YES")
        vm.sender = bob
        vm.value = 100
        claim.take_position("NO")

        vm.mock_web(r"example\.com/source", _web("evidence"))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "NO", "confidence": "0.9",
                "reasoning_summary": "r", "key_evidence": ["e"],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        vm.sender = alice
        claim.claim_payout()
        alice_pos = claim.get_position(to_hex(alice))
        assert alice_pos["payout"] == "0"
        assert alice_pos["claimed"] is True


def test_double_claim_reverts():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        claim = deploy_contract(
            CLAIM_PATH, vm,
            "Q?", "criteria", ["YES", "NO"], _future(2),
            ["https://example.com/source"], [],
        )
        vm.sender = alice
        vm.value = 50
        claim.take_position("YES")

        vm.mock_web(r"example\.com/source", _web("evidence"))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "YES", "confidence": "0.9",
                "reasoning_summary": "r", "key_evidence": ["e"],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        vm.sender = alice
        claim.claim_payout()
        with vm.expect_revert("already claimed"):
            claim.claim_payout()


def test_claim_payout_without_position_reverts():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        claim = _deploy_and_resolve(vm, creator)
        vm.sender = alice
        with vm.expect_revert("No position"):
            claim.claim_payout()


def test_claim_payout_before_resolution_reverts():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        claim = deploy_contract(
            CLAIM_PATH, vm,
            "Q?", "criteria", ["YES", "NO"], _future(2),
            ["https://example.com/source"], [],
        )
        vm.sender = alice
        vm.value = 10
        claim.take_position("YES")
        with vm.expect_revert("not yet resolved"):
            claim.claim_payout()


def test_inconclusive_refunds_full_stake():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        claim = deploy_contract(
            CLAIM_PATH, vm,
            "Q?", "criteria", ["YES", "NO"], _future(2),
            ["https://example.com/source"], [],
        )
        vm.sender = alice
        vm.value = 75
        claim.take_position("YES")

        vm.mock_web(r"example\.com/source", _web("insufficient"))
        vm.mock_llm(
            r"Equivalence Principle",
            _wrapped_json({
                "outcome": "INCONCLUSIVE", "confidence": "0.1",
                "reasoning_summary": "r", "key_evidence": [],
            }),
        )
        warp_now(vm, "2099-01-01T00:00:00Z")
        claim.resolve()

        vm.sender = alice
        claim.claim_payout()
        pos = claim.get_position(to_hex(alice))
        assert pos["payout"] == "75"


def test_get_verdict_precedent_hash_deterministic_not_llm_supplied():
    """precedent_hash must be computed in contract code from the agreed
    outcome/confidence, not asked of the LLM -- independent validator LLM
    calls cannot deterministically agree on a self-reported 'hash' string,
    which would break consensus on every single resolution. Confirm the
    hash is a 16-char hex digest, not whatever string the mock LLM used."""
    vm = VMContext()
    creator, = create_test_addresses(1)
    with vm.activate():
        claim = _deploy_and_resolve(vm, creator, outcome="YES", confidence="0.9")
        verdict = claim.get_verdict()
        assert len(verdict["precedent_hash"]) == 16
        int(verdict["precedent_hash"], 16)  # must be valid hex
