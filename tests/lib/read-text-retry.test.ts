import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { readTextFileWithRetry } from '../../src/lib/read-text-retry';

test('readTextFileWithRetry reads file content', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'beadboard-retry-read-'));
  const target = path.join(root, 'sample.txt');
  await fs.writeFile(target, 'ok', 'utf8');

  const content = await readTextFileWithRetry(target);
  assert.equal(content, 'ok');
});

test('readTextFileWithRetry does not retry non-retryable errors', async () => {
  await assert.rejects(
    () => readTextFileWithRetry('C:/definitely/missing/file.txt', { retries: 3, delayMs: 1 }),
    (error: unknown) => {
      const code = (error as NodeJS.ErrnoException).code;
      assert.equal(code, 'ENOENT');
      return true;
    },
  );
});
