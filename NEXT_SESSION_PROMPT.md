# Next Session: bb-ui2.6, bb-ui2.7, bb-ui2.8 - Shell Layout Components

## Context: Recovery from Corruption Incident

Last session we recovered from a catastrophic file corruption event where null bytes overwrote dozens of files. We:
- Recovered tracked files from git stash commits
- Reinstalled node_modules and regenerated shadcn components
- Recreated earthy-dark tokens from bead specifications
- Committed all work with story-driven commit messages
- Created PR #10: https://github.com/zenchantlive/beadboard/pull/10

**Current branch:** `feat/bb-ui2` (branched from recovery branch)

## Beads to Complete This Session

### bb-ui2.6: TopBar (1.3)
**Location:** `src/components/shared/top-bar.tsx`
**Dependency:** ✅ bb-ui2.5 (UnifiedShell) is CLOSED

Create top navigation bar with:
- Three view tabs: Social, Graph, Swarm
- Active state indicator (bold text, accent underline)
- Placeholder filter/search inputs
- Wire tab clicks to `useUrlState.setView`

```
┌─────────────────────────────────────────────────────────┐
│ [Social] [Graph] [Swarm]    │ [🔍 filter] [⚙ settings] │
└─────────────────────────────────────────────────────────┘
```

### bb-ui2.7: LeftPanel (1.4)
**Location:** `src/components/shared/left-panel.tsx`
**Dependency:** ✅ bb-ui2.5 (UnifiedShell) is CLOSED

Create left sidebar with:
- Channel tree for epic filtering
- Fetch epics from bd API
- Expandable tree structure
- Project scope controls
- Responsive collapse (desktop: 13rem, tablet: collapsed, mobile: hidden)

```
┌──────────────┐
│ CHANNELS     │
├──────────────┤
│ ▼ bb-ui2     │
│   ▶ bb-ui2.0 │
│ ▼ bb-buff    │
├──────────────┤
│ SCOPE        │
└──────────────┘
```

### bb-ui2.8: RightPanel (1.5)
**Location:** `src/components/shared/right-panel.tsx`
**Dependency:** ✅ bb-ui2.5 (UnifiedShell) is CLOSED

Create right panel with responsive behavior:
- Desktop (>=1024px): Fixed sidebar 17rem, always visible
- Tablet (768-1024px): Slide-over from right, backdrop
- Mobile (<768px): Full-screen drawer

Also create: `src/hooks/use-responsive.ts`

## Existing Components (Do Not Recreate)

- `src/components/shared/unified-shell.tsx` - Main 3-panel grid layout ✅
- `src/components/shared/base-card.tsx` - Card primitive ✅
- `src/components/shared/agent-avatar.tsx` - Avatar with liveness ✅
- `src/components/shared/status-badge.tsx` - Status display ✅
- `src/hooks/use-url-state.ts` - URL state management ✅
- `src/lib/social-cards.ts` - Social data builder ✅
- `src/lib/swarm-cards.ts` - Swarm data builder ✅
- `src/components/shared/workflow-graph.tsx` - Graph component ✅

## Key Hooks to Use

- `useUrlState` from `src/hooks/use-url-state.ts` for view/tab state
- Create `useResponsive` for breakpoint detection (bb-ui2.8)

## Design Tokens

Earthy-dark tokens are in `src/app/globals.css`:
- `--color-accent-green: #7CB97A`
- `--color-accent-amber: #D4A574`
- `--color-accent-teal: #5BA8A0`
- `--liveness-active/stale/stuck/dead` for agent states

## Verification Commands

After each bead:
```bash
npm run typecheck
npm run lint
npm run test
```

## Workflow

1. Claim bead: `bd update <id> --status in_progress --notes "<plan>"`
2. Write failing tests first (TDD)
3. Implement minimal code to pass
4. Run verification gates
5. Close bead: `bd close <id> --reason "<what was completed>"`
6. Commit with story-driven message

## Session Start Commands

```bash
# Check current branch
git branch

# Verify we're on feat/bb-ui2
# If not: git checkout feat/bb-ui2

# Check bead status
bd show bb-ui2.6
bd show bb-ui2.7
bd show bb-ui2.8

# Claim first bead
bd update bb-ui2.6 --status in_progress --notes "Starting TopBar implementation"
```

## Important Reminders

1. **Commit frequently** - The corruption incident taught us that uncommitted work is at risk
2. **Run gates before closing beads** - typecheck, lint, test must all pass
3. **Use closed beads for commit messages** - Reference the bead ID and describe the story
4. **Test responsive behavior** - Check at 390px, 768px, 1440px widths
5. **Wire to useUrlState** - URL is the single source of truth for view state

