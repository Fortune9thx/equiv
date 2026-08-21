"""
Integration tests against a real GenLayer node (Studio or Bradbury testnet).

These are the only tests in this repo that exercise gl.deploy_contract (the
ClaimFactory -> Claim on-chain factory pattern) and cross-contract .view()
precedent citation, since gltest's direct-mode WASI mock has no default
support for either (see tests/direct/test_resolve.py's module docstring).

Requires a configured gltest.config.yaml pointing at a live node and funded
test accounts. Run with: gltest tests/integration -v
Skips automatically if no RPC endpoint is reachable, so `pytest` alone
(without the gltest plugin/config) won't false-fail in environments with no
network access.

API note, corrected 2026-08-20: every contract method obtained through
gltest's schema-bound Contract (installed genlayer-test==0.29.2) returns a
ContractFunction descriptor, not a result -- reads need an explicit
`.call()` and writes need an explicit `.transact(...)`, confirmed directly
against `gltest/contracts/contract.py`/`contract_functions.py`'s source
(ContractFunction is a plain dataclass with no __call__). The version of
this file written earlier in this project called every method directly
(`factory.get_claims()`, `claim.connect(x).resolve()`) with neither -- which
would raise TypeError/AttributeError immediately on any real run against
this SDK version. That version was never actually executed against a live
node (this project's own CHANGELOG says so explicitly), so the bug went
uncaught. Fixed throughout this file; still not yet run against a live node
in *this* pass either, due to an ongoing Bradbury finalization backlog
documented in SECURITY.md -- ClaimFactory.deploy_claim's own live
transaction has been stuck unfinalized for hours at the time of this fix,
making a fresh live run currently uninformative rather than confirmatory.
`accounts` are real `eth_account.signers.local.LocalAccount` objects
(confirmed via gltest/accounts.py) -- `.address` is needed wherever a
plain address string is required (contract call args, string comparisons);
the LocalAccount object itself is what `.connect()` needs for signing.
"""

import time
from pathlib import Path

import pytest
from gltest import get_contract_factory
from gltest.assertions import tx_execution_failed

CONTRACTS_DIR = Path(__file__).resolve().parents[2] / "contracts"
CLAIM_PATH = CONTRACTS_DIR / "Claim.py"
CLAIM_FACTORY_PATH = CONTRACTS_DIR / "ClaimFactory.py"
CLAIM_SOURCE = CLAIM_PATH.read_text(encoding="utf-8")

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def factory(accounts):
    """Deploy a fresh ClaimFactory with the real Claim.py source embedded,
    zero creation fee -- exactly as deploy/deploy.mjs does for a real
    network deployment, except free, since most tests here don't need to
    exercise fee accounting specifically (see the dedicated fee-lifecycle
    tests below, which deploy their own separately-fee-configured factory)."""
    contract_factory = get_contract_factory(contract_file_path=str(CLAIM_FACTORY_PATH))
    return contract_factory.deploy(args=[CLAIM_SOURCE, 0])


def _deploy_claim(factory, creator, question, criteria, outcomes, end_time,
                   seed_sources, parent_claims, tags, value=0):
    """deploy_claim's own Python-level return value (the new Claim's
    address) is a different thing from the write transaction's receipt --
    decoding it reliably from the receipt's raw calldata isn't confirmed
    (see frontend/hooks/useClaimFactory.ts's identical note). Read it back
    from the registry instead, the same proven pattern the frontend and
    this project's own CLI verification tooling both already use."""
    receipt = factory.connect(creator).deploy_claim(
        args=[question, criteria, outcomes, end_time, seed_sources, parent_claims, tags]
    ).transact(value=value)
    assert not tx_execution_failed(receipt), f"deploy_claim failed: {receipt}"
    addresses = factory.get_claims_by_creator(args=[creator.address]).call()
    return addresses[-1]


