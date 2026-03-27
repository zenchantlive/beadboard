---
name: beadboard-driver
description: Use when an agent is executing work in any project repo and needs to coordinate with a human or other agents via BeadBoard. BeadBoard is the human-facing dashboard running separately; this skill is the agent-side operating contract for state, mail, assignment, and evidence flow.
---

# BeadBoard Driver

## Overview

This skill is the operator runbook for agent execution in external repos with BeadBoard as control plane.

Core principle: explicit state + explicit assignment + explicit evidence.

## What is BeadBoard

BeadBoard is a real-time dashboard for `bd`-backed agent work — it surfaces agent liveness, state transitions, swarm progress, and inter-agent mail in a live UI. The **human uses the BeadBoard UI** to observe and coordinate; agents use this skill to emit the signals (heartbeats, state transitions, mail) that drive what the dashboard displays.

**Agents almost never work inside the BeadBoard repo.** You work in your own project repo. `bb` and `bd` are globally available on PATH. Scripts used by this skill (preflight, mail shim, etc.) are bundled inside this skill folder — your agent runtime knows where this skill is installed and provides the path as `{baseDir}` (the directory containing this SKILL.md).

## The Iron Law

```
No bead claims, handoffs, or completion statements without:
1) assignee set,
2) coordination checked,
3) evidence recorded.
```

## Approved Archetypes

Read [`references/archetype-instance-model.md`](references/archetype-instance-model.md) before creating or dispatching agents.

Canonical model:

- `archetype` = stable approved worker type
- `runtime instance` = temporary executing copy of an archetype
- `spawn plan` = orchestrator declaration of what will be spawned, why, and who owns each scope

Hard rules:

1. Only approved archetypes are spawnable worker types.
2. Runtime instances may be created freely from approved archetypes.
3. Workers do not invent new stable worker types.
4. New archetype creation is separate and must be explicitly approved.
5. Orchestrators must state the spawn plan before dispatch.
6. Orchestrators own runtime-instance retirement when work is done or abandoned.

## Requirements

- `bd` must be installed and available on `PATH`.
- `bb` or `beadboard` must be installed globally and available on `PATH`.
- Work from the target repository root.
- Install `bd`: `npm install -g beads-cli`
- Install `bb`: clone from GitHub and install globally — see Step 0 bootstrap for the exact commands

## Session Runbook (Do Not Skip Steps)

### Step 0: Read `project.md` — Cache-First Decision

