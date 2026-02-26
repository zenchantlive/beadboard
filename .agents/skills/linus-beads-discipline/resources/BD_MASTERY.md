# BD Mastery

**Advanced commands for Linus-level beads discipline.**

## Agent Coordination Architecture

**Single source of truth:** Agent identity lives in bd agent beads (`.beads/issues.jsonl`), NOT in separate files.

### BD Agent Beads (Identity + Presence)

```bash
# Create agent bead
bd create --title "Agent: amber-otter" --type agent --label gt:agent

# Set agent state
bd agent state gt-amber-otter working

# Heartbeat (presence)
bd agent heartbeat gt-amber-otter

# Show agent
bd agent show gt-amber-otter

# Query agents
bd query "label=gt:agent AND status!=closed"
```

**Agent bead fields:** `id`, `title` (display name), `status`, `last_activity`, labels include `gt:agent` and role.

### BB Agent (Custom Extensions)

For features bd doesn't have:

```bash
# Messaging (bd has no equivalent)
bb agent send --from amber-otter --to cobalt-harbor --bead bb-xyz --category request --subject "Need review" --body "..."

# Path reservations (bd slots are bead-based, not path-based)
bb agent reserve --agent amber-otter --scope C:/project/path --bead bb-xyz
bb agent release --agent amber-otter --scope C:/project/path

# Check reservations + messages
bb agent status --agent amber-otter
```

**What stays in bb (no bd equivalent):**
- `agent-mail.ts` - Agent-to-agent messaging
- `agent-reservations.ts` - Path-based scope locks
- `agent-sessions.ts` - Session aggregation

### Architecture Principle

```
Identity → bd agent bead (git-tracked, team-visible)
Presence → bd agent heartbeat
State → bd agent state
Messaging → bb agent send/inbox (custom)
Scope locks → bb agent reserve/release (custom)
```

**Why:** Single truth, survives compaction, team coordination, bd query access.

## Gate Commands

```bash
bd gate list                # All open gates
bd gate check               # Evaluate and auto-close resolved
bd gate resolve <id>        # Manually close gate
```

**Gate types:** `human` (manual), `timer` (expires), `gh:run` (GitHub workflow), `gh:pr` (PR merge), `bead` (cross-rig bead)

**Use when:** Workflow needs human approval or external event.

## Molecule Commands

```bash
bd mol pour <proto>         # Persistent mol (solid → liquid)
bd mol wisp <proto>         # Ephemeral wisp (vapor)
bd mol show <id>            # View structure
bd mol current              # Position in workflow
bd mol burn <id>            # Discard wisp
bd mol squash <id>          # Compress to digest
```

**Wisp vs Mol:**
| Wisp (ephemeral) | Mol (persistent) |
|------------------|------------------|
| Exploration/experiment | Production workflow |
| Auto-deletes on close | Survives sessions |
| Fast iteration | Full audit trail |

**Use wisp when:** Uncertain scope, exploring. **Use mol when:** Committed workflow.

## Swarm Commands

```bash
bd swarm create <epic>      # Create from epic
bd swarm status             # Current progress
bd swarm list               # All swarms
bd swarm validate <epic>    # Check structure
```

**Use when:** Epic has parallelizable children. Swarm enables multi-agent execution.

## Worktree Commands

```bash
bd worktree create <name>        # Isolated directory
bd worktree list                 # All worktrees
bd worktree remove <name>        # Clean up
bd worktree info                 # Current context
```

**Use when:** Parallel feature work. Each worktree shares .beads but has isolated files.

## Query Language

```bash
bd query "status=open AND priority>1"
bd query "updated>7d AND NOT status=closed"
bd query "(status=open OR status=blocked) AND label=urgent"
bd query "assignee=none AND type=task"
```

**Use when:** Complex filtering beyond basic flags.

## Dependency Commands

```bash
bd dep add <blocked> <blocker>   # Add dependency
bd dep remove <blocked> <blocker>
bd dep tree <id>                 # Visual tree
bd dep cycles                    # Detect cycles
bd dep list <id>                 # List deps
```

**Use when:** Modeling work relationships. Critical for parallelization.

## Advanced Session Protocol

### Multi-Agent Claim
```bash
bd ready
bd show <id>
bd slot set <my-agent-id> hook <id>   # Claim exclusive
bd update <id> --status in_progress
bd agent heartbeat <my-agent-id>      # Signal presence
```

### Human Gate Checkpoint
```bash
bd gate add --type=human --await_id=<id> "Needs review"
# Continue other work...
bd gate check  # After human approval, gate closes
```

### Parallel Swarm Execution
```bash
bd swarm create <epic-id>
bd swarm status  # Shows parallelizable paths
# Dispatch agents to parallel beads
```

### Isolated Feature Work
```bash
bd worktree create feature-x
cd ../feature-x
# Work in isolation, shared .beads
bd sync  # Push changes
cd ../main
bd worktree remove feature-x
```

## Prime Context

```bash
bd prime        # AI-optimized workflow (~50 tokens in MCP mode)
bd prime --full  # Full reference (~1-2k tokens)
```

**Use:** At session start, after compaction, when unsure of workflow.

## Audit Trail

```bash
bd audit record --type=<type> --data='<json>'
bd audit label <entry-id> --label='<label>'
```

**Use when:** Recording agent decisions. SFT/RL dataset generation.

## Advanced Close Ritual

```bash
# Full verification
npm run typecheck && npm run lint && npm run test

# Evidence documentation
bd update <id> --notes "Evidence:
- typecheck: PASS
- lint: PASS
- test: PASS (N/N)
- Coverage: X%
- Artifacts: ..."

# Human gate if needed
bd gate resolve <gate-id>  # If checkpoint required

# Close
bd close <id> --reason "..."

# Sync
bd sync && git push

# Clear slot if agent
bd slot clear <agent> hook

# Report state
bd agent state <agent> done
```

## Decision Matrix

| Situation | Command |
|-----------|---------|
| Uncertain scope | `bd mol wisp` |
| Committed workflow | `bd mol pour` |
| Multi-agent parallel | `bd swarm create` |
| Isolated feature | `bd worktree create` |
| Human approval needed | `bd gate add --type=human` |
| Complex filtering | `bd query "expr"` |
| Claim exclusive work | `bd slot set` |
| Signal presence | `bd agent heartbeat` |
| After compaction | `bd prime && bd show <id>` |

## Linus-Level Principles

1. **Data-first workflow**: Use `bd query` to analyze before acting
2. **Explicit coordination**: `bd slot` for claiming, `bd agent` for presence
3. **Parallel by default**: `bd swarm` + `bd worktree` for isolation
4. **Human gates**: `bd gate` for approval checkpoints
5. **Ephemeral exploration**: `bd mol wisp` before committing
6. **Audit everything**: `bd audit record` for decisions

**Linus would use all of these. Not just `bd ready` and `bd close`.**