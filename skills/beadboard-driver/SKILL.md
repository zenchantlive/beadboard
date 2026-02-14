---
name: beadboard-driver
description: Drive BeadBoard agent workflows with strict preflight, per-session unique agent identity, and evidence-backed closeout. Use when handling bead lifecycle work that combines bd status commands with bb agent coordination (register/list/show, send/inbox/read/ack, reserve/release/status), especially in multi-agent sessions where path resolution, collision avoidance, and verification discipline are required.
---

# Beadboard Driver

## Overview

Use this skill to run repeatable `bd` + `bb` workflows without drift. Resolve `bb` safely, generate a unique session identity, coordinate with reservations/mail, and produce closeout evidence before claiming completion.

## Core Workflow

1. Run preflight:
```bash
node skills/beadboard-driver/scripts/session-preflight.mjs
```

2. Generate a unique per-session agent name:
```bash
node skills/beadboard-driver/scripts/generate-agent-name.mjs
```

3. Register identity, then claim bead:
```bash
& "$env:BB_REPO\bb.ps1" agent register --name <agent-name> --role <role>
bd update <bead-id> --status in_progress --claim
```

4. Coordinate during implementation:
```bash
& "$env:BB_REPO\bb.ps1" agent reserve --agent <agent-name> --scope "<path-glob>" --bead <bead-id>
& "$env:BB_REPO\bb.ps1" agent send --from <agent-name> --to <peer-agent> --bead <bead-id> --category HANDOFF --subject "<subject>" --body "<body>"
```

5. Build readiness summary before close:
```bash
node skills/beadboard-driver/scripts/readiness-report.mjs --checks '[{"name":"typecheck","ok":true}]' --artifacts '[{"path":"artifacts/final.png","required":true}]'
```

## Path Resolution Policy

- Treat `BB_REPO` as authoritative when set.
- On invalid `BB_REPO`, stop and return remediation text. Do not silently bypass.
- If `BB_REPO` is unset, resolve from global `bb`, then cached path, then bounded discovery.
- Update the skill cache only after a verified path is found.
- Never mutate shell profile/env vars automatically.

## Identity Policy

- Create one unique agent identity per session.
- Use adjective-noun names and retry on collisions.
- Register identity before any mail/reservation command.
- Keep bead claim authority in `bd`; identity alone is not a claim.

## Verification Policy

- Do not claim completion without fresh command evidence.
- Require typecheck, test, and lint evidence for closeout tasks.
- Use readiness report output in bead notes.

## References

- Command and argument contracts: `references/command-matrix.md`
- Failure and recovery handling: `references/failure-modes.md`
- End-to-end session choreography: `references/session-lifecycle.md`
