# Failure Modes

This document tracks high-impact coordination and environment failures for the BeadBoard driver skill.

## `BD_NOT_FOUND`

- Signal: preflight or scripts fail with `BD_NOT_FOUND`.
- Cause: `bd` is not installed or not on `PATH`.
- Recovery:
  - Install beads CLI.
  - Re-open shell so `PATH` updates apply.
  - Re-run `node skills/beadboard-driver/scripts/session-preflight.mjs`.

## `BB_NOT_FOUND`

- Signal: `session-preflight.mjs` or `bb-mail-shim.mjs` reports bb command missing.
- Cause: global BeadBoard CLI not installed, or not discoverable.
- Recovery:
  - Install BeadBoard globally (`bb`/`beadboard` on `PATH`) — see Bootstrap Step C in SKILL.md.
  - Run `node {baseDir}/scripts/setup-mail-delegate.mjs` to reconfigure the mail delegate after `bb` is installed.
  - Re-run preflight: `node {baseDir}/scripts/session-preflight.mjs`.

## `MAIL_DELEGATE_MISSING` / `BD_MAIL_DELEGATE_NOT_SET`

- Signal: `bd mail ...` returns delegate-not-configured or shim not invoked.
- Cause: neither env delegate (`BEADS_MAIL_DELEGATE`/`BD_MAIL_DELEGATE`) nor `mail.delegate` config is set.
- Recovery:
  - `bd config set mail.delegate "node <abs-path>/skills/beadboard-driver/scripts/bb-mail-shim.mjs"`
  - `export BB_AGENT=<agent-id>`
  - `node skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs`

## `BB_MAIL_NOT_CONFIGURED`

- Signal: `ensure-bb-mail-configured.mjs` fails contract checks.
- Cause: delegate points to wrong command, missing shim path, or invalid `BB_AGENT` context.
- Recovery (in order):
  1. Check delegate is set: `bd config get mail.delegate`
  2. Verify shim path: the path shown must be absolute and the `bb-mail-shim.mjs` file must exist on disk
  3. Reconfigure if wrong/missing: `node {baseDir}/scripts/setup-mail-delegate.mjs`
  4. Verify `BB_AGENT` is set: `echo $BB_AGENT` (must be non-empty)
  5. Re-run verification: `node {baseDir}/scripts/ensure-bb-mail-configured.mjs` — expected: `ok: true`

## `DOLT_NOT_RUNNING`

- Signal: `bd` reads stale/fallback data, API routes return Dolt connection failures, or status checks report backend unavailable.
- Cause: Dolt SQL server not started for this workspace.
- Recovery:
  - From repo root: `bd dolt start`
  - Verify backend health before proceeding (`beadboard status --json` or project-specific health checks).

## `AGENT_HEARTBEAT_MISSED` (Witness liveness degradation)

- Signal: agent appears stale/dead in liveness surfaces after inactivity window.
- Cause: agent is not sending `bd agent heartbeat <agent-bead-id>` during active work.
- Recovery:
  - Resume periodic heartbeat (typically every 30-120 seconds while active).
  - Set explicit state transitions: `running` -> `working` -> `stuck|done|stopped`.
  - If work was interrupted, post a coordination note/message before resuming.

## Mail Lifecycle Errors

- `UNKNOWN_SENDER` / `UNKNOWN_RECIPIENT`: register agent identities before sending.
- `MESSAGE_NOT_FOUND`: incorrect message id or wrong inbox context.
- `ACK_FORBIDDEN`: only the message recipient can acknowledge.

## Local Workspace Repair Signals

- `GIT_INDEX_LOCK_PRESENT`: stale git lock blocks writes.
- Recovery:
  - Confirm no active git process is still using the repo.
  - Run `node skills/beadboard-driver/scripts/heal-common-issues.mjs --project-root <repo> --apply --fix-git-index-lock`.

## Policy Guardrails

- Do not write `.beads/issues.jsonl` directly.
- Do not close beads without fresh evidence.
- Do not bypass a misconfigured mail delegate; fix configuration with `{baseDir}/scripts/setup-mail-delegate.mjs` first.
