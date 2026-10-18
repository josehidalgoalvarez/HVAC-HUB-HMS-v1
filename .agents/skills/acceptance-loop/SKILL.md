---
name: acceptance-loop
description: Defines acceptance criteria BEFORE building anything, then builds, measures the result against the checklist point by point, fixes failures, and repeats until everything passes. Use for any HVACHome feature, landing page, or deliverable with a quality bar.
---

# Acceptance Loop

Two-phase discipline: **define "done" first, then loop until done.** Never start building without a written checklist.

## Phase 1 — Define done (before any code)

Write the acceptance criteria as a checkbox list. Every item must be:
- **Observable** — "I can see / click / measure X", not "code is clean"
- **Binary** — passes or fails, no "mostly works"

Good:
- [ ] Intake a ticket from a screenshot photo in under 2 minutes
- [ ] Offline: log status + photo in airplane mode, reconnect, nothing lost

Bad:
- [ ] Make the ticket flow nice
- [ ] Handle errors gracefully

For HVACHome, pull criteria from `hvachome-v2-build-plan.md` — every phase already has them.

## Phase 2 — Build → measure → fix → repeat

1. Build the smallest thing that could satisfy the checklist.
2. Run through the checklist point by point. Mark each pass/fail honestly.
3. Fix ONLY the failures. Do not gold-plate passes.
4. Repeat from step 2 until every box is checked.
5. Stop. Ship it.

## Rules

- The checklist is written once, before building. It does not shrink mid-loop. (It may grow only if building reveals a genuinely missing criterion — note why.)
- A loop that passes everything on the first try means the checklist was too easy. Tighten it next time.
- Time-box: if 3 full loops don't close it, stop and escalate — the checklist or the approach is wrong, not the effort.
- Never present work as done with unchecked boxes. "Done except X" is not done.
