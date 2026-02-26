# Unified UX PRD - Swimlane Social Hub

> **Version**: 2.0  
> **Date**: 2026-02-16  
> **Status**: UPDATED - Complete Design Specification  
> **Supersedes**: Previous versions, bb-u6f.7

## Implementation Status

> **Last Updated: 2026-02-16**

### Phase 0: Design Foundation
- ✅ **bb-ui2.1** (codex-3fn) - Design Tokens Update - COMPLETED
  - Added complete earthy-dark token system in globals.css
  - Legacy Aero Chrome classes preserved for backward compatibility (gradual migration)
- ⏳ **bb-ui2.2** (codex-1ky) - Semantic Rename - READY (blocked by tokens - unblocked)
- ⏳ **bb-ui2.3** (codex-5vm) - Base Card Component - READY (blocked by tokens - unblocked)

### Phase 1-3: Not Started
- Planning complete, implementation pending Phase 0 completion


---

## Executive Summary

### Problem
BeadBoard has 4 fragmented pages with no shared navigation, no shared state, and inconsistent design language. The current Aero Chrome glass-morphism visual style has been rejected by users. Users want ONE cohesive experience for supervising multi-agent teams and managing tasks.

### Solution
Single unified shell at `/` with 4 switchable views (Social Feed, Swimlanes, Graph, Timeline), new earthy-dark design system, agent-prominent UX, and thoughtful interaction patterns throughout.

---

## Key Decisions (Immutable)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Routing | Single page + client tabs at / | Preserves selection state, panels never unmount |
| 2 | State Source | URL is Single Source of Truth | Prevents race conditions |
| 3 | Activity Feed | Context-aware (filters to selection) | Most useful for supervision workflow |
| 4 | Mobile | Hamburger left + slide-over right + bottom tabs | Standard pattern |
| 5 | Build Order | Tokens → Shell → Views (tracer bullet) | Real dependency chain |
| 6 | Card Interaction | Selection + detail strip below grid (desktop) | Grid stays uniform, split-view for conversation |
| 7 | Mobile Detail | Full-screen overlay (not split) | Keyboard takes 40% of screen |
| 8 | Visual Style | Earthy-dark design system (NOT Aero Chrome) | User provided full token spec |
| 9 | Agent Presence | Prominent - agents are the star | Avatars on every card, role-colored borders |
| 10 | Left Panel | Minimal with counts, nested epic tree | Status dots, hover tooltips |
| 11 | Card View-Jump | Small icons at card bottom | Jump to views with task pre-selected |
| 12 | Units | rem-based | Accessibility |

---

## Design Token Specification

### Color Palette

**Backgrounds:**
```css
--color-bg-base: #2D2D2D      /* primary background */
--color-bg-card: #363636      /* cards, elevated surfaces */
--color-bg-input: #404040     /* inputs, hover states */
```

**Accents:**
```css
--color-accent-green: #7CB97A   /* primary CTA, success, in-progress */
--color-accent-amber: #D4A574   /* warning, blocked */
--color-accent-teal: #5BA8A0    /* secondary, open/ready */
```

**Text:**
```css
--color-text-primary: #FFFFFF
--color-text-secondary: #B8B8B8
--color-text-muted: #888888
--color-text-on-primary: #1A1A1A
```

**Borders:**
```css
--color-border-default: #4A4A4A
--color-border-subtle: #3A3A3A
```

**Status Mapping:**
- open/ready → teal `#5BA8A0`
- in_progress → green `#7CB97A`
- blocked → amber `#D4A574`
- closed → muted `#888888`

**Agent Role Colors:**
- ui → `#6B9BD2` (steel blue)
- graph → `#7CB97A` (green)
- orchestrator → `#B08ED6` (soft purple)
- agent → `#B8B8B8` (neutral)
- researcher → `#D4A574` (amber)

**Liveness Colors:**
- active → `#7CB97A` (green, pulsing)
- stale → `#D4A574` (amber)
- evicted → `#C97A7A` (muted rose)
- idle → `#888888` (muted)

### Radii
```css
--radius-sm: 0.375rem      /* 6px */
--radius-card: 0.625rem    /* 10px */
--radius-modal: 1rem       /* 16px */
--radius-pill: 9999px
```

