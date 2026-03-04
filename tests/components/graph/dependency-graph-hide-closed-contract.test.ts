import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

test('dependency graph uses hide-closed filtered epics for epic chip strip', async () => {
  const file = await fs.readFile(path.join(process.cwd(), 'src/components/graph/dependency-graph-page.tsx'), 'utf8');

  assert.ok(file.includes('const selectableEpics = useMemo'), 'expected selectableEpics memoized list');
  assert.ok(file.includes('epics={selectableEpics}'), 'expected EpicChipStrip to receive selectableEpics');
  assert.ok(file.includes('selectableEpics.some((epic) => epic.id === requestedEpicId)'), 'expected requested epic validation against selectable epics');
});
