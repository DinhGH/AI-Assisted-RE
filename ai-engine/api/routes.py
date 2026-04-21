"""HTTP routes for AI engine analysis and chat."""

from __future__ import annotations

from fastapi import APIRouter, FastAPI

from app.ambiguity.detector import detect_ambiguity
from app.contradiction.detector import detect_internal_contradiction
from app.explainability.explainer import explain_result
from app.nlp.parser import parse_requirement_text
from app.readability.analyzer import analyze_readability
from app.scoring.scorer import calculate_quality_dimensions, score_requirement
from app.similarity.comparer import similarity_to_corpus
from app.standards.loader import load_reference_standards
from models.contracts import AnalyzeRequest, AnalyzeResponse, ChatRequest, ChatResponse

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    standards = load_reference_standards()

    parsed = parse_requirement_text(payload.text)

    ambiguity_result = detect_ambiguity(
        payload.text,
        extra_terms=standards.ambiguous_terms,
    )
    readability = analyze_readability(payload.text)
    similarity = similarity_to_corpus(payload.text, standards.reference_patterns)
    contradiction = detect_internal_contradiction(payload.text)

    quality = calculate_quality_dimensions(
        readability=readability,
        ambiguity=ambiguity_result["score"],
        similarity=similarity,
        contradiction=contradiction,
        has_actor=bool(parsed.get("actor")),
        has_action=bool(parsed.get("action")),
        has_object=bool(parsed.get("object")),
        requirement_text=payload.text,
        standards_profile=standards.scoring_profile,
    )

    final_score = score_requirement(
        clarity=quality["clarity"],
        completeness=quality["completeness"],
        consistency=quality["consistency"],
        ambiguity=ambiguity_result["score"],
        quality_gate=quality.get("quality_gate", 1.0),
    )

    response_payload = {
        "actor": parsed.get("actor", ""),
        "action": parsed.get("action", ""),
        "object": parsed.get("object", ""),
        "ambiguity": float(ambiguity_result["score"]),
        "ambiguity_count": int(ambiguity_result.get("count", 0)),
        "ambiguity_terms": list(ambiguity_result.get("terms", [])),
        "readability": float(readability),
        "similarity": float(similarity),
        "contradiction": float(contradiction),
        "clarity": float(quality["clarity"]),
        "completeness": float(quality["completeness"]),
        "consistency": float(quality["consistency"]),
        "score": float(final_score),
    }

    explanation = explain_result(
        {
            **response_payload,
            "standards_files": list(standards.files_used),
        }
    )

    return AnalyzeResponse(**response_payload, explanation=explanation["insights"])


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    """DEPRECATED: Chat is now handled by backend + Ollama.
    
    This endpoint is kept for backwards compatibility only.
    All new chat requests should be routed through the backend
    `/chat` endpoint, which calls Ollama directly with full context.
    
    The backend service handles:
    - Mode-aware prompt assembly (initial vs followup)
    - Full conversation history
    - Requirement analysis context
    - Ollama integration
    
    Do NOT use this endpoint for new implementations.
    """
    raise NotImplementedError(
        "Chat endpoint has been moved to backend. "
        "Use POST /chat on the Express backend instead, which integrates with Ollama. "
        "See backend/src/controllers/requirement.controller.js for implementation."
    )


def register_routes(app: FastAPI):
    app.include_router(router)
    return app

