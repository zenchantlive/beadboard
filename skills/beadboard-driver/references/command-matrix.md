# Command Matrix

## Bootstrapping and Handshake

- `node scripts/bb-init.mjs --register <name> --role <role> --json`
  - Output: `{ ok, agent_id, mode, lease, timestamp }`
- `node scripts/bb-init.mjs --adopt <id> [--non-interactive] --json`
  - Output: `{ ok, agent_id, mode, lease, timestamp }` or `{ ok:false, error }`

## Coordination Commands (`bb`)

- `bb agent register --name <agent> --role <role>`
- `bb agent activity-lease --agent <agent> [--json]`
  - Output: `{ ok, command, data: AgentRecord }`
- `bb agent list [--role <role>] [--status <status>]`
- `bb agent show --agent <agent>`
- `bb agent send --from <agent> --to <agent> --bead <id> --category <HANDOFF|BLOCKED|DECISION|INFO> --subject <text> --body <text>`
- `bb agent inbox --agent <agent> [--state unread|read|acked] [--bead <id>]`
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

## Legacy/Internal Scripts

- `node skills/beadboard-driver/scripts/resolve-bb.mjs`
- `node skills/beadboard-driver/scripts/session-preflight.mjs`
- `node skills/beadboard-driver/scripts/generate-agent-name.mjs`
- `node skills/beadboard-driver/scripts/readiness-report.mjs --checks <json> --artifacts <json>`