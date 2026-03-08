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
     export class ModelRegistry { constructor() { this.authStorage = { login: async () => { globalThis.__bbLoginCalled = true; } }; } getAll(){ return [{ provider: 'openai', id: 'gpt-5' }]; } find(provider,id){ return provider === 'openai' && id === 'gpt-5' ? { provider, id } : null; } async getAvailable(){ return [{ provider: 'openai', id: 'gpt-5' }]; } }
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
          prompt: async () => { throw new Error('No model selected.\\n\\nUse /login, set an API key environment variable, or create /home/clawdbot/.pi/agent/models.json\\n\\nThen use /model to select a model.'); },
          dispose() {},
          subscribe() { return () => {}; },
          settingsManager: options.settingsManager,
          setModel: async (model) => { globalThis.__bbSelectedModel = model; },
          modelRegistry: options.modelRegistry,
        }
      };
    }
`,
    'utf8',
  );
}

test('bb agent TUI rewrites model-path errors to managed Pi path', async () => {
  const home = await makeTempDir('bb-managed-home-');
  const cwd = await makeTempDir('bb-workspace-');
  const previousHome = process.env.HOME;
  process.env.HOME = home;
  await installFakeManagedPi(home);

  const input = new PassThrough();
  const output = new PassThrough();
  let rendered = '';
  output.on('data', (chunk) => {
    rendered += chunk.toString();
  });

  await runBbAgentTui({ input, output, cwd, initialMessage: 'yo' });

  assert.match(rendered, /agent\/models.json/);
  assert.doesNotMatch(rendered, /\/home\/clawdbot\/\.pi\/agent\/models\.json/);

  process.env.HOME = previousHome;
});

test('bb agent TUI handles /model without sending it as a prompt', async () => {
  const home = await makeTempDir('bb-managed-home-model-');
  const cwd = await makeTempDir('bb-workspace-model-');
  const previousHome = process.env.HOME;
  process.env.HOME = home;
  await installFakeManagedPi(home);
  (globalThis as any).__bbSelectedModel = null;

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
  input.write('/model openai/gpt-5\n');
  await new Promise((resolve) => setTimeout(resolve, 20));
  input.write('/exit\n');
  input.end();
  await tuiPromise;

  assert.deepEqual((globalThis as any).__bbSelectedModel, { provider: 'openai', id: 'gpt-5' });
  process.env.HOME = previousHome;
});
