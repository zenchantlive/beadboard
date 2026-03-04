---
name: beadboard-driver
description: Use when an agent is executing work in a non-BeadBoard repo while a human coordinates from BeadBoard, and you need reliable state, mail, assignment, and evidence flow from start to close.
---

# BeadBoard Driver

## Overview

This skill is the operator runbook for agent execution in external repos with BeadBoard as control plane.

Core principle: explicit state + explicit assignment + explicit evidence.

## The Iron Law

```
No bead claims, handoffs, or completion statements without:
1) assignee set,
2) coordination checked,
3) evidence recorded.
```

## Requirements

- `bd` must be installed and available on `PATH`.
- `bb` or `beadboard` must be installed globally and available on `PATH`.
- Work from the target repository root.

## Session Runbook (Do Not Skip Steps)

### Step 1: Preflight and Communication Validation

```bash
node skills/beadboard-driver/scripts/session-preflight.mjs
node skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs
```

Expected outcome:
- `bd` detected
- `bb` detected (global install)
- `mail.delegate` points to `bb-mail-shim.mjs`
- `BB_AGENT` or `BD_ACTOR` identity is available

If either script fails, stop and fix environment first.

### Step 2: Create Agent Bead Identity

```bash
bd create --title="Agent: <role-name>" --description="<scope>" --type=task --priority=0 --label="gt:agent,role:<orchestrator|ui|graph|backend|infra>"
```

Then set lifecycle state:

```bash
bd agent state <agent-bead-id> spawning
bd agent state <agent-bead-id> running
```

### Step 3: Initialize/Update `project.md`

`project.md` lives in the target repo root (not in the skill folder):
- first agent in repo creates it from `skills/beadboard-driver/project.template.md`
- later agents read and update it before work

Required updates each session:
- confirm whether `bd` and `bb/beadboard` are globally installed
- record shell/platform facts affecting execution
- record mail delegate/identity policy if changed

### Step 4: Read Hard Memory and Task Context

```bash
bd show beadboard-116 beadboard-60a beadboard-zas
bd ready
bd show <target-bead-id>
```

Minimum: read task contract, dependencies, success criteria, and blockers.

### Step 5: Claim Work with Assignee + Hook Slot

```bash
bd update <target-bead-id> --status in_progress --assignee <agent-bead-id>
bd slot set <agent-bead-id> hook <target-bead-id>
```

Never use `--claim`. Use explicit `--assignee`.

### Step 6: Execute + Heartbeat + Coordinate via Mail

During execution:

```bash
bd agent heartbeat <agent-bead-id>
```

Coordinate through delegated mail:

```bash
bd mail inbox
bd mail send --to <agent-or-role> --bead <bead-id> --category <HANDOFF|BLOCKED|DECISION|INFO> --subject "<short>" --body "<details>"
bd mail read <message-id>
bd mail ack <message-id>
```

When blocked:
- send `BLOCKED`
- set `bd agent state <agent-bead-id> stuck`
- resume only after intervention/response

### Step 7: Verification Gates (Code Changes)

```bash
npm run typecheck
npm run lint
npm run test
```

Do not claim fixed/done without fresh command output from this session.

### Step 8: Publish Evidence and Close

```bash
bd update <target-bead-id> --notes "<commands run + key outputs + files changed>"
bd close <target-bead-id> --reason "<what was completed>"
bd slot clear <agent-bead-id> hook
bd agent state <agent-bead-id> done
```

### Step 9: Memory Review

If reusable lesson exists:
- create/supersede canonical memory decision bead

If no reusable lesson:
- record: `Memory review: no new reusable memory.`

## Red Flags

Stop and correct if you are about to:
- close without `--assignee` history
- skip `bd mail` checks at session start/claim/close
- claim completion without gate output
- write project context inside skill folder instead of repo `project.md`
- use deprecated direct command patterns from old docs

## Use-The-Right-Doc Map

- `references/session-lifecycle.md`:
  Full end-to-end session choreography.
- `references/agent-state-liveness.md`:
  Agent states, heartbeat cadence, liveness interpretation.
- `references/coordination-system.md`:
  Canonical bb-mail command surface and category semantics.
- `references/coord-events-sessions-ack.md`:
  Trigger map, inbox polling protocol, blocked-to-resume walkthrough.
- `references/command-matrix.md`:
  Exact command inventory for day-to-day operation.
- `references/failure-modes.md`:
  Deterministic diagnosis and recovery paths.
- `references/memory-system.md`:
  Memory anchors, injection protocol, promotion/supersede rules.
- `references/archetypes-templates-swarms.md`:
  Swarm composition, molecule operations, worker dispatch patterns.
- `references/missions-realtime.md`:
  Real-time/watcher/event troubleshooting.

## Bottom Line

If you follow this runbook exactly, any agent can enter cold, coordinate safely, and deliver auditable completion without drift.
