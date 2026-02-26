# Main UI/UX Visual-Truth PRD

## Document Control
- Date: 2026-02-18
- Owner: Product + UI Engineering
- Status: Approved for implementation
- Primary route: `src/app/page.tsx`
- Design truth references:
  - Reference A: Command Grid shell (blocked/new-task top actions)
  - Reference B: Open Thread center takeover (conversation detail state)

## 1. Product Intent
Deliver a full redesign of the main BeadBoard experience so the live application visually and behaviorally matches the approved references while preserving existing backend workflows.

This is not a cosmetic patch. The shell, state model, and interaction hierarchy are being redefined.

## 2. Goals
1. Replace current green-card Social presentation with the new command-grid visual language.
2. Add Open Thread as a center takeover state (not right drawer-first).
3. Keep backend behavior, URL deep links, and mutation endpoints working.
4. Unify Social, Graph, and Swarm under one shell and token system.
5. Make both sidebars independently collapsible with persistent state.

## 3. Non-Goals
1. No backend schema migrations.
2. No changes to core issue/dependency semantics.
3. No new authentication or role systems.
4. No `/sessions` redesign (route is deprecated and redirected).

## 4. Users and Jobs-to-be-Done
### Primary User
- Technical operator managing active work and blockers in real time.

### Core Jobs
1. See blocked/high-priority work immediately.
2. Open a task and communicate/update status without leaving context.
3. Navigate between Social, Graph, and Swarm quickly.
4. Collapse side rails to focus when needed.

## 5. Experience Principles
1. Action first: top chrome should drive action, not telemetry overload.
2. Visual hierarchy over density: each region has one clear job.
3. State clarity: user always knows whether they are in Grid or Thread mode.
4. Consistent symbols: one icon system for view switching + card jump actions.
5. Fast and keyboard reachable: primary actions should be obvious and accessible.

## 6. Information Architecture
### Global Layout (Desktop)
- Left Sidebar: view switch icons + workstream tree + global scope controls.
- Center: either Command Grid or Open Thread takeover.
- Right Sidebar: agent pool + telemetry/activity context.
- Top Bar: minimal, action-first.

### Mobile Layout
- Dedicated mobile composition (not scaled desktop).
- Bottom nav for view switching.
- Open Thread is full-screen takeover with safe-area padding.

## 7. State Model
### Primary States
1. `command_grid`
- Shows top-level task stream/cards.
- Shows summary counts in center header.

2. `open_thread`
- Center takeover with task summary + conversation timeline + message input.
- Right sidebar may collapse/minimize depending on viewport.

### URL Contract
Maintain existing params and add sidebar params:
- Existing: `view`, `task`, `swarm`, `drawer`, `graphTab`, `panel`, `epic`
- New: `left=open|closed`, `right=open|closed`

Persistence precedence:
1. URL (source of truth)
2. Local storage fallback (when URL missing)
3. Default layout values

## 8. Surface Requirements

### 8.1 Top Bar (Action-First)
Required content:
1. Brand/scope label.
2. `Blocked Items` action.
3. `New Task` action.

Not in top bar:
1. Agent pool status blocks.
2. Large telemetry stat tiles.
3. Secondary controls that can live in sidebars.

Behavior:
1. `Blocked Items` toggles blocked-focused filtering in center and URL.
2. `New Task` opens create flow using existing beads mutation path.

### 8.2 Left Sidebar
Required:
1. View switcher icons at top (`Social`, `Graph`, `Swarm`).
2. Workstream/epic navigation below.
3. Collapse toggle.

Rules:
1. Icons match card jump icon language.
2. Keyboard focus visible and logical tab order.
3. Collapsed mode keeps view switch accessible.

### 8.3 Center: Command Grid
Required:
1. Header with title/subtitle and summary counts.
2. Grid/list of task cards with strong status hierarchy.
3. Strong visibility for blocked and in-progress items.

Card actions:
1. Jump to graph for task context.
2. Jump to activity/timeline context.
3. Open thread (enters takeover state).

### 8.4 Center: Open Thread Takeover
Required regions:
1. Task identity/status header.
2. Task summary + assignee + due date metadata.
3. Chronological conversation timeline.
4. Composer row with message input + send action.

