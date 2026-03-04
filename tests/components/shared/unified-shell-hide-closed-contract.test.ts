import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('UnifiedShell clears selected closed epic when hideClosed is enabled', async () => {
  const file = await fs.readFile(path.join(process.cwd(), 'src/components/shared/unified-shell.tsx'), 'utf8');

  assert.ok(file.includes('if (epic.status === \'closed\' || epic.status === \'tombstone\')'), 'expected closed epic guard');
  assert.ok(file.includes('setEpicId(null);'), 'expected selected epic reset');
});
