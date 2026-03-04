# Next Session: BeadBoard Driver Skill v5 Rewrite (beadboard-maf)

## TL;DR

Work on the **beadboard-maf** epic — rewriting the beadboard-driver skill to teach agents the
real live command surface. beadboard-izs (coordination layer) is complete. Start maf.1–5 in
parallel immediately, then maf.6 onward.

---

## ⚠️ FOLDER WARNING — READ BEFORE TOUCHING ANYTHING

```
✅ CORRECT:   skills/beadboard-driver/          ← THE REAL SKILL
❌ WRONG:     .agents/skills/beadboard-driver/  ← OLD COPY, DO NOT EDIT
```

**Every file you create or edit must be under `skills/beadboard-driver/`.**
The `.agents/` folder is an outdated mirror that does not get distributed.
A prior agent (silver-scribe session) made the mistake of writing to `.agents/` — commit
`dc7f201` is noise in the wrong place. Do not repeat this.

---

## Context Recovery Checklist

```bash
cd /mnt/c/Users/Zenchant/codex/beadboard
git log --oneline -8            # see what's been committed by other agents
bd ready                        # what's unblocked right now
bd show beadboard-maf           # review v5 epic
bd show beadboard-izs           # confirm izs is closed (should be)
```

---

## What's Already Done (beadboard-izs — closed by parallel agents)

All coordination infrastructure is committed and working on `feat/bb-mail`:

| Commit | What | Who |
|---|---|---|
| `114c227` | `bb agent` commands wired into global `bb` CLI (`src/cli/beadboard-cli.ts`) | other agent |
| `dcca324` | API routes: `/api/agents/mail` + `/api/agents/reservations` (`src/app/api/agents/`) | other agent |
| `d1b8125` | `bb-mail-shim.mjs` + `session-preflight.mjs` mail delegate in `skills/` + tests | other agent |
| `dc7f201` | ⚠️ WRONG FOLDER — shim in `.agents/` (noise, superseded by d1b8125) | silver-scribe (us) |

**izs.1 (audit) may still be open** — check `bd show beadboard-izs.1` and close it if the
audit was done inline (it was, across this session).

---

## What Was Discovered This Session (Critical Context for v5 Docs)

These facts must inform every reference doc and command example you write:

1. **`bb agent` IS the real coordination API.** Commands: `register`, `list`, `show`,
   `activity-lease`, `send`, `inbox`, `read`, `ack`, `reserve`, `release`, `status`.
   All work globally via the installed `bb` CLI.

2. **`bd mail` → `bb agent`** via `bb-mail-shim.mjs` (already in `skills/`).
   Set `BB_AGENT=<name>`, then `bd mail inbox/send/read/ack` transparently calls
   `bb agent`. Configured automatically by running `session-preflight.mjs`.

3. **Message categories**: `HANDOFF`, `BLOCKED`, `DECISION`, `INFO`.
   `HANDOFF` and `BLOCKED` auto-set `requires_ack: true`.

4. **Mail storage**: `~/.beadboard/agent/messages/<agent>.jsonl` (inbox) +
   `~/.beadboard/agent/messages/index/<msg-id>.json` (state).
   Reservations: `~/.beadboard/agent/reservations/active.json`.

5. **Agent registration flow**:
   ```bash
   bd agent state bb-<name> idle           # creates bead, sets ZFC state
   bd update bb-<name> --title "Agent: <name>" --add-label "gt:agent,role:<role>"
   ```

6. **Liveness tiers**: `active` (<15m), `stale` (15–30m), `evicted` (30–60m), `idle` (≥60m).

---

## The v5 Skill: What Needs to Change

**All work is under `skills/beadboard-driver/`.**

### Files to rewrite (read each before touching):

