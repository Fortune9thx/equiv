"""
Direct-mode test fixtures for Equiv contracts.

Applies one Windows-only monkeypatch documented from prior GenLayer projects
on this machine: gltest's direct-mode loader unlinks a temp file that is
still open via os.dup2 on this platform, raising PermissionError (harmless
on POSIX, where the same test suite runs clean). This patch never touches
contract code or the real SDK -- it only relaxes cleanup of a test-harness
temp file.
"""

import os
import sys
from pathlib import Path

import pytest

CONTRACTS_DIR = Path(__file__).resolve().parents[2] / "contracts"
CLAIM_PATH = CONTRACTS_DIR / "Claim.py"
CLAIM_FACTORY_PATH = CONTRACTS_DIR / "ClaimFactory.py"

_real_unlink = os.unlink


def _safe_unlink(path, *args, **kwargs):
    try:
        _real_unlink(path, *args, **kwargs)
    except PermissionError:
        pass


os.unlink = _safe_unlink


@pytest.fixture
def claim_source() -> str:
    return CLAIM_PATH.read_text(encoding="utf-8")


def _find_real_address_cls():
    """create_test_addresses()/create_address() fall back to plain bytes in
    this environment because `genlayer` isn't on sys.path until a contract
    has actually been deployed once (gltest wires SDK paths lazily inside
    load_contract_class). Address.as_hex is NOT plain lowercase hex -- it is
    an EIP-55 Keccak256 checksum (verified by reading the real SDK's
    genlayer/py/types.py in gltest's own download cache), so a naive
    "0x" + bytes.hex() fallback silently produces the WRONG key and every
    TreeMap[str, str] lookup keyed by holder address misses. Import the
    real Address class straight from the cached SDK so tests key positions
    exactly the way the contract itself does."""
    cache_root = Path.home() / ".cache" / "gltest-direct" / "extracted"
    for candidate in cache_root.glob("**/genlayer/py/types.py"):
        sdk_root = candidate.parents[2]
        if str(sdk_root) not in sys.path:
            sys.path.insert(0, str(sdk_root))
        from genlayer.py.types import Address
        return Address
    return None


_AddressCls = None


def warp_now(vm, iso_timestamp: str) -> None:
    """vm.warp() alone is not enough to move a Claim's notion of "now" for a
    contract that was already deployed: gltest's VMContext._refresh_gl_message
    (direct/vm.py) updates gl.message_raw's sender/origin/value on every
    vm.sender/vm.value change, but never touches gl.message_raw['datetime'] --
    and the one method that would build a fresh copy including it,
    get_message_raw(), is dead code, never called anywhere in the installed
    gltest==0.29.2 package (confirmed by grepping the whole package). So
    gl.message_raw["datetime"] -- which Claim._consensus_now() reads, by
    deliberate design, instead of Python's own datetime.now() -- stays frozen
    at whatever it was when the contract was first imported, no matter how
    many times vm.warp() is called afterwards. This mirrors real GenVM
    determinism (see Claim.py's _consensus_now() docstring) but is a gap in
    this specific test harness, not a contract bug -- so it is patched here,
    scoped to tests, exactly like the other documented gltest direct-mode
    gaps (os.unlink, WebRender screenshot mode, ExecPromptTemplate)."""
    import sys

    vm.warp(iso_timestamp)
    gl = sys.modules.get("genlayer.gl")
    if gl is not None and getattr(gl, "message_raw", None) is not None:
        gl.message_raw["datetime"] = iso_timestamp


def to_hex(addr) -> str:
    """Normalize a create_test_addresses()/create_address() value (real
    Address or raw bytes fallback) to the exact checksummed 0x-hex string
    the contract's own `gl.message.sender_address.as_hex` produces."""
    if hasattr(addr, "as_hex"):
        return addr.as_hex
    global _AddressCls
    if _AddressCls is None:
        _AddressCls = _find_real_address_cls()
    if _AddressCls is not None:
        return _AddressCls(addr).as_hex
    return "0x" + addr.hex()
