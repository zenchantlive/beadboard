# Command Matrix

This matrix lists the operational command surface for the BeadBoard driver skill.
Day-to-day runbooks use `bd mail` delegation rather than direct low-level agent CLI invocations.

## Session and Identity

- `node skills/beadboard-driver/scripts/session-preflight.mjs`
- `node skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs`
- `bd create --title="Agent: <role-name>" --description="<agent scope>" --type=task --priority=0 --label="gt:agent,role:<orchestrator|ui|graph|backend|infra>"`
- `bd agent state <agent-bead-id> spawning`
- `bd agent state <agent-bead-id> running`
- `bd agent heartbeat <agent-bead-id>`
- `bd agent show <agent-bead-id>`

## Work Claim and Lifecycle

- `bd ready`
- `bd show <bead-id>`
- `bd update <bead-id> --status in_progress --assignee <agent-bead-id>`
- `bd slot set <agent-bead-id> hook <bead-id>`
- `bd update <bead-id> --notes "<evidence>"`
- `bd close <bead-id> --reason "<completion summary>"`
- `bd slot clear <agent-bead-id> hook`

## Mail and Coordination (`bd mail` delegated)

- `bd mail inbox`
- `bd mail send --to <agent-id> --bead <bead-id> --category <HANDOFF|BLOCKED|DECISION|INFO> --subject "<short>" --body "<details>"`
- `bd mail read <message-id>`
- `bd mail ack <message-id>`

Delegate setup and validation:

- `bd config set mail.delegate "node <abs-path>/skills/beadboard-driver/scripts/bb-mail-shim.mjs"`
- `export BB_AGENT=<agent-id>`
- `node skills/beadboard-driver/scripts/ensure-bb-mail-configured.mjs`

## Dependency and Graph Control

- `bd dep <blocker-id> --blocks <blocked-id>`
- `bd dep add <blocked-id> <blocker-id>`
- `bd dep list <bead-id>`
- `bd dep tree <bead-id>`
- `bd dep cycles`
- `bd dep relate <issue-a> <issue-b>`
- `bd dep unrelate <issue-a> <issue-b>`

## Swarm and Molecule Operations

- `bd swarm validate <epic-id>`
- `bd swarm create <epic-id> [--coordinator <rig/address>] [--force]`
- `bd swarm status <swarm-id>`
- `bd swarm list`
- `bd mol show <formula-or-mol-id>`
- `bd mol pour <formula-id> --var key=value`
- `bd mol ready`
- `bd mol progress <mol-id>`
- `bd mol stale`

## Gates and Blocked Work

- `bd gate list`
- `bd gate list --all`
- `bd gate check`
- `bd gate check --type=bead`
- `bd gate show <gate-id>`
- `bd gate resolve <gate-id>`

## Comments and Audit Trail

- `bd comments <bead-id>`
- `bd comments add <bead-id> "<coordination note>"`
- `bd comments add <bead-id> -f <path-to-note-file>`

## Environment and Repair Helpers

- `node skills/beadboard-driver/scripts/resolve-bb.mjs`
- `node skills/beadboard-driver/scripts/readiness-report.mjs --checks <json> --artifacts <json>`
- `node skills/beadboard-driver/scripts/diagnose-env.mjs`
- `node skills/beadboard-driver/scripts/heal-common-issues.mjs [--project-root <path>] [--apply] [--fix-git-index-lock]`
