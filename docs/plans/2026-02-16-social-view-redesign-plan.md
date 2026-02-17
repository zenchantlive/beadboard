# Implementation Plan: Social View Redesign Phase 1

## Overview

Complete redesign of the Social View in BeadBoard to create a modern card-based interface inspired by Asana + Facebook + Slack. This phase focuses on the Social view only, implementing a responsive grid layout with full blocks/unlocks display and a detail strip that slides up from below the cards on desktop.

## Implementation Status

> **Updated: 2026-02-16**
> 
> **Phase 0 (Design Foundation) Status:**
> - ✅ bb-ui2.1 (Design Tokens) - COMPLETED
>   - Added complete earthy-dark token system in globals.css
>   - Added legacy compatibility tokens for backward compatibility with existing Aero Chrome components
> - ⏳ bb-ui2.2 (Semantic Rename) - PENDING (blocked by tokens)
> - ⏳ bb-ui2.3 (Base Card Component) - PENDING (blocked by tokens)

**Note:** The legacy Aero Chrome classes (.workflow-card, .glass-panel, .ui-field, etc.) are preserved in globals.css for backward compatibility with existing components that haven't been refactored yet. New components should use the earthy-dark design tokens. This is intentional - gradual migration rather than big-bang rewrite.

## Scope

- **Phase 1 only**: Social View redesign
- **Not included**: Swarm view, Graph view, Timeline (future phases)
- **Target**: 4-column responsive grid (desktop), detail strip positioning, full card content

## Types

### Data Types (No changes needed - already exists)

```typescript
// Already in src/lib/types.ts
type BeadStatus = 'open' | 'in_progress' | 'blocked' | 'deferred' | 'closed' | 'tombstone' | 'pinned' | 'hooked';
type BeadDependencyType = 'blocks' | 'parent' | 'relates_to' | 'duplicates' | 'supersedes' | 'replies_to';
```

### New/Modified Types

```typescript
// In src/lib/social-cards.ts - rename fields for semantic clarity
interface SocialCard {
  id: string;
  title: string;
  status: SocialCardStatus;
  blocks: string[];        // renamed from 'unlocks' - tasks THIS task blocks (amber)
  unblocks: string[];      // renamed from 'blocks' - tasks blocking THIS task (rose)
  agents: AgentInfo[];
  lastActivity: Date;
  priority: SocialCardPriority;
}
```

### Component Props

```typescript
// SocialCardProps - enhanced with full blocks/unlocks display
interface SocialCardProps {
  data: SocialCard;
  className?: string;
  selected?: boolean;
  onClick?: () => void;
  onJumpToGraph?: (id: string) => void;
  onJumpToKanban?: (id: string) => void;
}

// SocialPageProps - already adequate, no changes needed
interface SocialPageProps {
  issues: BeadIssue[];
  selectedId?: string;
  onSelect: (id: string) => void;
}
```

## Files

### Files to Modify

