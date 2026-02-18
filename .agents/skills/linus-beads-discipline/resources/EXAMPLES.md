# Examples

**Before/after code comparisons demonstrating Linus-Beads discipline.**

## Abstraction

### ❌ Bad: Abstraction Without Need

```typescript
// "We might need to support different backends later"
interface ITaskRepository {
  getTasks(): Promise<Task[]>;
  saveTask(task: Task): Promise<void>;
}

class JsonlTaskRepository implements ITaskRepository { 
  // 50 lines of implementation
}

class MemoryTaskRepository implements ITaskRepository { 
  // 40 lines for "testing" - but no test uses it
}

// Current requirement: Read from JSONL, write via bd CLI
// This adds: 1 interface, 2 classes, 90+ lines
// This provides: 0 current value
// This costs: maintenance burden forever
```

### ✅ Good: Direct Implementation

```typescript
// Current requirement: Read from JSONL, write via bd
function readIssues(rootPath: string): Issue[] {
  const content = fs.readFileSync(`${rootPath}/.beads/issues.jsonl`, 'utf-8');
  return parseJsonl(content);
}

// 8 lines. Obvious. Correct.
// Abstraction added ONLY when second backend proven by actual need
```

## Evidence Skip

### ❌ Bad: Claim Without Evidence

```bash
# Agent: "I tested it manually, works"
bd close bb-xyz --reason "Fixed the bug"
# No evidence cited
# No gates run
# Claim accepted without proof
```

### ✅ Good: Evidence Cited

```bash
# Run gates first
npm run typecheck  # PASS - 0 errors
npm run lint       # PASS - 0 warnings  
npm run test       # PASS - 47 tests in 2.3s

# Document evidence
bd update bb-xyz --notes "
Verification complete:
- typecheck: PASS (0 errors, 0 warnings)
- lint: PASS (0 warnings)
- test: PASS (47/47, 2.3s)
- UI: artifacts/fix-mobile-390.png
"

# Close with proof
bd close bb-xyz --reason "Fixed with full verification. All gates pass."
```

## Duplicate Fix

### ❌ Bad: Copy-Paste Fix

```typescript
// kanban-detail.tsx
function renderStatus(status: string) {
  const colors = {
    open: 'text-green-400',
    in_progress: 'text-blue-400',
    blocked: 'text-red-400',
    closed: 'text-gray-400'
  };
  return <span className={colors[status]}>{status}</span>;
}

// graph-detail.tsx (different page, same need)
function renderStatus(status: string) {
  const colors = {
    open: 'text-green-500',     // Different shade
    in_progress: 'text-blue-500',
    blocked: 'text-red-500', 
    closed: 'text-gray-500'
  };
  return <span className={colors[status]}>{status}</span>;
}

// Two places to maintain
// Two places to have bugs
// Inconsistency breeds confusion
```

### ✅ Good: Shared Logic

```typescript
// shared/status-renderer.tsx
export const STATUS_COLORS = {
  open: 'text-green-400',
  in_progress: 'text-blue-400', 
  blocked: 'text-red-400',
  closed: 'text-gray-400'
} as const;

export function renderStatus(status: string) {
  return <span className={STATUS_COLORS[status]}>{status}</span>;
}

// kanban-detail.tsx
import { renderStatus } from '@/shared/status-renderer';

// graph-detail.tsx
import { renderStatus } from '@/shared/status-renderer';

// One implementation
// One place to maintain
// Consistency guaranteed
```

## BD Bypass

### ❌ Bad: Direct JSONL Write

```typescript
// "bd update is too slow for this simple change"
const issues = JSON.parse(fs.readFileSync('.beads/issues.jsonl'));
issues.push(newIssue);
fs.writeFileSync('.beads/issues.jsonl', JSON.stringify(issues));

// Truth bypassed
// Schema potentially violated
// bd state unknown
// Race condition with other bd operations
```

### ✅ Good: BD Command

```bash
# Use bd CLI for all mutations
bd create --title "New task" --acceptance "Must work"

# bd ensures:
# - Schema validation
# - ID uniqueness
# - Dependency integrity
# - Git sync
```

## Bug Fix

### ❌ Bad: Patch Symptom

```typescript
// Bug: crash when user.profile is null
// Fix: Add null check at crash site
function renderUserCard(user: User) {
  return (
    <Card>
      <Text>{user.name}</Text>
      {user.profile && <Text>{user.profile.bio}</Text>}
    </Card>
  );
}

// Problem: user.profile being null is unexpected
// This hides the real bug: why is profile null?
// 10 other places might crash on null profile
```

### ✅ Good: Fix Root Cause

```typescript
// Trace: why is user.profile null?
// Found: ProfileService.load() fails silently

// Fix the service
class ProfileService {
  async load(userId: string): Promise<Profile> {
    const profile = await this.db.profiles.find(userId);
    if (!profile) {
      // Create default instead of returning null
      return this.createDefault(userId);
    }
    return profile;
  }
}

// Now user.profile is never null
// Entire bug class eliminated
// All 10 crash sites now safe
```

## Complexity

### ❌ Bad: Nested Logic

```typescript
function processOrder(order: Order) {
  if (order.status === 'pending') {
    if (order.items.length > 0) {
      for (const item of order.items) {
        if (item.available) {
          if (item.price > 0) {
            // 5 levels deep
            // Hard to read
            // Hard to test
            // Bug-prone
          }
        }
      }
    }
  }
}
```

### ✅ Good: Early Returns

```typescript
function processOrder(order: Order) {
  if (order.status !== 'pending') return;
  if (order.items.length === 0) return;
  
  const validItems = order.items
    .filter(item => item.available && item.price > 0);
  
  // 1 level deep
  // Obvious flow
  // Easy to test
  // Correct by inspection
}
```

## Evidence in Notes

### ❌ Bad: Vague Notes

```bash
bd update bb-xyz --notes "Made progress on the feature"
# No specifics
# No evidence
# No verification status
# Future agent can't assess state
```

### ✅ Good: Specific Evidence

```bash
bd update bb-xyz --notes "
Progress: implemented core logic
Files: src/lib/task-processor.ts (new), src/app/api/tasks/route.ts (modified)
Tests: tests/lib/task-processor.test.ts (5 tests passing)
Status: need to add error handling before close
Blockers: none
Next: npm run test to verify integration
"
# Specific
# Reproducible
# Future agent knows exact state
```

## Close Without Verification

### ❌ Bad: Premature Close

```bash
# Code written, not tested
bd close bb-xyz --reason "Done"
# Gates not run
# Evidence not cited
# Risk of regression
```

### ✅ Good: Verified Close

```bash
# Complete verification
npm run typecheck && npm run lint && npm run test
# All gates pass

bd update bb-xyz --notes "
Final verification:
- typecheck: PASS (0 errors)
- lint: PASS (0 warnings)  
- test: PASS (52/52 tests)
- Coverage: 87% on new code
"

bd close bb-xyz --reason "Complete with full verification. 52 tests passing, 87% coverage."
```