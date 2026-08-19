# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
from datetime import datetime

from genlayer import *
import genlayer.gl as gl

MAX_TAGS = 6
MAX_QUESTION_LEN = 600


def _consensus_now() -> int:
    """Unix timestamp from the transaction's own message context (identical
    for every validator), not each node's local wall clock. See Claim.py's
    _consensus_now() docstring for why this matters for write-path determinism."""
    raw = gl.message_raw["datetime"]
    return int(datetime.fromisoformat(str(raw).replace("Z", "+00:00")).timestamp())


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
        self.claim_meta[address_hex] = json.dumps(meta)
        return address_hex

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
        raw = self.claim_meta.get(address, "")
        if not raw:
            raise gl.vm.UserError("Unknown claim address.")
        return json.loads(raw)

    @gl.public.view
    def get_claims_by_tag(self, tag: str) -> list[str]:
        matches = []
        for address_hex in self.claim_addresses:
            raw = self.claim_meta.get(address_hex, "")
            if not raw:
                continue
            meta = json.loads(raw)
            if tag in meta.get("tags", []):
                matches.append(address_hex)
        return matches

    @gl.public.view
    def get_claims_by_creator(self, creator_address: str) -> list[str]:
        matches = []
        for address_hex in self.claim_addresses:
            raw = self.claim_meta.get(address_hex, "")
            if not raw:
                continue
            meta = json.loads(raw)
            if meta.get("creator") == creator_address:
                matches.append(address_hex)
        return matches

    @gl.public.view
    def get_children(self, parent_address: str) -> list[str]:
        children = []
        for address_hex in self.claim_addresses:
            raw = self.claim_meta.get(address_hex, "")
            if not raw:
                continue
            meta = json.loads(raw)
            if parent_address in meta.get("parent_claims", []):
                children.append(address_hex)
        return children
