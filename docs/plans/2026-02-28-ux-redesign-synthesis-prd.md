# BeadBoard UX Redesign — Synthesis PRD

**Date**: 2026-02-28
**Status**: Approved for implementation
**Supersedes**: `2026-02-28-holistic-ux-architecture.md`, `2026-02-28-multi-view-vision.md` (those remain as reference; this document is the implementation contract)

---

## 0. Agent Quick Start

**If you are picking up this work for the first time, do this in order:**

```bash
bd ready          # shows available Phase 0 tasks — start here
bd show <id>      # read the full task before claiming it
```

**Files to read before touching code (15 min):**

| File | Why |
|---|---|
| `src/components/shared/unified-shell.tsx` | Root layout — nearly every Phase 0 fix is here |
| `src/hooks/use-url-state.ts` | All view/panel/selection state flows through this |
| `src/components/activity/contextual-right-panel.tsx` | Right panel content router |
| `src/components/shared/left-panel.tsx` | Navigation + epic tree |
| `src/components/shared/top-bar.tsx` | Global header with metric tiles |
| `src/components/shared/thread-drawer.tsx` | Thread/chat overlay |

**Phase 0 tasks are fully independent — they can be worked in parallel by separate agents.**

**Phase ordering:** 0 → 1 → 2 → 3 → 4 → 5. Do not start a later phase until the previous one's acceptance criteria are verified.

---

## 1. Problem Statement

BeadBoard has three tiers of capability:

| Tier | What exists |
|---|---|
| Task layer | Issues, epics, status, dependencies (beads) |
| Agent layer | Live agents, sessions, liveness telemetry, SSE activity stream |
| Coordination layer | Swarms, archetypes, formulas, mission assignment |

The current UX surfaces tier 1 prominently, treats tier 2 as a deprecated route, and makes tier 3 invisible from the main shell. This means users who don't already know the system see a worse issue tracker. The coordination and agent layers are the only things that differentiate this product from Jira or Linear.

Additionally, the existing shell has four concrete wiring gaps (not design flaws — broken wire connections between infrastructure that already exists):

1. **Blocked flow not wired**: `topBar.blockedOnly` updates URL state, `SocialPage` accepts `blockedOnly` prop, `UnifiedShell` never passes it through. (`top-bar.tsx:55`, `social-page.tsx:65`, `unified-shell.tsx:128`)
2. **Activity view is a dead end**: `view=activity` is in `VALID_VIEWS`, renders `null` in the shell, omitted from nav, but `SocialPage` actively navigates users there via "Jump to Activity" on every card. (`use-url-state.ts:46`, `unified-shell.tsx:113-139`, `social-page.tsx:220`)
3. **ContextualRightPanel ignores URL context**: Branches only on `epicId` prop. Never receives `taskId`, `agentId`, or `swarmId`. (`contextual-right-panel.tsx:14`)
4. **Actor identity split**: `ConversationDrawer` reads/writes `localStorage('bb.humanActor')`. `ThreadDrawer` sends comments with no actor. No shared identity contract. (`conversation-drawer.tsx:125,167`, `thread-drawer.tsx:56`)

These four must be fixed as a prerequisite to any new view work.

---

## 2. Product Vision

BeadBoard is an **agent-first operations console**. Its primary audience is an operator (human or automated) overseeing a fleet of AI agents executing a structured work graph. The UI must make the following true at all times:

- **Who is working what, right now** — visible without navigating anywhere
- **What is blocked and why** — surfaced, not buried behind a filter
- **Launching and monitoring a swarm** — one interaction from anywhere in the app
- **Understanding task relationships** — available as a lens, not a page

The two primary views — Social and Graph — are not different pages. They are two lenses on the same live system state. Every entity reachable in one lens is reachable in the other. The swarm coordination system is not a view at all — it is a persistent layer available from any lens.

---

## 3. The Four Surfaces

### 3.1 The Shell (always present)

The shell is the frame that never changes regardless of active lens. It has four zones:

**Top Bar**
- Operator identity selector (replaces `localStorage` identity — see Gap 4)
- Global system health indicator (bdHealth, connected/disconnected)
- Blocked triage button — opens a dedicated triage modal showing only blocked tasks with inline agent assignment, not a panel toggle
- Metric tiles wired to live data: total tasks, blocked count, agent busy/idle counts (currently always zero — `UnifiedShell` must pass these props)

