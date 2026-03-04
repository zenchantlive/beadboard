import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('useBeadsSubscription triggers an initial refresh on mount', async () => {
  const file = await fs.readFile(path.join(process.cwd(), 'src/hooks/use-beads-subscription.ts'), 'utf8');
  assert.ok(file.includes("void refresh({ silent: true })"), 'expected initial refresh call');
});

test('app page forces dynamic rendering to avoid stale prerendered issues', async () => {
  const file = await fs.readFile(path.join(process.cwd(), 'src/app/page.tsx'), 'utf8');
  assert.ok(file.includes("export const dynamic = 'force-dynamic';"), 'expected force-dynamic export');
});