| File | Problem | maf task |
|---|---|---|
| `references/coord-events-sessions-ack.md` | Deprecated commands, no WHEN-to-use triggers | maf.6 |
| `references/archetypes-templates-swarms.md` | Zero real `bd swarm` commands, no `bd mol` | maf.3 |
| `references/command-matrix.md` | Dead commands, missing `bd agent/swarm/slot/gate/mol` | maf.7 |
| `references/failure-modes.md` | Deprecated errors, missing Dolt/mail/heartbeat failures | maf.7 |
| `references/memory-system.md` | Missing domain anchor IDs and injection trigger | maf.2 |
| `references/session-lifecycle.md` | Wrong `--claim` flag, missing BLOCKED path, 37 lines | maf.4 |
| `scripts/lib/driver-lib.mjs` | `discoverBbPath()` only finds `bb.ps1` — breaks Linux/WSL | maf.5 |
| `project.template.md` | Missing `BB_AGENT`, heartbeat policy, swarm template, mail config | maf.9 |
| `SKILL.md` | Full v5 rewrite tying all refs together | maf.10 (last) |

### Files to create (new):

| File | Content | maf task |
|---|---|---|
| `references/agent-state-liveness.md` | ZFC states, `bd agent heartbeat`, liveness tiers, slot workflow | maf.1 |
| `references/coordination-system.md` | Full `bb agent` surface, WHEN-to-use triggers, worked BLOCKED flow | maf.6/izs.7 |

---

## Execution Order

```
START IMMEDIATELY (all parallel, no blockers):
  maf.1  Create references/agent-state-liveness.md    (new doc)
  maf.2  Update references/memory-system.md           (add anchor IDs + inject trigger)
  maf.3  Rewrite references/archetypes-templates-swarms.md
  maf.4  Expand references/session-lifecycle.md
  maf.5  Fix scripts/lib/driver-lib.mjs               (Linux/WSL bb discovery)

AFTER maf.6 PREREQS (izs.7 ref doc must exist):
  maf.6  Rewrite references/coord-events-sessions-ack.md  ← read izs.7 output FIRST

AFTER maf.6:
  maf.7  Rewrite references/command-matrix.md + failure-modes.md
  maf.8  Update tests/
  maf.9  Update project.template.md

LAST:
  maf.10 Rewrite SKILL.md v5 entry point
```

---

## Ground Truth Files to Read Before Writing Anything

```
help/cli/bd_help.txt                       # full bd command surface
help/cli/agent-help.txt                    # bd agent state/heartbeat/show
help/cli/true_agents.txt                   # agent bead workflow
help/cli/state-help.txt                    # ZFC state machine
help/memory/query_and_injection.txt        # 7-step memory injection playbook
help/memory/memory_fabric_workflow.txt
help/workflows/agent_bead_workflow.txt
skills/beadboard-driver/SKILL.md           # v4 entry point (what you're replacing)
skills/beadboard-driver/references/        # all current reference docs
src/lib/agent-mail.ts                      # real mail implementation + flag names
src/lib/agent-registry.ts                  # registration, liveness
tools/bb.ts                                # bb agent CLI (source of truth for flags)
```

---

## Skill to Use

**`hyperpowers:executing-plans`** — execute maf tasks one at a time with review checkpoints.
**`hyperpowers:verification-before-completion`** — run before closing each maf task.

---

## Agent Bead Protocol

```bash
# Session start
bd agent state bb-<adjective-noun> idle
bd update bb-<adjective-noun> --title "Agent: <name>" --add-label "gt:agent,role:implementer"
bd agent state bb-<adjective-noun> working
bd update beadboard-maf.1 --status in_progress --assignee <name>

# Session end
bd agent state bb-<adjective-noun> done
bd update bb-<adjective-noun> --status closed
```

New unique adjective-noun each session (e.g., `amber-linden`, `cobalt-ridge`).

---

## Commit Convention

Branch: `feat/bb-mail`

Stage only your files — other agents are working concurrently:
```bash
git add skills/beadboard-driver/<specific-files>
git commit -m "feat(driver-v5): <description> (maf.<n>)"
```