```bash
ls project.md 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

**MISSING → you are the first agent in this project.** Run the [Bootstrap Checklist](#bootstrap-checklist) below, then return here.

**EXISTS → read the Environment Status Cache table at the top of `project.md`.**

- All rows `pass` → **skip Step 1 entirely, go straight to Step 2.** The environment is verified.
- Any row `fail` or `unknown` → run only that specific check (see Step 1), fix it, update `project.md`, continue.

> `project.md` is the token budget. Trust it when it's green. Only spend checks on what's actually broken.

---

#### Bootstrap Checklist

> `{baseDir}` is the absolute path to the directory containing this SKILL.md, injected automatically by your agent runtime (Claude Code, Codex, etc.). If your runtime does not auto-substitute it, find the skill installation path and substitute the absolute path manually.

Run once, in order, when `project.md` is missing.

**A. Check `bd` (beads-cli)**

```bash
which bd 2>/dev/null || where bd 2>/dev/null
```

If missing:
```bash
npm install -g beads-cli
```

**B. Initialize beads database (if not already present)**

```bash
ls .beads 2>/dev/null && echo "EXISTS — skip" || bd init
```

Required before any `bd config` commands. Skip if `.beads` already exists.

**C. Check `bb` (BeadBoard)**

```bash
which bb 2>/dev/null || where bb 2>/dev/null
```

If missing — `bb` is required for coordination. Ask the user:

> "BeadBoard is not installed. It is required for agent coordination. Would you like me to install it now? I'll clone the repo and install it globally."

If the user agrees:
```bash
git clone https://github.com/zenchantlive/beadboard.git ~/beadboard
cd ~/beadboard && npm install && npm install -g .
```

**D. Configure mail delegate**

```bash
node {baseDir}/scripts/setup-mail-delegate.mjs
```

Self-resolves the shim absolute path and runs `bd config set mail.delegate` automatically.

**E. Run session preflight**

```bash
node {baseDir}/scripts/session-preflight.mjs
```

Must pass before continuing. Checks `bd`, `bb`, and confirms delegate is set.

**F. Create `project.md`**

```bash
cp {baseDir}/project.template.md ./project.md
```

Fill in every field in the Environment Status Cache table and Project Identity section. Set each verified row to `pass` with today's date. This is what saves the next agent from re-running all of the above.

Append to the Session Log:
```
| YYYY-MM-DD | `<your-agent-bead-id>` | Initial project.md created, all checks pass |
```

---

### Step 1: Environment Check (Skip If project.md All Green)

**Only run this step if project.md has a `fail` or `unknown` row.**

Run only the failing check:

| Row failed | Command to fix |
|-----------|----------------|
| `bd` on PATH | `npm install -g beads-cli` |
| `bb` on PATH | clone + `npm install -g .` (see Bootstrap C) |
| `.beads` db | `bd init` (see Bootstrap B) |
| `mail.delegate` | `node {baseDir}/scripts/setup-mail-delegate.mjs` |
| `session-preflight` | `node {baseDir}/scripts/session-preflight.mjs` — fix what it reports |

`{baseDir}` is the directory containing this SKILL.md. Your agent runtime substitutes it automatically.

After fixing: update that row in `project.md` to `pass` with today's date.

> See [Platform Notes](#platform-notes) if running on Windows native or WSL2.

### Step 2: Create Runtime-Instance Identity + Verify Mail

```bash
bd create --title="Agent: <archetype>/<scope-or-ordinal>" --description="<runtime-instance scope>" --type=task --priority=0 --label="gt:agent,role:<orchestrator|ui|graph|backend|infra>"
```

```bash
# Register in bb coordination system and set identity
bb agent register --name <archetype>/<scope-or-ordinal> --role <orchestrator|ui|graph|backend|infra>
export BB_AGENT=<archetype>/<scope-or-ordinal>
```

This bead is a runtime-instance record, not a new stable worker type.
Stable type identity comes from the approved archetype.

Deterministic naming rules:

1. Start with the approved archetype id.
2. Add scope or ordinal that explains why this instance exists.
3. Keep names human-readable, but do not invent arbitrary personas.

Examples:

- `Agent: coder/task-beadboard-kqi.3`
- `Agent: reviewer/swarm-beadboard-ov2`
- `Agent: researcher#2`

| Term | Example | Used where |
|------|---------|------------|
| `archetype` | `coder` | stable approved worker type |
| `runtime instance name` | `coder/task-beadboard-kqi.3` | `bb agent register --name`, `BB_AGENT`, `bd mail --to` |
| Bead title | `Agent: coder/task-beadboard-kqi.3` | `bd create --title` |
| `<agent-bead-id>` | `beadboard-0m9` | `bd agent state`, `bd slot set`, `bd update --assignee` |
| `BB_AGENT` value | `coder/task-beadboard-kqi.3` | Set via `export`; auto-injected into all `bd mail` calls |

Now that BB_AGENT is set, verify the full mail stack:

```bash
node {baseDir}/scripts/ensure-bb-mail-configured.mjs
```

