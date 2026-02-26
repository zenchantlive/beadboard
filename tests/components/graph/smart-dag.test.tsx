import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';

// Test that the SmartDag component file exists and exports correctly
test('SmartDag - file exists and exports', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('export function SmartDag'), 'Should export SmartDag function');
  assert.ok(fileContent.includes('export interface SmartDagProps'), 'Should export SmartDagProps interface');
});

// Test that SmartDag has Filters toggle
test('SmartDag - contains Filters toggle button', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('Filters'), 'Should contain Filters text');
  assert.ok(fileContent.includes('showFilters'), 'Should have showFilters state');
});

// Test that SmartDag has Assign toggle
test('SmartDag - contains Assign toggle button', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('Assign'), 'Should contain Assign text');
  assert.ok(fileContent.includes('assignMode'), 'Should have assignMode state');
});

// Test that SmartDag has WorkflowTabs
test('SmartDag - contains WorkflowTabs', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('WorkflowTabs'), 'Should import WorkflowTabs');
  assert.ok(fileContent.includes('activeTab'), 'Should have activeTab state');
});

// Test that SmartDag has callback props
test('SmartDag - supports onAssignModeChange callback', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('onAssignModeChange'), 'Should have onAssignModeChange prop');
});

test('SmartDag - supports onSelectedIssueChange callback', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('onSelectedIssueChange'), 'Should have onSelectedIssueChange prop');
});

// Test that SmartDag imports TaskCardGrid
test('SmartDag - imports TaskCardGrid', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('TaskCardGrid'), 'Should import TaskCardGrid');
});

// Test that SmartDag imports WorkflowGraph
test('SmartDag - imports WorkflowGraph', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('WorkflowGraph'), 'Should import WorkflowGraph');
});

// Test that SmartDag passes assignMode to WorkflowGraph
test('SmartDag - passes assignMode to WorkflowGraph', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(/assignMode=\{assignMode\}/.test(fileContent), 'Should pass assignMode to WorkflowGraph');
});

// Test that SmartDag has filter state management
test('SmartDag - manages hideClosed filter', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('hideClosed'), 'Should manage hideClosed state');
});

test('SmartDag - manages sortReadyFirst filter', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('sortReadyFirst'), 'Should manage sortReadyFirst state');
});

// Test that SmartDag uses useGraphAnalysis hook
test('SmartDag - uses useGraphAnalysis hook', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/graph/smart-dag.tsx'), 'utf-8');
  assert.ok(fileContent.includes('useGraphAnalysis'), 'Should import and use useGraphAnalysis');
});
