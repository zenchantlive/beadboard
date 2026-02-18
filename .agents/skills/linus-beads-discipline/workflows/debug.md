# Debug Workflow

**"Something is broken."**

## Trigger
- "Fix this bug" / "Something's broken"
- "This doesn't work" / "Error in..."
- Test failure / Unexpected behavior

## The Flow

### 1. Check Skills
```
Any relevant skills for debugging?
- Error pattern recognition skills
- System-specific diagnostic skills
- Use if helpful, skip if not
```

### 2. Read Context
```bash
# Find related bead (if exists)
bd query "title~=<error-keyword> OR labels~=<component>"

# Check recent changes
bd query "updated<1d AND status=closed"

# Read related bead details
bd show <related-id>
```

### 3. Reproduce & Isolate
```
First question: Can I reproduce this?

If YES:
- Isolate the minimal reproduction
- Identify the exact failure point
- Gather evidence (logs, stack traces)

If NO:
- Add logging/observability
- Create hypothesis
- Design experiment to confirm
```

### 4. Root Cause Analysis
Ask "Why?" at least 3 times:
```
Symptom: Test fails
Why 1: Function returns wrong value
Why 2: Input is malformed
Why 3: Upstream normalization missing
ROOT CAUSE: Missing normalization in caller
```

**Fix the DESIGN, not just the symptom.**

### 5. Fix Implementation
```
1. Write failing test that exposes the bug
2. Implement minimal fix
3. Verify test passes
4. Check for similar bugs elsewhere (same pattern)
```

### 6. Update Memory
```bash
# Find or create bug bead
bd create "Fix: <description>" --type bug --priority P1

# Document root cause
bd update <id> --notes "Root cause: ...
Why this was possible: ...
Fix: ...
Evidence: test added, gates pass"

# Close with evidence
bd close <id> --reason "Fixed. Root cause: X. Prevention: Y."
```

### 7. Verify
```bash
npm run typecheck && npm run lint && npm run test
```

## The Debug Questions

1. What is the symptom?
2. Can I reproduce it?
3. Where does it fail?
4. Why does it fail there?
5. Why was this possible? (design flaw)
6. Does the same flaw exist elsewhere?

## Prevention Mindset

Linus doesn't just fix bugs. Linus eliminates bug CLASSES.

After every fix, ask:
- What design flaw allowed this?
- How do I prevent the entire class?
- Is there a pattern to search for?

Update bead with prevention notes for future reference.
