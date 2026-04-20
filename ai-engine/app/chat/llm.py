"""LLM-based chat functionality for requirement analysis using Grok API."""

import os
from typing import List, Optional, Dict, AsyncGenerator
from datetime import datetime
import asyncio
import requests

from dotenv import load_dotenv
from pydantic import BaseModel

# Load environment variables
load_dotenv()

# Configuration
XAI_API_KEY = os.getenv("XAI_API_KEY")
XAI_API_URL = "https://api.x.ai/v1/responses"
MODEL_NAME = "grok-4.20-reasoning"


# ============================================================================
# ISO 29148 REQUIREMENT ANALYZER
# ============================================================================

class ISORequirementAnalyzer:
    """Analyzes requirements for ISO 29148 compliance."""
    
    VIOLATIONS_KEYWORDS = {
        "ambiguity": [
            "should", "nice", "good", "bad", "fast", "slow",
            "user-friendly", "intuitive", "easy", "simple", "robust"
        ],
        "verifiability": [
            "acceptable", "appropriate", "sufficient", "proper",
            "adequate", "suitable", "reasonable", "effective"
        ],
        "completeness": [
            "relevant", "applicable", "involved", "handled",
            "managed", "processed" 
        ],
    }
    
    @staticmethod
    def detect_iso_violations(text: str) -> Dict[str, List[str]]:
        """Detect potential ISO 29148 violations in requirement."""
        violations = {
            "ambiguity": [],
            "verifiability": [],
            "completeness": [],
            "implementation_independent": []
        }
        
        text_lower = text.lower()
        
        # Check for ambiguous terms
        for term in ISORequirementAnalyzer.VIOLATIONS_KEYWORDS["ambiguity"]:
            if term in text_lower:
                violations["ambiguity"].append(f"Vague term: '{term}'")
        
        # Check for non-verifiable terms
        for term in ISORequirementAnalyzer.VIOLATIONS_KEYWORDS["verifiability"]:
            if term in text_lower:
                violations["verifiability"].append(f"Non-measurable: '{term}'")
        
        # Check for incomplete specifications
        if "system" not in text_lower and "application" not in text_lower:
            violations["completeness"].append("Missing actor")
        
        if not any(kw in text_lower for kw in ["shall", "must", "will", "can"]):
            violations["completeness"].append("Missing action keywords")
        
        # Check for implementation-specific terms
        tech_terms = ["sql", "mongodb", "javascript", "python", "react", "docker"]
        for term in tech_terms:
            if term in text_lower:
                violations["implementation_independent"].append(f"Implementation-specific: {term}")
        
        # Filter empty violation types
        violations = {k: v for k, v in violations.items() if v}
        
        return violations
    
    @staticmethod
    def generate_improvement_suggestion(text: str, violations: Dict) -> str:
        """Generate specific improvement suggestions."""
        suggestions = []
        
        if "ambiguity" in violations:
            suggestions.append("✏️ Replace ambiguous terms with measurable metrics (e.g., 'fast' → 'within X seconds')")
        
        if "verifiability" in violations:
            suggestions.append("🧪 Add measurable acceptance criteria with thresholds and test conditions")
        
        if "completeness" in violations:
            suggestions.append("📋 Add ACTOR-ACTION-OBJECT pattern (Who does what to what?)")
        
        if "implementation_independent" in violations:
            suggestions.append("🔧 Remove specific technology names, focus on functional needs")
        
        return "\n".join(suggestions) if suggestions else "✅ Meets ISO 29148 standards"
    
    @staticmethod
    def analyze_requirement(text: str) -> Dict:
        """Complete ISO 29148 analysis of requirement."""
        violations = ISORequirementAnalyzer.detect_iso_violations(text)
        suggestions = ISORequirementAnalyzer.generate_improvement_suggestion(text, violations)
        
        # Calculate quality score
        violation_count = sum(len(v) for v in violations.values())
        quality_score = max(0, 100 - (violation_count * 15))
        
        return {
            "text": text,
            "quality_score": quality_score,
            "is_compliant": quality_score >= 80,
            "violations": violations,
            "suggestions": suggestions,
            "timestamp": datetime.now().isoformat()
        }



