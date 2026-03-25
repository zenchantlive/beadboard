import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { resolveAgentWorkspace } from '../lib/agent-workspace';
import { bootstrapManagedPi, ensureManagedPiSettings } from '../lib/bb-pi-bootstrap';
import { detectPiRuntimeStrategy } from '../lib/pi-runtime-detection';
import { createDoltReadTool } from './tools/bb-dolt-read';
import { createMailboxTools } from './tools/bb-mailbox';
import { createPresenceTools } from './tools/bb-presence';
import { createDeviationTool } from './tools/bb-deviation';
import { buildBeadBoardSystemPrompt } from './system-prompt';

export interface BbAgentTuiOptions {
  cwd?: string;
  agentDir?: string;
  projectKey?: string | null;
  projectRoot?: string | null;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
  initialMessage?: string;
  testMode?: boolean;
  debug?: boolean;
}

type BbManagedSession = {
  prompt: (text: string) => Promise<void>;
  dispose: () => void;
  subscribe: (listener: (event: any) => void) => () => void;
  model?: { id?: string; provider?: string } | null;
  modelRegistry?: {
    getAll?: () => Array<{ id: string; provider: string }>;
    getAvailable?: () => Promise<Array<{ id: string; provider: string }>>;
    find?: (provider: string, modelId: string) => { id: string; provider: string } | null;
    authStorage?: {
      login?: (provider: string, callbacks: {
        onAuth: (payload: { url: string; instructions?: string }) => void;
        onPrompt: (payload: { message: string }) => Promise<string | null>;
        onProgress?: (message: string) => void;
      }) => Promise<void>;
    };
  };
  settingsManager?: {
    setDefaultModelAndProvider?: (provider: string, modelId: string) => void;
  };
  setModel?: (model: { id: string; provider: string }) => Promise<void>;
};

function renderBanner(): string {
  return [
    '╔══════════════════════════════════════════════════════════════╗',
    '║                  BeadBoard Pi Runtime TUI                  ║',
    '╠══════════════════════════════════════════════════════════════╣',
    '║ Talk directly to the BeadBoard agent runtime.           ║',
    '║ Commands: /exit, /quit, /help                              ║',
    '╚══════════════════════════════════════════════════════════════╝',
  ].join('\n');
}

