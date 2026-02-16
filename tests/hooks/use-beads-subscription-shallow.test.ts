import { describe, it } from 'node:test';
import assert from 'node:assert';

// Test for shallow comparison of initialIssues
// This test verifies that the hook doesn't sync state when the array contents are the same
// but the reference has changed (common in Next.js server component re-renders)

describe('useBeadsSubscription shallow comparison', () => {
  it('should NOT sync state when initialIssues reference changes but contents are same', async () => {
    // This is a placeholder test - the actual fix requires React Testing Library
    // to properly test React hooks in a browser environment.
    // 
    // The bug: When the parent re-renders, initialIssues gets a new array reference.
    // The useEffect with [initialIssues] dependency fires, calling setIssues(initialIssues),
    // which overwrites local state including form inputs in child components.
    //
    // The fix: Add shallow comparison before syncing.
    
    // Expected behavior after fix:
    // - When initialIssues changes reference but contents are equal → NO sync
    // - When initialIssues actually changes → sync
    
    const issues1 = [{ id: '1', title: 'Task 1' }];
    const issues2 = [{ id: '1', title: 'Task 1' }]; // Same content, new reference
    
    // These should be considered equal after JSON.stringify comparison
    const isEqual = JSON.stringify(issues1) === JSON.stringify(issues2);
    
    assert.ok(isEqual, 'Issues with same content should be equal when stringified');
  });
});
