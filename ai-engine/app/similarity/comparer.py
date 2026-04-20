"""Semantic similarity module based on Sentence-BERT embeddings."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Iterable

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

from utils.helpers import normalize_text


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer:
    model_name = os.getenv("SENTENCE_BERT_MODEL", "all-MiniLM-L6-v2")
    return SentenceTransformer(model_name)


def compare_requirements(left_text: str, right_text: str) -> float:
    """Return cosine similarity in range 0..1 between two requirements."""
    left = normalize_text(left_text)
    right = normalize_text(right_text)
    if not left or not right:
        return 0.0

    model = _load_model()
    embeddings = model.encode([left, right])
    score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
    return float(max(0.0, min(1.0, score)))


def similarity_to_corpus(text: str, corpus: Iterable[str]) -> float:
    """Return max semantic similarity of text against a corpus."""
    clean = normalize_text(text)
    candidates = [normalize_text(item) for item in corpus if normalize_text(item)]
    if not clean or not candidates:
        return 0.0

    model = _load_model()
    embeddings = model.encode([clean] + candidates)
    base = embeddings[0]
    refs = embeddings[1:]
    scores = cosine_similarity([base], refs)[0]
    return float(max(0.0, min(1.0, max(scores))))

