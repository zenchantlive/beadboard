---
name: beadboard-driver
description: Drive BeadBoard agent workflows with strict Operative Protocol v1 compliance. Use when handling bead lifecycle work that combines bd status commands with bb agent coordination (register/adopt, activity-lease, reserve/release, send/ack), especially in multi-agent sessions requiring silent observability and collision avoidance.
---

# Beadboard Driver (Operative Protocol v1)

## Overview

Use this skill to run repeatable `bd` + `bb` workflows under the **Activity Lease** (Parking Permit) model. Resolve `bb` safely, bootstrap via `bb-init`, coordinate via traceable incursions, and maintain liveness through real work.

## Core Workflow

1. **Bootstrap & Handshake**:
Run `bb-init` to resolve paths and identify yourself. Use `--adopt` if resuming a task with uncommitted changes.
```bash
node scripts/bb-init.mjs --register <agent-name> --role <role> --json
# OR
node scripts/bb-init.mjs --adopt <prior-agent-id> --non-interactive --json
```

2. **Claim Territory**:
Reserve your work surface before making edits to prevent silent collisions.
```bash
& "$env:BB_REPO\bb.ps1" agent reserve --agent <agent-id> --scope "src/lib/*" --bead <bead-id>
bd update <bead-id> --status in_progress --claim
```

3. **Physical Change -> Contextual Lookup**:
If you encounter uncommitted changes in a file you didn't personally edit: **STOP and Query**.
```bash
& "$env:BB_REPO\bb.ps1" agent status --agent <agent-id>
& "$env:BB_REPO\bb.ps1" agent inbox --agent <agent-id> --state unread
```

4. **Explain Deltas**:
Send high-fidelity signals when you hit milestones or incursions.
```bash
& "$env:BB_REPO\bb.ps1" agent send --from <agent-id> --to <peer> --bead <bead-id> --category INFO --subject "Patched parser.ts for UI sync" --body "..."
```

5. **Liveness Maintenance**:
Liveness is **Passive**. Any `bb agent` command extends your lease. Use `activity-lease` if you haven't run a command in > 10 minutes.
```bash
& "$env:BB_REPO\bb.ps1" agent activity-lease --agent <agent-id> --json
```

6. **Closeout Evidence**:
```bash
node skills/beadboard-driver/scripts/readiness-report.mjs --checks '[{"name":"typecheck","ok":true}]' --artifacts '[{"path":"artifacts/final.png","required":true}]'
bd close <bead-id> --reason "..."
```

## Identity & Adoption Policy

- **Uniqueness**: Create one unique `adjective-noun` identity per session unless adopting.
- **Adoption Guardrails**: Adoption is ONLY allowed if uncommitted changes exist in the scope OR you own an `in_progress` bead.
- **Audit**: Every adoption triggers a `RESUME` event in the audit feed.

## Activity Lease (Parking Permit)

- **Active (0-15m)**: Lease is valid. You are protected from takeover.
- **Stale (15-30m)**: Lease expired. Others can takeover with `--takeover-stale`.
- **Evicted (30m+)**: Lease dead. Others should takeover and archive your reservation.
- **Idle (60m+)**: Ghost state. You are considered gone.

## Red Flags - STOP and Start Over

- **Silent Incursion**: Editing a reserved file without sending an `INFO` message.
- **Identity Reuse**: Reusing an agent ID from a previous session without an adoption handshake.
- **Mocking**: Implementing mocks instead of coordinating with the domain owner.
- **Terminal Pop-ups**: Spawning background workers that disrupt the user's desktop.

## References

- Command and argument contracts: `references/command-matrix.md`
- End-to-end session choreography: `references/session-lifecycle.md`
- Protocol Specification: `docs/protocols/operative-protocol-v1.md`