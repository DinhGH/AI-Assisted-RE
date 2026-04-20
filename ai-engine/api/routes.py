"""HTTP routes for AI engine analysis and chat."""

from __future__ import annotations

from fastapi import APIRouter, FastAPI
from datetime import datetime

from app.ambiguity.detector import detect_ambiguity
from app.contradiction.detector import detect_internal_contradiction
from app.explainability.explainer import explain_result
from app.nlp.parser import parse_requirement_text
from app.readability.analyzer import analyze_readability
from app.scoring.scorer import calculate_quality_dimensions, score_requirement
from app.similarity.comparer import similarity_to_corpus
from app.chat.llm import (
    generate_response, 
    generate_enhanced_response,
    ISORequirementAnalyzer,
    ConversationMemory
)
from models.contracts import (
    AnalyzeRequest, 
    AnalyzeResponse, 
    ChatRequest, 
    ChatResponse,
    ISO29148AnalysisRequest,
    ISO29148AnalysisResponse,
    EnhancedChatRequest,
    EnhancedChatResponse
)

router = APIRouter()

# Conversation memory for chat sessions
conversation_sessions = {}


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


# ============================================================================
# ISO 29148 REQUIREMENT QUALITY ANALYSIS ENDPOINTS
# ============================================================================

@router.post("/iso29148/analyze", response_model=ISO29148AnalysisResponse)
def analyze_iso29148(payload: ISO29148AnalysisRequest) -> ISO29148AnalysisResponse:
    """
    Analyze requirement for ISO/IEC/IEEE 29148:2018 compliance.
    
    Returns:
    - Quality score (0-100)
    - Compliance status
    - Detected violations
    - Improvement suggestions
    """
    analysis = ISORequirementAnalyzer.analyze_requirement(payload.requirement_text)
    
    # Map violations to severities
    violations_with_severity = {}
    for violation_type, details in analysis["violations"].items():
        violations_with_severity[violation_type] = details
    
    # Define ISO dimensions
    iso_dimensions = {
        "unambiguous": "ambiguity" not in analysis["violations"],
        "verifiable": "verifiability" not in analysis["violations"],
        "consistent": "inconsistency" not in analysis["violations"],
        "complete": "completeness" not in analysis["violations"],
        "feasible": "feasibility" not in analysis["violations"],
    }
    
    return ISO29148AnalysisResponse(
        requirement_text=payload.requirement_text,
        quality_score=analysis["quality_score"],
        is_compliant=analysis["is_compliant"],
        violations=violations_with_severity,
        suggestions=analysis["suggestions"] if payload.include_suggestions else "",
        iso_dimensions=iso_dimensions,
        timestamp=datetime.now().isoformat()
    )


@router.post("/iso29148/batch-analyze")
def batch_analyze_iso29148(requirements: list[str]):
    """
    Batch analyze multiple requirements for ISO 29148 compliance.
    
    Returns analysis results for each requirement.
    """
    results = []
    for req_text in requirements:
        analysis = ISORequirementAnalyzer.analyze_requirement(req_text)
        results.append({
            "requirement": req_text,
            "quality_score": analysis["quality_score"],
            "is_compliant": analysis["is_compliant"],
            "violation_count": sum(len(v) for v in analysis["violations"].values())
        })
    
    return {
        "total_analyzed": len(requirements),
        "compliant_count": sum(1 for r in results if r["is_compliant"]),
        "average_quality_score": sum(r["quality_score"] for r in results) / len(results) if results else 0,
        "results": results
    }


# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

@router.post("/chat", response_model=ChatResponse)
def chat(payload: ChatRequest) -> ChatResponse:
    """AI-powered chat endpoint for requirement analysis and improvement.

    Uses fine-tuned LLM to provide intelligent responses about requirements.
    """
    # Convert history format if provided
    history = None
    if payload.history:
        history = [
            {"role": msg.role, "message": msg.message}
            for msg in payload.history
        ]

    # Generate response using LLM
    assistant_message = generate_response(
        message=payload.message,
        history=history,
        session_id=payload.session_id
    )

    return ChatResponse(session_id=payload.session_id, message=assistant_message)


@router.post("/chat/enhanced", response_model=EnhancedChatResponse)
def chat_enhanced(payload: EnhancedChatRequest) -> EnhancedChatResponse:
    """
    Enhanced chat endpoint with integrated ISO 29148 analysis.
    
    Features:
    - Requirement quality analysis
    - Improvement suggestions
    - Conversation memory
    - Context-aware responses
    """
    # Initialize or get conversation memory for session
    session_id = payload.session_id or "default"
    if session_id not in conversation_sessions:
        conversation_sessions[session_id] = ConversationMemory(max_history=10)
    
    memory = conversation_sessions[session_id]
    
    # Check if message is a requirement
    requirement_keywords = ["shall", "must", "will", "should", "system", "application"]
    is_requirement = any(kw in payload.message.lower() for kw in requirement_keywords)
    
    # Perform ISO 29148 analysis if requested and message is a requirement
    analysis = None
    if payload.include_analysis and is_requirement and len(payload.message) > 15:
        iso_analysis = ISORequirementAnalyzer.analyze_requirement(payload.message)
        analysis = ISO29148AnalysisResponse(
            requirement_text=payload.message,
            quality_score=iso_analysis["quality_score"],
            is_compliant=iso_analysis["is_compliant"],
            violations=iso_analysis["violations"],
            suggestions=iso_analysis["suggestions"],
            iso_dimensions={
                "unambiguous": "ambiguity" not in iso_analysis["violations"],
                "verifiable": "verifiability" not in iso_analysis["violations"],
                "consistent": "consistency" not in iso_analysis["violations"],
                "complete": "completeness" not in iso_analysis["violations"],
            },
            timestamp=datetime.now().isoformat()
        )
    
    # Convert history to the format expected by generate_response
    history = None
    if payload.conversation_history:
        history = [
            {"role": msg.role, "message": msg.content}
            for msg in payload.conversation_history
        ]
    
    # Generate conversational response
    response_message = generate_enhanced_response(payload.message, history)
    
    # Add to memory
    memory.add_message("user", payload.message)
    memory.add_message("assistant", response_message)
    
    # Extract suggestions if analysis was performed
    suggestions = None
    if analysis:
        # Parse suggestions into list format
        if analysis.suggestions:
            suggestions = [s.strip() for s in analysis.suggestions.split("\n") if s.strip()]
    
    return EnhancedChatResponse(
        message=response_message,
        analysis=analysis,
        suggestions=suggestions,
        timestamp=datetime.now().isoformat()
    )


@router.get("/chat/sessions/{session_id}/history")
def get_chat_history(session_id: str):
    """Get conversation history for a session."""
    if session_id not in conversation_sessions:
        return {"session_id": session_id, "history": []}
    
    memory = conversation_sessions[session_id]
    return {
        "session_id": session_id,
        "history": memory.get_history()
    }


@router.post("/chat/sessions/{session_id}/clear")
def clear_chat_session(session_id: str):
    """Clear conversation history for a session."""
    if session_id in conversation_sessions:
        conversation_sessions[session_id].clear()
    
    return {"session_id": session_id, "status": "cleared"}



def register_routes(app: FastAPI):
    app.include_router(router)
    return app

