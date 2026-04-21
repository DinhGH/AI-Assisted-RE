"""Load and structure external requirement quality standards (PDF/TXT/MD)."""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable

try:
    from pypdf import PdfReader
except Exception:  # pragma: no cover - optional dependency at runtime
    try:
        from PyPDF2 import PdfReader  # type: ignore[no-redef]
    except Exception:
        PdfReader = None  # type: ignore[assignment]


DEFAULT_REFERENCE_PATTERNS = [
    "The system shall allow authenticated users to submit requirements.",
    "The application must validate mandatory fields before saving data.",
    "The platform shall return a response within two seconds for standard queries.",
]

DEFAULT_ADDITIONAL_AMBIGUOUS_TERMS = {
    "efficient",
    "fast",
    "quick",
    "high",
    "low",
    "reliable",
    "robust",
    "flexible",
    "seamless",
    "adequate",
    "sufficient",
    "as needed",
    "if possible",
}

STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "shall",
    "must",
    "should",
    "system",
    "requirement",
    "requirements",
    "users",
    "user",
    "application",
    "software",
    "data",
    "process",
    "be",
    "to",
    "of",
    "in",
    "on",
    "is",
    "are",
    "by",
    "as",
    "or",
    "an",
    "a",
}


@dataclass(frozen=True)
class ReferenceStandards:
    """Structured standards data consumed by analysis pipeline."""

    reference_patterns: tuple[str, ...]
    ambiguous_terms: tuple[str, ...]
    scoring_profile: dict
    files_used: tuple[str, ...]



def _resolve_standards_dir() -> Path:
    current_file = Path(__file__).resolve()
    ai_engine_root = current_file.parents[2]
    repo_root = ai_engine_root.parent
    return repo_root / "reference-standards"



def _split_sentences(text: str) -> list[str]:
    return [
        part.strip()
        for part in re.split(r"(?<=[.!?])\s+", text or "")
        if part and part.strip()
    ]



def _extract_requirement_patterns(raw_text: str) -> list[str]:
    candidates: list[str] = []
    for sentence in _split_sentences(raw_text):
        words = sentence.split()
        if not (6 <= len(words) <= 45):
            continue

        lowered = sentence.lower()
        if any(modal in lowered for modal in (" shall ", " must ", " should ", " will ")):
            candidates.append(sentence)

    dedup: list[str] = []
    seen = set()
    for candidate in candidates:
        key = candidate.lower()
        if key in seen:
            continue
        seen.add(key)
        dedup.append(candidate)

    return dedup[:200]



def _extract_text_from_pdf(path: Path) -> str:
    if PdfReader is None:
        return ""

    try:
        reader = PdfReader(str(path))
        chunks = []
        for page in reader.pages:
            chunks.append(page.extract_text() or "")
        return "\n".join(chunks)
    except Exception:
        return ""



def _read_file_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return _extract_text_from_pdf(path)

    if suffix in {".txt", ".md", ".rst"}:
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return ""

    return ""



def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z0-9_-]{2,}", (text or "").lower())



def _extract_domain_terms(documents_text: Iterable[str], top_n: int = 40) -> list[str]:
    counter: Counter[str] = Counter()

    for text in documents_text:
        for token in _tokenize(text):
            if token in STOPWORDS:
                continue
            counter[token] += 1

    return [term for term, _ in counter.most_common(top_n)]



def _build_scoring_profile(combined_text: str, domain_terms: list[str]) -> dict:
    lowered = (combined_text or "").lower()

    emphasize_measurable = any(
        keyword in lowered
        for keyword in (
            "measurable",
            "quantifiable",
            "testable",
            "verification",
            "acceptance criteria",
            "metric",
            "response time",
            "latency",
            "throughput",
        )
    )

    emphasize_conditions = any(
        keyword in lowered
        for keyword in (
            "condition",
            "precondition",
            "when",
            "if",
            "under",
            "within",
            "before",
            "after",
        )
    )

    return {
        "emphasize_measurable": bool(emphasize_measurable),
        "emphasize_conditions": bool(emphasize_conditions),
        "domain_terms": domain_terms,
    }



def _build_signature(directory: Path) -> tuple[tuple[str, int, int], ...]:
    if not directory.exists():
        return tuple()

    signature: list[tuple[str, int, int]] = []
    for path in sorted(directory.iterdir()):
        if not path.is_file():
            continue
        if path.suffix.lower() not in {".pdf", ".txt", ".md", ".rst"}:
            continue

        stat = path.stat()
        signature.append((path.name, int(stat.st_mtime), int(stat.st_size)))

    return tuple(signature)


@lru_cache(maxsize=8)
def _load_reference_standards_cached(
    standards_dir: str,
    signature: tuple[tuple[str, int, int], ...],
) -> ReferenceStandards:
    del signature  # cache key only

    directory = Path(standards_dir)
    if not directory.exists():
        return ReferenceStandards(
            reference_patterns=tuple(DEFAULT_REFERENCE_PATTERNS),
            ambiguous_terms=tuple(sorted(DEFAULT_ADDITIONAL_AMBIGUOUS_TERMS)),
            scoring_profile={
                "emphasize_measurable": True,
                "emphasize_conditions": True,
                "domain_terms": [],
            },
            files_used=tuple(),
        )

    texts: list[str] = []
    files_used: list[str] = []

    for path in sorted(directory.iterdir()):
        if not path.is_file():
            continue

        if path.suffix.lower() not in {".pdf", ".txt", ".md", ".rst"}:
            continue

        text = _read_file_text(path)
        if not text.strip():
            continue

        texts.append(text)
        files_used.append(path.name)

    if not texts:
        return ReferenceStandards(
            reference_patterns=tuple(DEFAULT_REFERENCE_PATTERNS),
            ambiguous_terms=tuple(sorted(DEFAULT_ADDITIONAL_AMBIGUOUS_TERMS)),
            scoring_profile={
                "emphasize_measurable": True,
                "emphasize_conditions": True,
                "domain_terms": [],
            },
            files_used=tuple(),
        )

    extracted_patterns: list[str] = []
    for text in texts:
        extracted_patterns.extend(_extract_requirement_patterns(text))

    if not extracted_patterns:
        extracted_patterns = list(DEFAULT_REFERENCE_PATTERNS)

    domain_terms = _extract_domain_terms(texts, top_n=40)
    scoring_profile = _build_scoring_profile("\n".join(texts), domain_terms)

    return ReferenceStandards(
        reference_patterns=tuple(extracted_patterns),
        ambiguous_terms=tuple(sorted(DEFAULT_ADDITIONAL_AMBIGUOUS_TERMS)),
        scoring_profile=scoring_profile,
        files_used=tuple(files_used),
    )



def load_reference_standards() -> ReferenceStandards:
    """Load and cache standards from `reference-standards` folder."""
    standards_dir = _resolve_standards_dir()
    signature = _build_signature(standards_dir)
    return _load_reference_standards_cached(str(standards_dir), signature)
