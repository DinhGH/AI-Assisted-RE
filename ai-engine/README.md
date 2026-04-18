# AI Engine

<!--
  This folder contains the Python-based analysis service implementation.
  It performs NLP extraction, ambiguity detection, readability scoring,
  similarity, contradiction checks, and final requirement scoring.
-->

## Purpose

Analyze requirement text using NLP, similarity, contradiction, scoring, and explainability modules.

## Responsibilities

- Parse requirement statements into structured forms
- Detect ambiguity and consistency issues
- Produce quality scores and explanation metadata
- Expose analysis-friendly interfaces for the backend

## Example usage

Install dependencies with `pip install -r requirements.txt` and run
`uvicorn main:app --host 0.0.0.0 --port 8000`.

## Local chat behavior

The chat endpoint now runs a local context-aware conversational engine.

It uses:

- requirement analysis results
- chat history from the current session
- intent detection for short follow-up messages
- optional guideline snippets from `AI_TRAINING_DATA_DIR`

This keeps the assistant chatty and requirement-focused without depending on an external model provider.

## Team guideline training data (lightweight grounding)

Set `AI_TRAINING_DATA_DIR` to a folder containing `.txt` / `.md` guideline files.
During chat, the engine selects relevant snippets from that folder and injects them
as context so answers align better with your team standards.
