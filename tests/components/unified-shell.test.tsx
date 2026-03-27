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

test('UnifiedShell - owns a shared swarm launch dialog state', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('LaunchSwarmDialog'), 'Should import the shared launch dialog');
  assert.ok(fileContent.includes('const [swarmLaunchOpen, setSwarmLaunchOpen] = useState(false)'), 'Should own launch open state');
  assert.ok(fileContent.includes('const [swarmLaunchTitle, setSwarmLaunchTitle] = useState(\'\')'), 'Should own launch title state');
  assert.ok(fileContent.includes('handleOpenSwarmLaunch'), 'Should have a shared launch open handler');
  assert.ok(fileContent.includes('onLaunchSwarm={() => { handleOpenSwarmLaunch(); }}'), 'TopBar should open the shared launch dialog');
  assert.ok(fileContent.includes('onLaunchSwarm={(epicId) => { setEpicId(epicId); handleOpenSwarmLaunch(epicId); }}'), 'Epic rows should open the same dialog with epic context');
  assert.ok(fileContent.includes('setAssignMode(false);'), 'Opening launch should not route into assignment mode');
});

test('UnifiedShell - routes launched swarms into active swarm context on success', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('const handleSwarmLaunchSuccess = useCallback((launchedSwarmId: string | null) => {'), 'Should accept the launched swarm id from the shared dialog');
  assert.ok(fileContent.includes('buildUrlParams(new URLSearchParams(window.location.search), {'), 'Should build the handoff URL from the current browser location');
  assert.ok(fileContent.includes("swarm: launchedSwarmId"), 'Should activate the launched swarm context');
  assert.ok(fileContent.includes("window.history.pushState(null, '', nextUrl);"), 'Should commit the launch handoff directly into browser history');
  const launchHandlerSlice = fileContent.slice(
    fileContent.indexOf('const handleSwarmLaunchSuccess = useCallback((launchedSwarmId: string | null) => {'),
    fileContent.indexOf('  }, []);') + '  }, []);'.length,
  );
  assert.ok(!launchHandlerSlice.includes("setDrawer('closed');"), 'Launch success handler should avoid a second stale URL write that can wipe the swarm handoff');
  assert.ok(!launchHandlerSlice.includes('router.refresh();'), 'Launch success handler should not refresh over the route handoff');
  assert.ok(!launchHandlerSlice.includes('setTaskId(null);'), 'Launch success handler should not issue a redundant task-clearing push before the swarm handoff');
  assert.ok(!launchHandlerSlice.includes('setSwarmId('), 'Launch success handler should not rely on the stale hook push path here');
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

test('UnifiedShell - derives recent completion notifications from runtime events', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes('listRecentCompletedWorkers(runtimeEvents)'), 'Should derive completion notifications from runtime events');
  assert.ok(fileContent.includes('const [completionSummaryTurns, setCompletionSummaryTurns] = useState<ConversationTurn[]>([])'), 'Should keep completion summaries alongside orchestrator turns');
  assert.ok(fileContent.includes('visibleCompletedWorkers.length'), 'Should derive the visible completion count from the shared summary list');
  assert.ok(fileContent.includes('completedEventCount={completedEventCount}'), 'Should pass recent completion count into TopBar');
  assert.ok(fileContent.includes('onCompletedIndicatorClick={handleCompletedIndicatorClick}'), 'Should wire the completion badge click-through into the shell');
  assert.ok(fileContent.includes("const shouldOpenDrawer = completedIssue?.status !== 'closed'"), 'Completion click-through should keep review destinations out of the full-screen drawer');
  assert.ok(fileContent.includes('buildUrlParams(new URLSearchParams(window.location.search), {'), 'Completion click-through should build the next URL from the current browser state');
  assert.ok(fileContent.includes("task: nextVisibleCompletion.taskId"), 'Completion click-through should route into the completed task');
  assert.ok(fileContent.includes("drawer: shouldOpenDrawer ? 'open' : null"), 'Completion click-through should only keep drawer=open for live task conversations');
  assert.ok(fileContent.includes("window.history.pushState(null, '', nextUrl);"), 'Completion click-through should commit the route handoff directly to browser history');
  assert.ok(fileContent.includes('mergedOrchestratorThread'), 'Should merge completion summaries into the orchestrator thread');
});

test('UnifiedShell - suppresses the full-screen thread drawer for closed-task review routes', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.ok(fileContent.includes("const isClosedTaskReview = taskId !== null && selectedIssue?.status === 'closed'"), 'Closed-task review should be detected before showing the thread drawer overlay');
  assert.ok(fileContent.includes("const isChatOpen = drawer === 'open' && (!!swarmId || !!epicId || (!!taskId && !isClosedTaskReview));"), 'Closed-task review should not mount the full-screen thread drawer overlay');
});
