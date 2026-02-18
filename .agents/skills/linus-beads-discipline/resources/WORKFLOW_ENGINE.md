# Workflow Engine

**The decision brain. Shared across all modes.**

## Mode Detection

When user engages, detect the mode from intent:

| User Intent | Mode | First Action |
|-------------|------|--------------|
| "What's going on?" / "What should I do?" | TRIAGE | `bd ready` |
| "Something is broken" / "Fix this bug" | DEBUG | `bd show` on related bead |
| "I need to understand..." / "How does X work?" | RESEARCH | Read code, update bead |
| "I want to design..." / "Architecture for..." | DESIGN | First-principles analysis |
| "Implement X" / "Write code for..." | IMPLEMENT | Claim bead, TDD |
| "Review this code" / "Check my work" | REVIEW | Read code against spec |
| "Simplify this" / "Clean up..." | REFACTOR | Identify debt, plan |
| "Plan the project" / "Roadmap" | PLAN | Decompose, create beads |

**If unclear, ASK the user which mode.**

## The Universal Loop

Every mode follows this pattern:

```
1. READ BEADS (what's the current truth?)
   └─ bd ready / bd show / bd query
   
2. CHECK SKILLS (any relevant helpers?)
   └─ Look for skills that match the task type
   └─ Use if found, proceed without if not
   
3. DO WORK (mode-specific)
   └─ See workflow/<mode>.md for specifics
   
4. WRITE BEADS (update the shared memory)
   └─ bd update --notes / bd close / bd create
   
5. VERIFY (prove claims)
   └─ Run gates appropriate to the mode
```

## Beads-as-Memory Principles

### Every Session Starts With Reading

```
NEVER start work without:
1. bd ready          # What's unblocked?
2. bd show <id>      # What are the details?
3. Read related closed beads for context
```

### Every Session Ends With Writing

```
NEVER end session without:
1. bd update --notes "Progress: ... Evidence: ..."
2. bd sync           # Share with other agents
```

### Every Decision Is Recorded

```
When you decide something:
- Create a bead for it (if significant)
- Update existing bead notes (if related)
- Cross-reference in comments
```

### Other Agents Depend On Your Notes

```
Your notes should answer:
- What did you learn?
- What did you decide?
- What did you leave incomplete?
- What blocked you?
- What would help the next agent?
```

## The bb/bd Split

### If bb is available:
```
- Use bb agent for scope reservations
- Use bb agent for messaging other agents
- Passive activity: any bb command extends lease
```

### If bb is NOT available:
```
- Use bd slot for exclusive claims
- Use bd agent heartbeat for presence
- Skip messaging (no equivalent)
- Skip path reservations (no equivalent)
```

### Always available:
```
- bd commands (core truth)
- Verification gates
- First-principles thinking
```

## Cross-Agent Coordination

Since all agents share the same Linus personality and beads memory:

### Before Claiming Work:
```
bd ready                    # See what's available
bd show <id>                # Check if already in_progress
bd query "status=in_progress"  # Who else is working?
```

### When Claiming:
```
bd update <id> --status in_progress --notes "@<agent-id> claiming"
# Optionally: bd slot set <agent> hook <id>
# Optionally: bb agent reserve (if available)
```

### When Handing Off:
```
bd update <id> --notes "Handoff to next agent: ..."
bd update <id> --status open  # Or appropriate status
# Optionally: bb agent send (if available)
```

### When Picking Up Another's Work:
```
bd show <id>                # Read their notes carefully
bd query "id=<id>" --comments  # Read any comments
Acknowledge previous work in your first update
```

## Skill Integration Pattern

At the start of any workflow:

```
1. Identify the task type
2. Check available skills for relevant helpers
3. If found and useful: invoke the skill
4. If not found: proceed with Linus discipline alone
5. Never hardcode specific skill dependencies
```

This keeps workflows flexible and skill-agnostic.

## Evidence Thresholds By Mode

| Mode | Minimum Evidence |
|------|------------------|
| TRIAGE | Bead status updated |
| RESEARCH | Notes with findings |
| DEBUG | Root cause identified + fix + test |
| DESIGN | Decision documented + rationale |
| IMPLEMENT | typecheck ✓ lint ✓ test ✓ |
| REVIEW | Findings documented |
| REFACTOR | typecheck ✓ lint ✓ test ✓ |
| PLAN | Beads created with dependencies |

## The Iron Laws Apply Everywhere

No mode exempts you from:

1. **BD is source of truth** - Never direct JSONL writes
2. **Evidence before assertions** - Never claim without proof
3. **First principles** - Never stop at "best practice"

## Mode Transitions

Sometimes you need to switch modes mid-work:

```
TRIAGE → IMPLEMENT  : "I know what to do, now doing it"
DEBUG → RESEARCH    : "Need to understand before fixing"
RESEARCH → DESIGN   : "Now I understand, time to architect"
DESIGN → IMPLEMENT  : "Architecture done, now build"
ANY → TRIAGE        : "Lost, need to reassess"
```

On transition:
1. Update current bead notes with mode change
2. Read relevant workflow for new mode
3. Continue with fresh eyes
