"""Requirement quality scoring module."""

from __future__ import annotations

import re

from utils.helpers import clamp


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z][a-zA-Z0-9_\-]{2,}", (text or "").lower()))


def _token_count(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9]+", text or ""))


def _bounded_component(value: float) -> float:
    """Keep component scores within [0, 100]."""
    return float(clamp(value, 0.0, 100.0))


def _operating_band(value: float) -> float:
    """Compress generated scores to a practical 10..90 operating band.

    Theoretical score range remains 0..100, but default system outputs should
    avoid unrealistic extremes.
    """
    bounded = _bounded_component(value)
    return float(clamp(10.0 + (0.85 * bounded), 10.0, 90.0))


def _has_modal_verb(text: str) -> bool:
    return bool(re.search(r"\b(shall|must|should|will)\b", (text or "").lower()))


def _has_measurable_constraint(text: str) -> bool:
    lowered = (text or "").lower()
    if re.search(r"\b\d+(?:\.\d+)?\b", lowered):
        return True

    return bool(
        re.search(
            r"\b(ms|millisecond|second|minute|hour|day|week|month|year|percent|%|kb|mb|gb|tb|request|requests|user|users|transaction|transactions|record|records|items?)\b",
            lowered,
        )
    )


def _has_condition_clause(text: str) -> bool:
    return bool(
        re.search(
            r"\b(if|when|whenever|unless|under|within|before|after|while|provided that)\b",
            (text or "").lower(),
        )
    )


def _domain_alignment_score(text: str, domain_terms: list[str] | None) -> float:
    if not domain_terms:
        return 0.0

    tokens = _tokenize(text)
    if not tokens:
        return 0.0

    domain_set = {term.lower() for term in domain_terms if term}
    if not domain_set:
        return 0.0

    overlap = len(tokens.intersection(domain_set))
    baseline = min(12, len(domain_set))
    if baseline <= 0:
        return 0.0

    return max(0.0, min(1.0, overlap / baseline))


def _text_quality_gate(text: str) -> float:
    """Return a deterministic quality multiplier (0..1) for requirement text.

    WHY: Very short or non-informative inputs (e.g. '.', 'haha') should not receive
    medium scores from baseline formulas.
    """
    normalized = (text or "").strip()
    if not normalized:
        return 0.0

    if re.fullmatch(r"[\W_]+", normalized):
        return 0.0

    tokens = re.findall(r"[A-Za-z0-9]+", normalized.lower())
    token_count = len(tokens)
    if token_count <= 1:
        base = 0.05
    elif token_count <= 3:
        base = 0.2
    elif token_count <= 5:
        base = 0.4
    elif token_count <= 7:
        base = 0.65
    elif token_count <= 10:
        base = 0.82
    else:
        base = 1.0

    unique_tokens = len(set(tokens))
    if token_count > 0:
        unique_ratio = unique_tokens / token_count
        if unique_ratio < 0.4:
            base *= 0.75
        elif unique_ratio < 0.6:
            base *= 0.9

    if unique_tokens == 1 and token_count >= 2:
        base *= 0.5

    alpha_count = len(re.findall(r"[A-Za-z]", normalized))
    alnum_count = len(re.findall(r"[A-Za-z0-9]", normalized))
    if alnum_count <= 0 or alpha_count <= 0:
        return 0.0

    alpha_ratio = alpha_count / alnum_count
    if alpha_ratio < 0.35:
        base *= 0.75

    return max(0.0, min(1.0, round(base, 3)))


