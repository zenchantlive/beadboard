import test from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../../src/cli/beadboard-cli';

test('doctor returns structured install diagnostics', async () => {
  const out = await runCli(['doctor', '--json']);
  assert.equal(out.ok, true);
  assert.ok(out.installMode);
});

test('self-update returns explicit placeholder result', async () => {
  const out = await runCli(['self-update', '--json']);
  assert.equal(out.ok, true);
  assert.equal(out.command, 'self-update');
  assert.equal(out.updated, false);
});

test('uninstall requires --yes', async () => {
  const out = await runCli(['uninstall', '--json']);
  assert.equal(out.ok, false);
  assert.match(String(out.error), /--yes/);
});

test('agent list routes to coordination CLI surface', async () => {
  const out = await runCli(['agent', 'list', '--json']);
  assert.equal(typeof out.command, 'string');
  assert.equal(out.command, 'agent list');
});