### Shadows
```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.1)
--shadow-md: 0 4px 12px rgba(0,0,0,0.15)
```

### Typography
- Font: system sans-serif (Inter if available)
- H1: 2rem/700, H2: 1.5rem/600, H3: 1.125rem/600
- Body: 0.875rem/400, Small: 0.75rem/400, Tiny: 0.6875rem/500
- Line-height: headings 1.2, body 1.5

### Spacing
- Base: 0.25rem (4px)
- Card padding: 1rem-1.25rem
- Gaps: 1rem
- Section gaps: 2rem-2.5rem

### Icons & Transitions
- Icons: Lucide React, 1.5-2px stroke, 1rem-1.5rem size
- Transitions: 150-200ms ease-out for all hover/focus

---

## Component Anatomy

### Social Feed Card

```
┌─────────────────────────────────────┐
│ [⊕]                           (top-R)│  expand icon
│                                     │
│ bb-buff.1.1                         │  task ID (tiny, teal)
│ Fix login bug on mobile             │  title (bold, white)
│                                     │
│ UNLOCKS:                            │  blocked-by (ROSE tint)
│  ● #123 Blocker task                │
│                                     │
│ BLOCKS:                             │  downstream (AMBER tint)
│  ● #234 Dependent task              │
│                                     │
│ "Found the issue in the auth..."    │  latest message (muted)
│                                     │
│ [●a-1] [●a-2]                       │  agent avatars (PROMINENT)
│                          [≡] [◊] [≋]│  view-jump icons
└─────────────────────────────────────┘
```

