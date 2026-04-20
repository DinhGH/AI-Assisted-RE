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

- ✅ file upload and parsing
- ✅ requirement segmentation
- ✅ AI analysis and scoring
- ✅ queue-based background processing
- ✅ **AI-powered chat with fine-tuned LLM** ⭐ NEW
- ✅ chat history
- ✅ dashboard visualization
- ✅ versioning and exports

### Latest: LLM Chat Integration 🤖

The system now includes an **LLM-powered chat endpoint** (`/chat`) that provides intelligent requirement improvement suggestions using a fine-tuned distilgpt2 model. Features include:

- Context-aware responses maintaining conversation history
- Specialized training on requirement engineering patterns
- Graceful fallback if model unavailable
- Ready for production deployment

The codebase is functional, but the first production pass should still be validated in
your local environment or CI/CD pipeline before release.

## How to run

### ⚡ Option 1: Auto Start (Recommended)

Windows: Double-click `start.bat`  
Linux/Mac: `chmod +x start.sh && ./start.sh`

All services will start automatically. Open http://localhost:5173

📖 See [QUICK_START.md](./QUICK_START.md) for details

### Option 2: Docker Compose

1. Make sure Docker Desktop is running.
2. From the repository root, start all services:

   ```bash
   docker compose up --build
   docker compose up
   ```

3. Open the apps:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000/health
   - AI Engine: http://localhost:8000/health
   - MySQL: localhost:3307
   - Redis: localhost:6379

### Option 3: Run services individually

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

📖 See [RUN_GUIDE.md](./RUN_GUIDE.md) for detailed instructions

## Required services

- MySQL 8.4
- Redis 7
- Node.js 20+
- Python 3.12+

## 🤖 AI Chat Feature

The system now includes an **AI-powered chat** that provides intelligent requirement improvement suggestions.

### Features

- **LLM Integration**: Fine-tuned distilgpt2 model specialized in requirements engineering
- **Context Aware**: Maintains conversation history for coherent multi-turn dialogue
- **Smart Responses**: Suggests improvements for clarity, completeness, testability, and consistency

### Chat Endpoint

**POST** `/chat`

```json
{
  "session_id": "unique-session-id",
  "message": "How do I improve this requirement?",
  "history": [
    { "role": "user", "message": "What makes a good requirement?" },
    { "role": "assistant", "message": "..." }
  ]
}
```

### Test the Chat

```bash
cd ai-engine
python test_chat.py
```

Or via curl:

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"session_id": "test", "message": "How to improve requirements?"}'
```

📖 See [LLM_CHAT_GUIDE.md](./LLM_CHAT_GUIDE.md) for detailed documentation

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
