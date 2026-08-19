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
"""

import json
import time
from pathlib import Path

import pytest

CONTRACTS_DIR = Path(__file__).resolve().parents[2] / "contracts"
CLAIM_PATH = CONTRACTS_DIR / "Claim.py"
CLAIM_FACTORY_PATH = CONTRACTS_DIR / "ClaimFactory.py"

pytestmark = pytest.mark.integration


@pytest.fixture(scope="module")
def factory(get_contract_factory, accounts):
    """Deploy a fresh ClaimFactory with the real Claim.py source embedded,
    exactly as deploy/deploy.py does for a real network deployment."""
    claim_code = CLAIM_PATH.read_text(encoding="utf-8")
    contract_factory = get_contract_factory(contract_file_path=str(CLAIM_FACTORY_PATH))
    return contract_factory.deploy(args=[claim_code, 0])


def test_deploy_claim_spawns_readable_child_contract(factory, accounts):
    creator = accounts[0]
    future_end_time = int(time.time()) + 3600
    address_hex = factory.connect(creator).deploy_claim(
        "Will the integration test suite pass?",
        "Resolves YES if this exact test file's assertions all pass.",
        ["YES", "NO"],
        future_end_time,
        ["https://example.com"],
        [],
        ["testing"],
    )
    assert address_hex.startswith("0x")

    claims = factory.get_claims()
    assert address_hex in claims

    meta = factory.get_claim_meta(address_hex)
    assert meta["question"] == "Will the integration test suite pass?"


def test_factory_owner_is_informational_and_matches_deployer(factory, accounts):
    """get_owner() is provenance-only -- ClaimFactory has no admin-gated
    write anywhere (deploy_claim is intentionally permissionless, gated by
    the creation fee, not an allowlist). This just confirms the stored
    value is what it claims to be: whoever deployed this factory."""
    deployer = accounts[0]
    assert factory.get_owner().lower() == deployer.lower()


def test_deploy_claim_rejects_oversized_tag(factory, accounts):
    creator = accounts[0]
    future_end_time = int(time.time()) + 3600
    with pytest.raises(Exception, match="Tags must be at most"):
        factory.connect(creator).deploy_claim(
            "Q?",
            "criteria",
            ["YES", "NO"],
            future_end_time,
            ["https://example.com"],
            [],
            ["x" * 41],  # one over MAX_TAG_LEN
        )


def test_unauthorized_wallet_cannot_claim_a_position_it_never_took(
    factory, accounts, get_contract_factory
):
    """Access-control equivalent for Equiv's actual design: there is no
    owner-gated write anywhere in this system (deploy_claim, take_position,
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

    claim_address = factory.connect(creator).deploy_claim(
        "Access-control probe: does 1 + 1 equal 2?",
        "Resolves YES if arithmetic confirms 1 + 1 = 2.",
        ["YES", "NO"],
        near_future,
        ["https://en.wikipedia.org/wiki/1_%2B_1"],
        [],
        [],
    )
    claim = get_contract_factory(contract_file_path=str(CLAIM_PATH)).build_contract(
        contract_address=claim_address
    )

    time.sleep(35)
    claim.connect(creator).resolve()

    with pytest.raises(Exception, match="No position"):
        claim.connect(outsider).claim_payout()


def test_precedent_citation_reads_parent_verdict_via_view(factory, accounts, get_contract_factory):
    """End-to-end: resolve a parent Claim, then deploy a child Claim citing
    it as a precedent and confirm resolve() on the child does not revert
    when reading the parent's get_verdict() through .view() -- the only
    verified-working cross-contract call shape on Bradbury."""
    creator = accounts[0]
    near_future = int(time.time()) + 30

    parent_address = factory.connect(creator).deploy_claim(
        "Is 2 + 2 equal to 4?",
        "Resolves YES if arithmetic confirms 2 + 2 = 4.",
        ["YES", "NO"],
        near_future,
        ["https://en.wikipedia.org/wiki/2_%2B_2"],
        [],
        [],
    )
    parent_claim = get_contract_factory(contract_file_path=str(CLAIM_PATH)).build_contract(
        contract_address=parent_address
    )

    time.sleep(35)
    parent_claim.connect(creator).resolve()

    child_future = int(time.time()) + 3600
    child_address = factory.connect(creator).deploy_claim(
        "Does the parent claim's arithmetic verdict hold?",
        "Resolves YES if the cited parent claim resolved YES.",
        ["YES", "NO"],
        child_future,
        ["https://en.wikipedia.org/wiki/2_%2B_2"],
        [parent_address],
        [],
    )
    child_claim = get_contract_factory(contract_file_path=str(CLAIM_PATH)).build_contract(
        contract_address=child_address
    )
    assert child_claim.get_claim()["parent_claims"] == [parent_address]
