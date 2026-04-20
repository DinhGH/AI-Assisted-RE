"""Shared utility helpers for the AI engine.

The helpers are intentionally pure and side-effect free so modules can be tested
in isolation and reused across endpoints.
"""

from __future__ import annotations

import re
from typing import List


def normalize_text(text: str) -> str:
    """Normalize whitespace while preserving sentence semantics.

    WHY: Most analysis modules are text-statistical; stable whitespace lowers
    noise and makes metrics reproducible.
    """
    if not text:
        return ""
    compact = re.sub(r"\s+", " ", text).strip()
    return compact


def split_sentences(text: str) -> List[str]:
    """Split text into sentence-like chunks for fallback processing."""
    clean = normalize_text(text)
    if not clean:
        return []
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", clean) if part.strip()]


def clamp(value: float, min_value: float = 0.0, max_value: float = 100.0) -> float:
    """Clamp numeric values into a stable scoring range."""
    return max(min_value, min(max_value, value))

