# Next Session: Investigate Frontend/Dolt Data Mismatch

## Critical Unresolved Issue

The frontend is showing STALE data that doesn't match Dolt. We could NOT figure out the root cause.

### Symptoms:
1. **bb-u6f.7** shows as OPEN in frontend left sidebar, but is CLOSED in Dolt
2. **beadboard-2e6** and **beadboard-6cc** (brainstorming epics) don't appear in frontend, but exist in Dolt as OPEN
3. Memory-anchor epics ARE correctly filtered out (this works)
4. Frontend loads without Dolt connection errors

### What We Verified:
- Dolt IS running (bd dolt status shows PID 77304, port 3307)
- Dolt has CORRECT data (direct MySQL queries confirmed bb-u6f.7=status:closed, beadboard-2e6=status:open)
- issues.jsonl has WRONG data (bb-u6f.7=status:open, issue_type=task - both wrong!)
- No errors in console or Dolt logs

### What We Tried (ALL FAILED):
1. Added memory-anchor filter to left-panel.tsx line 73 - worked for filtering memory, but didn't fix stale data
2. Removed issues.jsonl fallback in read-issues.ts - didn't change anything
3. Cleared .next cache and restarted dev server - didn't change anything
4. Restarted Dolt server - didn't change anything
5. Multiple browser hard refreshes - didn't change anything

### What I Thought Was The Cause (WRONG):
1. ~~Dolt server not running~~ - it WAS running
2. ~~Frontend falling back to issues.jsonl~~ - removed fallback, same result
3. ~~Next.js build cache~~ - cleared, same result
4. ~~LeftPanel filter hiding epics~~ - verified filter logic is correct
5. ~~Dolt connection failing silently~~ - but no error means Dolt IS connecting

### Files Modified This Session:
- `src/components/shared/left-panel.tsx` - added memory-anchor filter (line 73)
- `src/lib/read-issues.ts` - removed issues.jsonl fallback (Dolt-only now)

### Files To Read To Understand What Happened:
1. `src/lib/read-issues.ts` - Dolt-only read path
2. `src/lib/read-issues-dolt.ts` - Dolt query logic
3. `src/lib/aggregate-read.ts` - calls readIssuesFromDisk
4. `src/app/page.tsx` - SSR entry point
5. `src/components/shared/left-panel.tsx` - epic display logic
6. `.beads/dolt-server.log` - connection logs (no errors found)

### Key Questions For Next Session:
1. Why does the frontend show different data than Dolt when Dolt is clearly accessible?
2. Is there another caching layer we're missing?
3. Is there something in the Next.js SSR that's caching data?
4. Could there be a second Dolt instance or database being read?

---

## What Was Accomplished This Session:

### Completed Earlier:
1. Fixed BlockedTriageModal CSS theme variables
2. Fixed agent names displaying as bead IDs (extract human-readable names)
3. Fixed blocked count to include derived blockers
4. Created memory node beadboard-6iq (Extract human-readable names)
5. Closed old bb-* epics (they were from old architecture)
6. Created beadboard-1bg epic for skill v4 rewrite (closed - all tasks done)
7. Created beadboard-n1h epic for quality gates
8. Created beadboard-jq5 epic for project scope UI (closed)
9. Created beadboard-2e6 epic for UX critique brainstorming

### Memory Nodes Created:
- beadboard-6iq - [MEMORY][UI][HARD] Extract human-readable names from raw data fields
- beadboard-dc0 - [MEMORY][ARCH][SOFT] Skill structure pattern

### Skills Used This Session:
1. `systematic-debugging` - followed the debugging process but couldn't find root cause
2. `beadboard-driver` - used bd commands throughout
3. `verification-before-completion` - ran gates before closing beads

---

## Ready Work (from bd ready):

- `beadboard-n1h.1` - Unit Tests: Core Libraries
- `beadboard-n1h.2` - API Integration Tests
- `beadboard-2e6` - [BRAINSTORM] UX Continuity and Critique (needs brainstorming skill)
- Other quality/testing tasks

---

## Non-Negotiable Context:

1. Run `bd` commands from `codex/beadboard` directory
2. `bd` is source of truth - no direct JSONL writes
3. Evidence before assertions - always cite command output
4. Read hard memory first: `bd show beadboard-116 beadboard-60a beadboard-zas`

## First 10 Minutes:

```bash
cd /mnt/c/Users/Zenchant/codex/beadboard

# 1) Read hard memory
bd show beadboard-116 beadboard-60a beadboard-zas beadboard-6fv

# 2) Check current state
bd query "status=closed" --sort closed --reverse --limit 10
bd ready

# 3) Check Dolt status
bd dolt status

# 4) Verify data consistency
# Compare Dolt vs frontend for a known-closed epic
bd show bb-u6f.7
# Then check what frontend shows
```

