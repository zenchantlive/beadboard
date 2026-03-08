import test from 'node:test';
import assert from 'node:assert/strict';
import { createPiDaemonAdapter } from '../../src/lib/pi-daemon-adapter';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'bb-pi.1',
    title: 'Adapter test issue',
    description: 'Adapter should launch',
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

test('pi daemon adapter exposes ensureProjectOrchestrator contract', async () => {
  const adapter = createPiDaemonAdapter();
  const result = await adapter.ensureProjectOrchestrator('/tmp/project-a');
  assert.equal(result.backend, 'pi');
  assert.equal(result.kind, 'orchestrator');
  assert.equal(result.attachMode, 'in-process');
  assert.ok(result.id);
});

test('pi daemon adapter launches through the backing daemon seam', async () => {
  const adapter = createPiDaemonAdapter();
  const result = await adapter.launchFromIssue({
    projectRoot: '/tmp/project-a',
    issue: makeIssue(),
    origin: 'social',
  });
  assert.equal(result.orchestrator.backend, 'pi');
  assert.equal(result.events.length > 0, true);
});
