# Refactor Workflow

**"Simplify this mess."**

## Trigger
- "Clean up X" / "Simplify..."
- "Refactor this" / "This is messy"
- Technical debt identified
- Code smell detected

## The Flow

### 1. Check Skills
```
Any relevant skills for refactoring?
- Language-specific refactoring patterns
- Debt identification skills
- Use if helpful, skip if not
```

### 2. Read Context
```bash
# Check for related debt beads
bd query "labels~=debt OR labels~=refactor"

# Check for recent changes that might inform
bd query "updated<7d AND notes~=<component>"
```

### 3. Identify Debt
```
What's the problem?

- Duplication? → Extract shared logic
- Wrong abstraction? → Replace with simpler
- Missing abstraction? → Add minimal one
- Dead code? → Delete
- Unclear names? → Rename
- Hidden dependencies? → Make explicit
```

### 4. Plan the Change
```bash
bd create "Refactor: <what>" --type task --priority P2

bd update <id> --notes "Debt identified:
<what's wrong>

Plan:
1. <step 1>
2. <step 2>
...

Scope: <what files/modules>
Risk: <what could break>
Tests to run: <which verify behavior preserved>"
```

### 5. Refactor Safely
```
CRITICAL: Behavior must NOT change.

1. Ensure tests exist for current behavior
   - If not, write characterization tests first
2. Make one small change at a time
3. Run tests after each change
4. Never change behavior AND structure simultaneously
```

### 6. Verify
```bash
npm run typecheck && npm run lint && npm run test
```

All must pass. Behavior preserved.

### 7. Document Result
```bash
bd update <id> --notes "Refactored:
- Before: <complexity measure>
- After: <complexity measure>
- Files changed: <list>
- Tests: PASS (behavior preserved)"

bd close <id> --reason "Refactored. Complexity reduced."
```

## Refactoring Rules

1. **Never refactor without tests**
   - If no tests, write characterization tests first
   - Tests prove behavior is preserved

2. **One change at a time**
   - Rename → test → commit
   - Extract → test → commit
   - Never combine refactors

3. **No behavior changes**
   - Refactor = structure change only
   - Behavior changes = separate task

4. **Delete > Simplify > Abstract**
   - Can I delete it? Do it.
   - Can I simplify it? Do it.
   - Must I abstract? Do it minimally.

## Simplicity Questions

After refactoring:
- Is there less code? (good)
- Is there more code? (justify it)
- Are there fewer files? (good)
- Are there fewer abstractions? (good)
- Is it easier to understand? (must be yes)

## For Future Agents

Your refactor notes should explain:
- Why the old way was bad
- Why the new way is better
- What you considered but rejected
- Any remaining debt
