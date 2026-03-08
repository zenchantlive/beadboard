import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../../src/cli/beadboard-cli';

test('bb daemon help renders daemon commands', async () => {
  const result = await runCli(['daemon', '--help']);
  assert.equal(result.ok, true);
  assert.match(String(result.text ?? ''), /start/i);
  assert.match(String(result.text ?? ''), /status/i);
  assert.match(String(result.text ?? ''), /stop/i);
});

test('bb daemon tui advertises interactive runtime mode', async () => {
  const result = await runCli(['daemon', 'tui']);
  assert.equal(result.ok, true);
  assert.match(String(result.text ?? ''), /interactive BeadBoard Pi runtime TUI/i);
  assert.equal(result.interactive, true);
});

test('bb daemon tui accepts explicit workspace flags', async () => {
  const result = await runCli(['daemon', 'tui', '--project-root', '/tmp/client-project']);
  assert.equal(result.ok, true);
  assert.equal(result.projectRoot, '/tmp/client-project');
});

test('bb daemon bootstrap-pi is available as a daemon command', async () => {
  const result = await runCli(['daemon', '--help']);
  assert.equal(result.ok, true);
  assert.match(String(result.text ?? ''), /bootstrap-pi/i);
});
