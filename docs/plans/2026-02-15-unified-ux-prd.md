# Unified UX PRD - Swimlane Social Hub

> **Version**: 1.1  
> **Date**: 2026-02-16  
> **Status**: Updated - Activity View + Thread Drawer added
> **Supersedes**: bb-u6f.7 (Unified Cross-Surface Navigation)

---

## Executive Summary

### Problem
BeadBoard has 4 fragmented pages with:
- No shared navigation or state
- Inconsistent design language (Aero Chrome glass-morphism feels dated)
- /sessions has good tech but missed the UX mark
- Users cannot supervise multi-agent teams in one cohesive experience

### Solution
Single unified shell at `/` with 3 views:
- **Social** - Task activity feed with blocks/unlocks
- **Graph** - Dependency visualization
- **Swarm** - Team health dashboard

---

## Key Decisions (Immutable)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Routing | Single page at `/` with client tabs | Preserves selection state |
| 2 | Views | 4 tabs: Social, Graph, Swarm, Activity | Activity replaces old /timeline |
| 3 | Right Panel | Activity Feed + Agent roster (top 30%) | Persistent sidebar, always shows timeline |
| 4 | Thread Drawer | Opens when clicking a card | Slides from right edge of middle area |
| 5 | Detail pattern | Right sidebar (desktop), drawer (mobile) | Best use of screens |
| 6 | Visual style | shadcn/ui + earthy-dark tokens | Replace Aero Chrome |
| 7 | Tailwind | Stay on v3, use shadcn/ui patterns | v4 has migration risks |
| 8 | Old pages | Copy page.tsx to page-old.tsx | Safe rollback |
| 9 | Card pattern | Same base for Social and Swarm | Reusable components |
| 10 | Threads | In thread drawer, not right panel | Separates conversation from activity |
| 11 | Agent presence | Embedded in swarm cards + right panel top | Supervisors can see all agents |
| 12 | Swarm sorting | Health (default), Activity, Progress | Auto-surface attention |
| 13 | Mobile nav | 4 bottom tabs (Social, Graph, Swarm, Activity) | Matches desktop view selector |

---

## Skills Required (Non-Negotiable)

1. **verification-before-completion** - Never claim done without proving commands
2. **test-driven-development** - Write failing tests first
3. **beadboard-driver** - Use bd commands for all bead operations
4. **linus-beads-discipline** - Single source of truth, evidence before assertion

---

## Design System Specification

### Color Palette (Earthy-Dark)

Backgrounds:
- --color-bg-base: #2D2D2D
- --color-bg-card: #363636
- --color-bg-input: #404040

Accents:
- --color-accent-green: #7CB97A (primary CTA)
- --color-accent-amber: #D4A574 (warning)
- --color-accent-teal: #5BA8A0 (secondary)

Text:
- --color-text-primary: #FFFFFF
- --color-text-secondary: #B8B8B8
- --color-text-muted: #888888

Status:
- ready: teal #5BA8A0
- in_progress: green #7CB97A
- blocked: amber #D4A574
- closed: muted #888888

Liveness:
- active: #7CB97A
- stale: #D4A574
- stuck: #E57373
- dead: #9E4244

---

## Layout Architecture

### Shell Structure (CSS Grid)
- TOP BAR: 3rem fixed
- LEFT: 13rem (channel tree)
- MIDDLE: flex-1 (card grid)
- RIGHT: 17rem (Activity Feed + Agent roster)
- THREAD DRAWER: 24rem (slides from right edge of middle area, appears on card selection)

### Responsive Behavior
| Size | Left Panel | Middle | Right Panel (Activity) | Thread Drawer |
|------|------------|--------|----------------------|---------------|
| Desktop (≥1024px) | 13rem fixed | flex-1 | 17rem fixed, always visible | 24rem slides in |
| Tablet (768-1024px) | Collapsed, toggle | flex-1 | Slide-over, toggle | Slide-over drawer |
| Mobile (<768px) | Hidden | flex-1 | Bottom tab | Full-screen bottom sheet |

### Mobile Navigation (Bottom Tabs)
- Tab 1: Social
- Tab 2: Graph
- Tab 3: Swarm
- Tab 4: Activity (shows timeline/agent view)

### URL State
- view: social | graph | swarm | activity
- task: selected task ID
- swarm: selected swarm ID
- agent: selected agent ID (for activity panel filtering)
- panel: open | closed (right panel)
- drawer: open | closed (thread drawer)

