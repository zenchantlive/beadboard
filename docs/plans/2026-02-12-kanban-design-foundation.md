# BeadBoard Kanban Design System Plan

**Goal**
Ship a production-ready baseline visual system for Tracer Bullet 1 (Kanban) before further feature expansion.

**Primary decision**
Use **Tailwind CSS v4 + CSS tokens (`@theme`) + Framer Motion**.

## 1. Why This Stack

### Tailwind v4 is the right baseline
- Fastest path to a coherent, reusable system in Next.js 15.
- CSS-first token model (`@theme`) fits our need for semantic design tokens.
- Lets us avoid scattered inline styles and ad-hoc CSS files.

### Framer Motion should be scoped
- Use for state transitions (card changes, panel enter/exit, filtered results).
- Avoid decorative over-animation that hurts readability in a dense dashboard.

### Risks and mitigations
- Risk: “generic Tailwind look”
  - Mitigation: strict token palette + component contracts + typography rules.
- Risk: visual inconsistency
  - Mitigation: no direct color literals in component markup except token definitions.

## 2. Baseline-First Sequencing

This should happen **now**, not later.

1. Foundation (tokens, layout, core components)
2. Motion and interaction polish
3. Accessibility and responsive hardening
4. Continue other tracer bullets

## 3. Visual Language (v1)

### Product feel
- High-signal operations UI.
- Calm neutral surfaces with sharp status accents.
- Dense information without visual clutter.

### Typography
- Primary UI: `DM Sans` (or `Inter` fallback decision at implementation time)
- Metadata/IDs: `JetBrains Mono`

### Color model
- Semantic tokens only:
  - `background`, `foreground`, `surface`, `muted`
  - `status-open`, `status-in-progress`, `status-blocked`, `status-deferred`, `status-closed`
  - `priority-p0` ... `priority-p4`
- Contrast target: at least WCAG AA for normal text.

## 4. Component Contract

Required first-class components:
- `KanbanPageShell`
- `KanbanControls`
- `KanbanBoard`
- `KanbanColumn`
- `KanbanCard`
- `KanbanDetailPanel`
- shared: `Badge`, `Chip`, `StatPill`

Rules:
- Component variants defined via class composition (CVA optional but preferred).
- No inline style objects for production components.
- All spacing/radius/shadow/color come from tokens/utilities.

## 5. Layout Contract

### Desktop
- Sticky top header with filters + stats.
- Main grid: board + detail panel.
- Columns scroll horizontally as needed.

### Mobile
- Stacked controls.
- Board in horizontal swipe/scroll mode.
- Detail panel becomes full-screen drawer.

## 6. Motion Contract (Framer Motion)

Use motion for:
- Card appear/disappear on filtering.
- Detail panel slide-in/out.
- Subtle status count transitions.

Do not animate:
- Global page container on every render.
- Constant hover effects that reduce legibility/performance.

## 7. Tailwind v4 Implementation Plan

### Phase A: Design System Foundation (P0)
- Add Tailwind v4 pipeline with `@import "tailwindcss"` in global stylesheet.
- Define `@theme` token set (colors, radius, spacing aliases, shadows, motion tokens).
- Add base layer typography/background defaults.
- Replace inline styles in tracer-1 components with tokenized Tailwind classes.

Acceptance criteria:
- No inline style usage in `src/components/kanban/*` and shared primitives (except truly dynamic edge cases).
- UI at `localhost:3000` has coherent baseline styling.

### Phase B: Motion + Interaction Polish (P1)
- Integrate Framer Motion transitions for board and panel.
- Improve visual hierarchy of card metadata.
- Add polished empty/loading/error states.

Acceptance criteria:
- Motion communicates state changes without jitter.
- Filtering and detail interactions feel intentional.

### Phase C: Accessibility + Responsive Hardening (P1)
- Keyboard focus and traversal for cards/panel.
- Verify color contrast and focus visibility.
- Tune mobile breakpoints and touch targets.

Acceptance criteria:
- Keyboard-only flow works for core Kanban actions.
- Mobile experience is usable and visually consistent.

## 8. Technical Boundaries

- Read path remains `.beads/issues.jsonl` / `.beads/issues.jsonl.new`.
- No direct write path to JSONL.
- Styling changes must not alter read/write boundary behavior.

## 9. Definition of Done (Tracer-1 Design Baseline)

- Tailwind v4 configured and used as primary styling framework.
- Tokenized design system applied across tracer-1 Kanban components.
- Framer Motion integrated for key transitions.
- Tests/typecheck pass, app runs on `localhost:3000`.
- Visual result is clearly beyond prototype/demo quality.
