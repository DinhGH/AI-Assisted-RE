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
from models.contracts import AnalyzeRequest, AnalyzeResponse, ChatRequest, ChatResponse

router = APIRouter()


REFERENCE_REQUIREMENT_PATTERNS = [
    "The system shall allow authenticated users to submit requirements.",
    "The application must validate mandatory fields before saving data.",
    "The platform shall return a response within two seconds for standard queries.",
]


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(payload: AnalyzeRequest) -> AnalyzeResponse:
    parsed = parse_requirement_text(payload.text)

    ambiguity_result = detect_ambiguity(payload.text)
    readability = analyze_readability(payload.text)
    similarity = similarity_to_corpus(payload.text, REFERENCE_REQUIREMENT_PATTERNS)
    contradiction = detect_internal_contradiction(payload.text)

    quality = calculate_quality_dimensions(
        readability=readability,
        ambiguity=ambiguity_result["score"],
        similarity=similarity,
        contradiction=contradiction,
        has_actor=bool(parsed.get("actor")),
        has_action=bool(parsed.get("action")),
        has_object=bool(parsed.get("object")),
    )

    final_score = score_requirement(
        clarity=quality["clarity"],
        completeness=quality["completeness"],
        consistency=quality["consistency"],
        ambiguity=ambiguity_result["score"],
    )

    response_payload = {
        "actor": parsed.get("actor", ""),
        "action": parsed.get("action", ""),
        "object": parsed.get("object", ""),
        "ambiguity": float(ambiguity_result["score"]),
        "readability": float(readability),
        "similarity": float(similarity),
        "contradiction": float(contradiction),
        "clarity": float(quality["clarity"]),
        "completeness": float(quality["completeness"]),
        "consistency": float(quality["consistency"]),
        "score": float(final_score),
    }

    explanation = explain_result(response_payload)

    return AnalyzeResponse(**response_payload, explanation=explanation["insights"])


@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    """Lightweight chat endpoint for backend integration.

    WHY: Keeps backend flow unblocked while allowing future LLM provider swapping.
    """
    history_size = len(payload.history or [])
    assistant_message = (
        "I reviewed your requirement. Consider making actor/action/object explicit, "
        "adding measurable acceptance criteria, and removing vague terms. "
        f"(session={payload.session_id}, history={history_size})"
    )
    return ChatResponse(session_id=payload.session_id, message=assistant_message)


def register_routes(app: FastAPI):
    app.include_router(router)
    return app