**Left Panel (Navigation Spine)**
- Scope: workspace → project → epic hierarchy
- View switcher: Social | Graph | Activity (three tabs, not two)
- Epic list with embedded swarm launch affordance per epic (one-click "assign swarm" from any epic row)
- Agent/archetype quick access: collapsed section showing active agents with liveness indicators
- No hardcoded identity in footer — wire to operator identity from Top Bar

**Right Panel (Context Inspector)**
Must adapt to URL context, not just `epicId`. Contract:

| URL context | Right panel content |
|---|---|
| No selection | Global activity feed (current `ActivityPanel`) |
| `?epic=X` | Swarm command feed for that epic + swarm launch controls |
| `?task=X` | Task thread + agent currently assigned + assignment controls |
| `?agent=X` | Agent liveness details + missions + current task |
| `?swarm=X` | Swarm topology + agent roster + mission status |

This replaces the current `epicId`-only branch in `ContextualRightPanel`.

**Mobile Nav**
- Three tabs matching Left Panel view switcher: Social | Graph | Activity
- Replace Unicode glyph icons (`≡`, `◊`) with Lucide icons and proper `aria-label`
- Add `aria-controls` linking tabs to content panels

---

### 3.2 The Social Lens (`/?view=social`)

**Purpose**: The ops room. Watching live agent work, intervening on blockers, threading into tasks.

**What it is today**: A grouped card grid of issues, sorted by last activity, with status sections. Cards show dependency counts, comment counts, blocked-by chains.

**What it needs to become**:

- **Agent presence on cards**: Each card shows the currently assigned agent with liveness indicator (active/stale/stuck). Source: `livenessMap` from `useSessionFeed`. Currently computed only in the deprecated Sessions header.
- **Inline swarm assignment**: Cards in `blocked` or `ready` state show an "Assign" affordance that opens the archetype picker inline (extracts `AssignmentPanel` logic into a hook). No modal, no view switch required.
- **Blocked filter wired**: `blockedOnly` from URL state passed through `UnifiedShell` to `SocialPage`. The TopBar toggle must visibly filter the social feed.
- **Activity stream ambient**: The right panel's `ActivityPanel` should update in real time as agents work. When no task is selected, the right panel shows the live `coord.v1` event stream (HANDOFFs, ACKs, heartbeats). This telemetry already exists in `ActivityPanel` and `SwarmCommandFeed`; it just needs to be the default right-panel content (which it is when no epicId is set — but this needs to be verified against the URL context contract above).
- **Jump to Activity navigates somewhere**: `onJumpToActivity` on `SocialCard` navigates to `?view=activity`. That view must render the `ActivityPanel` in the main content area, not the right panel. Currently renders null.

---

### 3.3 The Graph Lens (`/?view=graph`)

**Purpose**: The architect's canvas. Structural planning, dependency visualization, agent orchestration overlay.

**What it is today**: A static DAG with node coloring by status. Assign mode is a hidden toggle within `SmartDag`. No agent presence visible on nodes.

**What it needs to become**:

- **Agent presence on nodes**: Active nodes show the agent avatar (from `AgentAvatar` component which already exists). Nodes with a stuck/stale agent get a visual pulse/warning treatment.
- **Assign mode is always available**: The "Assign Agent" affordance is a permanent control in the graph toolbar, not a hidden state. Clicking a node with no assignment opens the archetype picker in the right panel. Assign mode is not a separate mode — it's the default right-click/long-press behavior on any unassigned node.
- **Flow vs Overview tabs**: These already exist (`graphTab` URL param). They should be explicitly labeled in the graph toolbar, not hidden.
- **Swarm overlay**: When a `?swarm=X` param is present, the graph should highlight the subgraph of tasks assigned to that swarm. Swarm members shown as agent avatars on their nodes.

---

### 3.4 Activity — Ambient Right Panel (not a view)

**Purpose**: The forensic ledger. Chronological audit of every mutation, agent heartbeat, coord event, and schema change.

**Design decision**: Activity is not a navigation destination. It is ambient infrastructure surfaced through the right panel. Navigation stays at two views: Social and Graph.

**What it is today**: `ActivityPanel` exists and works but is only rendered in deprecated routes. `?view=activity` is a dead end that SocialCard "Jump to Activity" navigates users into.

**What it needs to become**:

