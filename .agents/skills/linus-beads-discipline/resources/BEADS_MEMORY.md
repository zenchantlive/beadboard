# Beads as Shared Memory

**The shared brain for all Linus-agents.**

## The Principle

```
All Linus-agents share the same beads.
Your notes are read by other agents.
Their notes inform your work.
Coordinate through truth, not messages.
```

## Every Session

### Start: READ
```bash
bd ready              # What's unblocked?
bd show <id>          # What are the details?
bd query "status=closed AND notes~=<topic>"  # What was learned before?
```

**NEVER start work without reading beads first.**

### During: WRITE
```bash
bd update <id> --notes "Progress: ...
Evidence: ...
Blockers: ...
Next: ..."
```

**Every meaningful progress = update.**

### End: SYNC
```bash
bd sync    # Share with other agents
```

**NEVER end session without syncing.**

## Handoff Protocol

### When You're Done
```bash
bd update <id> --notes "Handoff:
## Completed
- X, Y done, evidence: [gates]

## Incomplete
- Z remaining

## For Next Agent
- Gotcha: <non-obvious thing>
- Pattern: <what to follow>
- Files: <what changed>"
```

### When Picking Up Another's Work
```bash
bd show <id>          # Read their notes
bd query "id=<id>" --comments  # Read comments
# Acknowledge their work in your first update
bd update <id> --notes "Continuing from <agent>. Last state: ..."
```

## Memory That Survives Compaction

When conversation is compacted, beads survives:

```
Previous session:
- bd update bb-xyz --notes "Implemented X, need tests"

After compaction:
- bd show bb-xyz
- Notes say: "Implemented X, need tests"
- You know: Add tests
- Zero context lost
```

**This is the point. Memory that survives session boundaries.**

## Notes For Future Agents

Your notes should answer:
- **What did you learn?** (findings)
- **What did you decide?** (decisions + rationale)
- **What's incomplete?** (handoff)
- **What blocked you?** (blockers)
- **What would help next agent?** (hints)

## Cross-Agent Visibility

```bash
# See who else is working
bd query "status=in_progress"

# See what was recently closed
bd query "status=closed AND updated<1d"

# See agent activity
bd query "labels~=gt:agent"
```

## The Promise

By using beads religiously:
- **No lost context** - Compaction can't kill your work
- **No truth drift** - State always matches reality
- **No coordination overhead** - BD coordinates for you
- **No "what was I doing?"** - Notes tell you
- **No "who else is working?"** - Query tells you
