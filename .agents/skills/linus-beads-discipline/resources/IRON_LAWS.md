# Iron Laws

**Non-negotiable. Violating letter = violating spirit. No "I followed spirit" escape hatch.**

## Law 1: BD is Source of Truth

```
NEVER write to .beads/issues.jsonl directly
NEVER skip bd commands for "speed"
NEVER claim bead state without bd show output
```

**Religious discipline:** Beads is not overhead. It IS the work tracking. Bypassing it bypasses truth.

### Violation Recovery
1. Stop immediately
2. Delete any direct changes to `.beads/issues.jsonl`
3. Run `bd sync` to restore truth
4. Re-apply changes via `bd update` commands
5. Document in bead notes: "Corrected from direct-write violation"

## Law 2: Evidence Before Assertions

```
NEVER claim: "done", "passing", "fixed", "closed"
WITHOUT fresh command output proving it
```

**The ritual:** Before closing ANY bead:
```bash
npm run typecheck
npm run lint  
npm run test
```

If UI changed: capture screenshots, record artifact paths.

### Required Evidence Types

| Change Type | Required Evidence |
|-------------|-------------------|
| Code change | typecheck + lint + test output |
| UI change | Screenshots at all breakpoints |
| API change | Route test output |
| Bug fix | Test demonstrating fix |
| Refactor | All tests still pass |

### Evidence Format in Notes
```
bd update bb-xyz --notes "npm run typecheck: PASS. npm run lint: PASS. npm run test: 47/47 passing. Screenshot: artifacts/fix-mobile-390.png"
```

## Law 3: First Principles Every Decision

Ask "why?" until you hit:
- **Physics**: Performance measurements, not assumptions
- **Economics**: Actual resource constraints, not hypotheticals
- **Requirements**: Stated acceptance criteria from bd show
- **Data Model**: bd schema semantics

Stop at "best practice" or "everyone does it"? **You haven't reached first principles.**

### First-Principles Questions

| Decision | First-Principles Questions |
|----------|---------------------------|
| Add feature | What user problem does this solve? What evidence exists for need? |
| Add abstraction | What concrete current use case requires this? What cost does it add? |
| Choose tech | Does this solve our actual problem better than simpler alternatives? |
| Optimize | Where is the bottleneck measured? What's the target? |

## No Exceptions Clause

```
"Not a simple case" → Run gates anyway
"Just this once" → No, not once
"I already tested" → Run gates anyway
"Time pressure" → Run gates anyway
"Everyone does it" → First-principles analysis required
```

**All rationalizations are addressed in [RATIONALIZATION_TABLE.md](RATIONALIZATION_TABLE.md).**

## Violation Consequence Protocol

1. **First violation**: Stop, correct, document in notes
2. **Second violation in same session**: Delete all changes, start bead from scratch
3. **Pattern of violations**: Bead should be closed and re-created with explicit "do not violate" in acceptance criteria

**Delete means delete. Don't keep as "reference". Don't "adapt" it. Delete.**