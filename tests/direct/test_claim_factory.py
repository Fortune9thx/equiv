"""
Direct-mode tests for ClaimFactory.withdraw_fees()/get_owner()/get_balance().

Scope note: these only cover what direct-mode CAN prove reliably --
access control and the zero-balance no-op path, neither of which needs
gl.deploy_contract (deploy_claim's nested deploy is not mocked here, see
test_resolve.py's module docstring). Proving that a real, non-zero
creation-fee balance actually leaves the contract on withdraw_fees()
requires genuine payable value and a real emit_transfer, which is covered
by the live test in tests/integration/test_full_lifecycle.py instead.
"""

from gltest.direct import VMContext, deploy_contract, create_test_addresses

from conftest import CLAIM_FACTORY_PATH, to_hex

_CLAIM_SOURCE = CLAIM_FACTORY_PATH.parent.joinpath("Claim.py").read_text(encoding="utf-8")


def _deploy_factory(vm, owner, fee=1_000_000_000_000_000_000):
    vm.sender = owner
    return deploy_contract(CLAIM_FACTORY_PATH, vm, _CLAIM_SOURCE, fee)


def test_get_owner_matches_deployer():
    vm = VMContext()
    owner, = create_test_addresses(1)
    with vm.activate():
        factory = _deploy_factory(vm, owner)
        assert factory.get_owner().lower() == to_hex(owner).lower()


def test_get_balance_is_zero_on_fresh_deploy():
    vm = VMContext()
    owner, = create_test_addresses(1)
    with vm.activate():
        factory = _deploy_factory(vm, owner)
        assert factory.get_balance() == "0"


def test_withdraw_fees_rejects_non_owner():
    vm = VMContext()
    owner, outsider = create_test_addresses(2)
    with vm.activate():
        factory = _deploy_factory(vm, owner)
        vm.sender = outsider
        with vm.expect_revert("Only the factory owner"):
            factory.withdraw_fees()


def test_withdraw_fees_is_a_safe_noop_when_nothing_to_withdraw():
    """The owner-access-control check must run and pass before the
    zero-balance skip -- this proves withdraw_fees() doesn't crash or
    revert for the legitimate owner just because nothing has accumulated
    yet, which matters for a factory nobody has used yet."""
    vm = VMContext()
    owner, = create_test_addresses(1)
    with vm.activate():
        factory = _deploy_factory(vm, owner)
        vm.sender = owner
        factory.withdraw_fees()  # must not raise
        assert factory.get_balance() == "0"
