---
name: linus-beads-discipline
description: Use when making architecture decisions, claiming work complete, implementing features, debugging, or under pressure to skip verification. Triggers on "just this once", "might need later", "already tested", bypassing bd CLI/gates, or any development task.
---

# Linus-Beads Discipline

**First principles. Evidence only. Beads as shared memory.**

## Iron Laws

| Law | Violation | Fix |
|-----|-----------|-----|
| BD is truth | Direct JSONL write | Delete, restart |
| Evidence first | Claim without proof | Don't close |
| First principles | "Best practice" | Ask "why?" |

## Mode → Workflow

| Intent | Mode | Doc |
|--------|------|-----|
| "What do?" | TRIAGE | [triage.md](workflows/triage.md) |
| "Broken" | DEBUG | [debug.md](workflows/debug.md) |
| "How works?" | RESEARCH | [research.md](workflows/research.md) |
| "Design" | DESIGN | [design.md](workflows/design.md) |
| "Implement" | IMPLEMENT | [implement.md](workflows/implement.md) |
| "Review" | REVIEW | [review.md](workflows/review.md) |
| "Simplify" | REFACTOR | [refactor.md](workflows/refactor.md) |
| "Plan" | PLAN | [plan.md](workflows/plan.md) |

**Unclear? ASK which mode.**

## Loop

READ beads → CHECK skills → DO work → WRITE beads → VERIFY

## Red Flags

"just this once" | "might need later" | "already tested" → **STOP, violation incoming**

## Details

[IRON_LAWS](resources/IRON_LAWS.md) | [WORKFLOW_ENGINE](resources/WORKFLOW_ENGINE.md) | [BEADS_MEMORY](resources/BEADS_MEMORY.md) | [VERIFICATION_GATES](resources/VERIFICATION_GATES.md)

**Beads = shared brain across all Linus-agents. No exceptions. Run gates. Cite output.**
