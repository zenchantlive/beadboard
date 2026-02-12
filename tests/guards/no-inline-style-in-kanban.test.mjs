import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['src/components/kanban', 'src/components/shared'];
const INLINE_STYLE_PATTERN = /\bstyle\s*=\s*\{\s*\{/m;

async function collectTsxFiles(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  const entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => path.join(absoluteDir, entry.name));
}

test('kanban and shared components do not use inline style objects', async () => {
  const files = (await Promise.all(TARGET_DIRS.map(collectTsxFiles))).flat();
  const offenders = [];

  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    if (INLINE_STYLE_PATTERN.test(content)) {
      offenders.push(path.relative(ROOT, filePath));
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Inline style objects found in: ${offenders.join(', ')}`,
  );
});
