"""Ambiguity detector module.

This module detects vague expressions that reduce requirement testability.
"""

from __future__ import annotations

import re
from typing import Dict, Iterable, List

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
    "haha",
    "hehe",
    "lol",
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
    "haha": 2.4,
    "hehe": 2.4,
    "lol": 2.6,
}


def _low_information_penalty(normalized_text: str) -> float:
    """Return additional ambiguity points for under-specified requirement text."""
    tokens = re.findall(r"[a-zA-Z0-9]+", normalized_text or "")
    token_count = len(tokens)
    if token_count <= 1:
        return 5.2
    if token_count <= 3:
        return 3.6
    if token_count <= 5:
        return 2.1
    if token_count <= 8:
        return 1.1
    return 0.5


def _count_occurrences(text: str, term: str) -> int:
    """Count term occurrences with boundary-aware matching for single words."""
    escaped = re.escape(term)
    if " " in term or "/" in term or "-" in term:
        return len(re.findall(escaped, text))
    return len(re.findall(rf"\b{escaped}\b", text))


def detect_ambiguity(text: str, *, extra_terms: Iterable[str] | None = None) -> Dict[str, object]:
    """Return ambiguity score and matched vague terms.

    Score is count-based to keep behavior deterministic and explainable.
    """
    normalized = normalize_text(text).lower()
    if not normalized:
        return {"count": 0, "terms": [], "score": 10.0}

    matched: List[str] = []
    total_occurrences = 0
    weighted_points = 0.0

    extra_term_set = {
        normalize_text(term).lower()
        for term in (extra_terms or [])
        if normalize_text(term)
    }

    all_terms = set(AMBIGUOUS_TERMS).union(extra_term_set)

    for term in sorted(all_terms):
        occurrences = _count_occurrences(normalized, term)
        if occurrences > 0:
            matched.append(term)
            total_occurrences += occurrences
            weighted_points += occurrences * AMBIGUITY_WEIGHTS.get(term, 1.0)

    words = [token for token in re.split(r"\s+", normalized) if token]
    word_count = max(1, len(words))

    # Density bonus makes the score reflect how concentrated ambiguity is.
    density_penalty = min(2.5, (total_occurrences / word_count) * 40.0)

    low_information_penalty = _low_information_penalty(normalized)

    # Internal raw scale remains approximately 0..10 for stable weighting.
    raw_score = round(weighted_points + density_penalty + low_information_penalty, 2)
    raw_score = max(0.1, min(9.9, raw_score))

    # Public ambiguity scale is 0..100, but operational range is centered around 10..90.
    # Example: raw 0.1 -> 10.8, raw 1.0 -> 18, raw 9.9 -> 89.2.
    score = max(0.0, min(100.0, round((raw_score * 8.0) + 10.0, 2)))

    return {
        "count": total_occurrences,
        "terms": matched,
        "score": float(score),
    }
