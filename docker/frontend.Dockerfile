# Frontend container scaffold.
# This file exists so the React application can be containerized later without changing the repository layout.

FROM node:20-alpine
WORKDIR /app
# Implementation will later copy frontend source, install dependencies, and start the Vite preview or dev server.
