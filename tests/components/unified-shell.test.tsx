import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

// Test that the UnifiedShell component exists and exports correctly
test('UnifiedShell - file exists and exports', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('export function UnifiedShell'), 'Should export UnifiedShell function');
  assert.ok(fileContent.includes('export interface UnifiedShellProps'), 'Should export UnifiedShellProps interface');
});

// Test that UnifiedShell has assignMode state
test('UnifiedShell - has assignMode state', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('assignMode'), 'Should have assignMode state');
});

// Test that UnifiedShell has selectedAssignIssue state
test('UnifiedShell - has selectedAssignIssue state', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('selectedAssignIssue'), 'Should have selectedAssignIssue state');
});

// Test that SmartDag receives onAssignModeChange callback
test('UnifiedShell - passes onAssignModeChange to SmartDag', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('onAssignModeChange'), 'Should pass onAssignModeChange to SmartDag');
});

// Test that SmartDag receives onSelectedIssueChange callback
test('UnifiedShell - passes onSelectedIssueChange to SmartDag', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('onSelectedIssueChange'), 'Should pass onSelectedIssueChange to SmartDag');
});

// Test that AssignmentPanel is imported
test('UnifiedShell - imports AssignmentPanel', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('AssignmentPanel'), 'Should import AssignmentPanel');
});

// Test that AssignmentPanel is rendered conditionally based on view and assignMode
test('UnifiedShell - renders AssignmentPanel conditionally', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  // Check for the condition: view === 'graph' && assignMode
  assert.ok(fileContent.includes("view === 'graph' && assignMode"), 'Should check view === graph && assignMode condition for AssignmentPanel');
});

// Test that SwarmWorkspace import is removed (deprecated)
test('UnifiedShell - does not import SwarmWorkspace', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(!fileContent.includes('SwarmWorkspace'), 'Should NOT import SwarmWorkspace (deprecated)');
});

// Test that SwarmMissionPicker import is removed (deprecated)
test('UnifiedShell - does not import SwarmMissionPicker', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(!fileContent.includes('SwarmMissionPicker'), 'Should NOT import SwarmMissionPicker (deprecated)');
});
