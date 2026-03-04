# Memory System

## Purpose

Use BeadBoard memory to preserve reusable operating rules across sessions.

Memory is tracked in `bd` decision beads, not markdown notes. Task notes are for local execution context; canonical memory is for reusable rules.

## Execution Context

- Agents usually run in a target project repository, not the BeadBoard repository.
- Project scope is controlled by the user in the BeadBoard UI.
- Agents do not select or mutate project scope.

## Core Objects

- Anchor: domain parent bead (for example architecture, workflow, agent ops, reliability).
- Canonical memory: `type=decision` bead with memory labels.
- Provenance links: relations from memory to source evidence beads.

## Canonical Memory Contract

Create canonical memory only when the rule is reusable.

Required labels:

- `mem-canonical`
- `mem-hard` or `mem-soft`
- `memory`
- domain label such as `memory-agent`, `memory-arch`, `memory-workflow`, `memory-reliability`, `memory-ui`

Required description sections:

- `Scope:`
- `Out of Scope:`
- `Rule:`
- `Rationale:`
- `Failure Mode:`

Required acceptance style:

- Given/When/Then invariant
- Verification commands

## Workflow

1. Query existing memory first.
2. Validate the memory provenance before relying on it.
3. Apply existing canonical memory to current task design.
4. If a new reusable rule appears, create canonical memory.
5. Link anchor, evidence, and related work with `bd dep relate`.
6. Ratify by closing the memory bead once complete.
7. For changes to an existing rule, supersede; do not rewrite history.

## Query and Validation Commands

```bash
bd query "type=decision label:mem-canonical"
bd show <memory-id>
bd dep list <memory-id>
```

Interpretation checklist:

- Is the memory closed and canonical?
- Are provenance links present (2-5 evidence beads preferred)?
- Is the domain anchor relationship present?

## Create and Index Canonical Memory

```bash
bd create --title="[MEMORY][<DOMAIN>][HARD|SOFT] <rule sentence>" \
  --description="Scope: ...\nOut of Scope: ...\nRule: ...\nRationale: ...\nFailure Mode: ..." \
  --type=decision --priority=1 \
  --label="mem-canonical,mem-hard,memory,memory-<domain>"

bd dep relate <anchor-id> <memory-id>
bd dep relate <memory-id> <source-bead-id>
```

Use `mem-soft` when the rule is guidance and `mem-hard` when it is non-negotiable.

## Evolve Memory Safely

Use supersession when changing canonical rules:

```bash
bd supersede <old-memory-id> --with <new-memory-id>
```

Do not edit historical memory beads to represent new policy.

## Noise Budget

Apply memory sparingly per active task:

- 3-7 related memory nodes
- 0-2 blocker contracts
- 1 primary anchor domain per canonical memory
- 2-5 source-bead provenance links

If the lesson is not reusable, record it in task notes instead of creating memory.

## Anti-Patterns

- Writing policy in ad-hoc markdown only.
- Using blocker edges for memory indexing.
- Creating duplicate canonical memory for the same rule.
- Creating memory for one-off incidents without recurrence.
- Claiming memory-backed completion without verification evidence.
