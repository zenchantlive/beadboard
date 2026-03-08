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
    `export class AuthStorage { constructor(path) { this.path = path; } }
     export class ModelRegistry { constructor() { this.authStorage = { login: async () => {} }; } getAll(){ return []; } find(){ return null; } async getAvailable(){ return []; } }
     export class SessionManager { static create(cwd){ return { buildSessionContext(){ return { messages: [], model: null, thinkingLevel: 'off' }; }, saveMessage(){}, loadEntries(){ return []; }, sessionFile: cwd + '/session.jsonl' }; } }
     export class SettingsManager { static create(cwd, agentDir){ return { getDefaultProvider(){ return null; }, getDefaultModel(){ return null; }, getDefaultThinkingLevel(){ return 'off'; }, getQueueMode(){ return 'one-at-a-time'; }, getSkillsSettings(){ return undefined; }, setDefaultModelAndProvider(){} }; } }
     export function createReadTool(cwd){ return { name: 'read', cwd }; }
     export function createBashTool(cwd){ return { name: 'bash', cwd }; }
     export function createEditTool(cwd){ return { name: 'edit', cwd }; }
     export function createWriteTool(cwd){ return { name: 'write', cwd }; }
     export async function createAgentSession(options = {}) {
      globalThis.__bbManagedAgentDirSeen = process.env.PI_CODING_AGENT_DIR;
      return {
        session: {
          model: null,
          prompt: async () => {},
          dispose() {},
          subscribe() { return () => {}; },
          settingsManager: options.settingsManager,
          setModel: async () => {},
          modelRegistry: options.modelRegistry,
        }
      };
    }
`,
    'utf8',
  );
  return managed;
}

test('bb agent TUI exports managed agent dir through PI_CODING_AGENT_DIR', async () => {
  const home = await makeTempDir('bb-managed-home-env-');
  const cwd = await makeTempDir('bb-workspace-env-');
  const previousHome = process.env.HOME;
  const previousAgentDir = process.env.PI_CODING_AGENT_DIR;
  process.env.HOME = home;
  const managed = await installFakeManagedPi(home);

  const input = new PassThrough();
  const output = new PassThrough();
  const tuiPromise = runBbAgentTui({ input, output, cwd });
  await new Promise((resolve) => setTimeout(resolve, 20));
  input.write('/exit\n');
  input.end();
  await tuiPromise;

  assert.equal((globalThis as any).__bbManagedAgentDirSeen, managed.agentDir);

  process.env.HOME = previousHome;
  if (previousAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
  else process.env.PI_CODING_AGENT_DIR = previousAgentDir;
});
