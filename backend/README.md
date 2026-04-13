# Backend

<!--
  This folder contains the Express.js application shell.
  It exists to define API boundaries, route organization, and service orchestration points.
-->

## Purpose

Expose HTTP APIs, coordinate analysis workflows, manage queues, and persist application data.

## Responsibilities

- Receive uploads and requirement analysis requests
- Orchestrate AI-engine calls and background jobs
- Manage persistence, validation, and request lifecycle concerns
- Keep transport logic separate from domain/service logic

## Example usage

Developers should add route handlers, services, and queue workers under `backend/src/`.
