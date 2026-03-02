# Blocked Triage Modal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a BlockedTriageModal that shows all blocked tasks with blocker chain context and inline archetype assignment, replacing the TopBar "Blocked Items" toggle.

**Architecture:** The modal will use the same blocked computation logic as Kanban (`deriveBlockedIds` in kanban.ts) to accurately identify blocked tasks - both explicitly blocked (status='blocked') and derivation-blocked (has open blockers in dependency chain). Each row shows the blocker chain using `buildBlockedByTree`.

**Tech Stack:** React, shadcn/ui Dialog, useArchetypePicker hook, Next.js

---

### Task 1: Verify deriveBlockedIds export in kanban.ts

**Files:**
- Modify: `src/lib/kanban.ts:90-107`

**Step 1: Check if deriveBlockedIds is exported**

Run: `grep -n "export function deriveBlockedIds" src/lib/kanban.ts`
Expected: Should find export on line 90

If NOT exported, edit line 90:
```typescript
// Before
function deriveBlockedIds(issues: BeadIssue[]): Set<string> {

// After  
export function deriveBlockedIds(issues: BeadIssue[]): Set<string> {
```

**Step 2: Commit**

```bash
git add src/lib/kanban.ts
git commit -m "feat: export deriveBlockedIds for reuse in BlockedTriageModal"
```

---

### Task 2: Create BlockedTriageModal component

**Files:**
- Create: `src/components/shared/blocked-triage-modal.tsx`
- Test: `tests/components/blocked-triage-modal.test.tsx`

**Step 1: Write the failing test**

Create `tests/components/blocked-triage-modal.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { BlockedTriageModal } from '@/components/shared/blocked-triage-modal';
import { BeadIssue } from '@/lib/types';

const mockIssues: BeadIssue[] = [
  {
    id: 'task-1',
    title: 'Task One',
    status: 'blocked',
    issue_type: 'task',
    priority: 0,
    dependencies: [],
    labels: [],
    created_at: '2026-01-01',
    created_by: 'test',
    updated_at: '2026-01-01'
  },
  {
    id: 'task-2', 
    title: 'Task Two',
    status: 'open',
    issue_type: 'task',
    priority: 0,
    dependencies: [{ target: 'task-1', type: 'blocks' }],
    labels: [],
    created_at: '2026-01-01',
    created_by: 'test',
    updated_at: '2026-01-01'
  }
];

describe('BlockedTriageModal', () => {
  it('renders blocked tasks from both explicit status and derived blockers', () => {
    const onClose = jest.fn();
    const onAssign = jest.fn();
    
    render(
      <BlockedTriageModal
        isOpen={true}
        onClose={onClose}
        issues={mockIssues}
        projectRoot="test"
      />
    );
    
    // task-1 is explicitly blocked
    expect(screen.getByText('Task One')).toBeInTheDocument();
    // task-2 is blocked by task-1 (derived)
    expect(screen.getByText('Task Two')).toBeInTheDocument();
  });

  it('shows blocker chain for each blocked task', () => {
    const onClose = jest.fn();
    
    render(
      <BlockedTriageModal
        isOpen={true}
        onClose={onClose}
        issues={mockIssues}
        projectRoot="test"
      />
    );
    
    // Should show blocker chain
    expect(screen.getByText(/blocked by/i)).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- tests/components/blocked-triage-modal.test.tsx`
Expected: FAIL - file does not exist

**Step 3: Write minimal implementation**

