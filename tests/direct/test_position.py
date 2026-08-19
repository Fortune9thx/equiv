"""Direct-mode tests for Claim.take_position and payout accounting."""

import time

import pytest
from gltest.direct import VMContext, deploy_contract, create_test_addresses

from conftest import CLAIM_PATH, to_hex, warp_now


def _future(seconds: int = 3600) -> int:
    return int(time.time()) + seconds


def _deploy_open_claim(vm, creator, end_time=None):
    return deploy_contract(
        CLAIM_PATH, vm,
        "Will X happen?", "Resolves YES if X is confirmed by end_time.",
        ["YES", "NO"], end_time or _future(), ["https://example.com/source"], [],
    )


def test_take_position_accumulates_pool():
    vm = VMContext()
    creator, alice, bob = create_test_addresses(3)
    with vm.activate():
        vm.sender = creator
        claim = _deploy_open_claim(vm, creator)

        vm.sender = alice
        vm.value = 100
        claim.take_position("YES")

        vm.sender = bob
        vm.value = 50
        claim.take_position("NO")

        pools = claim.get_pools()
        assert pools["YES"] == "100"
        assert pools["NO"] == "50"

        alice_pos = claim.get_position(to_hex(alice))
        assert alice_pos["outcome"] == "YES"
        assert alice_pos["amount"] == "100"
        assert alice_pos["claimed"] is False


def test_take_position_rejects_unknown_outcome():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        claim = _deploy_open_claim(vm, creator)
        vm.sender = alice
        vm.value = 10
        with vm.expect_revert("not declared"):
            claim.take_position("MAYBE")


def test_take_position_rejects_zero_value():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        claim = _deploy_open_claim(vm, creator)
        vm.sender = alice
        vm.value = 0
        with vm.expect_revert("Must send GEN"):
            claim.take_position("YES")


def test_take_position_accumulates_same_holder_same_outcome():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        claim = _deploy_open_claim(vm, creator)
        vm.sender = alice
        vm.value = 30
        claim.take_position("YES")
        vm.value = 20
        claim.take_position("YES")
        pos = claim.get_position(to_hex(alice))
        assert pos["amount"] == "50"


def test_take_position_rejects_switching_outcome():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        claim = _deploy_open_claim(vm, creator)
        vm.sender = alice
        vm.value = 30
        claim.take_position("YES")
        vm.value = 10
        with vm.expect_revert("different outcome"):
            claim.take_position("NO")


def test_take_position_closed_after_end_time():
    vm = VMContext()
    creator, alice = create_test_addresses(2)
    with vm.activate():
        vm.sender = creator
        near_future = int(time.time()) + 2
        claim = _deploy_open_claim(vm, creator, end_time=near_future)
        warp_now(vm, "2099-01-01T00:00:00Z")
        vm.sender = alice
        vm.value = 10
        with vm.expect_revert("end_time"):
            claim.take_position("YES")
