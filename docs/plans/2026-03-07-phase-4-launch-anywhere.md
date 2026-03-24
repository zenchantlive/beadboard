# Phase 4 - Multi-Surface Launch-Anywhere UX

**Status:** Planning
**Created:** 2026-03-07
**Goal:** Add spawn affordances to all UI surfaces so users can launch agents from anywhere

---

## Current Surfaces

| Surface | Location | Purpose |
|---------|----------|---------|
| Social cards | `src/components/social/` | Show beads with status, labels, assignments |
| Graph nodes | `src/components/graph/` | Show beads in dependency graph |
| Right panel | `src/components/shared/right-panel.tsx` | Contextual details when bead selected |
| Agent status panel | `src/components/agents/agent-status-panel.tsx` | Show active agents (already has spawn in orchestrator) |

---

## Discovery Tasks

### Task 1: Analyze Social Card Components
- Find all social card components
- Identify current actions/buttons
- Determine where spawn button fits
- Document available context (beadId, status, assignee, labels)

### Task 2: Analyze Graph Node Components
- Find all graph node components
- Identify current interactions
- Determine where spawn button fits
- Document available context

### Task 3: Analyze Right Panel
- Find contextual details components
- Identify where spawn makes sense
- Document available context

---

## Implementation Plan

### Step 1: Create Spawn Button Component
Create reusable spawn button that:
- Accepts beadId and context
- Shows agent type selector dropdown
- Calls orchestrator to spawn agent
- Shows loading state
- Links to Agent Status panel

**File:** `src/components/shared/spawn-agent-button.tsx`

### Step 2: Add to Social Cards
- Add spawn button to social card
- Pass beadId from card data
- Show when status is "open" or "in_progress" with no assignee

**Files:** `src/components/social/social-card.tsx`

### Step 3: Add to Graph Nodes
- Add spawn button to graph node context menu or hover
- Pass beadId from node data
- Show for unassigned beads

**Files:** `src/components/graph/graph-view.tsx`, node components

### Step 4: Add to Right Panel
- Add spawn section when viewing bead details
- Show spawn options for task/epic beads

**Files:** `src/components/shared/right-panel.tsx`

### Step 5: Wire Spawn Actions to Orchestrator
- Create API endpoint or event for spawn requests from UI
- Orchestrator receives spawn request and executes
- Update agent status panel

**Files:** `src/app/api/runtime/spawn/route.ts` or extend existing

---

## UI/UX Considerations

### Spawn Button Placement
- **Social card:** Bottom of card, next to status badge
- **Graph node:** Context menu on right-click, or hover tooltip
- **Right panel:** New section above details, when bead is unassigned

### Spawn Flow
1. User clicks "Spawn Agent" button
2. Dropdown shows agent types (Engineer, Reviewer, etc.)
3. User selects type or "Auto" (let orchestrator decide)
4. Button shows spawning state
5. Agent appears in status panel
6. Button changes to "View Agent" link

### Context Packaging
When spawning from a surface, package:
- beadId
- bead title/description
- bead status
- current assignee (if any)
- relevant labels

---

## Blocked Items

None identified yet.

---

## Success Criteria

- [ ] Spawn button appears on social cards for unassigned beads
- [ ] Spawn option available on graph nodes
- [ ] Right panel shows spawn section for task details
- [ ] Spawning from any surface creates bead and agent
- [ ] Agent status panel updates with new agent
- [ ] User can continue chatting with orchestrator while agent works

---

## Estimated Effort

4-6 hours

---

## Next Steps

1. ✅ Create plan document
2. 🔲 Run discovery on social card components
3. 🔲 Run discovery on graph node components
4. 🔲 Run discovery on right panel components
5. 🔲 Create spawn button component
6. 🔲 Integrate into surfaces