Expected: `ok: true` with matching delegate and actor. If it fails, see [Failure Modes](#use-the-right-doc-map).

Check inbox before proceeding:

```bash
bd mail inbox
```

> Read and ack any pending messages before claiming work. Unacked HANDOFF or DECISION messages may affect your tasks downstream.

Then set lifecycle state:

```bash
bd agent state <agent-bead-id> spawning
bd agent state <agent-bead-id> running
```

### Step 2A: Declare Spawn Plan Before Dispatch

If you are the orchestrator and intend to fan out work, state the spawn plan first.

Minimum spawn-plan fields:

1. archetype
2. action: `reuse` or `create`
3. target bead or scope
4. purpose

Example:

- `coder` `create` `beadboard-kqi.3` `implement runtime naming and retirement rules`
- `reviewer` `create` `beadboard-kqi.6` `independent regression validation`
- `researcher` `reuse` `beadboard-kqi.2` `gather current skill drift before rewrite`

Do not dispatch workers before you can explain:

- what will be spawned
- why each instance is needed
- who owns each target bead
- whether each instance is reused or newly created

### Step 3: Note Any Environment Changes in `project.md`

`project.md` was already read in Step 0. Only update it now if something changed this session — new package installed, delegate reconfigured, new platform quirk discovered. If nothing changed, skip this step entirely.

If you fixed a `fail`/`unknown` row in Step 1, update that row to `pass` with today's date now.

### Step 4: Read Hard Memory and Task Context

```bash
# Select your primary domain first:
# memory-arch | memory-workflow | memory-agent | memory-ux | memory-reliability
bd query "label=memory AND label=mem-canonical AND label=<domain> AND status=closed" --sort updated --reverse
bd ready
bd show <target-bead-id>
```

> Pick the domain matching your task: `memory-arch` (architecture decisions), `memory-workflow` (session protocol), `memory-agent` (agent setup/identity), `memory-ux` (UI/UX), `memory-reliability` (errors/recovery). Domain anchor IDs are in `references/memory-system.md`.

> `bd ready` can include stale runtime-instance artifacts in older repos. Prefer actionable work beads over `gt:agent` runtime-instance records, and use the current lifecycle contract to retire stale instances rather than treating them as normal project work.

Minimum: read task contract, dependencies, success criteria, and blockers.

### Step 5: Claim Work with Assignee + Hook Slot

```bash
bd update <target-bead-id> --status in_progress --assignee <agent-bead-id>
bd slot set <agent-bead-id> hook <target-bead-id>
bd agent state <agent-bead-id> working
```

Never use `--claim`. Use explicit `--assignee`.

### Step 6: Execute + Heartbeat + Coordinate via Mail

During execution:

```bash
bd agent heartbeat <agent-bead-id>
```

> **LLM agents (Claude Code):** Heartbeat at turn start and immediately before long-running commands (builds, tests). Inter-turn silence is expected — do not treat it as a health failure. The every-5-minutes cadence applies to persistent daemon-backed agents only.
>
> **Note:** The Witness enforcement layer that automatically marks agents `dead` on missed heartbeats is not yet running. Heartbeats are recorded and visible in the BeadBoard dashboard but not currently enforced. Daemon implementation is a future epic.

Coordinate through delegated mail:

> **`bd mail` vs `bb agent`:** `bd mail inbox/send/read/ack` are thin wrappers that delegate to `bb agent inbox/send/read/ack` via the configured shim, injecting `BB_AGENT` as your sender identity automatically. Always use `bd mail` in this skill. Raw `bb agent` commands appear in some reference docs as lower-level equivalents — use them only when the shim is not configured or for direct `bb`-level debugging.

```bash
bd mail inbox
bd mail send --to <agent-or-role> --bead <bead-id> --category <HANDOFF|BLOCKED|DECISION|INFO> --subject "<short>" --body "<details>"
bd mail read <message-id>
bd mail ack <message-id>
```

When blocked:
- send `BLOCKED`
- set `bd agent state <agent-bead-id> stuck`
- resume only after intervention/response

> See `references/coordination-system.md` → Inbox Polling Protocol for minimum polling moments and cadence.

### Step 7: Verification Gates (Code Changes)

```bash
npm run typecheck
npm run lint
npm run test
```

Do not claim fixed/done without fresh command output from this session.

### Step 8: Publish Evidence, Close, and Update Cache

```bash
bd update <target-bead-id> --notes "<commands run + key outputs + files changed>"
bd close <target-bead-id> --reason "<what was completed>"
bd slot clear <agent-bead-id> hook
bd agent state <agent-bead-id> done
```

If you are the orchestrator, retirement is not finished until you also:

1. confirm the instance no longer owns live work
2. clear or reassign any lingering hook/claim state
3. retire the runtime instance according to the current lifecycle rules

Do not leave finished instances sitting at the top of normal ready-work flows.

Update `project.md` Environment Status Cache:
- If you ran tests: set `Tests last run` row to `pass`/`fail` + today's date
- If you ran preflight: update `session-preflight` row
- If you ran `bb agent register` this session: update `bb agent registered` row to `pass | BB_AGENT=<name>` + today's date
- Append one line to the Session Log: `| YYYY-MM-DD | <agent-bead-id> | <what you verified/changed> |`

This update is what saves the next agent from re-running your checks.

### Step 9: Memory Review

If reusable lesson exists:
- create/supersede canonical memory decision bead

If no reusable lesson:
- record: `Memory review: no new reusable memory.`

## Red Flags

Stop and correct if you are about to:
- close without `--assignee` history
- skip `bd mail` checks at session start/claim/close
- claim completion without gate output
- write project context inside skill folder instead of repo `project.md`
- use deprecated direct command patterns from old docs
- spawn workers without stating the spawn plan first
- invent a new stable worker type instead of using an approved archetype
- leave finished runtime instances unretired

## Use-The-Right-Doc Map

- `references/session-lifecycle.md`:
  Full end-to-end session choreography.
- `references/archetype-instance-model.md`:
  Canonical identity model for approved archetypes, runtime instances, spawn plans, reuse, and retirement.
- `references/agent-state-liveness.md`:
  Agent states, heartbeat cadence, liveness interpretation.
- `references/coordination-system.md`:
  Canonical bb-mail command surface and category semantics.
- `references/coord-events-sessions-ack.md`:
  Trigger map, inbox polling protocol, blocked-to-resume walkthrough.
- `references/command-matrix.md`:
  Exact command inventory for day-to-day operation.
- `references/failure-modes.md`:
  Deterministic diagnosis and recovery paths.
- `references/memory-system.md`:
  Memory anchors, injection protocol, promotion/supersede rules.
- `references/archetypes-templates-swarms.md`:
  Swarm composition, molecule operations, worker dispatch patterns.
- `references/missions-realtime.md`:
  Real-time/watcher/event troubleshooting.
- `references/creating-beads.md`:
  Creating epics, tasks, subtasks with proper naming, dependencies, and workflow.

## Bottom Line

If you follow this runbook exactly, any agent can enter cold, coordinate safely, and deliver auditable completion without drift.

## Platform Notes

### Environment Variable Syntax

| Shell | Command |
|-------|---------|
| bash / zsh (WSL2, Linux, macOS) | `export BB_AGENT=<name>` |
| PowerShell (Windows native) | `$env:BB_AGENT = "<name>"` |
| cmd.exe (Windows native) | `set BB_AGENT=<name>` |

### Mail Delegate Path Format

When configuring `bd config set mail.delegate "node <path>/bb-mail-shim.mjs"`:

| Environment | Path format example |
|-------------|---------------------|
| WSL2 | `node /home/<you>/<project-path>/skills/beadboard-driver/scripts/bb-mail-shim.mjs` |
| Windows native | `node C:\Users\<you>\<project-path>\skills\beadboard-driver\scripts\bb-mail-shim.mjs` |

### Binary Detection

The preflight script checks `bd` and `bb` are on `PATH`. On native Windows, the system uses `where` instead of `which`. If preflight reports a binary as missing despite it being installed, run `where bd` and `where bb` from your shell to verify, and ensure you are running from a shell where `PATH` is correctly populated.