---

## View Specifications

### Social View
Card: Task ID (teal), Title (bold), UNLOCKS (rose), BLOCKS (amber), Agents, View-jump icons

### Graph View
Keep ReactFlow + Dagre, add fitView() on tab activation

### Swarm View
Card: Swarm ID, Epic title, AGENTS roster with status glow, ATTENTION items, Progress bar, Last activity

Sorting: Health (default), Activity, Progress, Name

### Activity View
Replaces /timeline. Shows:
- Top 30%: Agent roster with status (active/stale/stuck/dead)
- Bottom: Chronological activity feed (status changes, comments, events)
- Real-time updates via SSE

**Deep Linking from Cards:**
- Click agent icon on any card → Activity panel filters to that agent
- URL: `/?view=activity&agent=bb-xyz` shows agent's activity
- Click graph icon on card → `/?view=graph&task=bb-xyz`
- Click kanban icon on card → `/?view=social&task=bb-xyz`

**Right Panel Behavior:**
- No selection: Shows ALL active agents + ALL activity
- Agent selected: Shows that agent's roster + their specific activity
- Easy "show all" button to clear agent filter

### Thread Drawer
When clicking a card (Social or Swarm), opens drawer showing:
- Task/Swarm header with ID and title
- Full thread of comments and events
- Compose area for adding comments
- Close button (X)

---

## Dependency Graph (Bead Flow)

PHASE 0: Design Foundation
[0.1] Token System
[0.2] shadcn/ui Setup
[0.3] Base Primitives

PHASE 1: Shell Layout
[1.1] URL State Hook
[1.2] UnifiedShell Component <- [0.*][1.1]
[1.3] TopBar Component <- [1.2]
[1.4] LeftPanel Component <- [1.2]
[1.5] RightPanel Component <- [1.2]
[1.6] Responsive Behavior <- [1.3-1.5]
[1.7] Resizable Panels <- [1.2-1.6]

PHASE 2: Social View
[2.1] Social Card Data Builder
[2.2] SocialCard Component <- [0.3][2.1]
[2.3] Social Detail Strip <- [1.5][2.1]
[2.4] Thread View Component <- [2.3]
[2.5] Social View Integration <- [1.2][2.2-2.4]

PHASE 3: Swarm View
[3.1] Swarm Card Data Builder
[3.2] SwarmCard Component <- [0.3][3.1]
[3.3] Swarm Detail Strip <- [1.5][3.1]
[3.4] Swarm View Integration <- [1.2][3.2-3.3]

PHASE 4: Activity View (NEW)
[4.1] Activity Data Builder <- [0.3]
[4.2] ActivityPanel Component <- [1.5][4.1]
[4.3] Agent Deep Linking <- [4.2][2.2][3.2]
[4.4] Thread Drawer <- [2.4]
[4.5] Mobile Nav 4-tabs <- [1.6][4.2]

PHASE 5: Graph Migration
[5.1] Graph Component Extraction
[5.2] Graph Tab Integration <- [1.2][5.1]
[5.3] fitView Fix <- [5.2]

PHASE 6: Polish
[6.1] Deep Link Verification <- [all above]
[6.2] Mobile Responsive Polish
[6.3] Screenshot Evidence
[6.4] Final Quality Gates

---

## Verification Gates (Required)

Every bead MUST pass before closing:
- npm run typecheck
- npm run lint
- npm run test
- Screenshots for UI changes

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| ReactFlow resize | Use visibility:hidden + fitView() |
| shadcn + Tailwind v3 | Follow shadcn v3 docs |
| Mobile keyboard | Full-screen drawer on mobile |
| URL race conditions | URL is single source of truth |

---

## Migration Checklist

Pre:
- [ ] Copy page.tsx to page-old.tsx
- [ ] Verify tests pass

During:
- [ ] Install shadcn/ui
- [ ] Create globals.css with earthy-dark tokens
- [ ] Build phases in order

Post:
- [ ] All 3 views functional
- [ ] Deep links work
- [ ] Mobile verified
- [ ] Screenshots captured

---

## Appendix: shadcn/ui Setup

bash:
npx shadcn@latest init
npx shadcn@latest add button card badge avatar input scroll-area separator tooltip dropdown-menu

---

*End of PRD - Ready for Bead Creation*
