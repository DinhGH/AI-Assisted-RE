# jobs

<!--
  This folder contains background queue workers and scheduled jobs.
  It exists to keep long-running processing off the request path.
-->

## Purpose

Host Bull workers and queue-driven background tasks.

## Responsibilities

- Process analysis requests asynchronously
- Retry or schedule operational work
- Keep CPU-heavy tasks off HTTP handlers

## Example usage

Place queue workers, job processors, and scheduled task entry points here.
