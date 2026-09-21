---
description: Draft a new ADR in the house format via the adr-writer agent
argument-hint: <short description of the decision>
---

Launch the `adr-writer` agent to draft an ADR for: $ARGUMENTS

If this decision resolves one of the open questions in blueprint §19, mention the question number so the agent can cite it in the ADR's Context section.

If this decision introduces a new infrastructure dependency, remind the agent to check CLAUDE.md rule 6 — no new dep goes in `pyproject.toml` without the ADR landing first.
