"""Pydantic contracts for AI engine API."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1)


class AnalyzeResponse(BaseModel):
    actor: str
    action: str
    object: str
    ambiguity: float
    readability: float
    similarity: float
    contradiction: float
    clarity: float
    completeness: float
    consistency: float
    score: float
    ambiguity_count: Optional[int] = None
    ambiguity_terms: Optional[List[str]] = None
    explanation: List[str]


class ChatHistoryMessage(BaseModel):
    role: str
    message: str


class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    requirement_text: Optional[str] = None
    requirement_id: Optional[int] = None
    history: Optional[List[ChatHistoryMessage]] = None


class ChatResponse(BaseModel):
    session_id: str
    message: str

