import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('UnifiedShell bootstraps and subscribes to daemon runtime endpoints', async () => {
  const fileContent = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf-8');
  assert.match(fileContent, /\/api\/runtime\/status/);
  assert.match(fileContent, /\/api\/runtime\/orchestrator/);
  assert.match(fileContent, /\/api\/runtime\/stream/);
  assert.match(fileContent, /EventSource/);
  assert.match(fileContent, /daemon lifecycle/i);
});
