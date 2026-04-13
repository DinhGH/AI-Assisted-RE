# AI Engine

<!--
  This folder contains the Python-based NLP and scoring service boundary.
  It exists to isolate requirement analysis concerns from the web stack.
-->

## Purpose

Analyze requirement text using NLP, similarity, contradiction, scoring, and explainability modules.

## Responsibilities

- Parse requirement statements into structured forms
- Detect ambiguity and consistency issues
- Produce quality scores and explanation metadata
- Expose analysis-friendly interfaces for the backend

## Example usage

Implement analysis components under `ai-engine/app/` and keep external API surfaces in `ai-engine/api/`.
