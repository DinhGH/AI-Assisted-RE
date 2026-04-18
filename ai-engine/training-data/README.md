# Training Data (Guideline Corpus)

Put your team guideline documents here to ground chat answers:

- Supported formats: `.txt`, `.md`, `.markdown`
- Recommended: concise files by topic (naming-rules, acceptance-criteria, templates, anti-patterns)
- Avoid secrets/API keys in these files

How it works:

- Chat requests extract keywords from selected requirement + user question.
- The AI engine picks the most relevant local files by keyword overlap.
- Top snippets are injected as contextual guideline references before model generation.

Tip:

- Keep each file under ~2,000-3,000 words for better relevance.
- Prefer explicit, testable rules and examples.
