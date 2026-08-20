# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from datetime import datetime

from genlayer import *
import genlayer.gl as gl

MAX_TAGS = 6
MAX_TAG_LEN = 40
MAX_QUESTION_LEN = 600


def _consensus_now() -> int:
    """Unix timestamp from the transaction's own message context (identical
    for every validator), not each node's local wall clock. See Claim.py's
    _consensus_now() docstring for why this matters for write-path determinism."""
    raw = gl.message_raw["datetime"]
    return int(datetime.fromisoformat(str(raw).replace("Z", "+00:00")).timestamp())


@gl.evm.contract_interface
class _Recipient:
    """Nameless-transfer interface used to pay out accumulated creation-fee
    revenue to the factory owner. Same canonical pattern as Claim.py's copy
    (verified against genlayer-docs' value-transfers.mdx Faucet example) --
    see that file's docstring for the full explanation."""

    class View:
        pass

    class Write:
        pass


def _normalize_address(addr: str) -> str:
    """TreeMap keys and equality comparisons against caller-supplied address
    strings use this everywhere -- Address.as_hex is an EIP-55-style
    checksum (mixed case), and a caller has no reason to reproduce that
    exact casing (a raw genlayer-js call, a non-checksummed frontend, or
    any Web3 library defaulting to lowercase all produce a technically-
    correct but differently-cased address). Comparing a checksummed stored
    key against raw caller input is a real, confirmed GenLayer rejection
    pattern -- see Claim.py's copy of this helper for the full note.
    Display-facing fields (the "address"/"creator" values actually
    returned to callers) keep their original checksummed form; only the
    TreeMap key and comparison logic are normalized."""
    return addr.strip().lower()


