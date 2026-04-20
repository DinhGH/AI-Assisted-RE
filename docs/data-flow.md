<!--
  This document exists to describe how requirement data moves through the system.
  It will later track upload, analysis, scoring, persistence, and visualization flows.
-->

# Data Flow

## Planned flow

1. User uploads requirements in the frontend
2. Backend validates and enqueues work
3. AI engine parses and analyzes text
4. Results are stored in MySQL
5. Dashboard renders scores and traceability data
