import test from 'node:test';
import assert from 'node:assert/strict';
import { createBbDaemon } from '../../src/lib/bb-daemon';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'bb-daemon.1',
    title: 'Daemon lifecycle task',
    description: 'Lifecycle test issue',
    status: 'open',
    priority: 1,
    issue_type: 'task',
    assignee: null,
    templateId: null,
    owner: null,
    labels: [],
    dependencies: [],
    created_at: '2026-03-05T00:00:00.000Z',
    updated_at: '2026-03-05T00:00:00.000Z',
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

test('bb daemon starts in stopped state', () => {
  const daemon = createBbDaemon();
  assert.equal(daemon.getLifecycle().status, 'stopped');
});

test('bb daemon can start and expose started lifecycle metadata', async () => {
  const daemon = createBbDaemon();
  await daemon.start();
  const lifecycle = daemon.getLifecycle();
  assert.equal(lifecycle.status, 'running');
  assert.ok(lifecycle.startedAt);
  assert.ok(daemon.getPiRuntime());
  assert.equal(daemon.getPiRuntime()?.mode, 'bb-managed-pi');
});

test('bb daemon stop transitions back to stopped', async () => {
  const daemon = createBbDaemon();
  await daemon.start();
  await daemon.stop();
  assert.equal(daemon.getLifecycle().status, 'stopped');
});

test('bb daemon can auto-start orchestrator and publish runtime events', async () => {
  const daemon = createBbDaemon();
  const captured: string[] = [];
  const unsubscribe = daemon.subscribeRuntimeEvents((event) => captured.push(event.kind), { projectRoot: '/tmp/project-a' });

  const orchestrator = await daemon.ensureOrchestrator('/tmp/project-a');
  await daemon.launchFromIssue({
    projectRoot: '/tmp/project-a',
    issue: makeIssue(),
    origin: 'social',
  });
  unsubscribe();

  assert.equal(daemon.getLifecycle().status, 'running');
  assert.equal(orchestrator.kind, 'orchestrator');
  assert.equal(captured.length >= 2, true);
});
