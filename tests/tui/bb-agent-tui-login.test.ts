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
  await fs.writeFile(path.join(managed.agentDir, 'settings.json'), '{}\n');
  await fs.writeFile(
    path.join(sdkDir, 'index.js'),
    `export class AuthStorage { constructor(path) { this.path = path; } }
     export class ModelRegistry { constructor() { this.authStorage = { login: async (_provider, callbacks) => { const answer = await callbacks.onPrompt({ message: 'GitHub Enterprise URL/domain (blank for github.com)' }); globalThis.__bbLoginAnswer = answer; callbacks.onAuth({ url: 'https://github.com/login/device', instructions: 'Open in browser' }); } }; } getAll(){ return [{ provider: 'openai', id: 'gpt-5' }]; } find(){ return null; } async getAvailable(){ return []; } }
     export class SessionManager { static create(cwd){ return { buildSessionContext(){ return { messages: [], model: null, thinkingLevel: 'off' }; }, saveMessage(){}, loadEntries(){ return []; }, sessionFile: cwd + '/session.jsonl' }; } }
     export class SettingsManager { static create(){ return { getDefaultProvider(){ return null; }, getDefaultModel(){ return null; }, getDefaultThinkingLevel(){ return 'off'; }, getQueueMode(){ return 'one-at-a-time'; }, getSkillsSettings(){ return undefined; }, setDefaultModelAndProvider(){} }; } }
     export function createReadTool(cwd){ return { name: 'read', cwd }; }
     export function createBashTool(cwd){ return { name: 'bash', cwd }; }
     export function createEditTool(cwd){ return { name: 'edit', cwd }; }
     export function createWriteTool(cwd){ return { name: 'write', cwd }; }
     export async function createAgentSession(options) {
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
}

test('bb agent TUI login passes blank prompt responses as empty strings', async () => {
  const home = await makeTempDir('bb-managed-home-login-');
  const cwd = await makeTempDir('bb-workspace-login-');
  const previousHome = process.env.HOME;
  process.env.HOME = home;
  await installFakeManagedPi(home);
  (globalThis as any).__bbLoginAnswer = undefined;

  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = '';
  let promptReadyResolve: (() => void) | null = null;
  const promptReady = new Promise<void>((resolve) => {
    promptReadyResolve = resolve;
  });
  output.on('data', (chunk) => {
    rendered += chunk.toString();
    if (rendered.includes('bb> ')) {
      promptReadyResolve?.();
      promptReadyResolve = null;
    }
  });

  const tuiPromise = runBbAgentTui({ input, output, cwd });
  await promptReady;
  input.write('/login github-copilot\n');
  await new Promise((resolve) => setTimeout(resolve, 20));
  input.write('\n');
  await new Promise((resolve) => setTimeout(resolve, 20));
  input.write('/exit\n');
  input.end();
  await tuiPromise;

  assert.equal((globalThis as any).__bbLoginAnswer, '');
  assert.match(rendered, /github\.com\/login\/device/i);

  process.env.HOME = previousHome;
});
