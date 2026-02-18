import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'generate-agent-name.mjs');

test('generate-agent-name contract: returns structured success', async () => {
  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
    env: {
      ...process.env,
      BB_NAME_ADJECTIVES: 'green',
      BB_NAME_NOUNS: 'castle',
      BB_NAME_MAX_RETRIES: '1',
    },
  });
  const result = JSON.parse(stdout);
  assert.equal(result.ok, true);
  assert.equal(result.agent_name, 'green-castle');
  assert.equal(typeof result.attempts, 'number');
});
