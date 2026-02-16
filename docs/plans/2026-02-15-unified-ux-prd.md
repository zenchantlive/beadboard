# Unified UX PRD - Swimlane Social Hub

> **Version**: 1.0  
> **Date**: 2026-02-15  
> **Status**: Planning Complete - Ready for Bead Creation  
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
| 2 | Views | 3 tabs: Social, Graph, Swarm | Sessions replaced by Social |
| 3 | Detail pattern | Right sidebar (desktop), drawer (mobile) | Best use of screens |
| 4 | Visual style | shadcn/ui + earthy-dark tokens | Replace Aero Chrome |
| 5 | Tailwind | Stay on v3, use shadcn/ui patterns | v4 has migration risks |
| 6 | Old pages | Copy page.tsx to page-old.tsx | Safe rollback |
| 7 | Card pattern | Same base for Social and Swarm | Reusable components |
| 8 | Threads | In detail strip for both views | Comments + events |
| 9 | Agent presence | Embedded in swarm cards | Agents primary in Swarm |
| 10 | Swarm sorting | Health (default), Activity, Progress | Auto-surface attention |

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

Shell Structure (CSS Grid):
- TOP BAR: 3rem fixed
- LEFT: 13rem (channel tree)
- MIDDLE: flex-1 (card grid)
- RIGHT: 17rem (detail strip)

Responsive:
- < 768px: Full width, drawer overlay
- 768-1024px: Left collapses, slide-over
- >= 1024px: Full 3-panel

URL State:
- view: social | graph | swarm
- task: selected task ID
- swarm: selected swarm ID
- panel: open | closed

---

## View Specifications

### Social View
Card: Task ID (teal), Title (bold), UNLOCKS (rose), BLOCKS (amber), Agents, View-jump icons

### Graph View
Keep ReactFlow + Dagre, add fitView() on tab activation

### Swarm View
Card: Swarm ID, Epic title, AGENTS roster with status glow, ATTENTION items, Progress bar, Last activity

Sorting: Health (default), Activity, Progress, Name

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

PHASE 4: Graph Migration
[4.1] Graph Component Extraction
[4.2] Graph Tab Integration <- [1.2][4.1]
[4.3] fitView Fix <- [4.2]

PHASE 5: Polish
[5.1] Deep Link Verification <- [all above]
[5.2] Mobile Responsive Polish
[5.3] Screenshot Evidence
[5.4] Final Quality Gates

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
