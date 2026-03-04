# Project Driver Template

Use this template to create `project.md` at the target repository root.
The first agent in a repo should create this file; later agents must read and update it before work.

## Project Identity

- Project name:
- Repository root:
- Primary language/runtime:
- Primary package manager:

## Tooling Baseline (Global Installs)

Record what is already installed on this machine so later agents do not re-check unnecessarily.

- `bd` installed and on PATH: yes/no
- `bb` or `beadboard` installed and on PATH: yes/no
- Detection commands used (with date):
- Notes on shell/platform quirks (WSL/Windows/macOS/Linux):

## BeadBoard/Communication Setup

- Mail delegate command configured:
  - `bd config set mail.delegate "node <abs-path>/skills/beadboard-driver/scripts/bb-mail-shim.mjs"`
- Agent identity env var policy:
  - Preferred: `BB_AGENT=<agent-id>`
  - Fallback: `BD_ACTOR=<agent-id>`
- Delegate validation status:
  - `node skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs` pass/fail
- Session preflight status:
  - `node skills/beadboard-driver/scripts/session-preflight.mjs` pass/fail

## Agent State + Heartbeat Policy

- Agent bead naming convention for this repo:
- Required state transitions (spawning -> running -> working -> stuck/done/stopped):
- Heartbeat cadence during active work (recommended 30-120s):
- Stuck escalation timeout before user ping:

## Swarm / Formula Defaults

- Primary epic/swarm pattern used by this repo:
- Formula/proto id(s) commonly used (if any):
- Preferred swarm command flow (`bd swarm validate/create/status` etc.):

## Command Baseline

- Install command:
- Build command:
- Typecheck command:
- Lint command:
- Test command:
- Smoke command (optional):

## Verification Policy Overrides

- Required gates for this project:
- Known slow gates and timeout guidance:
- Evidence format expected in bead notes:

## Scope and Safety

- Forbidden commands/actions for this repo:
- Paths requiring reservation before edits:
- External systems requiring human approval:
- Secret handling guidance:

## Coordination Defaults

- Default handoff style:
- Blocker escalation policy:
- ACK expectations for `HANDOFF`/`BLOCKED`:
- Reservation conflict policy (`--takeover-stale` rules):

## Known Workarounds

Document only stable, repeatable workarounds.

1. Trigger:
   - Symptom:
   - Workaround:
   - Verification:
   - Owner:

2. Trigger:
   - Symptom:
   - Workaround:
   - Verification:
   - Owner:

## Session Closeout Checklist

- [ ] Bead status/assignee updated
- [ ] Verification commands executed and recorded
- [ ] Artifacts attached/linked
- [ ] Memory review performed
- [ ] Follow-up beads created (if needed)
- [ ] `project.md` updated with any new environment facts

## Change Log

- YYYY-MM-DD: Initial `project.md` created from template.
