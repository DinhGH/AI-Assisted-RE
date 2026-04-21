"""Explainability layer for analysis outputs."""

from __future__ import annotations

from typing import Dict, List


def _is_low_quality_chunk(value: str, *, min_words: int = 1, max_words: int = 8) -> bool:
    chunk = str(value or "").strip()
    if not chunk:
        return True

    words = [part for part in chunk.split() if part]
    if len(words) < min_words or len(words) > max_words:
        return True

    lowered = chunk.lower()
    if lowered in {"system", "the system", "user", "users", "it"}:
        return True

    if lowered.startswith("the system should") or lowered.startswith("the system shall"):
        return True

    return False


def explain_result(result: Dict[str, object]) -> Dict[str, List[str]]:
    """Generate short rationale bullets to support UI and audits."""
    bullets: List[str] = []

    ambiguity = float(result.get("ambiguity", 0.0))
    readability = float(result.get("readability", 0.0))
    contradiction = float(result.get("contradiction", 0.0))
    score = float(result.get("score", 0.0))
    actor = str(result.get("actor", "") or "").strip()
    action = str(result.get("action", "") or "").strip()
    obj = str(result.get("object", "") or "").strip()
    ambiguity_terms = [
        str(term).strip()
        for term in (result.get("ambiguity_terms") or [])
        if str(term).strip()
    ]
    standards_files = [
        str(item).strip()
        for item in (result.get("standards_files") or [])
        if str(item).strip()
    ]

    if ambiguity >= 40.0:
        bullets.append("Requirement includes ambiguous terms; consider replacing vague words with measurable constraints.")
    if ambiguity_terms:
        bullets.append(
            f"Detected ambiguous term(s): {', '.join(ambiguity_terms[:6])}. Replace them with quantifiable targets, boundaries, and acceptance conditions."
        )
    if readability < 40.0:
        bullets.append("Readability is low; simplify sentence structure for easier validation.")
    if contradiction >= 0.5:
        bullets.append("Potential contradiction detected; review modal verbs and negations.")
    if score >= 80.0:
        bullets.append("Overall quality is strong and likely testable with minor refinements.")

    missing_parts: List[str] = []
    if not actor:
        missing_parts.append("actor/owner")
    if not action:
        missing_parts.append("explicit action")
    if not obj:
        missing_parts.append("target object/scope")

    if missing_parts:
        bullets.append(
            f"Missing core requirement part(s): {', '.join(missing_parts)}. Add these explicitly so reviewers can verify intent and accountability."
        )

    safe_actor = actor if not _is_low_quality_chunk(actor, min_words=1, max_words=5) else "[responsible role]"
    safe_action = action if not _is_low_quality_chunk(action, min_words=1, max_words=5) else "[specific action]"
    safe_object = obj if not _is_low_quality_chunk(obj, min_words=1, max_words=8) else "[target object/scope]"

    suggested_rewrite = (
        f"Suggested rewrite: The system shall {safe_action} "
        f"for {safe_object} "
        f"by {safe_actor}, "
        "under [clear condition], within [measurable threshold], and validated by [acceptance criteria]."
    )
    bullets.append(suggested_rewrite)

    if standards_files:
        bullets.append(
            f"Scoring is aligned with {len(standards_files)} reference standard file(s): {', '.join(standards_files[:3])}."
        )

    if not bullets:
        bullets.append("No major quality risks were detected for this requirement.")

    return {"insights": bullets}

