"""Ambiguity detector module.

This module detects vague expressions that reduce requirement testability.
"""

from __future__ import annotations

import re
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

AMBIGUITY_WEIGHTS = {
    "some": 0.8,
    "many": 1.0,
    "few": 0.9,
    "often": 1.1,
    "usually": 1.0,
    "normally": 1.0,
    "as soon as possible": 1.8,
    "quickly": 1.2,
    "soon": 1.2,
    "appropriate": 1.4,
    "suitable": 1.3,
    "user-friendly": 1.6,
    "etc": 1.5,
    "and/or": 1.4,
    "maybe": 1.8,
    "approximately": 1.6,
    "roughly": 1.6,
}


def _count_occurrences(text: str, term: str) -> int:
    """Count term occurrences with boundary-aware matching for single words."""
    escaped = re.escape(term)
    if " " in term or "/" in term or "-" in term:
        return len(re.findall(escaped, text))
    return len(re.findall(rf"\b{escaped}\b", text))


def detect_ambiguity(text: str) -> Dict[str, object]:
    """Return ambiguity score and matched vague terms.

    Score is count-based to keep behavior deterministic and explainable.
    """
    normalized = normalize_text(text).lower()
    if not normalized:
        return {"count": 0, "terms": [], "score": 0.0}

    matched: List[str] = []
    total_occurrences = 0
    weighted_points = 0.0

    for term in sorted(AMBIGUOUS_TERMS):
        occurrences = _count_occurrences(normalized, term)
        if occurrences > 0:
            matched.append(term)
            total_occurrences += occurrences
            weighted_points += occurrences * AMBIGUITY_WEIGHTS.get(term, 1.0)

    words = [token for token in re.split(r"\s+", normalized) if token]
    word_count = max(1, len(words))

    # Density bonus makes the score reflect how concentrated ambiguity is.
    density_penalty = min(2.5, (total_occurrences / word_count) * 40.0)

    # Final scale is 0..10 for consistent UI mapping (x10 -> 0..100).
    score = min(10.0, round(weighted_points + density_penalty, 2))

    return {
        "count": total_occurrences,
        "terms": matched,
        "score": float(score),
    }
