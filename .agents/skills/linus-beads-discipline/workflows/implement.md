# Implement Workflow

**"I need to write code."**

## Trigger
- "Implement X"
- "Write code for..."
- "Build this feature"
- "Add support for..."

## The Flow

### 1. Check Skills
```
Any relevant skills for implementation?
- Language/framework skills
- Testing skills
- Code generation skills
- Use if helpful, skip if not
```

### 2. Read Context
```bash
# Find or claim the bead
bd ready
bd show <id>

# Read design decisions
bd query "labels~=design AND title~=<feature>"

# Read related closed beads for patterns
bd query "status=closed AND labels~=<area>"
```

### 3. Claim the Work
```bash
bd update <id> --status in_progress --notes "Plan:
1. <step 1>
2. <step 2>
...
Acceptance: <from bead>"
```

### 4. Test-First Implementation
```
For each piece of behavior:
1. Write failing test
2. Run test, capture failure
3. Implement minimal code to pass
4. Run test, verify pass
5. Refactor if needed
```

### 5. Update Progress
```bash
# After each meaningful progress
bd update <id> --notes "Progress:
- <X> complete, evidence: <test name>
- <Y> in progress
- <Z> blocked by: <blocker>"
```

### 6. Verify Gates
```bash
npm run typecheck && npm run lint && npm run test
```

All must pass before closing.

### 7. Close with Evidence
```bash
bd update <id> --notes "Evidence:
- typecheck: PASS
- lint: PASS  
- test: PASS (N/N)
- Files changed: <list>
- Coverage: <if relevant>"

bd close <id> --reason "Implemented with verification"
bd sync
```

## Implementation Principles

### Small Steps
```
One behavior at a time.
One file at a time when possible.
Commit after each working state.
```

### No Speculation
```
Don't build for imagined future.
Build for current concrete need.
If future need arises, extend then.
```

### Evidence Every Claim
```
"I added X" → Which test proves it?
"I fixed Y" → Which test was failing?
"It works" → Show the output.
```

## Blocked?

```bash
bd update <id> --notes "BLOCKED: <what>
Reason: <why>
Needs: <what would unblock>
Next agent: <handoff notes>"

# If creating a blocker bead
bd create "<blocker description>" --type task
bd dep add <current-id> <blocker-id>
```

## Multi-Agent Implementation

If another agent might continue:

```bash
bd update <id> --notes "Handoff:
## Completed
- X, Y, Z done

## In Progress  
- A partially done (see file:line)

## Remaining
- B, C still needed

## Gotchas
- <non-obvious things learned>
- <patterns to follow>"
```

## The Gates Are Non-Negotiable

Never close without:
- `npm run typecheck` → PASS
- `npm run lint` → PASS  
- `npm run test` → PASS

No exceptions. No "just this once". No "it's obvious".