Create `src/components/shared/blocked-triage-modal.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { deriveBlockedIds, buildBlockedByTree } from '@/lib/kanban';
import { useArchetypePicker } from '@/hooks/use-archetype-picker';
import type { BeadIssue } from '@/lib/types';

interface BlockedTriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  issues: BeadIssue[];
  projectRoot: string;
}

interface BlockedTaskRowProps {
  issue: BeadIssue;
  blockerChain: { id: string; title: string; status: string }[];
  onAssign: (issueId: string) => void;
}

function BlockedTaskRow({ issue, blockerChain, onAssign }: BlockedTaskRowProps) {
  const [showPicker, setShowPicker] = useState(false);
  const {
    selectedArchetype,
    setSelectedArchetype,
    isAssigning,
    assignError,
    assignSuccess,
    handleAssign,
    resetAssignState
  } = useArchetypePicker();

  const handleAssignClick = async () => {
    await handleAssign(issue.id);
    if (!assignError) {
      setShowPicker(false);
      resetAssignState();
      onAssign(issue.id);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-card)] p-3 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[var(--text-tertiary)]">{issue.id}</span>
            <span className="text-sm font-medium text-[var(--text-primary)]">{issue.title}</span>
          </div>
          
          {blockerChain.length > 0 && (
            <div className="mt-1 text-xs text-[var(--text-tertiary)]">
              <span className="text-[var(--accent-warning)]">Blocked by: </span>
              {blockerChain.map((blocker, idx) => (
                <span key={blocker.id}>
                  {idx > 0 && ', '}
                  <span className={blocker.status === 'closed' ? 'line-through' : ''}>
                    {blocker.id}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="ml-2 rounded-md bg-[var(--accent-info)] px-2 py-1 text-xs font-medium text-[var(--text-inverse)] hover:brightness-110"
        >
          Assign
        </button>
      </div>

      {showPicker && (
        <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
          <p className="text-xs text-[var(--text-tertiary)] mb-2">Select an archetype:</p>
          {/* Archetype picker UI - simplified for now */}
          <div className="flex gap-2">
            {['agent:coder', 'agent:reviewer', 'agent:writer'].map((archetype) => (
              <button
                key={archetype}
                type="button"
                onClick={() => setSelectedArchetype(archetype)}
                className={`rounded px-2 py-1 text-xs ${
                  selectedArchetype === archetype
                    ? 'bg-[var(--accent-success)] text-[var(--text-inverse)]'
                    : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                }`}
              >
                {archetype.replace('agent:', '')}
              </button>
            ))}
          </div>
          
          {assignError && (
            <p className="mt-1 text-xs text-[var(--accent-danger)]">{assignError}</p>
          )}
          
          <button
            type="button"
            onClick={handleAssignClick}
            disabled={!selectedArchetype || isAssigning}
            className="mt-2 rounded bg-[var(--accent-success)] px-3 py-1 text-xs font-medium text-[var(--text-inverse)] disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
          </button>
        </div>
      )}
    </div>
  );
}

export function BlockedTriageModal({ isOpen, onClose, issues, projectRoot }: BlockedTriageModalProps) {
  const blockedIds = useMemo(() => deriveBlockedIds(issues), [issues]);
  
  const blockedTasks = useMemo(() => {
    return issues.filter((issue) => 
      issue.status === 'blocked' || blockedIds.has(issue.id)
    );
  }, [issues, blockedIds]);

  const handleAssign = (issueId: string) => {
    // Trigger refresh - parent will handle SSE update
    console.log('Assigned agent to:', issueId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-[var(--accent-warning)]">⚠</span>
            Blocked Triage
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-2">
          {blockedTasks.length === 0 ? (
            <p className="text-center text-[var(--text-tertiary)] py-8">
              No blocked tasks found.
            </p>
          ) : (
            blockedTasks.map((issue) => {
              const blockerTree = buildBlockedByTree(issues, issue.id, { maxNodes: 5 });
              const blockerChain = blockerTree.nodes.map((node) => ({
                id: node.id,
                title: node.title,
                status: node.status
              }));
              
              return (
                <BlockedTaskRow
                  key={issue.id}
                  issue={issue}
                  blockerChain={blockerChain}
                  onAssign={handleAssign}
                />
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `npm run test -- tests/components/blocked-triage-modal.test.tsx`
Expected: PASS

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors

**Step 6: Commit**

```bash
git add src/components/shared/blocked-triage-modal.tsx tests/components/blocked-triage-modal.test.tsx
git commit -m "feat: add BlockedTriageModal with inline archetype picker"
```

---

### Task 3: Wire BlockedTriageModal into UnifiedShell and TopBar

**Files:**
- Modify: `src/components/shared/unified-shell.tsx`
- Modify: `src/components/shared/top-bar.tsx`

**Step 1: Add modal state to UnifiedShell**

Read `src/components/shared/unified-shell.tsx` to find where state is defined, then add:

```tsx
const [blockedTriageOpen, setBlockedTriageOpen] = useState(false);
```

Add handler:
```tsx
const handleOpenBlockedTriage = useCallback(() => {
  setBlockedTriageOpen(true);
}, []);

const handleCloseBlockedTriage = useCallback(() => {
  setBlockedTriageOpen(false);
}, []);
```

**Step 2: Pass handler to TopBar**

Find the `<TopBar` component and add:
```tsx
onOpenBlockedTriage={handleOpenBlockedTriage}
```

**Step 3: Update TopBar to accept and use the handler**

In `top-bar.tsx`, add to TopBarProps:
```tsx
onOpenBlockedTriage?: () => void;
```

In the TopBar component, change the blocked button:
```tsx
// Before
onClick={toggleBlockedOnly}

// After
onClick={onOpenBlockedTriage}
```

**Step 4: Import and render BlockedTriageModal in UnifiedShell**

Add import:
```tsx
import { BlockedTriageModal } from './blocked-triage-modal';
```

Add render (at end of return, inside main container):
```tsx
<BlockedTriageModal
  isOpen={blockedTriageOpen}
  onClose={handleCloseBlockedTriage}
  issues={issues}
  projectRoot={projectRoot}
/>
```

**Step 5: Run typecheck**

Run: `npm run typecheck`
Expected: PASS with 0 errors

**Step 6: Commit**

```bash
git add src/components/shared/unified-shell.tsx src/components/shared/top-bar.tsx
git commit -m "feat: wire BlockedTriageModal to TopBar blocked button"
```

---

### Task 4: Verify full integration

**Step 1: Run all tests**

Run: `npm run test`
Expected: All tests pass

**Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors

**Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: 0 errors

**Step 4: Update bead notes**

```bash
bd update beadboard-d2x.1 --notes "BlockedTriageModal implemented with deriveBlockedIds for accurate blocked computation. Uses buildBlockedByTree for blocker chain context. Inline archetype picker per row. Typecheck, lint, test all pass."
```

---

### Summary

| Task | Description |
|------|--------------|
| 1 | Export `deriveBlockedIds` from kanban.ts |
| 2 | Create BlockedTriageModal component with tests |
| 3 | Wire modal to UnifiedShell and TopBar |
| 4 | Verify full integration |