def generate_response(
    message: str,
    history: Optional[List[dict]] = None,
    session_id: str = ""
) -> str:
    """Generate a response using xAI Grok API."""
    if not XAI_API_KEY:
        return "xAI API key not configured. Please set XAI_API_KEY in your environment variables."

    try:
        # Build conversation context
        context = "You are an expert requirements engineer helping analyze and improve software requirements. Be helpful, precise, and focus on clarity, completeness, and testability.\n\n"

        if history:
            # Add recent history (last 5 messages to avoid token limits)
            recent_history = history[-5:]
            for msg in recent_history:
                role = msg.get("role", "")
                content = msg.get("message", "")
                if role == "user":
                    context += f"User: {content}\n"
                elif role == "assistant":
                    context += f"Assistant: {content}\n"

        context += f"User: {message}\nAssistant:"

        # Call xAI API
        headers = {
            "Authorization": f"Bearer {XAI_API_KEY}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": MODEL_NAME,
            "input": context
        }

        response = requests.post(XAI_API_URL, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        result = response.json()
        # Assuming the response has a "response" field or similar
        if "response" in result:
            return result["response"].strip()
        elif "output" in result:
            return result["output"].strip()
        elif "choices" in result and result["choices"]:
            return result["choices"][0]["message"]["content"].strip()
        else:
            return "API response format unexpected."

    except requests.exceptions.RequestException as e:
        print(f"Error calling xAI API: {e}")
        return "I encountered an error while processing your request. Please try again later."
    except Exception as e:
        print(f"Error generating response: {e}")
        return "I encountered an error while processing your request. Please try rephrasing your question."


def unload_model():
    """Unload the model to free memory. (Not needed for API)"""
    pass


# ============================================================================
# CONVERSATION MEMORY & CHAT MODELS
# ============================================================================

class ChatMessage(BaseModel):
    """Chat message model."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str
    conversation_history: Optional[List[Dict]] = None
    include_analysis: bool = True


class ChatResponse(BaseModel):
    """Chat response model."""
    message: str
    analysis: Optional[Dict] = None
    timestamp: str


class ConversationMemory:
    """Maintains conversation history for context-aware responses."""
    
    def __init__(self, max_history: int = 10):
        """Initialize conversation memory."""
        self.max_history = max_history
        self.history: List[Dict] = []
    
    def add_message(self, role: str, content: str):
        """Add message to history."""
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        }
        self.history.append(message)
        
        # Keep only recent history
        if len(self.history) > self.max_history:
            self.history = self.history[-self.max_history:]
    
    def get_history(self) -> List[Dict]:
        """Get conversation history."""
        return self.history.copy()
    
    def clear(self):
        """Clear conversation history."""
        self.history = []


def generate_requirement_analysis_response(message: str, history: Optional[List[Dict]] = None) -> Dict:
    """
    Generate comprehensive requirement quality analysis response.
    Returns ISO 29148 analysis with improvement suggestions.
    """
    # Analyze requirement quality
    analysis = ISORequirementAnalyzer.analyze_requirement(message)
    
    # Generate conversational response
    response_text = f"""
**Requirement Quality Analysis (ISO 29148)**

**Original**: {message}

**Quality Score**: {analysis['quality_score']}/100 {'✅ COMPLIANT' if analysis['is_compliant'] else '❌ NON-COMPLIANT'}

**Issues Found**: {len(analysis['violations'])} violation(s)
"""
    
    if analysis['violations']:
        response_text += "\n**Violations**:\n"
        for violation_type, details in analysis['violations'].items():
            response_text += f"  • {violation_type.upper()}: {', '.join(details)}\n"
    else:
        response_text += "\n✅ No major violations detected.\n"
    
    response_text += f"\n**Recommendations**:\n{analysis['suggestions']}\n"
    
    return {
        "message": response_text,
        "analysis": analysis,
        "timestamp": datetime.now().isoformat()
    }


def generate_enhanced_response(message: str, history: Optional[List[Dict]] = None) -> str:
    """Generate enhanced response with ISO 29148 analysis."""
    # Check if message contains requirement (detect by keywords)
    requirement_keywords = ["shall", "must", "will", "should", "can", "system", "application", "user"]
    is_requirement = any(kw in message.lower() for kw in requirement_keywords)
    
    if is_requirement and len(message) > 10:
        # Generate requirement analysis
        analysis_response = generate_requirement_analysis_response(message, history)
        return analysis_response["message"]
    else:
        # Generate regular chat response
        return generate_response(message, history)