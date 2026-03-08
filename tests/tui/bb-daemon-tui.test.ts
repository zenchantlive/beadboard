import test from 'node:test';
import assert from 'node:assert/strict';
import { renderDaemonTuiSnapshot } from '../../src/tui/bb-daemon-tui';

test('daemon TUI snapshot includes daemon status and orchestrator summary', () => {
  const lines = renderDaemonTuiSnapshot({
    daemonStatus: 'running',
    projects: [{ projectRoot: '/tmp/project-a', orchestratorStatus: 'idle', eventCount: 2 }],
  });
  const text = lines.join('\n');
  assert.match(text, /running/i);
  assert.match(text, /project-a/i);
  assert.match(text, /orchestrator/i);
});
