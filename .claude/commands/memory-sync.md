---
description: Review recent git history and this conversation, then file anything durable across memory/*.md in one pass
---

Do a deliberate memory sweep — the thing the SessionStart brief and incremental updates might have missed.

1. Run `git log --oneline -20` and `git diff HEAD~5..HEAD 2>/dev/null || git diff` (adjust range to what's reasonable) to see what actually changed recently that memory hasn't captured yet. Cross-check against `memory/changelog.md`'s most recent dated entry as the "since when" marker.

2. Scan back over this conversation for anything that fits one of the memory files but wasn't written down:
   - A decision that added to or overrode a blueprint assumption → `memory/decisions.md`
   - An open question (from `memory/open-questions.md` or blueprint §19) that got answered → check it off with the answer + today's date
   - A bug or footgun worth remembering → `memory/gotchas.md`
   - Domain-specific learning while building → `memory/domain-notes/<domain>.md`

3. Add one `memory/changelog.md` line summarizing this session/PR — what shipped, not how.

4. Follow the format rules in `memory/README.md`: dated (`YYYY-MM-DD`), most-recent-first, append rather than rewrite, one bullet per fact.

Report back a short summary of what you filed — don't just say "done."