class ClaimFactory(gl.Contract):
    """
    Registry + on-chain factory for Equiv Claims.

    Deploys a fresh `Claim` contract instance per claim via gl.deploy_contract,
    mirroring the verified genlayerlabs/intelligent-oracle Registry pattern
    (same dependency hash, confirmed real deploy_contract() API). Registry
    metadata is intentionally read-only creation-time data (question, tags,
    creator) -- live status/outcome is never mirrored here and must be read
    directly from the Claim contract, since Claim.resolve() can change status
    after deployment and this contract has no reliable way to be pushed
    updates from it (see ARCHITECTURE.md: cross-contract writes are not used
    anywhere in this system, only deploy_contract at creation and .view()
    reads for precedent citation).
    """

    claim_addresses: DynArray[str]
    claim_code: str
    creation_fee: u256
    owner: Address
    # claim_address_hex -> JSON {question, criteria, outcomes, creator,
    # end_time, seed_sources, parent_claims, tags, created_at}
    claim_meta: TreeMap[str, str]

    def __init__(self, claim_code: str, creation_fee: u256):
        if not claim_code:
            raise gl.vm.UserError("Missing Claim contract source code.")
        self.claim_code = claim_code
        self.creation_fee = creation_fee
        self.owner = gl.message.sender_address

    @gl.public.write.payable
    def deploy_claim(
        self,
        question: str,
        criteria: str,
        outcomes: list[str],
        end_time: u256,
        seed_sources: list[str],
        parent_claims: list[str],
        tags: list[str],
    ) -> str:
        if gl.message.value < self.creation_fee:
            raise gl.vm.UserError(
                f"Creation stake too low: sent {gl.message.value}, requires {self.creation_fee}"
            )
        if len(tags) > MAX_TAGS:
            raise gl.vm.UserError(f"At most {MAX_TAGS} tags allowed.")
        if any(len(tag) > MAX_TAG_LEN for tag in tags):
            raise gl.vm.UserError(f"Tags must be at most {MAX_TAG_LEN} characters.")
        if len(question) > MAX_QUESTION_LEN:
            raise gl.vm.UserError("Question exceeds max length.")

        registered = len(self.claim_addresses)
        contract_address = gl.deploy_contract(
            code=self.claim_code.encode("utf-8"),
            args=[
                question,
                criteria,
                outcomes,
                end_time,
                seed_sources,
                parent_claims,
            ],
            salt_nonce=registered + 1,
        )
        address_hex = contract_address.as_hex
        self.claim_addresses.append(address_hex)

        meta = {
            "address": address_hex,
            "question": question,
            "criteria": criteria,
            "outcomes": outcomes,
            "creator": gl.message.sender_address.as_hex,
            "end_time": str(int(end_time)),
            "seed_sources": seed_sources,
            "parent_claims": parent_claims,
            "tags": tags,
            "created_at": str(_consensus_now()),
            "stake": str(int(gl.message.value)),
        }
        self.claim_meta[_normalize_address(address_hex)] = json.dumps(meta)
        return address_hex

    @gl.public.view
    def get_owner(self) -> str:
        """The deployer's address. Every write that touches a Claim's own
        data (deploy_claim, and everything on the Claim contracts it spawns)
        remains intentionally permissionless -- owner gates none of that.
        The one narrow exception is withdraw_fees() below: owner-only,
        and scoped strictly to this factory's own accumulated creation-fee
        balance, never to a Claim's positions, resolution, or payouts."""
        return self.owner.as_hex

    @gl.public.view
    def get_balance(self) -> str:
        """This factory's own GEN balance -- accumulated, unwithdrawn
        creation-fee revenue from deploy_claim calls. Exposed so the
        recoverable lifecycle in withdraw_fees() is observable, not just
        assumed: anyone can check what's actually claimable before an owner
        withdraws it."""
        return str(int(self.balance))

    @gl.public.write
    def withdraw_fees(self) -> None:
        """Owner-only recovery path for this factory's own accumulated
        balance -- creation-fee revenue from deploy_claim, which is
        protocol revenue, not user-locked capital; it never belongs to any
        specific Claim or position. Without this, that revenue had no way
        to ever leave the contract once collected, permanently stranding
        it. Deliberately narrow: sweeps only this contract's own balance to
        its own deployer, and cannot touch a Claim's positions, resolution
        state, or payouts -- it does not reintroduce the admin-can-block-a-
        Claim risk this project otherwise avoids by design (see
        SECURITY.md's "Trust model and access control")."""
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("Only the factory owner can withdraw fees.")
        amount = u256(self.balance)
        if amount > 0:
            _Recipient(self.owner).emit_transfer(value=amount)

    @gl.public.view
    def get_claims(self) -> list[str]:
        return list(self.claim_addresses)

    @gl.public.view
    def get_claims_count(self) -> int:
        return len(self.claim_addresses)

    @gl.public.view
    def get_claims_page(self, offset: int, limit: int) -> list[str]:
        if offset < 0 or limit <= 0:
            return []
        addresses = list(self.claim_addresses)
        return addresses[offset : offset + limit]

    @gl.public.view
    def get_claim_meta(self, address: str) -> dict:
        raw = self.claim_meta.get(_normalize_address(address), "")
        if not raw:
            raise gl.vm.UserError("Unknown claim address.")
        return json.loads(raw)

    @gl.public.view
    def get_claims_by_tag(self, tag: str) -> list[str]:
        matches = []
        for address_hex in self.claim_addresses:
            raw = self.claim_meta.get(_normalize_address(address_hex), "")
            if not raw:
                continue
            meta = json.loads(raw)
            if tag in meta.get("tags", []):
                matches.append(address_hex)
        return matches

    @gl.public.view
    def get_claims_by_creator(self, creator_address: str) -> list[str]:
        matches = []
        target = _normalize_address(creator_address)
        for address_hex in self.claim_addresses:
            raw = self.claim_meta.get(_normalize_address(address_hex), "")
            if not raw:
                continue
            meta = json.loads(raw)
            if _normalize_address(meta.get("creator", "")) == target:
                matches.append(address_hex)
        return matches

    @gl.public.view
    def get_children(self, parent_address: str) -> list[str]:
        target = _normalize_address(parent_address)
        children = []
        for address_hex in self.claim_addresses:
            raw = self.claim_meta.get(_normalize_address(address_hex), "")
            if not raw:
                continue
            meta = json.loads(raw)
            parents = [_normalize_address(p) for p in meta.get("parent_claims", [])]
            if target in parents:
                children.append(address_hex)
        return children
