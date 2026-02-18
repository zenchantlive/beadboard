# Failure Modes

## `BD_NOT_FOUND`

- Cause: `bd` missing from PATH.
- Recovery: install beads CLI or add `bd` executable directory to PATH.

## `BB_NOT_FOUND`

- Cause: `BB_REPO` invalid or no `bb` command / cache / discovery hit.
- Recovery:
  - Set `BB_REPO` to BeadBoard repo root.
  - Verify `bb.ps1` exists under `BB_REPO`.
  - Retry preflight.

## `NAME_GENERATION_EXHAUSTED`

- Cause: all generated names collided with existing registry entries.
- Recovery:
  - increase retry count (`BB_NAME_MAX_RETRIES`),
  - expand adjective/noun pools,
  - retry generation.

## Reservation Conflicts

- `RESERVATION_CONFLICT`: active owner exists.
- `RESERVATION_STALE_FOUND`: stale reservation exists; use takeover only when safe.
- `RELEASE_FORBIDDEN`: non-owner attempted release.

## Mail Lifecycle Errors

- `UNKNOWN_SENDER` / `UNKNOWN_RECIPIENT`: register agents before send.
- `ACK_FORBIDDEN`: only recipient may ack.
- `MESSAGE_NOT_FOUND`: stale id or wrong message reference.

## Policy Guardrails

- Do not write `.beads/issues.jsonl` directly.
- Do not close beads without verification evidence.
- Do not bypass `BB_REPO` when it is set but invalid; fix it explicitly.
