# Next Session Prompt: Holistic UX Critique for Professional Multi-Agent Operations

You are continuing work in `/mnt/c/Users/Zenchant/codex/beadboard`.

## Understanding Brief
BeadBoard is intended to be a **professional multi-agent communication + work management system** where:
- agents coordinate through Beads (`bd`) state,
- humans supervise, intervene, and steer,
- both can collaborate across multiple repos/projects.

This is **not** just a task board. It is an operations surface for swarm-style execution, communication, assignment, and recovery.

## Recent work completed (must understand before critique)
1. `bd`/Dolt recovery was performed after severe divergence:
   - prior broken state: Dolt showed only a few issues while historical stores had hundreds,
   - repaired state now shows healthy inventory (381 issues) and non-empty `bd ready`.
2. Runtime assumptions changed:
   - `bd` upgraded to `0.56.1`.
   - Dolt server mode is operationally relevant (`127.0.0.1:3307`).
3. `bd` command execution was moved toward PATH-based portability and clearer setup failure handling.

Do not re-do this recovery unless evidence shows a new regression.

## First required step (before UX critique)
Audit current local uncommitted work and summarize it in UX terms.

Run and analyze at minimum:
- `git status --short`
- `git diff --stat`
- targeted diffs for UX-facing areas (views, tabs, drawers, assignment, session feed, top/nav shell)

Then produce:
1. what changes are incomplete but directionally correct,
2. what changes conflict with intended product behavior,
3. what changes increase accidental complexity.

## Product intent to evaluate against
Evaluate all views/tabs as one cohesive system for:
- **Agent-first operations** (fast, low-friction, low ambiguity)
- **Human oversight** (clear state, intervention points, confidence)
- **Cross-project/scoped execution** (project scope switching without confusion)
- **Communication reliability** (comments/messages/coordination context where decisions happen)

## Critique targets (must cover all)
1. Information architecture across main views/tabs.
2. Distinct role of each major surface (`Social`, `Graph`, `Sessions`, side panels, drawers).
3. Assignment UX consistency and discoverability.
4. Communication model UX (threads/comments/agent interactions) and where it breaks flow.
5. State clarity: ready vs blocked vs in-progress; ownership; handoff visibility.
6. Failure mode UX (server unavailable, path/config mismatches, stale data indicators).
7. Cognitive load: where operators need to context-switch too much.
8. Terminology consistency (`bead`, `task`, `swarm`, `molecule`, `session`, `agent`).

## Required outputs
### 1) UX Critique Report
Provide a structured critique with:
- **What is working** (keep)
- **What is ambiguous** (clarify)
- **What is broken/risky** (fix)
- severity per issue (`P0`, `P1`, `P2`)
- concrete file/component references

### 2) Target UX Model (recommended)
Propose a clean target model for view responsibilities:
- one-line purpose per view/tab,
- key interactions per surface,
- interactions that must be shared vs isolated.

### 3) Prioritized execution backlog
Create beads for follow-up work from critique findings:
- one bead per coherent unit,
- include scope/out-of-scope and acceptance criteria,
- preserve dependency correctness.

### 4) Minimal change strategy
Recommend a staged rollout plan that avoids large regressions:
- phase 1: low-risk high-value consistency fixes,
- phase 2: IA/view role cleanup,
- phase 3: deeper workflow refinements.

## Constraints
- Preserve current route model (`/` with `view=` query params).
- Keep changes grounded in actual implemented code (no speculative claims).
- Reuse shared components/logic; avoid one-off behavior per view.
- Keep language simple and operator-facing.
- **Approval gate:** Do not create any beads during discovery/brainstorming. First present findings + proposed bead backlog draft, then wait for explicit user approval before running any `bd create` commands.

## Quality bar
The critique should read like a professional product/UX architecture review for an agent operations platform, not generic UI feedback.

## Completion criteria
- Clear diagnosis of current UX shape using actual uncommitted code.
- Decision-ready target model for views/tabs and communication surfaces.
- Prioritized, execution-ready bead backlog generated from findings.
