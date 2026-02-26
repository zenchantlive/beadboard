# Verification Gates

**Required checks before ANY bead close. No exceptions.**

## Gate Sequence

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Typecheck  │────▶│    Lint     │────▶│    Test     │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
   0 errors            0 warnings          All pass
   0 warnings           Fix or              or skip
                      document            with reason
```

## Required Commands

### All Code Changes
```bash
npm run typecheck  # Must PASS with 0 errors
npm run lint       # Must PASS with 0 warnings (or documented exceptions)
npm run test       # Must PASS all tests
```

### UI Changes (add to above)
```bash
# Capture screenshots at all breakpoints
npm run capture:mobile   # artifacts/xxx-mobile.png
npm run capture:tablet   # artifacts/xxx-tablet.png
npm run capture:desktop  # artifacts/xxx-desktop.png
```

### API Changes (add to above)
```bash
npm run test:api    # Route integration tests
# or
node --test tests/api/
```

## Gate Failure Protocol

### Typecheck Fails
1. Fix type errors
2. Re-run typecheck
3. Only proceed when 0 errors
4. Document: "typecheck: PASS (0 errors)"

### Lint Fails
1. Fix warnings if trivial
2. If intentional violation: add eslint-disable with comment explaining WHY
3. Document in notes: "lint: PASS (0 warnings)" or "lint: PASS (1 intentional - see line 42)"
4. Never merge with unexplained lint violations

### Tests Fail
1. Analyze failure output
2. Determine: bug in code or bug in test?
3. Fix the bug (not the test to pass)
4. Re-run tests
5. Only proceed when ALL pass
6. Document: "test: PASS (47/47)"

### Flaky Tests
1. Identify flaky test
2. Options:
   - Fix flakiness (preferred)
   - Quarantine with .skip and create bead to fix
3. Never skip without tracking

## Evidence Format

### In Bead Notes
```bash
bd update bb-xyz --notes "Verification:
- typecheck: PASS (0 errors, 0 warnings)
- lint: PASS (0 warnings)
- test: PASS (47/47 tests in 2.3s)
- UI screenshots: artifacts/kanban-390.png, artifacts/kanban-768.png, artifacts/kanban-1440.png"
```

### In Close Reason
```bash
bd close bb-xyz --reason "Implemented X with full gate coverage. All tests passing. Screenshots captured."
```

## Gate Checklist

```
□ npm run typecheck → PASS (cite output)
□ npm run lint → PASS (cite output)
□ npm run test → PASS (cite output)
□ UI changed? → Screenshots captured (list paths)
□ API changed? → Route tests pass
□ New file? → Included in test suite
□ Notes updated? → Evidence cited
```

**Any unchecked? Don't close. Keep working.**

## Special Cases

### "No Tests Exist Yet"
1. Create tests for new code
2. Run existing test suite to ensure no regressions
3. Document: "test: PASS (existing suite), NEW: added tests for X"

### "Tests Are Slow"
1. Run them anyway
2. Consider: parallelize, optimize, cache
3. Never skip for speed

### "CI Will Catch It"
1. Run locally first
2. CI is backup, not replacement
3. Local failures = faster feedback

### "Just Documentation Change"
1. Still run typecheck (links, imports)
2. Still run lint (formatting)
3. Test may not be needed - document why skipped

## Post-Close Verification

After `bd close`:
```bash
bd show <id>  # Verify status is closed
bd ready      # Confirm it's not still showing as ready
```

If still shows as ready after close: `bd sync` then re-check.