- **Right panel default**: When no task/epic/swarm is selected, the right panel shows `ActivityPanel` (global live feed). Selecting anything switches the right panel to contextual content. Deselecting returns to the global feed.
- **Right panel toggle**: A small "Global / Inspector" toggle in the right panel header lets the operator switch between the live feed and the selected item's context at any time.
- **Per-card activity** (Phase 4): Each SocialCard shows a small inline activity strip (last event, agent liveness dot). Not a separate panel.
- **"Jump to Activity" on SocialCard**: Remove or replace with "clear selection" so the right panel falls back to the global feed. Do not navigate to `?view=activity`.
- Navigation (LeftPanel, MobileNav) stays at **two tabs only**: Social and Graph.

---

### 3.5 The Coordination Layer (not a view — a persistent overlay)

The swarm system is not a page. It is a set of controls available at every level of the app:

**Entry points**:
- Epic row in left panel → "Launch Swarm" action
- Blocked task card in social view → "Assign Archetype" inline picker
- Graph node (unassigned) → right panel archetype picker on click
- TopBar → "Missions" quick-access showing active swarm count with drill-down
- `?swarm=X` URL param → right panel shows full swarm inspector

**Swarm Inspector (right panel, `?swarm=X`)**:
- Mission title, status, agent roster with liveness
- Active tasks in this swarm highlighted in whatever lens is active
- Ability to join/leave, assign/unassign agents
- Currently exists as `MissionInspector` component — needs to be integrated into the right panel URL contract

**Archetype Picker (inline)**:
- Extracted from `AssignmentPanel` into a standalone `<ArchetypePicker>` component
- Used in: Social card "Assign" action, Graph node click, BlockedTriage modal
- Calls `/api/swarm/prep` + `/api/mission/assign` as today

**Launch Swarm**:
- `LaunchSwarmDialog` promoted to a global command accessible from TopBar and left panel epic rows
- Post-launch: navigates to `?swarm=X` so the new swarm is immediately visible in the right panel

---

## 4. Gap Registry

Precise classification of every identified gap as **exists-but-disconnected** or **missing-entirely**.

### Exists but disconnected

| Gap | Evidence | Fix |
|---|---|---|
| `blockedOnly` not passed to `SocialPage` | `unified-shell.tsx:128` missing prop | One-line pass-through |
| `ContextualRightPanel` shows nothing when no selection | `contextual-right-panel.tsx` no default content | Show `ActivityPanel` as default when no task/epic/swarm selected |
| SocialCard "Jump to Activity" navigates to dead end | `social-page.tsx:220` | Remove or replace with clear-selection action |
| `ContextualRightPanel` ignores task/agent/swarm URL context | `contextual-right-panel.tsx:14` | Extend props + branching |
| TopBar metric tiles always zero | `unified-shell.tsx:168` no props passed | Wire from live data |
| `SessionsHeader` liveness data not in shell | `sessions-page.tsx:37`, `sessions-header.tsx` | Move hook to shell or share |
| Swarm `MissionInspector` not in right panel URL contract | `swarm-page.tsx:100`, `unified-shell.tsx:142` | Wire `?swarm=X` to right panel |
| `AssignmentPanel` only reachable via graph assign mode | `unified-shell.tsx:149` | Extract to hook, expose everywhere |
| Thread drawer status badge hardcoded "In Progress" | `thread-drawer.tsx:418` | Read `issue.status` |
| TopBar "New Task" does nothing in shell | `unified-shell.tsx:168` no `onCreateTask` | Implement or remove |
| Jump to Activity navigates to dead view | `social-page.tsx:220` | Fix activity render path first |

### Missing entirely

| Gap | What's needed |
|---|---|
| Operator identity UI | TopBar identity selector, shared actor context, replaces `localStorage` in `conversation-drawer.tsx:125` and adds actor to `thread-drawer.tsx:56` |
| Agent presence on social cards | Liveness indicator per card using `livenessMap` from session feed |
| Agent presence on graph nodes | Agent avatar overlay on active/stuck nodes |
| Blocked Triage modal | Dedicated modal (not panel toggle) for blocked task triage with inline assignment |
| Global mutation lock (read-only mode) | `bdHealth.healthy` gating all mutation buttons app-wide |
| Swarm launch from left panel epic row | "Launch Swarm" affordance on each epic |
| Swarm overlay on graph for `?swarm=X` | Highlight subgraph of swarm tasks |

---

## 5. Terminology Contract