def calculate_quality_dimensions(
    *,
    readability: float,
    ambiguity: float,
    similarity: float,
    contradiction: float,
    has_actor: bool,
    has_action: bool,
    has_object: bool,
    requirement_text: str = "",
    standards_profile: dict | None = None,
):
    """Compute clarity/completeness/consistency dimensions.

    WHY: Separating dimensions from final score keeps scoring transparent and tunable.
    """
    # ambiguity is already in the practical 10..90 range.
    # Convert it to a softer clarity deduction so decent requirements
    # are not overly punished.
    ambiguity_penalty = min(70.0, max(0.0, (ambiguity - 10.0) * 0.55))

    text = requirement_text or ""
    profile = standards_profile or {}
    quality_gate = _text_quality_gate(text)

    has_modal = _has_modal_verb(text)
    has_measurable = _has_measurable_constraint(text)
    has_condition = _has_condition_clause(text)
    domain_alignment = _domain_alignment_score(text, profile.get("domain_terms") or [])
    token_count = _token_count(text)
    missing_core_count = int(not has_actor) + int(not has_action) + int(not has_object)

    if token_count <= 2:
        brevity_penalty = 35.0
    elif token_count <= 4:
        brevity_penalty = 24.0
    elif token_count <= 7:
        brevity_penalty = 12.0
    else:
        brevity_penalty = 0.0

    clarity_base = (
        22.0
        + (0.40 * readability)
        + (14.0 if has_modal else -5.0)
        + (14.0 if has_measurable else -10.0)
        + (8.0 if has_condition else -2.0)
        + (18.0 * domain_alignment)
    )
    clarity_deduction = (
        ambiguity_penalty
        + (missing_core_count * 9.0)
        + (brevity_penalty * 0.8)
    )
    clarity = _operating_band(clamp((clarity_base - clarity_deduction) * quality_gate))

    actor_weight = 15.0
    action_weight = 15.0
    object_weight = 15.0
    modal_weight = 10.0
    measurable_weight = 20.0
    condition_weight = 10.0
    domain_weight = 15.0

    if not bool(profile.get("emphasize_measurable", True)):
        measurable_weight -= 5.0
        domain_weight += 5.0

    if not bool(profile.get("emphasize_conditions", True)):
        condition_weight -= 5.0
        domain_weight += 5.0

    completeness = (
        (actor_weight if has_actor else 0.0)
        + (action_weight if has_action else 0.0)
        + (object_weight if has_object else 0.0)
        + (modal_weight if has_modal else 0.0)
        + (measurable_weight if has_measurable else 0.0)
        + (condition_weight if has_condition else 0.0)
        + (domain_weight * domain_alignment)
    )
    completeness -= missing_core_count * 11.0
    if not has_modal:
        completeness -= 5.0
    if not has_measurable:
        completeness -= 9.0
    if not has_condition:
        completeness -= 4.0
    completeness -= brevity_penalty * 0.7
    completeness += 6.0
    completeness = _operating_band(clamp(completeness * quality_gate))

    consistency_raw = (similarity * 72.0) + ((1.0 - contradiction) * 18.0) + 16.0
    consistency_raw -= (missing_core_count * 6.0) + (brevity_penalty * 0.35)
    consistency = _operating_band(clamp(consistency_raw * quality_gate))

    return {
        "clarity": float(clarity),
        "completeness": float(completeness),
        "consistency": float(consistency),
        "quality_gate": float(quality_gate),
    }


def score_requirement(
    *,
    clarity: float,
    completeness: float,
    consistency: float,
    ambiguity: float,
    quality_gate: float = 1.0,
) -> float:
    """Compute final score according to project weighting contract."""
    clarity = _bounded_component(clarity)
    completeness = _bounded_component(completeness)
    consistency = _bounded_component(consistency)
    ambiguity_percent = _bounded_component(ambiguity)

    total = (
        (0.29 * clarity)
        + (0.31 * completeness)
        + (0.22 * consistency)
        + (0.18 * (100.0 - ambiguity_percent))
    )
    gate = max(0.0, min(1.0, quality_gate))
    gated_total = total * gate

    # Calibration lift:
    # - Raise overall scores to better match product expectations.
    # - Explicitly reward lower ambiguity (smaller is better).
    # - Keep weak/noisy requirements low using quality gate scaling.
    ambiguity_reward_ratio = max(0.0, min(1.0, (90.0 - ambiguity_percent) / 80.0))

    quality_lift = (5.0 * gate) + (4.0 * gate * ambiguity_reward_ratio)
    if completeness >= 62.0 and clarity >= 28.0 and ambiguity_percent <= 30.0:
        quality_lift += 3.0
    if completeness >= 70.0 and clarity >= 40.0 and ambiguity_percent <= 20.0:
        quality_lift += 2.0

    # Keep "ambiguity lower is better" behavior explicit.
    # When ambiguity grows high, remove part of the calibration lift.
    high_ambiguity_penalty = max(0.0, (ambiguity_percent - 60.0) * 0.12) * gate

    return float(clamp(gated_total + quality_lift - high_ambiguity_penalty, 10.0, 90.0))

