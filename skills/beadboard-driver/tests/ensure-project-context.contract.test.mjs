import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'ensure-project-context.mjs');

test('ensure-project-context creates project.md when missing', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-project-context-'));
  try {
    const { stdout } = await execFileAsync(process.execPath, [scriptPath, '--project-root', root]);
    const result = JSON.parse(stdout);

    const content = await fs.readFile(path.join(root, 'project.md'), 'utf8');
    assert.equal(result.ok, true);
    assert.equal(result.created, true);
    assert.match(content, /Project Driver Template/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('ensure-project-context preserves existing project.md', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'bb-skill-project-context-'));
  try {
    const target = path.join(root, 'project.md');
    await fs.writeFile(target, '# existing\n', 'utf8');

    const { stdout } = await execFileAsync(process.execPath, [scriptPath, '--project-root', root]);
    const result = JSON.parse(stdout);
    const content = await fs.readFile(target, 'utf8');

    assert.equal(result.ok, true);
    assert.equal(result.created, false);
    assert.equal(result.used_existing, true);
    assert.equal(content, '# existing\n');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
