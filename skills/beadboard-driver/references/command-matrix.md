# Command Matrix

## Preflight and Identity

- `node skills/beadboard-driver/scripts/resolve-bb.mjs`
  - Output: `{ ok, source, resolved_path, reason, remediation }`
- `node skills/beadboard-driver/scripts/session-preflight.mjs`
  - Output: `{ ok, tools.bd, bb }` or `{ ok:false, error_code }`
- `node skills/beadboard-driver/scripts/generate-agent-name.mjs`
  - Output: `{ ok, agent_name, attempts, collisions }` or `{ ok:false, error_code }`
- `node skills/beadboard-driver/scripts/readiness-report.mjs --checks <json> --artifacts <json>`
  - Output: `{ ok, checks, artifacts, dependency_sanity, summary }`

## Coordination Commands (`bb`)

- `bb agent register --name <agent> --role <role>`
- `bb agent list`
- `bb agent show --agent <agent>`
- `bb agent send --from <agent> --to <agent> --bead <id> --category <HANDOFF|BLOCKED|DECISION|INFO> --subject <text> --body <text>`
- `bb agent inbox --agent <agent> [--state unread|read|acked]`
- `bb agent read --agent <agent> --message <message-id>`
- `bb agent ack --agent <agent> --message <message-id>`
- `bb agent reserve --agent <agent> --scope <path> --bead <id> [--ttl <minutes>] [--takeover-stale]`
- `bb agent release --agent <agent> --scope <path>`
- `bb agent status [--bead <id>] [--agent <agent>]`

## Lifecycle Commands (`bd`)

- `bd ready`
- `bd show <bead-id>`
- `bd update <bead-id> --status in_progress --claim`
- `bd update <bead-id> --notes "<evidence>"`
- `bd close <bead-id> --reason "<summary>"`
