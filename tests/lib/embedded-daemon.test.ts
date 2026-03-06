import test from 'node:test';
import assert from 'node:assert/strict';

import { EmbeddedPiDaemon } from '../../src/lib/embedded-daemon';
import type { BeadIssue } from '../../src/lib/types';

function makeIssue(overrides: Partial<BeadIssue> = {}): BeadIssue {
  return {
    id: 'bb-host.7',
    title: 'Wire host daemon bridge',
    description: 'Host runtime bridge task',
    status: 'open',
    priority: 1,
    issue_type: 'task',
    assignee: null,
    templateId: 'template-host',
    owner: null,
    labels: [],
    dependencies: [{ type: 'parent', target: 'bb-host' }],
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

test('EmbeddedPiDaemon ensures one orchestrator per project', () => {
  const daemon = new EmbeddedPiDaemon();
  const first = daemon.ensureOrchestrator('/tmp/project-a');
  const second = daemon.ensureOrchestrator('/tmp/project-a');

  assert.equal(first.id, second.id);
  assert.equal(daemon.getStatus().daemon.projectCount, 1);
});

test('EmbeddedPiDaemon launchFromIssue records launch events and sets orchestrator planning', () => {
  const daemon = new EmbeddedPiDaemon();
  const result = daemon.launchFromIssue({
    projectRoot: '/tmp/project-a',
    issue: makeIssue(),
    origin: 'social',
  });

  assert.equal(result.orchestrator.status, 'planning');
  assert.equal(result.events.length, 2);
  assert.equal(result.events[0].kind, 'launch.requested');
  assert.equal(daemon.listEvents('/tmp/project-a').length, 2);
});