| File | Changes |
|------|---------|
| `src/app/globals.css` | Add complete earthy-dark token system from PRD |
| `src/lib/social-cards.ts` | Rename `unlocks`→`blocks`, `blocks`→`unblocks`, add full detail data |
| `src/components/social/social-card.tsx` | Complete redesign with full blocks/unlocks display |
| `src/components/social/social-page.tsx` | Responsive grid (4→2→1), detail strip integration |
| `src/components/shared/base-card.tsx` | Status borders, 10px radius |
| `src/components/shared/agent-avatar.tsx` | Role-colored borders, ZFC state indicators |
| `src/components/shared/unified-shell.tsx` | Detail strip positioning (below cards on desktop) |

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/social/detail-strip.tsx` | New component for conversation/detail panel |

### Reference Files (Read Only)

| File | Purpose |
|------|---------|
| `src/components/graph/task-card-grid.tsx` | Blocks/unlocks display pattern (lines 227-330) |
| `src/components/shared/thread-drawer.tsx` | Current drawer implementation to replace |

## Functions

### Modified Functions

| Function | File | Changes |
|----------|------|---------|
| `buildSocialCards()` | `src/lib/social-cards.ts` | Swap `unlocks`/`blocks` field names, populate full detail |
| `SocialCard` component | `src/components/social/social-card.tsx` | Complete redesign with blocks/unlocks sections |
| `SocialPage` component | `src/components/social/social-page.tsx` | Responsive grid, detail strip positioning |
| `BaseCard` component | `src/components/shared/base-card.tsx` | Status-colored borders, radius |
| `AgentAvatar` component | `src/components/shared/agent-avatar.tsx` | Role-colored ring, ZFC states |

### New Functions

| Function | File | Purpose |
|----------|------|---------|
| `DetailStrip` component | `src/components/social/detail-strip.tsx` | Conversation panel that slides up |

## Classes

### No new classes required

Using functional React components with hooks.

## Dependencies

### Existing Dependencies (Already in project)

- `react`, `react-dom` - UI framework
- `@radix-ui/react-avatar` - Avatar primitive
- `lucide-react` - Icons
- `clsx`, `tailwind-merge` - Class utilities
- `tailwindcss-animate` - Animations

### No new dependencies needed

All functionality achievable with existing dependencies.

## Testing

### Test Strategy

1. **Visual regression**: Compare screenshots before/after
2. **Responsive testing**: Verify 4→2→1 column layout
3. **Interaction testing**: Card selection, detail strip behavior
4. **Type safety**: Ensure TypeScript compiles without errors

### Test Files to Check

```bash
npm run typecheck
npm run lint  
npm run test
```

## Implementation Order

### Step 1: Design Tokens (bb-ui2.1)
- Update `globals.css` with complete earthy-dark token system
- Add missing: agent role colors, liveness colors, radii, shadows
- Verify tokens match PRD exactly

### Step 2: Semantic Rename (bb-ui2.2)
- Rename fields in `social-cards.ts`: `unlocks`→`blocks`, `blocks`→`unblocks`
- Update all consumers of these fields
- Run typecheck to verify

### Step 3: Base Card Component (bb-ui2.3)
- Modify `BaseCard` with:
  - Status-colored 1px borders
  - 10px radius (`--radius-card: 0.625rem`)
  - #363636 background

### Step 4: Agent Avatar Enhancement (bb-ui2.4)
- Add role-colored left border ring
- Implement ZFC state indicators:
  - working: pulsing green glow
  - stuck: attention amber dot
  - dead: warning red

### Step 5: SocialCard Redesign (bb-ui2.5)
- Full card anatomy:
  - Task ID (teal, tiny)
  - Title (bold, white)
  - BLOCKS section (rose tint): tasks blocking ME
  - UNBLOCKS section (amber tint): tasks I block
  - Agent avatars (prominent, role-colored)
  - Last message preview
  - View-jump icons
- Reuse blocks/unlocks pattern from task-card-grid.tsx

### Step 6: Responsive Grid Layout (bb-ui2.6)
- Update `SocialPage` grid:
  - Desktop (≥1024px): 4 columns
  - Tablet (768-1023px): 2 columns
  - Mobile (<768px): 1 column
- Use CSS Grid with `minmax()` for responsiveness

### Step 7: Detail Strip Positioning (bb-ui2.7)
- Create new `DetailStrip` component
- Desktop: Slides UP from below the card grid (not bottom of page)
- Mobile: Full-screen overlay
- Connect to URL state for selected task

### Step 8: Verification (bb-ui2.8)
- Run typecheck, lint, test
- Capture screenshots at all breakpoints
- Verify visual improvements match PRD

## Bead Structure

```
bb-ui2.1  → Design Tokens Update
bb-ui2.2  → Semantic Rename (unlocks↔blocks)
bb-ui2.3  → Base Card Component
bb-ui2.4  → Agent Avatar Enhancement
bb-ui2.5  → SocialCard Redesign
bb-ui2.6  → Responsive Grid Layout
bb-ui2.7  → Detail Strip Positioning
bb-ui2.8  → Verification + Screenshots
```

## Dependencies Between Beads

```
bb-ui2.1 (tokens)
    ↓
bb-ui2.2 (semantic rename) → bb-ui2.1
    ↓
bb-ui2.3 (base card) → bb-ui2.1
    ↓
bb-ui2.4 (avatar) → bb-ui2.3
    ↓
bb-ui2.5 (card redesign) → bb-ui2.2, bb-ui2.3, bb-ui2.4
    ↓
bb-ui2.6 (grid) → bb-ui2.5
    ↓
bb-ui2.7 (detail strip) → bb-ui2.5, bb-ui2.6
    ↓
bb-ui2.8 (verification) → bb-ui2.6, bb-ui2.7
```

## Key Design Details from PRD

### Blocks/Unlocks Color Mapping

| Relationship | Color | Tailwind |
|--------------|-------|----------|
| Tasks blocking ME (unblocks) | Rose tint | bg-rose-500/10, text-rose-400/80 |
| Tasks I block (blocks) | Amber tint | bg-amber-500/10, text-amber-400/80 |

### Status Colors

| Status | Color | Tailwind |
|--------|-------|----------|
| open/ready | Teal | #5BA8A0 |
| in_progress | Green | #7CB97A |
| blocked | Amber | #D4A574 |
| closed | Muted | #888888 |

### Agent Role Colors

| Role | Color |
|------|-------|
| ui | #6B9BD2 (steel blue) |
| graph | #7CB97A (green) |
| orchestrator | #B08ED6 (soft purple) |
| agent | #B8B8B8 (neutral) |
| researcher | #D4A574 (amber) |

### Card Specs

- Background: #363636
- Border: 1px status-colored
- Border-radius: 10px
- Padding: 1rem-1.25rem

### ZFC State Visuals

| State | Visual |
|-------|--------|
| idle | #888888 static dot |
| spawning | #5BA8A0 pulsing dot |
| running | #7CB97A animated dot |
| working | #7CB97A pulsing glow |
| stuck | #D4A574 attention dot |
| done | #7CB97A check |
| dead | #C97A7A warning |