**Card Specs:**
- Background: `#363636`
- Border: 1px status-colored (teal/green/amber/muted)
- Border-radius: 10px
- Status dot on card matches status mapping
- Agent avatars have **role-colored left border**
- Blocks/unlocks have tinted backgrounds (rose #E57373/10%, amber #D4A574/10%)

**Blocks/Unlocks Pattern (reuse from task-card-grid.tsx):**
```tsx
// Container
rounded-lg p-2 border border-white/5

// "Unlocks" header (rose tint)
text-[9px] font-bold uppercase tracking-widest text-rose-400/80
bg-rose-500/10  // background tint

// "Blocks" header (amber tint)
text-[9px] font-bold uppercase tracking-widest text-amber-400/80
bg-amber-500/10  // background tint

// Individual item
rounded border border-white/5 bg-white/5 px-2.5 py-2
hover:border-sky-400/30 hover:bg-white/10 transition-colors
```

### ZFC Agent State Visuals

| State | Visual |
|-------|--------|
| idle | `#888888` static dot |
| spawning | `#5BA8A0` pulsing dot |
| running | `#7CB97A` animated dot |
| working | `#7CB97A` pulsing glow |
| stuck | `#D4A574` attention dot (needs help!) |
| done | `#7CB97A` check |
| stopped | `#888888` no animation |
| dead | `#C97A7A` warning |

### Agent Card (Right Panel)

```
┌──────────────────────┐
│ [●avatar] agent-1    │  role-colored left border
│ role: ui             │  role label
│ ● working · 2m ago   │  ZFC state dot + age
│ Task: buff.1.1       │  current task
│ [≡] [◊] [≋] [💬]      │  view-jump + message
└──────────────────────┘
```

### Swimlane Header
- Swarm name + computed counts: "3/8 done · 2 active · 1 ready · 1 blocked"
- Agent roster with ZFC state labels
- Collapsible

---

## Layout Architecture

### Shell Structure (CSS Grid)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP BAR (fixed, 3rem)                                            │
│ ≡  [Swimlanes|Graph|Timeline|Social]                      ◢     │
├──────────┬──────────────────────────────────┬────────────────────┤
│ LEFT     │ MIDDLE                           │ RIGHT              │
│ 13.75rem │ flex-1                           │ 17.5rem            │
│          │                                  │                    │
│ Channel  │ View content (swaps on tab)      │ Agents (~40%)      │
│ tree     │                                  │ ────────────────── │
│          │                                  │ Activity (~60%)    │
└──────────┴──────────────────────────────────┴────────────────────┘
```

**Grid:** `grid-template-columns: 13.75rem 1fr 17.5rem`

### Detail Strip Behavior

**Desktop (≥1024px):**
- Grid splits: cards (~45%) | detail strip (~55%)
- Strip slides in below grid when card selected
- Cards remain visible above

**Mobile (<768px):**
- Full-screen overlay (z-index above bottom tabs)
- Required: virtual keyboard takes 40% of screen
- Split view would leave 0px for conversation

### Responsive Behavior

| Size | Left | Middle | Right | Detail Strip |
|------|------|--------|-------|--------------|
| Desktop (≥1024px) | 13.75rem fixed | flex-1 | 17.5rem fixed | Below grid |
| Tablet (768-1024px) | Overlay | flex-1 | Overlay | Slide-over |
| Mobile (<768px) | Overlay | flex-1 | Hidden | Full-screen |

---

## Anti-Patterns (Forbidden)

- NO glass-morphism / backdrop-blur effects
- NO arbitrary Tailwind color values (use tokens)
- NO agent-unaware cards (every card shows agents)
- NO page-per-view routing (use client tabs)
- NO localStorage for view state (use URL)
- NO direct JSONL writes (use bd CLI)

---

## Recommended Bead Structure

### Phase 0: Design Foundation
**Goal:** Tokens + Primitives only. No views.

**bb-ui2.1a** - Token System Update  
- Update tokens.css with complete spec above
- Ensure all status/liveness/role colors defined
- Migrate away from Aero Chrome gradients

**bb-ui2.2a** - Card Primitive with Blocks/Unlocks  
- Build reusable Card component
- Implement blocks/unlocks section pattern (reuse task-card-grid.tsx logic)
- Status-colored borders
- Soft gradient backgrounds (amber/teal tints, not harsh Aero Chrome)

**bb-ui2.3a** - Agent Avatar Primitive  
- Avatar with role-colored ring
- ZFC state indicator (dot/pulse/glow)
- Size variants (sm, md, lg)

**bb-ui2.4a** - Status Utilities Update  
- Rewrite status-utils.tsx for new tokens
- Status badge component with pill + dot
- Liveness indicator component

### Phase 1: Layout Polish
**Goal:** Fix current layout issues, preserve structure

**bb-ui2.22** - Detail Strip Positioning Fix  
- Move from side drawer to below-grid (desktop)
- Full-screen overlay (mobile)
- Preserve URL state behavior
- Thread content actually shows selected bead data

**bb-ui2.23** - Activity Panel Polish  
- Split right panel: Agents (40%) + Activity (60%)
- Agent cards with ZFC states
- Context-aware activity filtering

**bb-ui2.24** - Mobile Responsive Polish  
- Bottom tab bar
- Panel overlays
- Touch-friendly targets

### Phase 2: Card Design Implementation
**Goal:** Implement complete card anatomy

**bb-ui2.25** - Social Feed Card Redesign  
- Full card anatomy from spec
- Blocks/unlocks with rose/amber tints
- Prominent agent avatars
- View-jump icons
- Expand icon → full-page popup

**bb-ui2.26** - Swimlane Card Redesign  
- Agent-first layout
- ZFC state prominent
- Status-colored border
- Drag-drop preserved

**bb-ui2.27** - Graph Node Redesign  
- New design tokens
- Agent avatars on nodes
- Selection syncs with store

### Phase 3: Cross-Cutting Polish
**Goal:** Deep links, mobile, final gates

**bb-ui2.28** - Deep Link Verification  
- All URL patterns work
- Browser back/forward
- Shareable URLs

**bb-ui2.29** - Screenshot Evidence  
- All breakpoints
- All views
- Mobile + desktop

**bb-ui2.30** - Final Gates  
- typecheck, lint, test
- Close epic

---

## Verification Strategy

After each bead:
```bash
npm run typecheck
npm run lint
npm run test
```

Visual verification:
- Screenshots at 390px, 768px, 1440px
- Compare against design spec
- Agent avatars visible on all cards
- Blocks/unlocks sections tinted correctly

---

*End of PRD v2.0 - Ready for Implementation*
