# Phase 5 - Agent Presence in Social/Graph Views

**Status:** Planning
**Created:** 2026-03-07
**Goal:** Show active agents in social cards, graph nodes, and make agent activity visible across the UI

---

## Current State

- Agent status panel exists in right panel (for epic/swarm context)
- Agents have display names (Engineer 01, etc.)
- Agent instances tracked in `.beads/agents.jsonl`
- No visibility in main social/graph views

---

## Implementation Plan

### Step 1: Agent Badge on Social Cards
When a bead has an active agent assigned, show:
- Agent icon/avatar
- Display name (Engineer 01)
- Status indicator (working, blocked, etc.)

**Files:**
- `src/components/social/social-card.tsx` - add agent badge
- `src/lib/types.ts` - ensure agentInstanceId on BeadIssue

### Step 2: Agent Indicator on Graph Nodes
Show agent presence on graph nodes:
- Small icon when agent assigned
- Tooltip shows agent name and status
- Color coding by status

**Files:**
- `src/components/graph/graph-view.tsx`
- Node rendering logic

### Step 3: Agent Activity in Activity Panel
If activity panel exists, show agent events:
- "Engineer 01 started working on BEAD-001"
- "Reviewer 01 completed review of BEAD-005"

**Files:**
- Check if activity panel still exists or needs rebuilding

### Step 4: Agent Filter/View
Add filter option to show only beads with active agents:
- "Show my agents" filter in social view
- Highlight beads with active work

**Files:**
- `src/components/social/social-page.tsx`
- Filter controls

---

## Blocked Items

None identified.

---

## Success Criteria

- [ ] Social cards show agent badge when agent assigned
- [ ] Graph nodes show agent indicator
- [ ] Agent status visible at a glance
- [ ] Can filter by "has active agent"

---

## Estimated Effort

2-3 hours
