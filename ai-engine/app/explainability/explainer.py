"""Explainability layer for analysis outputs."""

from __future__ import annotations

from typing import Dict, List


def explain_result(result: Dict[str, object]) -> Dict[str, List[str]]:
    """Generate short rationale bullets to support UI and audits."""
    bullets: List[str] = []

    ambiguity = float(result.get("ambiguity", 0.0))
    readability = float(result.get("readability", 0.0))
    contradiction = float(result.get("contradiction", 0.0))
    score = float(result.get("score", 0.0))

    if ambiguity > 1.0:
        bullets.append("Requirement includes ambiguous terms; consider replacing vague words with measurable constraints.")
    if readability < 40.0:
        bullets.append("Readability is low; simplify sentence structure for easier validation.")
    if contradiction >= 0.5:
        bullets.append("Potential contradiction detected; review modal verbs and negations.")
    if score >= 80.0:
        bullets.append("Overall quality is strong and likely testable with minor refinements.")

    if not bullets:
        bullets.append("No major quality risks were detected for this requirement.")

    return {"insights": bullets}

