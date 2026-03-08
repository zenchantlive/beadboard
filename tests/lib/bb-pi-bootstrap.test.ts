import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { bootstrapManagedPi, ensureManagedPiSettings } from '../../src/lib/bb-pi-bootstrap';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test('bootstrapManagedPi creates managed runtime scaffold and runs npm install', async () => {
  const home = await makeTempDir('bb-pi-home-');
  const calls: Array<{ file: string; args: string[]; cwd: string }> = [];

  const result = await bootstrapManagedPi({
    home,
    execFile: async (file, args, options) => {
      calls.push({ file, args, cwd: options.cwd });
      const sdkDir = path.join(options.cwd, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist');
      await fs.mkdir(sdkDir, { recursive: true });
      await fs.writeFile(path.join(sdkDir, 'index.js'), 'export const createAgentSession = async () => ({ session: {} });');
    },
  });

  const packageJson = await fs.readFile(path.join(result.managedRoot, 'package.json'), 'utf8');
  const settingsJson = await fs.readFile(path.join(result.agentDir, 'settings.json'), 'utf8');

  assert.equal(result.created, true);
  assert.equal(result.alreadyInstalled, false);
  assert.equal(calls.length, 1);
  assert.match(calls[0].file, /npm/);
  assert.match(packageJson, /bb-managed-pi-runtime/);
  assert.match(packageJson, /@mariozechner\/pi-coding-agent/);
  assert.match(settingsJson, /defaultProvider/);
  assert.match(settingsJson, /shellPath/);
});

test('ensureManagedPiSettings adds shellPath to existing settings', async () => {
  const home = await makeTempDir('bb-pi-settings-');
  const agentDir = path.join(home, '.beadboard', 'runtime', '0.1.0', 'pi', 'agent');
  await fs.mkdir(agentDir, { recursive: true });
  await fs.writeFile(path.join(agentDir, 'settings.json'), JSON.stringify({ defaultProvider: 'x' }, null, 2));

  await ensureManagedPiSettings(agentDir);

  const settingsJson = await fs.readFile(path.join(agentDir, 'settings.json'), 'utf8');
  assert.match(settingsJson, /shellPath/);
  assert.match(settingsJson, /defaultProvider/);
});

test('bootstrapManagedPi is a no-op when managed sdk already exists', async () => {
  const home = await makeTempDir('bb-pi-home-existing-');
  const managedRoot = path.join(home, '.beadboard', 'runtime', '0.1.0', 'pi');
  const sdkDir = path.join(managedRoot, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist');
  await fs.mkdir(sdkDir, { recursive: true });
  await fs.writeFile(path.join(sdkDir, 'index.js'), 'export const createAgentSession = async () => ({ session: {} });');

  let called = false;
  const result = await bootstrapManagedPi({
    home,
    execFile: async () => {
      called = true;
    },
  });

  assert.equal(result.created, false);
  assert.equal(result.alreadyInstalled, true);
  assert.equal(called, false);
});