async function loadPiSdk(): Promise<Record<string, any> & { resolution: Awaited<ReturnType<typeof detectPiRuntimeStrategy>> }> {
  const resolution = await detectPiRuntimeStrategy();

  if (resolution.installState === 'bootstrap-required' || !resolution.sdkPath) {
    return {
      createAgentSession: async () => {
        throw new Error(`Agent runtime required at ${resolution.managedRoot}`);
      },
      resolution,
    };
  }

  const candidates = [resolution.sdkPath].filter((candidate): candidate is string => Boolean(candidate));

  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(candidate).href);
      if (typeof mod.createAgentSession === 'function') {
        return { ...mod, resolution };
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Unable to load Pi SDK createAgentSession() for ${resolution.mode} (${resolution.installState}). ${resolution.reason} ${errors.join(' | ')}`);
}

export function renderBbAgentTuiBanner(): string {
  return renderBanner();
}

function getDefaultShellPath(): string | null {
  if (process.platform === 'win32') {
    return process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe';
  }

  const candidates = ['/bin/sh', '/usr/bin/sh', '/bin/bash', '/usr/bin/bash'];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function buildSafePath(existingPath: string | undefined, shellPath: string | null): string {
  const entries = new Set<string>();
  const delimiter = path.delimiter;

  for (const entry of String(existingPath ?? '').split(delimiter)) {
    if (entry.trim()) {
      entries.add(entry.trim());
    }
  }

  const home = process.env.HOME ?? os.homedir();
  const preferredEntries = process.platform === 'win32'
    ? [
        path.dirname(shellPath ?? process.env.ComSpec ?? 'C:\\Windows\\System32\\cmd.exe'),
      ]
    : [
        path.join(home, '.local', 'bin'),
        shellPath ? path.dirname(shellPath) : '',
        '/usr/local/bin',
        '/usr/bin',
        '/bin',
        '/usr/sbin',
        '/sbin',
      ];

  for (const entry of preferredEntries) {
    if (entry) {
      entries.add(entry);
    }
  }

  return Array.from(entries).join(delimiter);
}

export function ensureSafeShellEnvironment(env: NodeJS.ProcessEnv = process.env): { path: string; shell: string | null } {
  const shellPath = getDefaultShellPath();
  const safePath = buildSafePath(env.PATH ?? env.Path, shellPath);

  if (process.platform === 'win32') {
    env.PATH = safePath;
    env.Path = safePath;
    if (shellPath && !env.ComSpec) {
      env.ComSpec = shellPath;
    }
  } else {
    env.PATH = safePath;
    if (shellPath && !env.SHELL) {
      env.SHELL = shellPath;
    }
  }

  return { path: safePath, shell: shellPath };
}

function rewriteManagedPiError(message: string, agentDir: string): string {
  return message.replace(/\/home\/clawdbot\/\.pi\/agent\/models\.json/g, path.join(agentDir, 'models.json'));
}

function formatModelChoices(session: BbManagedSession): string {
  const available = session.modelRegistry?.getAll?.() ?? [];
  if (available.length === 0) {
    return 'No models are registered yet.';
  }
  return available.map((model) => `- ${model.provider}/${model.id}`).join('\n');
}

async function handleLoginCommand(session: BbManagedSession, text: string, output: NodeJS.WritableStream, rl: readline.Interface): Promise<void> {
  const provider = text.split(/\s+/)[1];
  const authStorage = session.modelRegistry?.authStorage;
  const supportedProviders = ['anthropic', 'github-copilot', 'google-gemini-cli', 'google-antigravity'];

  if (!provider) {
    output.write(`Login requires a provider. Try one of:\n- ${supportedProviders.join('\n- ')}\n`);
    return;
  }

  if (!supportedProviders.includes(provider)) {
    output.write(`Unsupported login provider: ${provider}\nSupported: ${supportedProviders.join(', ')}\n`);
    return;
  }

  if (!authStorage?.login) {
    output.write('Managed Pi auth storage is unavailable.\n');
    return;
  }

  await authStorage.login(provider, {
    onAuth: ({ url, instructions }) => {
      output.write(`Open this URL to continue login for ${provider}:\n${url}\n`);
      if (instructions) {
        output.write(`${instructions}\n`);
      }
    },
    onPrompt: ({ message }) => new Promise((resolve) => {
      rl.question(`${message} `, (answer) => resolve(answer ?? ''));
    }),
    onProgress: (message) => {
      output.write(`${message}\n`);
    },
  });

  const availableModels = await session.modelRegistry?.getAvailable?.() ?? [];
  if (!session.model && availableModels.length > 0 && session.setModel) {
    await session.setModel(availableModels[0]);
    session.settingsManager?.setDefaultModelAndProvider?.(availableModels[0].provider, availableModels[0].id);
    output.write(`Selected model: ${availableModels[0].provider}/${availableModels[0].id}\n`);
  }
}

async function handleModelCommand(session: BbManagedSession, text: string, output: NodeJS.WritableStream): Promise<void> {
  const requested = text.split(/\s+/)[1];
  if (!requested) {
    output.write(`Available models:\n${formatModelChoices(session)}\nUsage: /model <provider/model>\n`);
    return;
  }

  const [provider, ...modelParts] = requested.split('/');
  const modelId = modelParts.join('/');
  if (!provider || !modelId) {
    output.write('Usage: /model <provider/model>\n');
    return;
  }

  const model = session.modelRegistry?.find?.(provider, modelId);
  if (!model || !session.setModel) {
    output.write(`Model not found: ${requested}\nAvailable models:\n${formatModelChoices(session)}\n`);
    return;
  }

  await session.setModel(model);
  session.settingsManager?.setDefaultModelAndProvider?.(model.provider, model.id);
  output.write(`Selected model: ${model.provider}/${model.id}\n`);
}

export async function runBbAgentTui(options: BbAgentTuiOptions = {}): Promise<void> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const debug = options.debug ?? process.env.BB_TUI_DEBUG === '1';
  const logDebug = (message: string) => {
    if (debug) {
      output.write(`[bb tui debug] ${message}\n`);
    }
  };

  output.write(`${renderBanner()}\n`);

  const shellEnv = ensureSafeShellEnvironment();
  logDebug(`shell env ready: shell=${shellEnv.shell ?? 'unknown'} path=${shellEnv.path}`);

  if (options.testMode) {
    output.write('[bb tui test mode]\n');
    return;
  }

  const workspace = await resolveAgentWorkspace({
    currentProjectRoot: options.cwd ?? process.cwd(),
    requestedProjectKey: options.projectKey ?? null,
    requestedProjectRoot: options.projectRoot ?? null,
  });
  logDebug(`workspace: ${workspace.root} (${workspace.source})`);

  let resolution = await detectPiRuntimeStrategy();
  if (resolution.installState === 'bootstrap-required') {
    output.write(`[bb tui] Installing agent runtime at ${resolution.managedRoot}\n`);
    await bootstrapManagedPi({ output });
    resolution = await detectPiRuntimeStrategy();
  }

  const managedAgentDir = options.agentDir ?? resolution.agentDir;
  await ensureManagedPiSettings(managedAgentDir);
  process.env.PI_CODING_AGENT_DIR = managedAgentDir;
  logDebug(`managed agent dir: ${managedAgentDir}`);

  logDebug('loading Pi SDK');
  const sdk = await loadPiSdk();
  const {
    createAgentSession,
    createReadTool,
    createBashTool,
    createEditTool,
    createWriteTool,
    AuthStorage,
    ModelRegistry,
    SessionManager,
    SettingsManager,
    loadSkillsFromDir,
  } = sdk;
  logDebug(`pi runtime mode: ${resolution.mode} (${resolution.installState})`);
  if (resolution.installState === 'bootstrap-required') {
    output.write(`[bb tui error] Agent runtime required at ${resolution.managedRoot}\n`);
    output.write('[bb tui error] Automatic bb-pi bootstrap failed.\n');
    return;
  }
  logDebug('creating Pi session');

  let session: any;
  let managedSession: BbManagedSession;
  let currentWorkspaceRoot = workspace.root;

  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const driverSkills = loadSkillsFromDir ? loadSkillsFromDir({
    dir: path.join(rootDir, 'skills'),
    source: 'beadboard',
  }).skills : [];

  async function startSession(root: string) {
    if (session) {
      session.dispose();
    }
    currentWorkspaceRoot = root;
    const authStorage = new AuthStorage(path.join(managedAgentDir, 'auth.json'));
    const modelRegistry = new ModelRegistry(authStorage, path.join(managedAgentDir, 'models.json'));
    const settingsManager = SettingsManager.create(root, managedAgentDir);
    const sessionManager = SessionManager.create(root);
    
    // Evaluate the system prompt once before creating the session since the SDK does not await the function
    const dynamicPrompt = await buildBeadBoardSystemPrompt(root, `You are a headless orchestrator for the BeadBoard system.`);

    const res = await createAgentSession({
      cwd: root,
      agentDir: managedAgentDir,
      authStorage,
      modelRegistry,
      settingsManager,
      sessionManager,
      systemPrompt: dynamicPrompt,
      tools: [
        createReadTool(root),
        createBashTool(root),
        createEditTool(root),
        createWriteTool(root),
      ],
      hooks: [],
      skills: driverSkills,
      contextFiles: [],
      slashCommands: [],
      customTools: [
        { tool: createDoltReadTool(root) },
        { tool: createDeviationTool(root) },
        ...createMailboxTools().map((tool) => ({ tool })),
        ...createPresenceTools().map((tool) => ({ tool })),
      ],
    });
    session = res.session;
    managedSession = session as BbManagedSession;

    session.subscribe((event: any) => {
      if (event.type === 'message_start') {
        logDebug(`message_start:${event.message.role}`);
      }
      if (event.type === 'tool_execution_start') {
        logDebug(`tool_start:${event.toolName}`);
        output.write(`\n> Running tool: ${event.toolName}...\n`);
      }
      if (event.type === 'tool_execution_end') {
        logDebug(`tool_end:${event.toolName}:${event.isError ? 'error' : 'ok'}`);
        if (event.isError) {
          output.write(`> Tool error: ${event.toolName}\n`);
        }
      }
      if (event.type === 'message_update') {
        const ame = event.assistantMessageEvent;
        if (ame.type === 'text_delta') {
          output.write(ame.delta);
        } else if (ame.type === 'thinking_delta') {
          output.write(`\x1b[90m${ame.delta}\x1b[0m`); // dim text for thinking
        } else if (ame.type === 'error') {
          output.write(`\n\x1b[31m[Agent Error] ${ame.error.errorMessage}\x1b[0m\n`);
        }
      }
      if (event.type === 'agent_end') {
        logDebug('agent_end');
        
        // Safety check in case the error wasn't streamed via message_update
        const lastMsg = event.messages?.[event.messages.length - 1];
        if (lastMsg?.role === 'assistant' && lastMsg.stopReason === 'error' && lastMsg.errorMessage) {
          output.write(`\n\x1b[31m[Agent Error] ${lastMsg.errorMessage}\x1b[0m\n`);
        }
        
        output.write('\n\n');
      }
    });
  }

  await startSession(workspace.root);
  logDebug(`session ready (model: ${session.model?.id ?? 'unknown'})`);

  const rl = readline.createInterface({
    input,
    output,
    prompt: 'bb> ',
  });

  const close = async () => {
    rl.close();
    session.dispose();
  };

  rl.on('line', async (line) => {
    const text = line.trim();
    if (!text) {
      rl.prompt();
      return;
    }
    if (text === '/exit' || text === '/quit') {
      await close();
      return;
    }
    if (text === '/help') {
      output.write('Enter a prompt to talk to BeadBoard Pi. Use /exit to quit.\n');
      output.write('Commands: /help, /exit, /quit, /login <provider>, /model <provider/model>, /workspace <path>\n');
      rl.prompt();
      return;
    }

    try {
      if (text === '/workspace' || text.startsWith('/workspace ')) {
        const newWorkspace = text.slice(10).trim();
        if (!newWorkspace) {
          output.write(`Current workspace: ${currentWorkspaceRoot}\nUsage: /workspace <path>\n`);
        } else {
          const resolvedPath = path.resolve(currentWorkspaceRoot, newWorkspace);
          if (!fs.existsSync(resolvedPath)) {
            output.write(`Workspace path does not exist: ${resolvedPath}\n`);
          } else {
            await startSession(resolvedPath);
            output.write(`Workspace switched to: ${resolvedPath}\n`);
          }
        }
        rl.prompt();
        return;
      }
      if (text === '/login' || text.startsWith('/login ')) {
        await handleLoginCommand(managedSession, text, output, rl);
        rl.prompt();
        return;
      }
      if (text === '/model' || text.startsWith('/model ')) {
        await handleModelCommand(managedSession, text, output);
        rl.prompt();
        return;
      }

      logDebug(`prompt:start:${text}`);
      await session.prompt(text);
      logDebug('prompt:resolved');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const message = rewriteManagedPiError(rawMessage, managedAgentDir);
      output.write(`\n[bb tui error] ${message}\n`);
      logDebug(`prompt:error:${message}`);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    session.dispose();
  });

  if (options.initialMessage) {
    try {
      logDebug(`initialPrompt:start:${options.initialMessage}`);
      await session.prompt(options.initialMessage);
      logDebug('initialPrompt:resolved');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : String(error);
      const message = rewriteManagedPiError(rawMessage, managedAgentDir);
      output.write(`\n[bb tui error] ${message}\n`);
      logDebug(`initialPrompt:error:${message}`);
    }
  }

  rl.prompt();
}
