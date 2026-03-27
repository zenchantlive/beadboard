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

test('UnifiedShell - passes agentId to ContextualRightPanel', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('agentId={agentId}'), 'Should pass agentId so the right panel can render agent detail');
});

// Test that AssignmentPanel is imported
test('UnifiedShell - imports AssignmentPanel', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('AssignmentPanel'), 'Should import AssignmentPanel');
});

test('UnifiedShell - checks bd health and renders setup warning', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('useBdHealth'), 'Should use bd health hook');
  assert.ok(fileContent.includes('BD setup issue:'), 'Should show bd setup warning text');
});

// Test that AssignmentPanel is rendered conditionally based on view and assignMode
test('UnifiedShell - renders AssignmentPanel conditionally', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  // Check for the condition: assignMode && !taskId
  assert.ok(fileContent.includes("assignMode && !taskId"), 'Should check assignMode && !taskId condition for AssignmentPanel');
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

test('UnifiedShell - mounts shared AgentState shell path', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('const [agentStates, setAgentStates] = useState<AgentState[]>([])'), 'Should own agentStates at shell level');
  assert.ok(fileContent.includes("fetch(`/api/runtime/agents?projectRoot=${encodeURIComponent(projectRoot)}`)"), 'Should bootstrap shared agent state from runtime agents route');
  assert.ok(fileContent.includes('reduceAgentStates'), 'Should update shared agent state through canonical reducer');
  assert.ok(fileContent.includes('summarizeAgentStates(agentStates)'), 'Should derive shared shell summary from agentStates');
});

test('UnifiedShell - no longer derives TopBar agent counts from issues or hardcoded idle zero', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(!fileContent.includes("busyCount={issues.filter(i => i.status === 'in_progress').length}"), 'Should not derive busy agent count from issue status');
  assert.ok(!fileContent.includes('idleCount={0}'), 'Should not hardcode idleCount to zero');
  assert.ok(fileContent.includes('busyCount={agentSummary.busyCount}'), 'Should pass busy count from agent summary');
  assert.ok(fileContent.includes('idleCount={agentSummary.idleCount}'), 'Should pass idle count from agent summary');
});
