"""Natural language parser for extracting actor/action/object triples."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Dict

try:
    import spacy
except Exception:  # pragma: no cover - optional runtime dependency
    spacy = None  # type: ignore[assignment]

from utils.helpers import normalize_text, split_sentences


@lru_cache(maxsize=1)
def _load_nlp():
    """Load spaCy pipeline lazily for faster startup in test contexts."""
    if spacy is None:
        return None

    model_name = os.getenv("SPACY_MODEL", "en_core_web_sm")
    try:
        return spacy.load(model_name)
    except Exception:
        # Fallback keeps service alive when model download is delayed.
        return spacy.blank("en")


def _fallback_parse(text: str) -> Dict[str, str]:
    """Heuristic parser used when POS/dependency signals are unavailable.

    IMPORTANT: avoid assigning actor/action/object for low-information text
    (e.g. "haha") because that inflates completeness scoring.
    """
    normalized = normalize_text(text)
    tokens = [token for token in normalized.split(" ") if token]

    # For very short/non-requirement text, return empty components.
    if len(tokens) < 4:
        return {"actor": "", "action": "", "object": ""}

    lowered = [token.lower() for token in tokens]
    modal_candidates = {"shall", "must", "should", "will", "can", "may"}

    modal_index = -1
    for idx, token in enumerate(lowered):
        if token in modal_candidates:
            modal_index = idx
            break

    if 1 <= modal_index < len(tokens) - 1:
        actor = " ".join(tokens[:modal_index]).strip()
        action = tokens[modal_index + 1].strip()
        obj = " ".join(tokens[modal_index + 2 :]).strip()
        return {"actor": actor, "action": action, "object": obj}

    # Conservative fallback: only populate object when structure is unclear.
    return {"actor": "", "action": "", "object": normalized}


def parse_requirement_text(text: str):
    """Extract actor, action, object from requirement text.

    WHY: Structured triples improve downstream scoring and explainability.
    """
    normalized = normalize_text(text)
    if not normalized:
        return {"actor": "", "action": "", "object": ""}

    nlp = _load_nlp()
    if nlp is None:
        return _fallback_parse(normalized)

    doc = nlp(normalized)

    # If dependency parser is missing (blank model), use a deterministic fallback.
    if not doc.has_annotation("DEP"):
        return _fallback_parse(normalized)

    actor = ""
    action = ""
    obj = ""

    for token in doc:
        if token.dep_ in {"nsubj", "nsubjpass"} and not actor:
            actor = token.text
        if token.pos_ == "VERB" and not action:
            action = token.lemma_
        if token.dep_ in {"dobj", "pobj", "obj"} and not obj:
            obj = token.text

    if not any([actor, action, obj]):
        return _fallback_parse(normalized)

    if not obj:
        sentences = split_sentences(normalized)
        obj = sentences[0] if sentences else ""

    return {"actor": actor, "action": action, "object": obj}

