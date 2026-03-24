# Session Notes: Assign Archetypes to Tasks - UI System

## Executive Summary
Implemented a complete UI system for assigning agent archetypes to tasks
via both graph nodes and sidebar panel.

## Collaboration Journey

### 1. Initial Discovery (User Question: "What did we do so far?")
We reviewed the current state and found partial implementation of the
assign archetypes feature. The epic had 4 child tasks:
- beadboard-yo5: Pass labels to graph nodes ✓
- beadboard-brq: Add Assign button/dropdown ✓
- beadboard-7r7: Visual indicators (partial)
- beadboard-b7t: Enhance AssignmentPanel (not started)

### 2. Bug Discovery: Unassign Not Working
User reported: "I see 'unassigned <archetype>' but it's still showing as a tag"

**Root Cause**: DELETE API existed but frontend was calling POST for unassign.

**Fix**: Changed handleUnassignAgent to use method: 'DELETE'

**Deeper Issue**: Even with correct API, UI didn't update because props
don't change after client-side API calls.

**Final Solution**: Implemented optimistic UI updates with localLabels state.

### 3. Missing Epic Filtering
User feedback: "needs agent area should be filtered to selected epic"

We had correctly implemented epic filtering for Squad Roster but forgot
to apply it to Needs Agent and Pre-assigned sections.

### 4. Honest Mistakes Made
1. Initially used POST for unassign instead of DELETE
2. Forgot epicId filter on new sections (caught by user)
3. First implementation didn't consider optimistic updates

## Technical Decisions

### Why Optimistic Updates?
- Instant feedback for better UX
- Rollback on error preserves data integrity
- Avoids full page refresh or complex re-fetch patterns

### Why useGraphAnalysis Hook?
- Single source of truth for "actionable" definition
- Reused across SmartDag and AssignmentPanel
- Ensures consistency: a task is actionable everywhere or nowhere

### Label Format: `agent:<archetypeId>`
- Simple string format
- Easy to parse and filter
- Works with existing bd label commands

## Files Changed (Summary)
- graph-node-card.tsx: Assign UI + optimistic updates
- assignment-panel.tsx: Three-section sidebar
- workflow-graph.tsx: Pass labels to nodes
- smart-dag.tsx: Main view with assign mode
- unified-shell.tsx: Wire up sidebar panel
- use-graph-analysis.ts: Shared analysis logic
- API route: Added DELETE handler

## Beads Closed
- beadboard-yo5 ✓
- beadboard-brq ✓
- beadboard-7r7 ✓
- beadboard-b7t ✓
- beadboard-lgi (Epic) ✓

## Test Coverage
- 6 tests for graph node assign
- 5 tests for assignment panel sections
- 4 tests for graph node labels
- 12 tests for SmartDag
- 6 tests for useGraphAnalysis
- 9 tests for UnifiedShell

## What's Next
From `bd ready`:
- beadboard-58u (P3): DependencyFlowStrip
- bb-18e.1 (P2): Cycle warning card
- bb-18e.2 (P1): Plain-English edge labels

## Post-Session Bug Fix

### SSE Overwrite Bug
User discovered: "An archetype can only exist on one task at a time - when
I try to make the next task have the same arch, it deleted the one I added."

### Root Cause
The SSE subscription refreshes data whenever any change happens. This
created a race condition:
1. User assigns archetype -> optimistic update
2. SSE fires -> fetches server data (without new label yet)
3. useEffect overwrites localLabels with stale server data
4. Label disappears

### Solution
Track pending optimistic labels in useRef Set, merge with server data
during sync. This prevents SSE overwrites of in-flight operations.

### Test Coverage
Added 10 new tests in graph-node-labels-optimistic.test.tsx to ensure
this bug doesn't regress.

### Commit
bd3b3da - fix(graph): prevent SSE overwrites of optimistic label updates
