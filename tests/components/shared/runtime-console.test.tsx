import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { RuntimeConsole } from '../../../src/components/shared/runtime-console';
import type { RuntimeConsoleEvent } from '../../../src/lib/embedded-runtime';

function makeEvent(overrides: Partial<RuntimeConsoleEvent> = {}): RuntimeConsoleEvent {
  return {
    id: overrides.id ?? 'evt-1',
    projectId: overrides.projectId ?? 'proj-1',
    kind: overrides.kind ?? 'worker.spawned',
    title: overrides.title ?? 'Worker spawned',
    detail: overrides.detail ?? 'Spawned for task',
    timestamp: overrides.timestamp ?? '2026-03-27T21:00:00.000Z',
    status: overrides.status ?? 'working',
    metadata: overrides.metadata ?? { workerId: 'worker-1' },
  };
}

describe('RuntimeConsole stop controls', () => {
  it('does not render Stop for workers missing from the live active-worker set', () => {
    const html = renderToStaticMarkup(
      React.createElement(RuntimeConsole, {
        events: [makeEvent()],
        activeWorkerIds: [],
        projectRoot: '/tmp/beadboard',
      }),
    );

    assert.equal(html.includes('Stop'), false);
  });

  it('renders Stop for workers present in the live active-worker set', () => {
    const html = renderToStaticMarkup(
      React.createElement(RuntimeConsole, {
        events: [makeEvent()],
        activeWorkerIds: ['worker-1'],
        projectRoot: '/tmp/beadboard',
      }),
    );

    assert.equal(html.includes('Stop'), true);
  });
});
