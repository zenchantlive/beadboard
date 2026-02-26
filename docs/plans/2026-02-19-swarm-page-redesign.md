# Swarm Page Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace label-based swarm grouping with proper `bd swarm` orchestration UI showing epic-level work coordination.

**Architecture:** Query `bd swarm list/status/validate` directly via new API routes. Swarm cards show computed progress from epic DAGs. Activity panel filters to selected swarm's epic children.

**Tech Stack:** Next.js API routes, existing BD CLI, reuse ActivityPanel and card patterns.

---

## Background: How `bd swarm` Actually Works

### NOT Labels
The current UI incorrectly uses `swarm:*` labels to group agents. `bd swarm` does NOT use labels.

### How It Actually Works

**Create:**
```bash
bd swarm create <epic-id>
```
Creates a **molecule bead** with `issue_type: "molecule"` and `mol_type: "swarm"`:
```json
{
  "id": "codex-f4r",
  "title": "Swarm: Test Epic",
  "issue_type": "molecule",
  "mol_type": "swarm",
  "dependencies": [{ "id": "codex-dq9", "dependency_type": "relates-to" }]
}
```

**Status (computed, not stored):**
```bash
bd swarm status <epic-or-swarm-id> --json
```
Returns:
```json
{
  "epic_id": "codex-dq9",
  "epic_title": "Test Epic",
  "completed": [...],
  "active": [...],    // in_progress issues
  "ready": [...],     // unblocked, open issues
  "blocked": [...],   // waiting on dependencies
  "progress_percent": 40
}
```

**List:**
```bash
bd swarm list --json
```
Returns:
```json
{
  "swarms": [{
    "id": "codex-f4r",
    "title": "Swarm: Test Epic",
    "epic_id": "codex-dq9",
    "epic_title": "Test Epic",
    "status": "open",
    "coordinator": "",
    "total_issues": 5,
    "completed_issues": 2,
    "active_issues": 1,
    "progress_percent": 40
  }]
}
```

**Validate:**
```bash
bd swarm validate <epic-id> --verbose
```
Returns DAG quality, ready fronts, max parallelism.

---

## Data Contract

### GET /api/swarm/list
Returns `bd swarm list --json` output directly.

### GET /api/swarm/status?epic=<epic-id>
Returns `bd swarm status <epic> --json` output.

### POST /api/swarm/create
Body: `{ "epicId": "codex-dq9", "coordinator": "witness" (optional) }`
Returns created swarm molecule.

### POST /api/swarm/close
Body: `{ "swarmId": "codex-f4r" }`
Closes the swarm molecule.

---

## Page Layout

**Existing structure (unified-shell.tsx) - no changes to layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  TOP BAR                                                            │
├──────────────┬────────────────────────────────┬─────────────────────┤
│  LEFT PANEL  │  MIDDLE CONTENT                │  RIGHT PANEL        │
│  (filters)   │  (SwarmPage cards)             │  (ActivityPanel)    │
│              │                                │  ← filter by swarm  │
│              │  [swarm cards grid]            │                     │
│              │                                │                     │
├──────────────┴────────────────────────────────┴─────────────────────┤
│  MOBILE NAV                                                         │
└─────────────────────────────────────────────────────────────────────┘
```

**SwarmPage:**
- Header with title + "Create Swarm" button
- Responsive cards grid (1-4 columns)
- Click card → sets `swarmId` in URL → right panel filters to that swarm

---

## Swarm Card Design

```
┌─────────────────────────────────────┐
│  🐝 Swarm: Feature Auth             │  ← title from swarm molecule
│  codex-f4r                          │  ← swarm molecule ID
│  ─────────────────────────────────  │
│  Progress ████████░░░░ 40%          │  ← progress_percent
│  Epic: codex-dq9                    │  ← linked epic ID
│  ─────────────────────────────────  │
│  ✓ 2 completed                      │  ← completed count
│  ▶ 1 active                         │  ← in_progress count
│  ⏳ 2 ready                         │  ← unblocked, open
│  ⚠ 1 blocked                        │  ← waiting on deps
│  ─────────────────────────────────  │
│  Coordinator: (none)                │  ← optional coordinator
│  Last: 5 minutes ago                │  ← most recent update
└─────────────────────────────────────┘
```

**Mini-DAG (optional, expandable):**
- Show just the ready/front nodes as clickable badges
- "Ready to pick up: Task A, Task B"

---

## Implementation Phases

### Phase 1: API Layer

**Files to create:**
- `src/app/api/swarm/list/route.ts` - wraps `bd swarm list --json`
- `src/app/api/swarm/status/route.ts` - wraps `bd swarm status <epic> --json`
- `src/app/api/swarm/create/route.ts` - wraps `bd swarm create <epic>`
- `src/app/api/swarm/close/route.ts` - wraps `bd close <swarm-id>`

**Pattern:** Follow existing `/api/beads/...` routes. Use `runBdCommand` from `src/lib/bridge.ts`.

### Phase 2: UI Layer

**Files to modify:**
- `src/lib/swarm-cards.ts` → replace with API calls or repurpose
- `src/components/swarm/swarm-page.tsx` → fetch from API, add create button
- `src/components/swarm/swarm-card.tsx` → new layout with status metrics

**Files to create:**
- `src/components/swarm/create-swarm-dialog.tsx` - form to create new swarm

### Phase 3: Activity Filter

**Files to modify:**
- `src/components/activity/activity-panel.tsx` - add `filterByEpicId?: string` prop
- `src/components/shared/unified-shell.tsx` - pass epicId when swarm selected

**Logic:** When `swarmId` is set, look up the swarm's epic_id and pass to ActivityPanel.

### Phase 4: Create Flow

**Entry points:**
1. Swarm page empty state → "Create Swarm" button
2. (Future) Epic detail page → "Create Swarm" action

**Dialog:**
- Dropdown to select epic (from `bd list --type=epic`)
- Optional: assign coordinator (from agent list)
- Submit → `POST /api/swarm/create`

---

## Files Summary

### New Files
- `src/app/api/swarm/list/route.ts`
- `src/app/api/swarm/status/route.ts`
- `src/app/api/swarm/create/route.ts`
- `src/app/api/swarm/close/route.ts`
- `src/components/swarm/create-swarm-dialog.tsx`

### Modified Files
- `src/lib/swarm-cards.ts` - refactor for API data or deprecate
- `src/components/swarm/swarm-page.tsx` - use API, add create
- `src/components/swarm/swarm-card.tsx` - new card layout
- `src/components/activity/activity-panel.tsx` - add filter prop
- `src/components/shared/unified-shell.tsx` - wire epic filter

### Tests
- `tests/app/api/swarm/*.test.ts`
- Update `tests/components/swarm/*.test.tsx`
- Update `tests/lib/swarm-cards.test.ts`

---

## Success Criteria

1. Swarm page shows swarms from `bd swarm list` (not labels)
2. Cards display progress, active/ready/blocked counts
3. Clicking swarm filters ActivityPanel to epic children
4. "Create Swarm" dialog works from empty state
5. Existing tests updated, new tests for API routes
6. No `swarm:*` label usage in swarm page logic