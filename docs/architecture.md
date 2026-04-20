<!--
  This document exists to explain the service boundaries, module layers, and architecture rationale.
  It will later describe how the frontend, backend, AI engine, and shared contracts interact.
-->

# Architecture

## System shape

- Frontend: React + Vite UI
- Backend: Express API and orchestration layer
- AI Engine: Python NLP and scoring service
- Shared: Cross-service contracts and constants
- Infrastructure: MySQL, Redis, and Docker Compose

## Design goals

- Separation of concerns
- Team parallelism
- Swappable AI implementations
- Clear integration boundaries
