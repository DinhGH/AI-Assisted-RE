# Backend

<!--
  This folder contains the Express.js backend implementation for upload handling,
  requirement segmentation, queue orchestration, exports, metrics, and chat proxying.
-->

## Purpose

Expose HTTP APIs, coordinate analysis workflows, manage queues, and persist application data.

## Responsibilities

- Receive uploads and requirement analysis requests
- Orchestrate AI-engine calls and background jobs
- Manage persistence, validation, and request lifecycle concerns
- Keep transport logic separate from domain/service logic

## Example usage

Run the API with `npm run start:api` and the worker with `npm run start:worker`.
