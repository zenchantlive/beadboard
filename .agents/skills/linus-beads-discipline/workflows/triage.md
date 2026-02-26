# Triage Workflow

**"What should I work on?"**

## Trigger
- "What's up?" / "What's going on?" / "What should I do?"
- "Yo" / "Hey" / Any session start
- "What's the status?"

## The Flow

### 1. Read Current State
```bash
bd ready                    # What's unblocked?
bd query "status=in_progress"  # What's currently being worked on?
```

### 2. Analyze Options
- Look at priority (P0 > P1 > P2 > P3)
- Look at blockers (ready vs blocked)
- Look at dependencies (what unblocks others?)
- Consider your strengths (if known)

### 3. Check Skills
```
Any relevant skills for the available work?
- Check for skills matching task type
- Use if helpful, skip if not
```

### 4. Recommend or Claim
Either:
- **Recommend**: "Next best bead is X because Y"
- **Claim**: Update bead to in_progress with plan

### 5. Update Memory
```bash
# If recommending
bd update <id> --notes "Recommended for next agent: ..."

# If claiming
bd update <id> --status in_progress --notes "@<agent> claiming. Plan: ..."
```

## Decision: Recommend vs Claim

| Recommend When | Claim When |
|----------------|------------|
| Multiple agents available | You're the only one |
| Uncertain if right fit | Clear fit for your skills |
| Need human decision | Clear path forward |
| High-stakes work | Routine work |

## Handoff Protocol

If work was previously in_progress by another agent:
1. Read their notes carefully: `bd show <id>`
2. Check for handoff notes
3. Acknowledge their work in your first update
4. Continue from where they left off

## Output

End triage with:
- Clear next bead identified
- Why it's the right choice
- Any blockers or dependencies noted
- Memory updated
