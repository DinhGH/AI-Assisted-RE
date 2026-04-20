"""Readability analysis module."""

from __future__ import annotations

import re

from utils.helpers import clamp, normalize_text


VOWELS = set("aeiouy")


def _count_words(text: str) -> int:
    return len([item for item in re.findall(r"[A-Za-z']+", text) if item])


def _count_sentences(text: str) -> int:
    parts = [chunk.strip() for chunk in re.split(r"[.!?]+", text) if chunk.strip()]
    return max(1, len(parts))


def _count_syllables_in_word(word: str) -> int:
    clean = re.sub(r"[^a-z]", "", word.lower())
    if not clean:
        return 1

    syllables = 0
    prev_is_vowel = False
    for char in clean:
        is_vowel = char in VOWELS
        if is_vowel and not prev_is_vowel:
            syllables += 1
        prev_is_vowel = is_vowel

    if clean.endswith("e") and syllables > 1:
        syllables -= 1

    return max(1, syllables)


def _count_syllables(text: str) -> int:
    words = re.findall(r"[A-Za-z']+", text)
    if not words:
        return 0
    return sum(_count_syllables_in_word(word) for word in words)


def analyze_readability(text: str) -> float:
    """Return a 0-100 readability score using Flesch Reading Ease.

    WHY: The score is interpretable and aligns with requirement clarity checks.
    """
    normalized = normalize_text(text)
    if not normalized:
        return 0.0

    words = _count_words(normalized)
    sentences = _count_sentences(normalized)
    syllables = _count_syllables(normalized)

    if words == 0:
        return 0.0

    # Flesch Reading Ease:
    # 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
    raw_score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllables / words))
    return float(clamp(raw_score, 0.0, 100.0))
