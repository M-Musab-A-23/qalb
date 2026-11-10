"""Map MIT-BIH annotation symbols to AAMI beat classes."""
from __future__ import annotations

AAMI_MAP = {
    # Normal
    "N": "N", "L": "N", "R": "N", "e": "N", "j": "N",
    # Supraventricular ectopic
    "A": "S", "a": "S", "J": "S", "S": "S",
    # Ventricular ectopic
    "V": "V", "E": "V",
    # Fusion
    "F": "F",
    # Unknown / paced
    "/": "Q", "f": "Q", "Q": "Q",
}


def symbol_to_aami(symbol: str) -> str | None:
    """Return the AAMI class for a beat symbol, or None for non-beat symbols."""
    return AAMI_MAP.get(symbol)
