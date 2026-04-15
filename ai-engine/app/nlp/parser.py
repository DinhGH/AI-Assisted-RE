"""Natural language parser for extracting actor/action/object triples."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Dict

import spacy

from utils.helpers import normalize_text, split_sentences


@lru_cache(maxsize=1)
def _load_nlp():
    """Load spaCy pipeline lazily for faster startup in test contexts."""
    model_name = os.getenv("SPACY_MODEL", "en_core_web_sm")
    try:
        return spacy.load(model_name)
    except Exception:
        # Fallback keeps service alive when model download is delayed.
        return spacy.blank("en")


def _fallback_parse(text: str) -> Dict[str, str]:
    """Heuristic parser used when POS/dependency signals are unavailable."""
    tokens = normalize_text(text).split(" ")
    actor = tokens[0] if len(tokens) > 0 else ""
    action = tokens[1] if len(tokens) > 1 else ""
    obj = " ".join(tokens[2:]) if len(tokens) > 2 else ""
    return {"actor": actor, "action": action, "object": obj}


def parse_requirement_text(text: str):
    """Extract actor, action, object from requirement text.

    WHY: Structured triples improve downstream scoring and explainability.
    """
    normalized = normalize_text(text)
    if not normalized:
        return {"actor": "", "action": "", "object": ""}

    nlp = _load_nlp()
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

