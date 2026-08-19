"""Direct-mode tests for Claim.__init__ validation."""

import time

import pytest
from gltest.direct import VMContext, deploy_contract, create_test_addresses

from conftest import CLAIM_PATH, to_hex


def _future(seconds: int = 3600) -> int:
    return int(time.time()) + seconds


def test_valid_claim_deploys_open():
    vm = VMContext()
    creator, *_ = create_test_addresses(1)
    with vm.activate():
        vm.sender = creator
        claim = deploy_contract(
            CLAIM_PATH,
            vm,
            "Will Team A win the championship?",
            "Resolves YES if the official league site lists Team A as champion before end_time.",
            ["YES", "NO"],
            _future(),
            ["https://example.com/standings"],
            [],
        )
        assert claim.get_status() == "Open"
        data = claim.get_claim()
        assert data["outcomes"] == ["YES", "NO"]
        assert data["creator"].lower() == to_hex(creator).lower()
        assert data["total_positions"] == 0


def test_requires_at_least_two_outcomes():
    vm = VMContext()
    with vm.activate():
        with vm.expect_revert("At least 2 outcomes"):
            deploy_contract(
                CLAIM_PATH, vm,
                "Q", "criteria", ["ONLY_ONE"], _future(), ["https://example.com"], [],
            )


def test_rejects_duplicate_outcomes():
    vm = VMContext()
    with vm.activate():
        with vm.expect_revert("unique"):
            deploy_contract(
                CLAIM_PATH, vm,
                "Q", "criteria", ["YES", "YES"], _future(), ["https://example.com"], [],
            )


def test_rejects_reserved_inconclusive_outcome():
    vm = VMContext()
    with vm.activate():
        with vm.expect_revert("reserved"):
            deploy_contract(
                CLAIM_PATH, vm,
                "Q", "criteria", ["YES", "INCONCLUSIVE"], _future(), ["https://example.com"], [],
            )


def test_requires_seed_sources():
    vm = VMContext()
    with vm.activate():
        with vm.expect_revert("seed source"):
            deploy_contract(
                CLAIM_PATH, vm,
                "Q", "criteria", ["YES", "NO"], _future(), [], [],
            )


def test_rejects_past_end_time():
    vm = VMContext()
    with vm.activate():
        with vm.expect_revert("future"):
            deploy_contract(
                CLAIM_PATH, vm,
                "Q", "criteria", ["YES", "NO"], int(time.time()) - 10, ["https://example.com"], [],
            )


def test_rejects_too_many_outcomes():
    vm = VMContext()
    with vm.activate():
        with vm.expect_revert("At most"):
            deploy_contract(
                CLAIM_PATH, vm,
                "Q", "criteria", [f"O{i}" for i in range(9)], _future(), ["https://example.com"], [],
            )


def test_rejects_too_many_parent_claims():
    vm = VMContext()
    with vm.activate():
        with vm.expect_revert("At most"):
            deploy_contract(
                CLAIM_PATH, vm,
                "Q", "criteria", ["YES", "NO"], _future(), ["https://example.com"],
                ["0x" + "11" * 20] * 6,
            )
