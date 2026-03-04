---
name: beadboard-driver
description: Complete operating manual for agents running work in external repos while humans orchestrate from BeadBoard.
---

# BeadBoard Driver

BeadBoard is for teams that want autonomous agents without losing control of the work.

Most agent setups break down the same way: work happens quickly, but visibility collapses, handoffs get fuzzy, and “done” starts meaning “probably done.” This skill fixes that operating problem.

With BeadBoard Driver, agents execute inside the target project repo, while humans orchestrate from BeadBoard as the control plane: assign, redirect, intervene, verify, and keep a durable coordination record.

BeadBoard project:

- GitHub: `https://github.com/zenchantlive/beadboard`

## What This Changes

- Work becomes observable, not performative.
- Ownership stays explicit at bead level.
- Handoffs and blockers become machine-readable events.
- Completion claims require evidence, not confidence.
- Multi-agent execution stays coordinated instead of chaotic.

## Operating Reality

- Agents usually run in a non-BeadBoard target repo.
- The user controls project scope from BeadBoard UI.
- Agents execute the current repo context they were assigned.
- `bd` remains source of truth for task/memory state.

## Start Here

Run this quick confidence check before you start a session:

```bash
bd --version
node skills/beadboard-driver/scripts/session-preflight.mjs
node skills/beadboard-driver/scripts/resolve-bb.mjs
```

If discovery fails, install/repair from:

- `https://github.com/zenchantlive/beadboard`

## Session Runbook

1. Diagnose environment.
2. Confirm preflight/discovery.
3. Establish session identity.
4. Read memory + ready work.
5. Claim bead with assignee.
6. Execute and coordinate via events.
7. Run verification gates.
8. Publish evidence and close.
9. Perform memory review.

## Core Commands

```bash
# Diagnostics and discovery
node skills/beadboard-driver/scripts/diagnose-env.mjs
node skills/beadboard-driver/scripts/session-preflight.mjs
node skills/beadboard-driver/scripts/resolve-bb.mjs

# Ensure project context exists in the target repository
node skills/beadboard-driver/scripts/ensure-project-context.mjs --project-root <repo>

# Identity helper
node skills/beadboard-driver/scripts/generate-agent-name.mjs

# Closeout evidence envelope
node skills/beadboard-driver/scripts/readiness-report.mjs --checks '<json>' --artifacts '<json>'

# Safe self-healing (dry-run default)
node skills/beadboard-driver/scripts/heal-common-issues.mjs --project-root <repo>
node skills/beadboard-driver/scripts/heal-common-issues.mjs --project-root <repo> --apply --fix-git-index-lock
```

## Bead Lifecycle (Minimum Contract)

```bash
# Read context
bd show <memory-or-task-id>
bd ready

# Claim explicitly
bd update <bead-id> --status in_progress --assignee <agent-bead-id>

# Record evidence and close
bd update <bead-id> --notes "<commands + outputs>"
bd close <bead-id> --reason "<completed outcome>"
```

## Use-The-Right-Doc Map

### `references/memory-system.md`
Use when you need to query/apply/create canonical memory, validate provenance, or decide whether a lesson belongs in memory vs task notes.

### `references/coord-events-sessions-ack.md`
Use when you’re coordinating handoffs/blockers/incursions and need correct inbox/read/ack behavior.

### `references/session-lifecycle.md`
Use for end-to-end session choreography and closeout hygiene.

### `references/archetypes-templates-swarms.md`
Use when choosing team shape, role boundaries, and swarm ownership patterns.

### `references/missions-realtime.md`
Use when assigning work and troubleshooting stale/live-update behavior from mission/event flow.

### `references/command-matrix.md`
Use when you need exact command surfaces and argument shape.

### `references/failure-modes.md`
Use when preflight/discovery/coordination fails and you need deterministic recovery.

## Project Context Template

The skill ships a source template file: `project.template.md`.

Runtime contract:

- Agents should use `<target-repo>/project.md` for project context.
- If `<target-repo>/project.md` is missing, create it from `project.template.md`.
- If `<target-repo>/project.md` already exists, do not overwrite it.

Helper command:

```bash
node skills/beadboard-driver/scripts/ensure-project-context.mjs --project-root <repo>
```

## Tests

Skill-local contracts:

- `skills/beadboard-driver/tests/run-tests.mjs`
- `skills/beadboard-driver/tests/*.contract.test.mjs`

Repo-level coverage:

- `tests/skills/beadboard-driver/*.test.ts`

## Verification Gates

```bash
npm run typecheck
npm run lint
npm run test
```

If failures are outside your scope, cite exact failing files/tests and continue transparently.

## Bottom Line

This skill is the bridge between fast autonomous execution and human operator trust. Use it when speed matters, but coordination quality matters more.
