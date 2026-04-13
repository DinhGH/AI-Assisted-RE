# Backend container scaffold.
# This file exists so the Express API can be containerized later as a separate deployable unit.

FROM node:20-alpine
WORKDIR /app
# Implementation will later copy backend source, install dependencies, and launch the API server.
