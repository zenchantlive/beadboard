import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { detectPiRuntimeStrategy, getManagedPiPaths } from '../../src/lib/pi-runtime-detection';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test('detectPiRuntimeStrategy defaults to bb-managed-pi even when linked Pi exists', async () => {
  const cwd = await makeTempDir('bb-linked-');
  const sdkPath = path.join(cwd, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist');
  await fs.mkdir(sdkPath, { recursive: true });
  await fs.writeFile(path.join(sdkPath, 'index.js'), 'export const createAgentSession = async () => ({ session: {} });');

  const result = await detectPiRuntimeStrategy({ cwd, home: cwd, version: '0.1.0', globalPiRoot: path.join(cwd, 'missing-global') });
  assert.equal(result.mode, 'bb-managed-pi');
  assert.equal(result.installState, 'bootstrap-required');
  assert.equal(result.sdkPath, null);
});

test('detectPiRuntimeStrategy can still opt into linked-pi as a future reference path', async () => {
  const cwd = await makeTempDir('bb-linked-opt-in-');
  const sdkPath = path.join(cwd, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist');
  await fs.mkdir(sdkPath, { recursive: true });
  await fs.writeFile(path.join(sdkPath, 'index.js'), 'export const createAgentSession = async () => ({ session: {} });');

  const result = await detectPiRuntimeStrategy({ cwd, home: cwd, version: '0.1.0', globalPiRoot: path.join(cwd, 'missing-global'), allowLinkedPi: true });
  assert.equal(result.mode, 'linked-pi');
  assert.equal(result.installState, 'ready');
  assert.match(String(result.sdkPath), /pi-coding-agent/);
});

test('detectPiRuntimeStrategy falls back to bb-managed-pi when no linked Pi exists', async () => {
  const cwd = await makeTempDir('bb-managed-');
  const result = await detectPiRuntimeStrategy({ cwd, home: cwd, version: '0.1.0', globalPiRoot: path.join(cwd, 'missing-global') });
  assert.equal(result.mode, 'bb-managed-pi');
  assert.equal(result.installState, 'bootstrap-required');
  assert.equal(result.sdkPath, null);
});

test('getManagedPiPaths returns beadboard-managed runtime locations', () => {
  const paths = getManagedPiPaths('0.1.0', '/tmp/bead-home');
  assert.match(paths.managedRoot, /\.beadboard\/runtime\/0.1.0\/pi$/);
  assert.match(paths.agentDir, /\/pi\/agent$/);
});
