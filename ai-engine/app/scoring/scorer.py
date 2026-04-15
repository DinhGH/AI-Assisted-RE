"""Requirement quality scoring module."""

from __future__ import annotations

from utils.helpers import clamp


def calculate_quality_dimensions(*, readability: float, ambiguity: float, similarity: float, contradiction: float, has_actor: bool, has_action: bool, has_object: bool):
    """Compute clarity/completeness/consistency dimensions.

    WHY: Separating dimensions from final score keeps scoring transparent and tunable.
    """
    ambiguity_penalty = min(60.0, ambiguity * 12.0)

    clarity = clamp((0.65 * readability) + 35.0 - ambiguity_penalty)

    completeness_components = [has_actor, has_action, has_object]
    completeness = clamp((sum(1 for item in completeness_components if item) / 3.0) * 100.0)

    consistency = clamp((similarity * 70.0) + ((1.0 - contradiction) * 30.0))

    return {
        "clarity": float(clarity),
        "completeness": float(completeness),
        "consistency": float(consistency),
    }


def score_requirement(*, clarity: float, completeness: float, consistency: float, ambiguity: float) -> float:
    """Compute final score according to project weighting contract."""
    total = (0.3 * clarity) + (0.3 * completeness) + (0.25 * consistency) + (0.15 * (100.0 - ambiguity))
    return float(clamp(total))

