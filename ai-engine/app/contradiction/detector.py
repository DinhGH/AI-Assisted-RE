"""Contradiction analysis using NLI with lightweight fallbacks."""

from __future__ import annotations

import os
from functools import lru_cache

from transformers import pipeline

from utils.helpers import normalize_text


@lru_cache(maxsize=1)
def _load_nli_pipeline():
    model_name = os.getenv("NLI_MODEL", "roberta-large-mnli")
    return pipeline("text-classification", model=model_name)


def detect_contradiction(requirement_a: str, requirement_b: str) -> float:
    """Return contradiction confidence (0..1) between two statements."""
    left = normalize_text(requirement_a)
    right = normalize_text(requirement_b)
    if not left or not right:
        return 0.0

    try:
        nli = _load_nli_pipeline()
        result = nli({"text": left, "text_pair": right})
        if isinstance(result, list) and result:
            top = result[0]
            label = str(top.get("label", "")).lower()
            score = float(top.get("score", 0.0))
            return score if "contradiction" in label else 0.0
    except Exception:
        # Operational fallback: keep service available even when model can't load.
        pass

    # Heuristic fallback for opposite modality cues.
    pairs = [
        ("must", "must not"),
        ("shall", "shall not"),
        ("enable", "disable"),
        ("allow", "deny"),
    ]
    joined = f"{left} {right}".lower()
    for a, b in pairs:
        if a in joined and b in joined:
            return 0.6
    return 0.0


def detect_internal_contradiction(text: str) -> float:
    """Approximate contradiction inside one requirement statement."""
    clean = normalize_text(text)
    if not clean:
        return 0.0

    low = clean.lower()
    if ("must" in low and "must not" in low) or ("shall" in low and "shall not" in low):
        return 0.8
    if "enable" in low and "disable" in low:
        return 0.7
    return 0.0

