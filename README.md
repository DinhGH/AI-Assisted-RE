# AI-Assisted Requirement Quality Analysis

<!--
  This repository now contains a working end-to-end implementation of the platform.
  The monorepo keeps frontend, backend, AI engine, shared contracts, Docker files,
  and setup guidance separated so the system can be run locally or in containers.
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

This project now includes a working end-to-end implementation for:

- file upload and parsing
- requirement segmentation
- AI analysis and scoring
- queue-based background processing
- chat history
- dashboard visualization
- versioning and exports

The codebase is functional, but the first production pass should still be validated in
your local environment or CI/CD pipeline before release.

## How to run

### Option 1: Docker Compose

1. Make sure Docker Desktop is running.
2. From the repository root, start all services:

   ```bash
   docker compose up --build
   docker compose up
   docker compose restart ai-engine backend
   docker compose down
   ```

3. Pull the Ollama model once before using chat:

```bash
docker exec -it ai-assistedre-ollama-1 ollama pull llama3:8b
```

If the backend started before the model finished downloading, restart the API services:

```bash
docker compose restart backend backend-worker
```

4. Open the apps:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/health
   - AI Engine: http://localhost:8000/health
   - MySQL: localhost:3307
   - Redis: localhost:6379

### Option 2: Run services individually

- Backend:
  - `cd backend`
  - `npm install`
  - `npm run start:api`
- Backend worker:
  - `cd backend`
  - `npm run start:worker`
- Frontend:
  - `cd frontend`
  - `npm install`
  - `npm run dev`
- AI engine:
  - `cd ai-engine`
  - `pip install -r requirements.txt`
  - `uvicorn main:app --host 0.0.0.0 --port 8000`

## Required services

- MySQL 8.4
- Redis 7
- Node.js 20+
- Python 3.12+

## Environment variables

Each service has an `.env.example` file in its folder. Copy the example file to `.env`
and adjust values if you are not using Docker Compose defaults.

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
