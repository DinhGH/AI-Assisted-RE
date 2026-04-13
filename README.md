# AI-Assisted Requirement Quality Analysis

<!--
  This repository is a monorepo scaffold for an AI-powered requirement analysis platform.
  It exists to align teams on the architecture, module boundaries, and delivery workflow
  before any business logic is implemented.
-->

## What this repository is for

This workspace is a non-functional project skeleton for:

- frontend requirement intake and visualization
- backend orchestration and API exposure
- AI/NLP analysis services
- shared contracts and constants
- documentation, Docker, and local development setup

## Architecture goals

- Clean separation of concerns
- Modular and replaceable services
- Team-friendly folder conventions
- Clear handoff points for 4 developers working in parallel

## Repository layout

- `frontend/` — React + Vite user interface
- `backend/` — Express API and job orchestration
- `ai-engine/` — Python NLP and scoring services
- `shared/` — Cross-service types, constants, and interfaces
- `docs/` — Architecture and process documentation
- `scripts/` — Automation helpers and maintenance scripts
- `docker/` — Container build files

## Status

This project currently contains structure, comments, and documentation only.
No business logic, AI algorithm, or production feature implementation has been added yet.

## Example workflow

1. Drop SRS or user stories into the upload flow
2. Send the text to the backend API
3. Forward analysis requests to the AI engine
4. Persist results and version history in MySQL
5. Visualize quality metrics in the dashboard

## Team working rules

To keep collaboration clean and predictable, follow these rules:

- The `main` branch is the official integration branch on GitHub.
- Each team member must create and work on their own feature branch.
- Branch names should match the feature or task being worked on.
- If the task is a small part of a larger feature, use a nested feature branch name in the format `big-feature-small-feature`.
- Do not merge directly into `main` unless you are explicitly responsible for integration.
- Do not push code to `main` just to share work in progress.
- The team lead will handle integration and merging into `main` after review.
- If environment variables change, notify the team in Zalo and include the exact variable name(s) that changed.
- If the database structure changes, notify the team so everyone is aware of the update before continuing work.

## Recommended branch naming examples

- `upload-module`
- `dashboard-radar-chart`
- `ai-chat-message-history`
- `requirement-analysis-ambiguity-check`

## Collaboration note

This repository is organized for parallel development. Please keep changes isolated, communicate breaking updates early, and let the integration owner manage final merging.
