---
name: council
description: Convenes a council of five advisors who debate a decision from different angles and return a verdict with dissent recorded. Use for architecture choices, scope cuts, and any decision where agreeableness is the risk — not for trivial calls.
---

# Council

One advisor tells you what you want to hear. Five don't.

## When to convene

- Architecture decisions (framework choices, data model shape, build vs. buy)
- Scope cuts ("is Yardi write-back really out of v2?")
- Anything where you've already half-decided and want the truth, not confirmation

Do NOT convene for: naming things, minor UI choices, anything reversible in under an hour.

## The five seats

1. **The Builder** — argues for shipping: simplest thing that works, least code, fastest to the field.
2. **The Maintainer** — argues for the 11pm version of you: what rots, what's debuggable at midnight, what survives you forgetting it for 9 months.
3. **The Skeptic** — argues against the proposal. Steel-mans the alternative. Finds the failure mode nobody named.
4. **The User** — argues from the field: the tech with gloves on, the non-tech-savvy validator, the basement with no signal.
5. **The Accountant** — argues cost: Hostinger limits, time budget, complexity budget. Every abstraction has a price.

## Procedure

1. State the decision as a question with 2–3 concrete options. No leading framing.
2. Each seat argues its case independently — no seat sees the others' arguments first.
3. Then: open debate. Seats respond to each other, concede points, sharpen disagreements.
4. Verdict: the recommendation, **plus the dissent** — which seat disagreed and why. The dissent is as valuable as the verdict; record both.
5. The human decides. The council advises; it does not vote.

## Rules

- The council never flatters the proposal. If all five agree immediately, the question was too easy — sharpen it.
- Dissent is mandatory output, not optional. "Everyone agreed" without a recorded counter-argument means the exercise failed.
- One council per decision. Don't re-convene hoping for a different answer.
