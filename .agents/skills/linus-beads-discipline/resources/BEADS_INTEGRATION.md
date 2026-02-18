# Beads Integration

**BD as religious discipline. Not overhead—truth.**

## The Religion

Beads is not a tool. Beads IS the work state.

```
BD = Truth
Code = Implementation of truth
Tests = Verification of implementation
Gates = Ritual proving truth
```

Every bypass is a lie to yourself about what the work state is.

## The Sacraments

### 1. `bd prime` - Awakening

Start of any session:
```bash
bd prime  # AI-optimized workflow context
```

This is knowing the ritual. ~50 tokens of essential workflow.

### 2. `bd ready` - Morning Prayer

Before any work:
```bash
bd ready  # What is unblocked?
```

This is not optional. This is asking: "What should I work on?"

### 3. `bd show <id>` - Reading Scripture

Before implementing:
```bash
bd show bb-xyz  # What does this bead require?
```

This is understanding the task. Not guessing. Not assuming. Reading.

### 4. `bd slot set` - Taking Vows (Advanced)

Claiming exclusive work:
```bash
bd slot set gt-agent hook bb-xyz  # Exclusive claim
```

This is commitment with lock. Prevents other agents from same work.

### 5. `bd update --status in_progress` - Public Declaration

Starting work:
```bash
bd update bb-xyz --status in_progress --notes "Plan: implement X, verify Y"
```

This is commitment. Public declaration. Now you're accountable.

### 6. `bd update --notes` - Confession

As you work:
```bash
bd update bb-xyz --notes "Progress: X done, Y in progress, Z blocked by ..."
```

This is documentation. Future agents need to know. Past you forgets.

### 7. `bb agent` Commands - Passive Presence (Project-Specific)

This project uses `bb agent` (tools/bb.ts) for coordination, not `bd agent`:

```bash
# Register identity (session start)
bb agent register --name amber-otter --role backend

# Reserve work scope (claim lock)
bb agent reserve --agent amber-otter --scope C:/project --bead bb-xyz

# Any command with --agent extends activity lease automatically
bb agent status --agent amber-otter  # Extends lease as side-effect
```

**Passive Activity Lease:** No background heartbeat. Lease extends on real work.

**Liveness:** `active` (<15m), `stale` (15-30m), `evicted` (30-60m), `idle` (>=60m)

### 8. Verification Gates - Ritual Cleansing

Before closing:
```bash
npm run typecheck && npm run lint && npm run test
```

This is proof. Not "I think it works". Proof.

### 9. `bd close` - Absolution

Completing work:
```bash
bd close bb-xyz --reason "Complete with evidence: gates pass, tests pass"
```

This is absolution. Work is done. Truth is updated.

### 10. `bd sync` - Communion

End of session:
```bash
bd sync  # Git push the truth
```

This is sharing. Team knows state. Future sessions have context.

## The Heresies

### Direct JSONL Edit

```
WRITING TO .beads/issues.jsonl DIRECTLY
```

This is bypassing truth. This is creating shadow truth. This is heresy.

**Correction**: Delete changes. Use bd commands. Confess in notes.

### Claim Without Evidence

```
CLOSING A BEAD WITHOUT RUNNING GATES
```

This is lying about completion. This is claiming truth you haven't proven.

**Correction**: Re-open bead. Run gates. Cite output. Close with evidence.

### Skip BD Commands

```
"bd is too slow, I'll just..."
```

This is convenience over truth. This is the root of all drift.

**Correction**: Use bd. Slow truth > fast lies.

### Stale Session Start

```
STARTING WORK WITHOUT `bd ready`
```

This is working without knowing what to work on. This is blindness.

**Correction**: `bd ready` first. Always.

## The Daily Practice

### Start of Session
```bash
bd ready              # What's unblocked?
bd show <id>          # What does it require?
bd update <id> --status in_progress --notes "Plan: ..."
```

### During Work
```bash
# After each meaningful progress
bd update <id> --notes "Progress: X complete, evidence: ..."
```

### End of Session
```bash
npm run typecheck && npm run lint && npm run test
bd update <id> --notes "Session end: ... Evidence: ..."
bd sync
```

### Closing a Bead
```bash
# Full ritual
npm run typecheck
npm run lint
npm run test
bd update <id> --notes "Final evidence: typecheck ✓, lint ✓, test ✓"
bd close <id> --reason "Complete with verification"
bd sync
```

