# Next Session Prompt: BeadBoard View Strategy + Assign Everywhere

You are continuing work on `/beadboard`.

## Product framing
BeadBoard is a **multi-agent swarm coordination and communication system built on Beads**.  
DAG/topology, project scope switching, and command-feed views exist to improve swarm coordination outcomes.

## Immediate goal
Clarify the product-level difference between:
1. `Social` view, and
2. `Graph` view -> `Tasks` subtab

Then implement **Assign** controls consistently across all relevant views/pages.

## Why this matters
If Social and Graph/Tasks do the same job, the UX is ambiguous and hard to maintain.  
If Assign exists in only one place, operator workflows are fragmented.

## Required questions to answer first
1. What is the unique purpose of Social view?
2. What is the unique purpose of Graph/Tasks subtab?
3. Which interactions belong only in one of them?
4. Which interactions must be shared?
5. Should Social be renamed/reframed (for example toward “Swim” / “Command Feed”)?

Write this as a short decision note before coding.

## Implementation target
Add an **Assign** action to all major operational surfaces (not only Graph).

Minimum expected surfaces:
- Social view cards
- Graph tasks cards (already exists, keep parity)
- Any task-focused detail/drawer surface where assignment is operationally relevant

## Constraints
- Preserve current runtime route model (`/` with `view=` query params).
- Keep claims and behavior aligned to actual shipped code.
- Reuse existing assignment logic/components; avoid duplicate one-off implementations.
- Keep diffs scoped and maintainable.

## Deliverables
1. Decision note: “Social vs Graph/Tasks” (clear, concise, actionable).
2. Code changes implementing Assign parity across views.
3. README touch-up only if wording must change after decisions.
4. Evidence from verification gates:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test`

## Suggested execution order
1. Audit current assign entry points/components.
2. Define shared assignment UI contract (props/events/state).
3. Implement Social + detail/drawer assignment affordance(s).
4. Normalize labels/tooltips/copy for consistency.
5. Run full verification gates.
6. Summarize behavior changes and unresolved UX questions.

## Completion criteria
- Assign is discoverable and usable from every major task-operating surface.
- Social and Graph/Tasks have clearly distinct roles in both UX and docs.
- No regressions in typecheck/lint/tests.
