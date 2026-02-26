# Decision Frameworks

**Systematic approaches for common engineering decisions.**

## When to Add Abstraction

```
                        Current concrete use case exists?
                                   │
                    ┌──────────────┴──────────────┐
                   YES                            NO
                    │                              │
                    ▼                              ▼
         Does abstraction simplify                REJECT
         THIS case (not future cases)?           (YAGNI)
                    │
         ┌──────────┴──────────┐
        YES                    NO
         │                      │
         ▼                      ▼
    CONSIDER                  REJECT
    (proceed to               (add when
     cost analysis)            need proven)
```

### Abstraction Cost Analysis

| Cost | Question | Reject If |
|------|----------|-----------|
| Maintenance | Will someone need to understand this in 5 years? | Complexity > benefit |
| Debugging | Does indirection make tracing harder? | Yes, and no tooling helps |
| Performance | Does abstraction add measurable overhead? | Yes, and no mitigation |
| Cognitive | Does developer need to learn 2+ concepts? | Learning cost > simplicity gain |

### Valid Abstraction Reasons

- ✅ Multiple current consumers with same interface need
- ✅ Complex logic needs isolation for testability
- ✅ Performance optimization that benefits multiple paths
- ✅ Platform boundary (not just "flexibility")

### Invalid Abstraction Reasons

- ❌ "Might need it later"
- ❌ "More professional/extensible"
- ❌ "Follows design pattern X"
- ❌ "Team standard" (without concrete need)

## When to Close a Bead

```
                           All gates pass?
                                │
                     ┌──────────┴──────────┐
                   YES                      NO
                    │                        │
                    ▼                        ▼
            Evidence cited?            Fix failures
                    │                   then re-check
         ┌──────────┴──────────┐
       YES                      NO
        │                        │
        ▼                        ▼
   Notes updated?           Cite evidence
        │                    in notes
  ┌─────┴─────┐
 YES         NO
  │            │
  ▼            ▼
CLOSE       Update notes
            then close
```

### Close Checklist

```
□ npm run typecheck → PASS (output cited)
□ npm run lint → PASS (output cited)
□ npm run test → PASS (output cited)
□ UI changed? → Screenshots captured, paths noted
□ Notes? → All progress documented
□ Evidence? → Commands + results cited
□ Dependencies? → Confirm blockers still resolved
```

### Close Command Template
```bash
bd update <id> --notes "Evidence:
- typecheck: PASS (0 errors)
- lint: PASS (0 warnings)
- test: PASS (N/N tests)
- [UI: screenshots at artifacts/...]"

bd close <id> --reason "Completed with full verification. [Brief summary of what was done.]"
```

## When to Fix Bug vs Patch Symptom

```
                         Bug found
                             │
                             ▼
                    Why was this bug possible?
                             │
              ┌──────────────┴──────────────┐
         Design flaw                    Isolated mistake
              │                              │
              ▼                              ▼
    Fix design, eliminate           Patch this instance
    entire bug class                + add test
              │                              │
              ▼                              ▼
    Example: Input validation      Example: Typo in
    missing at boundary            variable name
    → Add validation at entry      → Fix typo
    → Bug class eliminated         → Add spellcheck
```

### Bug Class Analysis

| Symptom | Look For | Fix At |
|---------|----------|--------|
| Null pointer | Missing validation at boundaries | Entry point validation |
| Race condition | Shared mutable state without synchronization | Data structure design |
| Off-by-one | Boundary condition pattern | Abstraction for iteration |
| Type mismatch | Weak typing at interfaces | TypeScript strict mode |
| Memory leak | Ownership unclear | RAII / ownership model |

### Linus's Approach

1. **Trace to root cause** - Not just "where it crashed"
2. **Ask "why was this possible?"** - What enabled this bug class?
3. **Fix design if needed** - Better to eliminate bug class than patch instances
4. **Add regression test** - Ensure class can't return

## When to Refactor

```
                    Pain point exists?
                          │
               ┌──────────┴──────────┐
             YES                      NO
               │                        │
               ▼                        ▼
        Pain quantified?           Don't refactor
               │                    (premature)
    ┌──────────┴──────────┐
  YES                      NO
   │                        │
   ▼                        ▼
Benefit > cost?         Quantify first
   │                    (measure pain)
  ┌─┴─┐
YES   NO
 │     │
 ▼     ▼
Refactor  Don't refactor
 now      (track as bead)
```

### Refactor Quantification

| Pain | Measurement | Threshold |
|------|-------------|-----------|
| Slow | Profile, ms | >100ms hot path |
| Confusing | PR comments, questions | >3 questions/month |
| Bug-prone | Bug count in area | >2 bugs/quarter |
| Slow to change | Time to add feature | >2x expected |

### Refactor Rules

- ✅ Have test coverage first
- ✅ Measure before and after
- ✅ One vertical slice at a time
- ❌ Don't refactor "while here" without tracking
- ❌ Don't refactor for style without measurable benefit

## When to Create Bead

```
                 Work identified
                      │
                      ▼
            Will it take >30 min?
                      │
           ┌──────────┴──────────┐
          YES                    NO
           │                      │
           ▼                      ▼
    Has dependencies?         Just do it
           │                  (no bead needed)
    ┌──────┴──────┐
   YES            NO
    │              │
    ▼              ▼
Create bead    Create bead
with deps      (simple task)
```

### Bead Worth Creating If

- Spans sessions / needs compaction survival
- Has dependencies / blockers
- Complex acceptance criteria
- Needs collaboration
- Risk of context loss

### No Bead Needed If

- <30 minutes single session
- No dependencies
- Clear immediate action
- Will complete in this session

## When to Parallelize

```
            Multiple independent tasks?
                      │
           ┌──────────┴──────────┐
          YES                    NO
           │                      │
           ▼                      ▼
    Shared state needed?      Execute sequentially
           │
    ┌──────┴──────┐
   YES            NO
    │              │
    ▼              ▼
Sequential    PARALLELIZE
(avoid races)    via subagents
```

### Parallelization Rules

- ✅ No shared state between tasks
- ✅ No read-after-write dependencies
- ✅ Each task owns distinct files
- ❌ Don't parallelize if tasks modify same files
- ❌ Don't parallelize if order matters for correctness