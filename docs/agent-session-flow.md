# Agent Session Flow & Operator Guide

This document defines the canonical workflow for human operators using `bb agent` to coordinate work in the Beadboard repo.

## Core Principle: Two Sources of Truth

1.  **Work Lifecycle**: `bd` (Beads) is the ONLY source of truth for what work is happening (`in_progress`, `done`, dependencies).
2.  **Coordination**: `bb agent` is the source of truth for *who* is doing it and *how* they are coordinating (reservations, handoffs).

**Rule**: Never write to `.beads/issues.jsonl` directly. Always use `bd` commands.

## Session Lifecycle

### 1. Identity Check (Start of Session)

Before claiming work, ensure your agent identity is registered and active.

```bash
# Check if you are registered
bb agent show --agent agent-ui-1

# If not, register (idempotent, use --force-update to change role/display)
bb agent register --name agent-ui-1 --role ui --display "UI Agent 1"
```

### 2. Picking and Claiming Work

Use `bd` to find and claim work. This is the "clock in" event.

```bash
# 1. Find ready work (unblocked)
bd ready

# 2. Inspect the bead
bd show bb-dcv.5

# 3. CLAIM the bead (Atomic Claim)
# This sets status=in_progress AND assigns it to you in one atomic op.
bd update bb-dcv.5 --status in_progress --notes "Starting docs work" --claim
```

### 3. Coordination (During Work)

While working, use `bb agent` to coordinate with other agents or reserve contested resources.

#### Reservations (Traffic Control)
Prevent collisions on shared files or subsystems.

```bash
# Reserve a scope (default TTL 120m)
bb agent reserve --agent agent-ui-1 --bead bb-dcv.5 --scope "src/components/graph/*"

# Check status of your reservation
bb agent status --bead bb-dcv.5
```

#### Communication (Handoffs & Blockers)
Send structured signals to other agents.

```bash
# BLOCKER: Request help
bb agent send \
  --from agent-ui-1 \
  --to agent-backend-1 \
  --bead bb-dcv.5 \
  --category BLOCKED \
  --subject "API 404 on /b/users" \
  --body "Endpoint missing. Blocking UI integration."

# HANDOFF: Pass context
bb agent send \
  --from agent-ui-1 \
  --to agent-qa-1 \
  --bead bb-dcv.5 \
  --category HANDOFF \
  --subject "Ready for verification" \
  --body "UI complete. Verify at /graph and /kanban."
```

#### Checking Mail
```bash
# Check inbox
bb agent inbox --agent agent-ui-1 --state unread

# Read a message (marks as read)
bb agent read --agent agent-ui-1 --message msg_id_123

# Acknowledge a message (required for HANDOFF/BLOCKED)
bb agent ack --agent agent-ui-1 --message msg_id_123
```

### 4. Completion (End of Session)

Wrap up the session cleanly.

1.  **Release Reservations**:
    ```bash
    # Release specific scope
    bb agent release --agent agent-ui-1 --scope "src/components/graph/*"
    ```

2.  **Update Bead Status**:
    ```bash
    # Post evidence/results
    bd update bb-dcv.5 --notes "Docs created. Validation passed."

    # Close the bead
    bd close bb-dcv.5 --reason "Completed all acceptance criteria"
    ```

## UX & Output Formats

All `bb agent` commands support human-friendly output (default) and machine-readable JSON.

### Human Format (Default)
Optimized for operator readability.

```text
$ bb agent register --name agent-ui-1 --role ui
✓ Agent registered: agent-ui-1 (role: ui)
```

### JSON Format (`--json`)
Optimized for tool parsing. Always returns a standard envelope.

```bash
$ bb agent register --name agent-ui-1 --role ui --json
```

```json
{
  "ok": true,
  "command": "agent register",
  "data": {
    "agent_id": "agent-ui-1",
    "role": "ui",
    "status": "idle",
    ...
  },
  "error": null
}
```

### Error Handling

Errors always return `ok: false` with a stable error code.

```json
{
  "ok": false,
  "command": "agent send",
  "data": null,
  "error": {
    "code": "UNKNOWN_RECIPIENT",
    "message": "Agent 'ghost-1' not found"
  }
}
```

## Anti-Patterns (Don't Do This)

1.  **Ghosting**: Claiming a bead but not registering an agent identity.
2.  **Squatting**: Holding a reservation (`--ttl 1440`) while not actively working.
3.  **Bypassing**: Writing to `issues.jsonl` directly instead of using `bd`.
4.  **Zombie Claims**: Forgetting to `bd close` or `bd update --status todo` when stopping work.
