import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildLaunchRequest,
  createDeviationRecord,
  createLaunchConsoleEvents,
  createOrchestratorInstance,
  getOrchestratorAgentType,
  getProjectRuntimeId,
} from '../../src/lib/embedded-runtime';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'bb-epic.2',
    title: 'Ship orchestrator launch flow',
    description: 'Implement embedded Pi launch flow.',
    status: 'open',
    priority: 1,
    issue_type: 'task',
    assignee: null,
    templateId: 'template-default',
    owner: null,
    labels: [],
    dependencies: [
      { type: 'parent', target: 'bb-epic' },
      { type: 'blocks', target: 'bb-epic.3' },
      { type: 'relates_to', target: 'bb-epic.5' },
    ],
    created_at: '2026-03-05T01:00:00.000Z',
    updated_at: '2026-03-05T01:05:00.000Z',
    closed_at: null,
    close_reason: null,
    closed_by_session: null,
    created_by: null,
    due_at: null,
    estimated_minutes: null,
    external_ref: null,
    metadata: {},
    ...overrides,
  };
}

test('getProjectRuntimeId creates a stable project-scoped id', () => {
  assert.equal(
    getProjectRuntimeId('/tmp/Work/My Repo'),
    'tmp-work-my-repo',
  );
});

test('getOrchestratorAgentType returns Pi-backed orchestrator type', () => {
  const orchestratorType = getOrchestratorAgentType();
  assert.equal(orchestratorType.id, 'pi-orchestrator');
  assert.equal(orchestratorType.backend, 'pi');
  assert.equal(orchestratorType.archetypeId, 'orchestrator');
});

test('createOrchestratorInstance creates one stable project orchestrator identity', () => {
  const instance = createOrchestratorInstance('/tmp/work/beadboard');
  assert.equal(instance.kind, 'orchestrator');
  assert.equal(instance.backend, 'pi');
  assert.equal(instance.id, 'tmp-work-beadboard:orchestrator');
  assert.equal(instance.label, 'Main Orchestrator');
});

test('buildLaunchRequest packages task, epic, template, and dependency context', () => {
  const request = buildLaunchRequest({
    issue: makeIssue(),
    origin: 'social',
    projectRoot: '/tmp/work/beadboard',
    requestedAgentTypeId: 'reviewer',
  });

  assert.equal(request.projectId, 'tmp-work-beadboard');
  assert.equal(request.backend, 'pi');
  assert.equal(request.taskId, 'bb-epic.2');
  assert.equal(request.epicId, 'bb-epic');
  assert.equal(request.templateId, 'template-default');
  assert.deepEqual(request.dependencyIds, ['bb-epic.3', 'bb-epic.5']);
  assert.equal(request.requestedAgentTypeId, 'reviewer');
  assert.match(request.contextSummary, /Launch bb-epic\.2 from social/);
});

test('createDeviationRecord requires approval only for major deviations', () => {
  const request = buildLaunchRequest({
    issue: makeIssue(),
    origin: 'graph',
    projectRoot: '/tmp/work/beadboard',
  });

  const minor = createDeviationRecord({
    launchRequest: request,
    severity: 'minor',
    summary: 'Add a reviewer instance',
    reason: 'Task touches shared UI.',
  });
  const major = createDeviationRecord({
    launchRequest: request,
    severity: 'major',
    summary: 'Skip template and launch direct implementation worker',
    reason: 'No valid template exists for this mission.',
  });

  assert.equal(minor.requiresApproval, false);
  assert.equal(major.requiresApproval, true);
});

test('createLaunchConsoleEvents emits orchestrator planning telemetry for a launch request', () => {
  const request = buildLaunchRequest({
    issue: makeIssue(),
    origin: 'task',
    projectRoot: '/tmp/work/beadboard',
  });

  const events = createLaunchConsoleEvents(request);
  assert.equal(events.length, 2);
  assert.equal(events[0].kind, 'launch.requested');
  assert.equal(events[0].status, 'planning');
  assert.equal(events[0].taskId, 'bb-epic.2');
  assert.equal(events[1].kind, 'orchestrator.message');
  assert.match(events[1].detail, /dependency link/);
});