## Compaction Survival

When conversation is compacted, beads survives:

```
Previous session: 
- bd update bb-xyz --notes "Implemented X, need to add tests"

After compaction:
- bd show bb-xyz
- Notes say: "Implemented X, need to add tests"
- You know: Add tests
- No context lost
```

**This is the point of beads.** Memory that survives compaction.

## Multi-Agent Coordination

When multiple agents work:

```
Agent A: bd slot set gt-agent-a hook bb-xyz   # Claim
Agent A: bd update bb-xyz --status in_progress
Agent B: bd ready  # bb-xyz not shown (in_progress)
Agent A: bd close bb-xyz
Agent A: bd slot clear gt-agent-a hook       # Release
Agent B: bd ready  # Now sees newly unblocked beads
```

BD coordinates without agents communicating directly. Truth is shared.

### Agent Presence Protocol

```bash
# At session start
bd agent state gt-agent-a spawning
bd agent heartbeat gt-agent-a

# While working
bd agent state gt-agent-a working
bd agent heartbeat gt-agent-a  # Every few minutes

# When stuck
bd agent state gt-agent-a stuck

# When done
bd agent state gt-agent-a done
```

### Slot-Based Claiming

```
hook slot = exclusive work claim
role slot = agent's role definition
```

Multiple agents cannot claim same bead via slots. Coordination is automatic.

## The Promise

By using beads religiously, you promise:

1. **Truth over convenience** - BD always, even when slow
2. **Evidence over claims** - Gates always, even when "obvious"
3. **Future over present** - Document for agents you'll never meet
4. **Consistency over creativity** - Ritual ensures quality
5. **Coordination over isolation** - Slots, heartbeats, swarms

## Advanced Rituals

### Swarm Coordination

When epic has parallelizable children:
```bash
bd swarm create bb-epic     # Create swarm molecule
bd swarm status             # See parallel paths
# Dispatch agents to independent beads
bd swarm validate bb-epic   # Check structure
```

Swarm enables multi-agent parallel execution of DAG.

### Molecule Workflows

For repeatable patterns:
```bash
bd formula list             # Available templates
bd mol pour <proto>         # Persistent mol
bd mol wisp <proto>         # Ephemeral exploration
bd mol current              # Position in workflow
```

Molecules = templated workflows. Pour for commitment, wisp for exploration.

### Worktree Isolation

For parallel feature work:
```bash
bd worktree create feature-x
cd ../feature-x
# Isolated files, shared .beads
bd sync
cd ../main
bd worktree remove feature-x
```

Worktrees = isolated directories. Same truth, different files.

### Human Gates

For irreversible actions:
```bash
bd gate add --type=human "Needs security review"
# Work continues on other beads
bd gate check  # After human approval
# Gate closes, blocked bead proceeds
```

Gates = async checkpoints. Human-in-the-loop coordination.

## The Reward

Following beads discipline:

- **No lost context** - Compaction can't kill your work
- **No truth drift** - State always matches reality
- **No coordination overhead** - BD coordinates for you
- **No "what was I doing?"** - Notes tell you
- **No "does this work?"** - Gates prove it

## The Punishment

Violating beads discipline:

- **Lost context** - Compaction erases untracked work
- **Truth drift** - Code and state diverge, bugs emerge
- **Coordination chaos** - Agents duplicate or block each other
- **Memory loss** - Future you has no idea what past you did
- **Unproven claims** - "Works" becomes "broken in production"

## The Bottom Line

**Beads is your source of truth.**

Not "a tool for tracking". IS the tracking. IS the work state. IS the memory. IS the coordination.

**Linus-level mastery requires:**
- `bd prime` for context
- `bb agent reserve/release` for scope claiming (this project)
- `bb agent status --agent <id>` for passive presence (this project)
- `bd swarm` for parallelization
- `bd gate` for checkpoints
- `bd mol` for workflows
- `bd worktree` for isolation
- `bd query` for analysis

**Key distinction:**
- `bb agent` = project coordination via tools/bb.ts (passive lease, reservations)
- `bd agent` = agent beads in bd issues (for agent-labeled beads)

Treat it with the respect truth deserves.

```
BD = Truth
Gates = Proof
Notes = Memory
Sync = Survival
Reservations = Locks
Passive Lease = Presence
Swarm = Parallel
Gates = Checkpoints
```