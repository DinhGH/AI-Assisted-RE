"""Ambiguity detector module.

This module detects vague expressions that reduce requirement testability.
"""

from __future__ import annotations

from typing import Dict, List

from utils.helpers import normalize_text

AMBIGUOUS_TERMS = {
    "some",
    "many",
    "few",
    "often",
    "usually",
    "normally",
    "as soon as possible",
    "quickly",
    "soon",
    "appropriate",
    "suitable",
    "user-friendly",
    "etc",
    "and/or",
    "maybe",
    "approximately",
    "roughly",
}


def detect_ambiguity(text: str) -> Dict[str, object]:
    """Return ambiguity score and matched vague terms.

    Score is count-based to keep behavior deterministic and explainable.
    """
    normalized = normalize_text(text).lower()
    if not normalized:
        return {"count": 0, "terms": [], "score": 0.0}

    matched: List[str] = []
    for term in sorted(AMBIGUOUS_TERMS):
        if term in normalized:
            matched.append(term)

    return {
        "count": len(matched),
        "terms": matched,
        "score": float(len(matched)),
    }
