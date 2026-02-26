# Comprehensive Theme System Design

## The Problem
We have colors scattered across 67+ files:
- Hardcoded hex: `bg-[#0a111a]`, `bg-[#111f2b]`, `bg-[#14202e]`
- Inline styles: `style={{ backgroundColor: '#1a2d3d' }}`
- Arbitrary Tailwind: `bg-white/5`, `border-white/10`
- Mixed variable systems: `--ui-bg-*`, `--color-bg-*`, etc.

## The Solution: Unified Theme System

### File Structure
```
src/styles/
  themes/
    index.css           ← Theme definitions + data-attribute switching
    tokens.css          ← Base CSS variable names (no values)
  components/
    surfaces.css        ← Surface layer utilities
    interactions.css    ← Hover, focus, active states
```

### Token Architecture (12 Semantic Categories)

#### 1. SURFACE LAYERS (Backgrounds)
```css
--surface-backdrop:      /* Page background */
--surface-elevated:      /* Header - sits on top */
--surface-primary:       /* Left sidebar */
--surface-secondary:     /* Main content area */
--surface-tertiary:      /* Panels/cards within sidebars */
--surface-quaternary:    /* Cards */
--surface-overlay:       /* Modals, dropdowns, drawers */
--surface-input:         /* Form fields, inputs */
--surface-hover:         /* Hover states */
--surface-active:        /* Active/selected states */
--surface-tooltip:       /* Tooltips, popovers */
```

#### 2. BORDERS
```css
--border-subtle:         /* Dividers between sections */
--border-default:        /* Card borders */
--border-strong:         /* Focus rings, selected states */
--border-accent:         /* Colored status borders */
```

#### 3. TEXT
```css
--text-primary:          /* Headlines, important text */
--text-secondary:        /* Body text */
--text-tertiary:         /* Muted, hints */
--text-disabled:         /* Disabled elements */
--text-inverse:          /* Text on colored backgrounds */
```

#### 4. ACCENTS (Functional)
```css
--accent-info:           /* Cyan - links, actions */
--accent-success:        /* Green - ready, done */
--accent-warning:        /* Amber - in progress */
--accent-danger:         /* Red - blocked, errors */
```

#### 5. ACCENTS (Aurora Glow)
```css
--glow-info:             /* Box-shadow glow for info */
--glow-success:          /* Box-shadow glow for success */
--glow-warning:          /* Box-shadow glow for warning */
--glow-danger:           /* Box-shadow glow for danger */
```

#### 6. GRAPH COLORS
```css
--graph-node-default:    /* Default node background */
--graph-node-epic:       /* Epic node accent */
--graph-edge-default:    /* Default edge color */
--graph-edge-selected:   /* Selected edge color */
--graph-edge-cycle:      /* Cycle warning color */
```

#### 7. SEMANTIC ALPHAS
Instead of `bg-white/5` and `bg-black/40`, use themeable alphas:
```css
--alpha-white-low:       /* 5% white */
--alpha-white-medium:    /* 10% white */
--alpha-white-high:      /* 20% white */
--alpha-black-low:       /* 10% black */
--alpha-black-medium:    /* 40% black */
--alpha-black-high:      /* 80% black */
```

#### 8. STATUS COLORS
```css
--status-ready:          /* Ready/open status */
--status-in-progress:    /* In progress status */
--status-blocked:        /* Blocked status */
--status-closed:         /* Closed/done status */
--status-deferred:       /* Deferred status */
```

#### 9. SHADOWS
```css
--shadow-sm:             /* Subtle elevation */
--shadow-md:             /* Cards */
--shadow-lg:             /* Modals, drawers */
--shadow-glow-info:      /* Aurora glow */
--shadow-glow-success:   /* Aurora glow */
--shadow-glow-warning:   /* Aurora glow */
--shadow-glow-danger:    /* Aurora glow */
```

#### 10. AGENT/ROLE COLORS
```css
--agent-role-ui:         /* UI role color */
--agent-role-graph:      /* Graph role color */
--agent-role-orchestrator: /* Orchestrator role */
--agent-role-researcher: /* Researcher role */
```

#### 11. SCROLLBARS
```css
--scrollbar-track:       /* Scrollbar track */
--scrollbar-thumb:       /* Scrollbar thumb */
--scrollbar-thumb-hover: /* Scrollbar thumb hover */
```

#### 12. CODE/SYNTAX
```css
--code-background:       /* Code block background */
--code-text:             /* Code text color */
```

---

## Theme Definitions (Example)

