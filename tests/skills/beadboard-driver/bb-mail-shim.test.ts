import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const shimPath = path.resolve('skills/beadboard-driver/scripts/bb-mail-shim.mjs');

test('bb-mail-shim fails with helpful error when bb is unavailable', async () => {
  await assert.rejects(
    async () => {
      await execFileAsync(process.execPath, [shimPath, 'inbox'], {
        env: {
          ...process.env,
          PATH: '',
          BB_AGENT: 'silver-scribe',
        },
      });
    },
    (error: any) => {
      const stderr = String(error.stderr || '');
      assert.match(stderr, /bb command not found/i);
      return true;
    },
  );
});
