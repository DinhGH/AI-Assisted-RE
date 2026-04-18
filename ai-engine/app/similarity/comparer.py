"""Semantic similarity module based on Sentence-BERT embeddings."""

from __future__ import annotations

import logging
import os
import re
from functools import lru_cache
from typing import Iterable

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - dependency may be unavailable in some environments
    SentenceTransformer = None  # type: ignore[assignment]
try:
    from sklearn.metrics.pairwise import cosine_similarity
except Exception:  # pragma: no cover - dependency may be unavailable in some environments
    cosine_similarity = None  # type: ignore[assignment]

from utils.helpers import normalize_text


logger = logging.getLogger(__name__)


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-zA-Z0-9_\-]{2,}", (text or "").lower()))


def _lexical_similarity(left_text: str, right_text: str) -> float:
    left_tokens = _tokenize(left_text)
    right_tokens = _tokenize(right_text)

    if not left_tokens or not right_tokens:
        return 0.0

    union = left_tokens.union(right_tokens)
    if not union:
        return 0.0

    return float(len(left_tokens.intersection(right_tokens)) / len(union))


@lru_cache(maxsize=1)
def _load_model() -> SentenceTransformer | None:
    if SentenceTransformer is None:
        logger.warning("sentence-transformers not available, using lexical similarity fallback")
        return None

    if cosine_similarity is None:
        logger.warning("scikit-learn not available, using lexical similarity fallback")
        return None

    model_name = os.getenv("SENTENCE_BERT_MODEL", "all-MiniLM-L6-v2")
    disabled = os.getenv("DISABLE_SENTENCE_BERT", "").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    if disabled:
        logger.warning("Sentence-BERT disabled via DISABLE_SENTENCE_BERT, using lexical similarity fallback")
        return None

    try:
        return SentenceTransformer(model_name)
    except Exception as error:  # pragma: no cover - defensive runtime fallback
        logger.warning(
            "Failed to load Sentence-BERT model '%s', falling back to lexical similarity (%s)",
            model_name,
            error,
        )
        return None


def compare_requirements(left_text: str, right_text: str) -> float:
    """Return cosine similarity in range 0..1 between two requirements."""
    left = normalize_text(left_text)
    right = normalize_text(right_text)
    if not left or not right:
        return 0.0

    model = _load_model()
    if model is None:
        return float(max(0.0, min(1.0, _lexical_similarity(left, right))))

    try:
        embeddings = model.encode([left, right])
        score = cosine_similarity([embeddings[0]], [embeddings[1]])[0][0]
        return float(max(0.0, min(1.0, score)))
    except Exception as error:  # pragma: no cover - defensive runtime fallback
        logger.warning("Sentence-BERT encode failed, using lexical similarity fallback (%s)", error)
        return float(max(0.0, min(1.0, _lexical_similarity(left, right))))


def similarity_to_corpus(text: str, corpus: Iterable[str]) -> float:
    """Return max semantic similarity of text against a corpus."""
    clean = normalize_text(text)
    candidates = [normalize_text(item) for item in corpus if normalize_text(item)]
    if not clean or not candidates:
        return 0.0

    model = _load_model()
    if model is None:
        lexical_scores = [_lexical_similarity(clean, candidate) for candidate in candidates]
        return float(max(0.0, min(1.0, max(lexical_scores)))) if lexical_scores else 0.0

    try:
        embeddings = model.encode([clean] + candidates)
        base = embeddings[0]
        refs = embeddings[1:]
        scores = cosine_similarity([base], refs)[0]
        return float(max(0.0, min(1.0, max(scores))))
    except Exception as error:  # pragma: no cover - defensive runtime fallback
        logger.warning("Sentence-BERT corpus encode failed, using lexical similarity fallback (%s)", error)
        lexical_scores = [_lexical_similarity(clean, candidate) for candidate in candidates]
        return float(max(0.0, min(1.0, max(lexical_scores)))) if lexical_scores else 0.0