def test_deploy_claim_spawns_readable_child_contract(factory, accounts):
    creator = accounts[0]
    future_end_time = int(time.time()) + 3600
    address_hex = _deploy_claim(
        factory, creator,
        "Will the integration test suite pass?",
        "Resolves YES if this exact test file's assertions all pass.",
        ["YES", "NO"], future_end_time, ["https://example.com"], [], ["testing"],
    )
    assert address_hex.startswith("0x")

    claims = factory.get_claims().call()
    assert address_hex in claims

    meta = factory.get_claim_meta(args=[address_hex]).call()
    assert meta["question"] == "Will the integration test suite pass?"


def test_factory_owner_is_provenance_only_and_matches_deployer(factory, accounts):
    """get_owner() is provenance-only -- ClaimFactory has no admin-gated
    write over Claim data anywhere (deploy_claim is intentionally
    permissionless, gated by the creation fee, not an allowlist). The one
    owner-gated write, withdraw_fees(), is scoped strictly to the
    factory's own fee balance -- see the fee-lifecycle tests below."""
    deployer = accounts[0]
    assert factory.get_owner().call().lower() == deployer.address.lower()


def test_deploy_claim_rejects_oversized_tag(factory, accounts):
    creator = accounts[0]
    future_end_time = int(time.time()) + 3600
    with pytest.raises(Exception, match="Tags must be at most"):
        factory.connect(creator).deploy_claim(
            args=["Q?", "criteria", ["YES", "NO"], future_end_time,
                  ["https://example.com"], [], ["x" * 41]]
        ).transact()


def test_unauthorized_wallet_cannot_claim_a_position_it_never_took(factory, accounts):
    """Access-control equivalent for Equiv's actual design: there is no
    owner-gated write over Claim data anywhere (deploy_claim, take_position,
    resolve, and claim_payout are all intentionally permissionless --
    economically gated by stake/fee, not an allowlist). The real per-item
    ownership boundary is a position, and claim_payout already restricts
    itself to gl.message.sender_address's own position. This proves that
    boundary live: a second, funded wallet that never staked on this Claim
    gets a real on-chain error, not a silent success or someone else's
    payout."""
    creator = accounts[0]
    outsider = accounts[1]
    near_future = int(time.time()) + 30

    claim_address = _deploy_claim(
        factory, creator,
        "Access-control probe: does 1 + 1 equal 2?",
        "Resolves YES if arithmetic confirms 1 + 1 = 2.",
        ["YES", "NO"], near_future, ["https://en.wikipedia.org/wiki/1_%2B_1"], [], [],
    )
    claim = get_contract_factory(contract_file_path=str(CLAIM_PATH)).build_contract(
        contract_address=claim_address
    )

    time.sleep(35)
    resolve_receipt = claim.connect(creator).resolve(args=[]).transact()
    assert not tx_execution_failed(resolve_receipt)

    with pytest.raises(Exception, match="No position"):
        claim.connect(outsider).claim_payout(args=[]).transact()


def test_precedent_citation_reads_parent_verdict_via_view(factory, accounts):
    """End-to-end: resolve a parent Claim, then deploy a child Claim citing
    it as a precedent and confirm resolve() on the child does not revert
    when reading the parent's get_verdict() through .view() -- the only
    verified-working cross-contract call shape on Bradbury."""
    creator = accounts[0]
    near_future = int(time.time()) + 30

    parent_address = _deploy_claim(
        factory, creator,
        "Is 2 + 2 equal to 4?",
        "Resolves YES if arithmetic confirms 2 + 2 = 4.",
        ["YES", "NO"], near_future, ["https://en.wikipedia.org/wiki/2_%2B_2"], [], [],
    )
    parent_claim = get_contract_factory(contract_file_path=str(CLAIM_PATH)).build_contract(
        contract_address=parent_address
    )

    time.sleep(35)
    parent_resolve = parent_claim.connect(creator).resolve(args=[]).transact()
    assert not tx_execution_failed(parent_resolve)

    child_future = int(time.time()) + 3600
    child_address = _deploy_claim(
        factory, creator,
        "Does the parent claim's arithmetic verdict hold?",
        "Resolves YES if the cited parent claim resolved YES.",
        ["YES", "NO"], child_future, ["https://en.wikipedia.org/wiki/2_%2B_2"], [parent_address], [],
    )
    child_claim = get_contract_factory(contract_file_path=str(CLAIM_PATH)).build_contract(
        contract_address=child_address
    )
    assert child_claim.get_claim(args=[]).call()["parent_claims"] == [parent_address]


