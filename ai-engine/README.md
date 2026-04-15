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
