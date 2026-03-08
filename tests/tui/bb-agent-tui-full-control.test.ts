import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import { runBbAgentTui } from '../../src/tui/bb-agent-tui';
import { getManagedPiPaths } from '../../src/lib/pi-runtime-detection';

async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function installFakeManagedPi(home: string) {
  const managed = getManagedPiPaths('0.1.0', home);
  const sdkDir = path.join(managed.managedRoot, 'node_modules', '@mariozechner', 'pi-coding-agent', 'dist');
  await fs.mkdir(sdkDir, { recursive: true });
  await fs.mkdir(managed.agentDir, { recursive: true });
  await fs.writeFile(path.join(managed.agentDir, 'settings.json'), JSON.stringify({ shellPath: '/bin/sh' }, null, 2));
  await fs.writeFile(
    path.join(sdkDir, 'index.js'),
    `export class AuthStorage { constructor(path) { this.path = path; } async login() {} }
     export class ModelRegistry { constructor(auth, modelsPath) { this.authStorage = { login: async()=>{} }; this.modelsPath=modelsPath; } getAll(){ return []; } find(){ return null; } async getAvailable(){ return []; } }
     export class SessionManager { static create(cwd){ globalThis.__bbSessionManagerCwd = cwd; return { buildSessionContext(){ return { messages: [], model: null, thinkingLevel: 'off' }; }, saveMessage(){}, loadEntries(){ return []; }, sessionFile: cwd + '/session.jsonl' }; } }
     export class SettingsManager { static create(cwd, agentDir){ globalThis.__bbSettingsManagerArgs = { cwd, agentDir }; return { getDefaultProvider(){ return null; }, getDefaultModel(){ return null; }, getDefaultThinkingLevel(){ return 'off'; }, getQueueMode(){ return 'one-at-a-time'; }, getSkillsSettings(){ return undefined; }, setDefaultModelAndProvider(){} }; } }
     export function createReadTool(cwd){ return { name: 'read', cwd }; }
     export function createBashTool(cwd){ return { name: 'bash', cwd }; }
     export function createEditTool(cwd){ return { name: 'edit', cwd }; }
     export function createWriteTool(cwd){ return { name: 'write', cwd }; }
     export async function createAgentSession(options){ globalThis.__bbCreateAgentSessionOptions = options; return { session: { model: null, prompt: async()=>{}, dispose(){}, subscribe(){ return ()=>{}; }, settingsManager: options.settingsManager, setModel: async()=>{}, modelRegistry: options.modelRegistry } }; }
    `,
    'utf8',
  );
  return managed;
}

test('bb agent TUI creates a full-control Pi session without discovery inputs', async () => {
  const home = await makeTempDir('bb-managed-home-full-');
  const cwd = await makeTempDir('bb-workspace-full-');
  const previousHome = process.env.HOME;
  process.env.HOME = home;
  await installFakeManagedPi(home);

  const input = new PassThrough();
  const output = new PassThrough();
  const tuiPromise = runBbAgentTui({ input, output, cwd });
  await new Promise((resolve) => setTimeout(resolve, 20));
  input.write('/exit\n');
  input.end();
  await tuiPromise;

  const options = (globalThis as any).__bbCreateAgentSessionOptions;
  assert.deepEqual(options.hooks, []);
  assert.deepEqual(options.skills, []);
  assert.deepEqual(options.contextFiles, []);
  assert.deepEqual(options.slashCommands, []);
  assert.equal(options.customTools.length, 6); // Dolt read, deviation, mailbox read/send/ack, presence update
  assert.equal(options.tools.length, 4);
  assert.deepEqual(options.tools.map((tool: { name: string }) => tool.name), ['read', 'bash', 'edit', 'write']);

  process.env.HOME = previousHome;
});