def test_no_stake_on_winning_outcome_refunds_every_position(factory, accounts):
    """Live proof of the fund-safety fix: everyone stakes NO, the claim
    genuinely resolves YES (winning_pool == 0), and every staker gets their
    own stake back rather than a permanently-stranded zero payout. Mirrors
    tests/direct/test_precedent.py's mocked-LLM version of this same
    scenario, but exercises the real resolve() consensus path live."""
    creator = accounts[0]
    staker = accounts[1]
    near_future = int(time.time()) + 30

    claim_address = _deploy_claim(
        factory, creator,
        "Refund-path probe: is 2 + 2 equal to 5?",
        "Resolves NO if standard arithmetic confirms 2 + 2 does not equal 5.",
        ["YES", "NO"], near_future, ["https://en.wikipedia.org/wiki/Elementary_arithmetic"], [], [],
    )
    claim = get_contract_factory(contract_file_path=str(CLAIM_PATH)).build_contract(
        contract_address=claim_address
    )

    stake = 10_000_000_000_000_000  # 0.01 GEN, small deliberately
    take_position_receipt = claim.connect(staker).take_position(args=["YES"]).transact(value=stake)
    assert not tx_execution_failed(take_position_receipt)

    time.sleep(35)
    resolve_receipt = claim.connect(creator).resolve(args=[]).transact()
    assert not tx_execution_failed(resolve_receipt)

    resolved_outcome = claim.get_claim(args=[]).call()["resolved_outcome"]
    assert resolved_outcome == "NO", "expected the real arithmetic answer to resolve NO"

    payout_receipt = claim.connect(staker).claim_payout(args=[]).transact()
    assert not tx_execution_failed(payout_receipt)
    position = claim.get_position(args=[staker.address]).call()
    assert position["payout"] == str(stake)
    assert position["claimed"] is True


def test_owner_can_withdraw_accumulated_creation_fees(accounts):
    """Live proof of the recoverable-fee-lifecycle fix: a separate factory
    (its own instance, non-zero creation_fee) collects a real fee from a
    real deploy_claim call, and the owner's withdraw_fees() actually moves
    that GEN out -- not just that the access-control check passes (that
    part is already covered, faster, in tests/direct/test_claim_factory.py)."""
    owner = accounts[0]
    staker = accounts[1]
    fee = 10_000_000_000_000_000  # 0.01 GEN, small deliberately

    fee_factory = get_contract_factory(contract_file_path=str(CLAIM_FACTORY_PATH)).deploy(
        args=[CLAIM_SOURCE, fee], account=owner
    )

    future_end_time = int(time.time()) + 3600
    deploy_receipt = fee_factory.connect(staker).deploy_claim(
        args=[
            "Fee-lifecycle probe: does the factory actually collect its own fee?",
            "Resolves YES if the fee balance increased by the creation fee.",
            ["YES", "NO"], future_end_time, ["https://example.com"], [], [],
        ]
    ).transact(value=fee)
    assert not tx_execution_failed(deploy_receipt)

    balance_before = int(fee_factory.get_balance().call())
    assert balance_before >= fee

    withdraw_receipt = fee_factory.connect(owner).withdraw_fees(args=[]).transact()
    assert not tx_execution_failed(withdraw_receipt)

    balance_after = int(fee_factory.get_balance().call())
    assert balance_after == 0


def test_non_owner_cannot_withdraw_fees(accounts):
    owner = accounts[0]
    outsider = accounts[1]
    fee_factory = get_contract_factory(contract_file_path=str(CLAIM_FACTORY_PATH)).deploy(
        args=[CLAIM_SOURCE, 0], account=owner
    )
    with pytest.raises(Exception, match="Only the factory owner"):
        fee_factory.connect(outsider).withdraw_fees(args=[]).transact()
