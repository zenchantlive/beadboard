# Session Lifecycle

This runbook is the minimum lifecycle contract for agents using BeadBoard Driver.

## 1) Session Start

1. Run preflight and discovery checks:

```bash
node skills/beadboard-driver/scripts/session-preflight.mjs
node skills/beadboard-driver/scripts/resolve-bb.mjs
```

2. Create or identify your agent bead first (required before claiming work):

```bash
bd create --title "Agent: <name>" --type task --priority 0 --label "gt:agent,role:<role>"
```

3. Set state transitions and attach hook when work begins:

```bash
bd agent state <agent-bead-id> spawning
bd agent state <agent-bead-id> running
```

4. Query hard memory for your domain before claim:

```bash
bd query "label=memory AND label=mem-canonical AND label=mem-hard AND status=closed"
```

## 2) Discover Work and Read Epic Context

1. Find ready work:

```bash
bd ready
```

2. For child tasks, read parent epic first:

```bash
bd show <epic-id>
bd children <epic-id>
```

3. Read full assigned bead:

```bash
bd show <bead-id>
```

## 3) Claim Correctly (`--assignee`, not `--claim`)

Claim order is strict:
1. Agent bead exists
2. Set bead to in_progress with assignee
3. Hook agent slot to current bead

```bash
bd update <bead-id> --status in_progress --assignee <agent-bead-id>
bd slot set <agent-bead-id> hook <bead-id>
bd agent state <agent-bead-id> working
```

## 4) Dependency Workflow During Execution

Use dependencies to model execution order, not visual grouping.

Add blocker dependency (`<blocked>` depends on `<blocker>`):

```bash
bd dep add <blocked-id> <blocker-id>
```

Add non-blocking related context link:

```bash
bd dep relate <id-a> <id-b>
```

Inspect dependency state:

```bash
bd dep list <bead-id>
bd dep tree <bead-id>
```

## 5) BLOCKED Path (Mandatory Pattern)

When blocked, do all four actions:

1. State signal:

```bash
bd agent state <agent-bead-id> stuck
```

2. Coordination signal:

```bash
bb agent send --from <agent-name> --to <target-agent-or-role> --bead <bead-id> --category BLOCKED --subject "<blocker summary>" --body "<what is needed>"
```

3. Keep heartbeat while waiting:

```bash
bd agent heartbeat <agent-bead-id>
```

4. Resume cleanly once unblocked:

```bash
bd agent state <agent-bead-id> running
bd agent state <agent-bead-id> working
```

## 6) Verification and Closure

Run gates before close claims:

```bash
npm run typecheck
npm run lint
npm run test
```

Record evidence and close bead:

```bash
bd update <bead-id> --notes "Commands run: ... Outputs: ..."
bd close <bead-id> --reason "<completed outcome>"
```

Detach hook when bead is complete:

```bash
bd slot clear <agent-bead-id> hook
bd agent state <agent-bead-id> done
```

## 7) Memory Review Rule (Create vs Skip)

Create/supersede canonical memory only when BOTH are true:
- Rule is reusable across future tasks
- Evidence exists from at least one concrete failure/recovery pattern

Otherwise, record:

```bash
bd update <bead-id> --notes "Memory review: no new reusable memory."
```

If reusable and novel:
- Create new memory decision bead
- Link anchor + evidence via `bd dep relate`
- Supersede old memory if replacing policy (`bd supersede <old> --with <new>`)

## 8) Session End Hygiene

1. Ensure no lingering hook slot:

```bash
bd slot show <agent-bead-id>
```

2. Ensure no unresolved required-ack backlog for your active work.
3. Set end state:

```bash
bd agent state <agent-bead-id> stopped
```
