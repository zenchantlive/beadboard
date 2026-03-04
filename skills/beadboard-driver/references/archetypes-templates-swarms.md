# Archetypes, Templates, and Swarms

This document defines how multi-agent work is structured so any agent can join, execute, and exit cleanly.

## Mental Model

- Archetype: role contract (what an agent is accountable for)
- Template/proto: reusable work shape (molecule source)
- Swarm: live execution instance over an epic (or auto-wrapped task)

## Verified Command Surface

Swarm lifecycle:

```bash
bd swarm create <epic-id> [--coordinator <rig/witness>] [--force]
bd swarm status <epic-or-swarm-id> [--json]
bd swarm list [--json]
bd swarm validate <epic-id> [--verbose]
```

Template/proto discovery:

```bash
bd mol show <molecule-id> [--parallel]
```

## Swarm Creation and Discovery

Create a swarm for an epic:

```bash
bd swarm create beadboard-maf --coordinator beadboard/witness
```

If you create from a single task, `bd` can auto-wrap it into an epic and then create swarm.

Find active swarms:

```bash
bd swarm list
```

Inspect swarm execution state (computed from beads):

```bash
bd swarm status beadboard-maf
```

Validate dependency quality before dispatch:

```bash
bd swarm validate beadboard-maf --verbose
```

## Template/Proto Traceability

To understand what pattern a swarm or molecule came from, inspect molecule structure:

```bash
bd mol show <molecule-id> --parallel
```

Use this to answer:
- Which steps can run in parallel right now
- Which steps are dependency-blocked
- Which work shape this execution follows

## Archetype Contracts

### Coder

Primary responsibility:
- Implement scoped changes for assigned bead

Quality gates:
- `npm run typecheck`
- `npm run lint`
- `npm run test` (or focused + full as required)

Handoff payload:
- File list changed
- Commands run + pass/fail
- Remaining risks

Escalation triggers:
- Missing dependency/input
- Conflicting ownership or reservation
- Repeated failing gate without clear root cause

### Reviewer

Primary responsibility:
- Validate behavior, regressions, and acceptance criteria

Quality gates:
- Reproduce relevant tests
- Check edge-case behavior against bead contract

Handoff payload:
- Findings ordered by severity
- Explicit “no findings” when clean
- Residual risk/testing gaps

Escalation triggers:
- Spec ambiguity affecting correctness
- Inconsistent cross-view behavior
- Insufficient evidence to approve close

### Writer

Primary responsibility:
- Keep user-facing and operator docs accurate and action-oriented

Quality gates:
- Command examples match real CLI help
- Scope/out-of-scope and verification sections are explicit

Handoff payload:
- Updated doc paths
- User impact summary
- Remaining docs debt

Escalation triggers:
- Command surface changed but docs unclear
- Contradictory references across skill docs

## Worker Join Flow (Not Just Orchestrators)

1. Check active swarms and pick assigned epic:

```bash
bd swarm list
bd swarm status <epic-or-swarm-id>
```

2. Read epic + children context before claiming:

```bash
bd show <epic-id>
bd children <epic-id>
bd ready
```

3. Claim assigned bead with explicit assignee and attach hook slot:

```bash
bd update <bead-id> --status in_progress --assignee <agent-bead-id>
bd slot set <agent-bead-id> hook <bead-id>
```

4. Report state and coordinate through mail/events while executing.

## Swarm Closure Ownership

Default ownership:
- Orchestrator/coordinator closes swarm context after all child beads close
- Workers close only their assigned beads and clear their hook slots

Closure checklist:
1. No open child beads remain for the swarm epic
2. No unresolved BLOCKED handoffs remain
3. Required verification evidence exists on completed beads
4. Coordinator posts close summary and archives follow-ups as new beads

## Anti-Patterns

- Starting swarm work without reading epic dependencies
- Treating templates as optional and inventing ad-hoc flows each run
- Claiming multiple beads without explicit ownership updates
- Closing swarm before child verification evidence exists
- Hiding blocker state in chat instead of machine-readable bead/mail signals