Behavior:
1. Escape/close returns to prior command-grid selection context.
2. Existing edit/comment/status update flows continue to use current APIs.
3. Unsaved edits require warning before destructive navigation.

### 8.5 Right Sidebar
Required:
1. Agent pool monitor list.
2. Activity/telemetry feed.
3. Collapse toggle.

Rules:
1. Right sidebar is context rail, not primary action area.
2. In thread takeover on smaller screens, it may minimize/collapse.

### 8.6 Graph and Swarm Views
Required:
1. Full visual reskin using same token system and shell language.
2. Keep existing graph/swarm behavior and deep links.
3. Keep consistent icon/action vocabulary.

## 9. Design Token Contract (Locked)
All main-route UI must use tokenized values. No ad-hoc one-off hex values in component files.

### Required Tokens
- Background: `--ui-bg-app`, `--ui-bg-shell`, `--ui-bg-panel`, `--ui-bg-card`
- Border/Text: `--ui-border-soft`, `--ui-border-strong`, `--ui-text-primary`, `--ui-text-muted`
- Status/Action: `--ui-accent-ready`, `--ui-accent-blocked`, `--ui-accent-warning`, `--ui-accent-info`, `--ui-accent-action-green`, `--ui-accent-action-red`
- Typography: `--ui-font-sans`, `--ui-font-mono`, `--ui-tracking-tight`, `--ui-numeric-tabular`

Color policy:
- Match reference palette closely.
- Permit small WCAG contrast adjustments where needed.

## 10. Copy and Label Rules
Use plain operational language.

Approved examples:
- `Blocked Items`
- `New Task`
- `Open Thread`
- `No activity yet`

Avoid marketing-style labels and ambiguous verbs.

## 11. Accessibility Requirements (Must Pass)
1. Icon-only buttons include `aria-label`.
2. No clickable `div/span` for action controls.
3. All interactive controls have visible `:focus-visible` state.
4. Form controls have labels and sensible autocomplete behavior.
5. Async updates use polite live regions when applicable.
6. Keyboard support for sidebar toggles, view switching, composer actions.
7. Preserve semantic headings and logical region order.

## 12. Performance Requirements
1. No layout-thrashing reads in render.
2. Avoid `transition: all`; transition only explicit properties.
3. Keep card rendering cheap; memoize derived lists where needed.
4. Keep thread rendering stable under high event volume.
5. Preserve responsive behavior without JS measurement hacks.

## 13. Route Policy
- `/sessions` is deprecated.
- Required behavior: hard redirect `/sessions` to `/?view=social`.
- Remove active nav entry points to `/sessions`.

## 14. Acceptance Criteria
Design acceptance:
1. Desktop and mobile visually match references by region and hierarchy.
2. Command Grid and Open Thread states are both implemented.
3. Sidebars independently collapse and persist state.

Behavior acceptance:
1. URL state round-trip works for selection/view/layout state.
2. `Blocked Items` and `New Task` are functional.
3. Graph/Swarm remain behaviorally correct after reskin.
4. Existing mutation paths still work.

Quality gates:
1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. Vercel guideline audit output per phase (`file:line`, terse findings)

## 15. Verification Matrix
### Screenshot checkpoints
- `1920x1080`
- `1440x1024`
- `390x844`

### Flow checks
1. Open grid -> filter blocked -> open thread -> send message -> close thread -> restore context.
2. Switch Social/Graph/Swarm from left icon rail.
3. Collapse/expand each sidebar independently.
4. Reload with URL params and verify exact state restoration.

## 16. Risks and Mitigations
1. Risk: token updates leak to unrelated routes.
- Mitigation: scope tokens/class application to main shell first, then promote intentionally.

2. Risk: URL state regressions break deep links.
- Mitigation: add targeted URL parsing/building tests before refactor.

3. Risk: visual drift during incremental implementation.
- Mitigation: enforce screenshot checkpoints each phase.

4. Risk: stale runtime lock artifacts pollute git status.
- Mitigation: keep runtime lock files ignored and untracked.

## 17. Delivery Phases
1. Shell V2 + collapsible sidebars + URL state foundation.
2. Command Grid visual truth implementation.
3. Open Thread center takeover implementation.
4. Graph/Swarm full reskin.
5. `/sessions` hard redirect.
6. Final gates + audit and handoff.
