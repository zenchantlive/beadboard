import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { ensureSafeShellEnvironment, renderBbAgentTuiBanner, runBbAgentTui } from '../../src/tui/bb-agent-tui';

test('bb agent TUI banner describes interactive Pi runtime shell', () => {
  const banner = renderBbAgentTuiBanner();
  assert.match(banner, /BeadBoard Pi Runtime TUI/i);
  assert.match(banner, /Talk directly/i);
  assert.match(banner, /\/exit/i);
});

test('bb agent TUI supports non-blocking test mode', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = '';
  output.on('data', (chunk) => {
    rendered += chunk.toString();
  });

  await runBbAgentTui({ input, output, testMode: true });

  assert.match(rendered, /BeadBoard Pi Runtime TUI/i);
  assert.match(rendered, /bb tui test mode/i);
});

test('bb agent TUI debug mode reports runtime strategy during test mode', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = '';
  output.on('data', (chunk) => {
    rendered += chunk.toString();
  });

  await runBbAgentTui({ input, output, testMode: true, debug: true, projectRoot: '/tmp/client-project' });

  assert.match(rendered, /BeadBoard Pi Runtime TUI/i);
  assert.match(rendered, /shell env ready:/i);
});

test('ensureSafeShellEnvironment restores a shell-capable PATH when PATH is empty', () => {
  const originalPath = process.env.PATH;
  const originalShell = process.env.SHELL;

  process.env.PATH = '';
  delete process.env.SHELL;

  const result = ensureSafeShellEnvironment(process.env);

  assert.ok(process.env.PATH);
  assert.match(process.env.PATH!, /\/bin|\/usr\/bin/);
  assert.equal(process.env.SHELL, result.shell ?? undefined);

  if (originalPath === undefined) {
    delete process.env.PATH;
  } else {
    process.env.PATH = originalPath;
  }

  if (originalShell === undefined) {
    delete process.env.SHELL;
  } else {
    process.env.SHELL = originalShell;
  }
});

test('bb agent TUI test mode still avoids bootstrap side effects', async () => {
  const output = new PassThrough();
  let rendered = '';
  output.on('data', (chunk) => {
    rendered += chunk.toString();
  });

  await runBbAgentTui({
    input: new PassThrough(),
    output,
    cwd: '/tmp/bb-no-managed-pi',
    testMode: true,
  });

  assert.match(rendered, /BeadBoard Pi Runtime TUI/i);
  assert.match(rendered, /bb tui test mode/i);
});