### Aurora Theme (Current)
```css
[data-theme="aurora"] {
  /* Surfaces - Warm Charcoal */
  --surface-backdrop: #181716;
  --surface-elevated: #131211;
  --surface-primary: #1f1e1d;
  --surface-secondary: #242322;
  --surface-tertiary: #282725;
  --surface-quaternary: #302e2c;
  --surface-overlay: #0d0c0b;
  
  /* Borders */
  --border-subtle: rgba(180, 175, 165, 0.15);
  --border-default: rgba(180, 175, 165, 0.25);
  --border-strong: rgba(180, 175, 165, 0.4);
  
  /* Text */
  --text-primary: #f0eeea;
  --text-secondary: #c9c5bc;
  --text-tertiary: #a8a49a;
  
  /* Accents */
  --accent-info: #35c9ff;
  --accent-success: #35d98f;
  --accent-warning: #ffb24a;
  --accent-danger: #ff4c72;
  
  /* Glows */
  --glow-info: 0 0 20px rgba(53, 201, 255, 0.3);
  --glow-success: 0 0 20px rgba(53, 217, 143, 0.3);
  
  /* Graph */
  --graph-node-default: rgba(48, 46, 44, 0.8);
  --graph-node-epic: rgba(53, 201, 255, 0.15);
  --graph-edge-default: rgba(180, 175, 165, 0.3);
  --graph-edge-selected: #35c9ff;
  
  /* Alphas */
  --alpha-white-low: rgba(240, 238, 234, 0.05);
  --alpha-white-medium: rgba(240, 238, 234, 0.1);
  --alpha-black-medium: rgba(0, 0, 0, 0.4);
}
```

### Midnight Theme (Future)
```css
[data-theme="midnight"] {
  --surface-backdrop: #0a0a0f;
  --surface-elevated: #050508;
  --surface-primary: #111118;
  --surface-secondary: #151520;
  --surface-quaternary: #1e1e2e;
  
  --accent-info: #8b5cf6;
  --accent-success: #10b981;
  
  /* Same structure, different values */
}
```

---

## Migration Strategy

### Phase 1: Create Token System
1. Create `src/styles/themes/index.css` with token definitions
2. Create `src/styles/themes/tokens.css` with token names
3. Add data-theme attribute to layout

### Phase 2: Component Audit & Migration
For each component:
1. Replace hardcoded colors with semantic tokens
2. Replace `bg-white/5` with `bg-[var(--alpha-white-low)]`
3. Replace `bg-[#0a111a]` with appropriate surface token

### Phase 3: Graph/Flow Colors
1. Extract all graph colors to `--graph-*` tokens
2. Update ReactFlow styles to use CSS variables

### Phase 4: Validation
1. Create theme preview page showing all tokens
2. Verify no hardcoded colors remain

---

## Usage Examples

### Before (Chaos):
```tsx
<div className="bg-[#0a111a] border border-white/10">
  <span className="text-[#a8a49a]">Text</span>
</div>
```

### After (Clean):
```tsx
<div className="bg-[var(--surface-tertiary)] border border-[var(--border-default)]">
  <span className="text-[var(--text-tertiary)]">Text</span>
</div>
```

### With Tailwind utilities (even cleaner):
```tsx
<div className="surface-tertiary border-default">
  <span className="text-tertiary">Text</span>
</div>
```

---

## Component Mapping Guide

| Component | Current | New Token |
|-----------|---------|-----------|
| TopBar | `bg-[var(--ui-bg-header)]` | `bg-[var(--surface-elevated)]` |
| LeftPanel | `bg-[var(--ui-bg-shell)]` | `bg-[var(--surface-primary)]` |
| Main content | `bg-[var(--ui-bg-main)]` | `bg-[var(--surface-secondary)]` |
| SocialCard | `bg-[var(--ui-bg-card)]` | `bg-[var(--surface-quaternary)]` |
| AssignmentPanel | `bg-[#0a111a]` | `bg-[var(--surface-tertiary)]` |
| Modal/Drawer | `bg-[#0d0c0b]` | `bg-[var(--surface-overlay)]` |
| Input fields | `bg-[#0f1824]` | `bg-[var(--surface-input)]` |

---

## Files That Need Migration (Priority Order)

### HIGH (Core UI):
1. `src/app/globals.css` - Define tokens
2. `src/components/shared/unified-shell.tsx` - Main layout
3. `src/components/shared/top-bar.tsx` - Header
4. `src/components/shared/left-panel.tsx` - Sidebar
5. `src/components/shared/right-panel.tsx` - Right panel
6. `src/components/social/social-card.tsx` - Cards

### MEDIUM (Active Views):
7. `src/components/graph/assignment-panel.tsx` - Heavy hardcoded colors
8. `src/components/graph/graph-node-card.tsx` - Graph nodes
9. `src/components/activity/swarm-command-feed.tsx` - Activity feed
10. `src/components/graph/smart-dag.tsx` - Graph background

### LOWER (Secondary):
11. All modal/dialog components
12. All form/input components
13. Kanban components (if still used)
14. Swarm components

---

## Success Criteria

- [ ] Zero hardcoded hex colors in components (except for data viz)
- [ ] Zero `bg-white/X` or `bg-black/X` - all use `--alpha-*` tokens
- [ ] Theme switcher works instantly without reload
- [ ] All 12 token categories have values for each theme
- [ ] Visual regression test passes (no unintended changes)

---

## For You (The Human)

Once this is implemented, you can just say:
> "Change the sidebar to be slightly lighter in the aurora theme"

And I'll know exactly where to go:
```css
[data-theme="aurora"] {
  --surface-primary: #252422; /* Changed from #1f1e1d */
}
```

Or:
> "Make the aurora glow more subtle"

```css
[data-theme="aurora"] {
  --glow-info: 0 0 12px rgba(53, 201, 255, 0.15); /* Reduced from 20px/0.3 */
}
```

Everything in one place. No hunting through 67 files.