The current UI uses internal implementation vocabulary in user-facing copy. This is the canonical mapping going forward:

| Internal term | User-facing term |
|---|---|
| Archetype | Agent Role |
| Formula / proto | Swarm Template |
| Molecule | Swarm |
| Mission | Mission (keep — it's clear) |
| ag-blocked | Agent Blocked |
| "Instantiate a new molecule from a template proto" | "Start a new swarm from a template" |
| Command Grid | BeadBoard (use product name directly) |

---

## 6. What Does Not Change

- **Data layer**: Beads JSONL remains source of truth. No schema changes required for any of this.
- **SSE infrastructure**: `useBeadsSubscription` and the events API are correct. No changes needed.
- **URL state model**: `useUrlState` already supports all required params. Only consumers need updating.
- **Component library**: Existing components (`ActivityPanel`, `SwarmCommandFeed`, `MissionInspector`, `AssignmentPanel`, `AgentAvatar`) are the building blocks. The work is wiring, not rebuilding.
- **Theme system**: CSS variable token contract is solid. Do not introduce new hardcoded hex values.

---

## 7. Out of Scope

- New API endpoints (all required coordination APIs exist: `/api/swarm/*`, `/api/mission/*`, `/api/agents/*`)
- Kanban view (components exist, no route — leave as-is until there is a clear user need)
- Video/Remotion export pipeline
- Agent-to-agent messaging protocol changes
- Authentication / multi-user session management

---

## 8. Implementation Phases

### Phase 0 — Wiring Fixes (no new design, no new components)

Prerequisites for all other work. All items are independent and can be parallelized.

---

#### P0.1 — Wire `blockedOnly` to `SocialPage`

**File**: `src/components/shared/unified-shell.tsx`
**Exact location**: The `<SocialPage>` call inside `renderMiddleContent()` (currently at line 128)
**Change**: `blockedOnly` is already destructured from `useUrlState()` at line 38. Add it as a prop:
```tsx
<SocialPage
  issues={filteredIssues}
  selectedId={taskId ?? undefined}
  onSelect={handleCardSelect}
  projectScopeOptions={projectScopeOptions}
  blockedOnly={blockedOnly}   // ← add this line
/>
```
**Acceptance**: Clicking "Blocked Items" toggle in TopBar immediately filters the social feed to blocked cards only. Toggling off restores full list.

---

#### P0.2 — Wire ActivityPanel as right panel default (no selection state)

**Design**: Activity is ambient, not a view. Navigation stays at two tabs: Social and Graph.

**File**: `src/components/activity/contextual-right-panel.tsx`
**Change**: When no task/epic/swarm is selected, render `ActivityPanel` instead of empty/null:
```tsx
// When nothing is selected, show global activity feed
if (!epicId && !taskId && !swarmId) {
  return <ActivityPanel issues={issues} projectRoot={projectRoot} />;
}
```
Check current `ContextualRightPanel` prop contract before editing — confirm it receives `issues` and `projectRoot`, or thread them through from `UnifiedShell`.

**Also**: Remove or replace SocialCard "Jump to Activity" link (currently navigates to `?view=activity` dead end). Replace with clear-selection so right panel falls back to global feed.

**Acceptance**: With nothing selected, right panel shows live activity feed. Selecting a task/epic switches right panel to contextual content. Deselecting returns to global feed.

---

#### P0.3 — ~~Add Activity to Left Panel and Mobile Nav~~ (removed)

**Decision**: Navigation stays at Social and Graph only. Activity is surfaced through the right panel ambient feed, not as a third navigation destination. This item is closed.

---

#### P0.4 — Fix thread drawer status badge

**File**: `src/components/shared/thread-drawer.tsx`
**Exact location**: Line 418 — hardcoded string `'In Progress'`
**Current code**:
```tsx
<span className="rounded-full border border-[var(--ui-accent-ready)]/45 ...">
  In Progress
</span>
```
**Change**: Replace the string with the actual issue status, formatted:
```tsx
<span className="rounded-full border border-[var(--ui-accent-ready)]/45 ...">
  {issue?.status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) ?? 'Unknown'}
</span>
```
**Acceptance**: A task with `status: 'open'` shows "Open". A task with `status: 'in_progress'` shows "In Progress". A task with `status: 'blocked'` shows "Blocked".

---

#### P0.5 — Wire TopBar metric tiles from live data

**File**: `src/components/shared/unified-shell.tsx`
**Exact location**: The `<TopBar />` call (currently no props passed, causing all tiles to show 0)
**Change**: Compute from the live `issues` array and pass props:
```tsx
<TopBar
  totalTasks={issues.filter(i => i.issue_type !== 'epic').length}
  criticalAlerts={issues.filter(i => i.status === 'blocked').length}
  busyCount={issues.filter(i => i.status === 'in_progress').length}
  idleCount={0}
/>
```
Note: `idleCount` requires agent data not available in this component — pass `0` explicitly until Phase 4 wires the liveness map.
**Acceptance**: TopBar shows real blocked count and in-progress count. Values update when SSE pushes changes.

---

**Phase 0 combined acceptance**: All four items pass. Right panel shows ActivityPanel when nothing selected. Blocked toggle filters feed. Status badge matches real status. TopBar shows real counts.

---

### Phase 1 — Contextual Right Panel
Make the right panel adapt to full URL context.

1. Extend `ContextualRightPanel` props to accept `taskId`, `agentId`, `swarmId`
2. Pass all URL params from `UnifiedShell` to `ContextualRightPanel`
3. Implement each branch of the URL context contract (section 3.1)
4. Wire `MissionInspector` into `?swarm=X` right panel branch

**Acceptance**: Selecting a task shows task thread in right panel. Selecting a swarm shows swarm inspector. No selection shows global activity feed.

---

### Phase 2 — Operator Identity
Replace fragmented actor identity with a unified operator profile.

1. Add operator identity state to shell (stored in `localStorage` or URL, displayed in TopBar)
2. Pass `actor` from shell context to `ConversationDrawer` — remove `localStorage` read in component
3. Pass `actor` from shell context to `postComment` in `ThreadDrawer`
4. All mutation API calls include explicit `actor` field

**Acceptance**: Comments from both drawer types show consistent actor. Switching operator identity in TopBar immediately affects subsequent comments.

---

### Phase 3 — Coordination Layer Integration
Make swarm management accessible from everywhere.

1. Extract `AssignmentPanel` core logic into `useArchetypePicker` hook
2. Add inline "Assign" affordance to `SocialCard` (appears on blocked/unassigned tasks)
3. Add "Launch Swarm" button to each epic row in `LeftPanel`
4. Promote `LaunchSwarmDialog` to TopBar global access
5. Wire `?swarm=X` URL param: social view highlights swarm tasks, graph view shows swarm subgraph overlay

**Acceptance**: Launching a swarm is possible without navigating to any dedicated page. Assigned agent is visible on task cards.

---

### Phase 4 — Agent Presence
Surface live agent state in both views.

1. Move `livenessMap` computation up to `UnifiedShell` level (currently only in deprecated Sessions header)
2. Pass `livenessMap` down to `SocialCard` — render agent avatar + liveness dot per card
3. Pass `livenessMap` to `SmartDag` / graph node cards — render agent avatar on active nodes with pulse animation for stuck agents
4. Replace hardcoded identity footer in `LeftPanel` with live workspace stats (N agents active, M tasks in motion)

**Acceptance**: A user opening either view immediately sees which agents are active and what they are working on without navigating anywhere.

---

### Phase 5 — Blocked Triage Modal
Replace the panel-toggle blocked button with a purpose-built triage surface.

1. Build `BlockedTriageModal` component: full list of blocked tasks, each with inline `ArchetypePicker`
2. Reroute TopBar "Blocked Items" button to open this modal
3. Modal shows blocker chain context for each task (already available from `buildBlockedByTree`)

**Acceptance**: Operator can see all blocked tasks and assign agents to unblock them without leaving the modal.

---

## 9. Success Criteria

The redesign is complete when:

- [ ] A new user can see which agents are working and what they're doing within 5 seconds of opening the app
- [ ] Launching a swarm requires no navigation — it is possible from the current view with ≤ 2 interactions
- [ ] `?view=activity` renders meaningful content and is reachable from navigation
- [ ] The blocked toggle filters the social feed immediately
- [ ] Comments in both ThreadDrawer and ConversationDrawer show the correct actor identity
- [ ] Right panel content changes when switching between task/agent/swarm selection
- [ ] No hardcoded hex colors introduced in any new component — all values use CSS token variables
- [ ] No new hardcoded copy uses internal vocabulary (molecule, proto, archetype → see terminology contract)
