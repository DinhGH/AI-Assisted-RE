<!--
  This document helps the team bootstrap the project consistently and run the
  implemented services in Docker or locally.
-->

# Setup Guide

## Prerequisites

- Docker Desktop 4+
- Node.js 20+
- Python 3.12+
- Git

## Environment files

Copy the example files before running services locally outside Docker:

- `.env.example` → `.env`
- `backend/.env.example` → `backend/.env`
- `frontend/.env.example` → `frontend/.env`
- `ai-engine/.env.example` → `ai-engine/.env`

## Run with Docker Compose

From the repository root:

1. Build and start everything:

```bash
docker compose up --build
```

2. Verify the services:

- Frontend: http://localhost:5173
- Backend health: http://localhost:3000/health
- AI engine health: http://localhost:8000/health

## Local service run

### Backend API

1. Install packages:

- `cd backend`
- `npm install`

2. Start API:

- `npm run start:api`

3. Start worker in another terminal:

- `npm run start:worker`

### Frontend

1. Install packages:

- `cd frontend`
- `npm install`

2. Start dev server:

- `npm run dev`

### AI engine

1. Install Python dependencies:

- `cd ai-engine`
- `pip install -r requirements.txt`

2. Start FastAPI:

- `uvicorn main:app --host 0.0.0.0 --port 8000`

## Service ports

- Frontend: `5173`
- Backend API: `3000`
- Backend worker: no public port
- AI engine: `8000`
- MySQL: `3306`
- Redis: `6379`

## Notes

- The queue worker must run alongside the API if you start services manually.
- The frontend expects the backend at `http://localhost:3000`.
- The backend expects the AI engine at `http://localhost:8000`.
