# project.md — BeadBoard Driver Session Cache

This file is maintained by agents. A new agent reads this first.
If the Environment Status table shows all `pass`, skip straight to Step 2 of the runbook.
Only re-run a check if its row says `fail` or `unknown`, or if you hit an actual error.

---

## Environment Status Cache

Last updated: YYYY-MM-DD by `<agent-bead-id>`

| Component | Status | Version / Detail | Verified |
|-----------|--------|-----------------|---------|
| `bd` on PATH | `unknown` | | |
| `bb` on PATH | `unknown` | | |
| `.beads` db exists | `unknown` | | |
| `mail.delegate` configured | `unknown` | | |
| `session-preflight` | `unknown` | | |
| `bb agent` registered | `unknown` | `BB_AGENT=` | |
| Tests last run | `unknown` | | |

**Status values:** `pass` · `fail` · `unknown` · `skip` (not applicable to this project)

**Rule:** If every row is `pass` → skip Step 1 entirely and go straight to Step 2.
If any row is `fail` or `unknown` → run only that check, update this table, continue.

---

## Project Identity

- Project name:
- Repository root:
- Primary language/runtime:
- Primary package manager:

## Tooling Baseline

- `bd` installed and on PATH: yes/no — version:
- `bb` installed and on PATH: yes/no — version:
- Detection commands used:
- Shell/platform: (e.g. WSL2/bash, macOS/zsh, Windows/PowerShell)

## BeadBoard/Communication Setup

- `.beads` database: exists/created on YYYY-MM-DD via `bd init`
- Mail delegate: `bd config set mail.delegate "node <abs-path>/scripts/bb-mail-shim.mjs"` — configured YYYY-MM-DD
- Agent identity policy: `export BB_AGENT=<role-name>` (set fresh each session in Step 2)
- `session-preflight` last pass: YYYY-MM-DD

## Agent State + Heartbeat Policy

- Agent bead naming: `bb-<role-name>` (e.g. `bb-silver-scribe`)
- Required state transitions: `spawning → running → working → stuck/done/stopped`
- Heartbeat: LLM agents heartbeat at turn start + before long commands; daemon agents every 5 min

## Command Baseline

- Install:
- Build:
- Typecheck:
- Lint:
- Test:

## Known Workarounds

Document only stable, repeatable workarounds.

1. Trigger:
   - Symptom:
   - Workaround:
   - Verified:

## Session Log (append-only)

Each agent appends one line when they update this file:

| Date | Agent | What changed |
|------|-------|-------------|
| YYYY-MM-DD | `<agent-bead-id>` | Initial project.md created |
