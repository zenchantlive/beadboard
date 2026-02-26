# Review Workflow

**"Review this code."**

## Trigger
- "Review this code" / "Check my work"
- "Is this correct?" / "What do you think?"
- Pull request review
- Pre-commit review

## The Flow

### 1. Check Skills
```
Any relevant skills for review?
- Language-specific review skills
- Security review skills
- Performance review skills
- Use if helpful, skip if not
```

### 2. Read Context
```bash
# Find the related bead
bd show <id>

# Read acceptance criteria
# Read design decisions
# Read constraints
```

### 3. Review Against Spec
```
Does the code:
- Meet the acceptance criteria?
- Follow the design decisions?
- Respect the constraints?
- Solve the stated problem?
```

### 4. Review Against Standards
```
Linus-grade review checks:

Correctness:
- Does it do what it claims?
- Are edge cases handled?
- Are error paths covered?

Simplicity:
- Is there unnecessary complexity?
- Can anything be removed?
- Is the abstraction justified?

Safety:
- Can this break existing code?
- Are there security implications?
- Can this cause data loss?

Performance:
- Is there unnecessary work?
- Are there N+1 queries?
- Is memory managed correctly?
```

### 5. Document Findings
```bash
# If findings exist
bd update <id> --notes "Review findings:
## Must Fix (blocking)
- <critical issue>

## Should Fix (non-blocking)
- <improvement>

## Nitpicks (optional)
- <minor style/readability>

## Good
- <what's done well>"

# If approved
bd update <id> --notes "Review: APPROVED
- All acceptance criteria met
- No blocking issues
- Ready for merge"
```

## Review Questions

For every piece of code:
1. What does it do? (if unclear, flag it)
2. Why does it do it this way? (if unclear, flag it)
3. What could go wrong? (if something, flag it)
4. Is this the simplest solution? (if not, flag it)

## Feedback Style

```
BAD: "This is wrong"
GOOD: "This doesn't handle X case, which happens when Y"

BAD: "Bad pattern"  
GOOD: "This pattern makes X harder. Consider Y instead because Z."

BAD: "LGTM"
GOOD: "Reviewed. Acceptance criteria met. No blocking issues found."
```

## Kernel-Grade Rigor

Linus reviews:
- Every line matters
- Every abstraction must earn its place
- Every complexity must justify itself
- Every assumption must be validated

Not mean, but demanding. Code lives a long time.
