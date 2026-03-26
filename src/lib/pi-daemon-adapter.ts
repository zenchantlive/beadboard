import { embeddedPiDaemon } from './embedded-daemon';
import type { LaunchSurface, RuntimeConsoleEvent, RuntimeInstance } from './embedded-runtime';
import { makeTurnId } from './orchestrator-chat';
import type { BeadIssue } from './types';
import { detectPiRuntimeStrategy } from './pi-runtime-detection';
import { ensureManagedPiSettings, bootstrapManagedPi } from './bb-pi-bootstrap';
import { buildBeadBoardSystemPrompt } from '../tui/system-prompt';
import path from 'node:path';

import { createDoltReadTool } from '../tui/tools/bb-dolt-read';
import { createMailboxTools } from '../tui/tools/bb-mailbox';
import { createPresenceTools } from '../tui/tools/bb-presence';
import { createDeviationTool } from '../tui/tools/bb-deviation';
import { createSpawnWorkerTool } from '../tui/tools/bb-spawn-worker';
import { createSpawnTemplateTool } from '../tui/tools/bb-spawn-template';
import { createWorkerStatusTool } from '../tui/tools/bb-worker-status';
import { createAssignAgentTool } from '../tui/tools/bb-assign-agent';
import { createListAgentsTool } from '../tui/tools/bb-list-agents';
import { createCreateAgentTool } from '../tui/tools/bb-create-agent';
import { createUpdateAgentTool } from '../tui/tools/bb-update-agent';
import { createDeleteAgentTool } from '../tui/tools/bb-delete-agent';
import { createListTemplatesTool } from '../tui/tools/bb-list-templates';
import { createCreateTemplateTool } from '../tui/tools/bb-create-template';
import { createUpdateTemplateTool } from '../tui/tools/bb-update-template';
import { createDeleteTemplateTool } from '../tui/tools/bb-delete-template';
import { createBeadCrudTools } from '../tui/tools/bb-bead-crud';
import { createWorkerResultsTool } from '../tui/tools/bb-worker-results';

export interface PiDaemonBinding {
  id: string;
  backend: 'pi';
  kind: RuntimeInstance['kind'];
  projectRoot: string;
  attachMode: 'in-process' | 'host-daemon';
  launchTarget: 'embedded-pi-daemon';
  runtime: RuntimeInstance;
}

export interface PiDaemonAdapter {
  ensureProjectOrchestrator(projectRoot: string): Promise<PiDaemonBinding>;
  listEvents(projectRoot: string): RuntimeConsoleEvent[];
  listTurns(projectRoot: string): import('./orchestrator-chat').ConversationTurn[];
  launchFromIssue(params: {
    projectRoot: string;
    issue: BeadIssue;
    origin: LaunchSurface;
    swarmId?: string | null;
  }): Promise<{ orchestrator: RuntimeInstance; events: RuntimeConsoleEvent[] }>;
  prompt?(projectRoot: string, text: string): Promise<void>;
  restartSession?(projectRoot: string): Promise<void>;
}

class InProcessPiDaemonAdapter implements PiDaemonAdapter {
  private activeSessions = new Map<string, any>(); // Map<projectRoot, AgentSession>
  private sessionCreationPromises = new Map<string, Promise<any>>(); // In-flight creation locks
  private recentEventKeys = new Set<string>(); // Deduplicate events within same second

  private async _createSession(projectRoot: string): Promise<any> {
    let resolution = await detectPiRuntimeStrategy();

    // Auto-bootstrap if Pi not installed
    if (!resolution.sdkPath || resolution.installState === 'bootstrap-required') {
      console.log('[Agent] SDK not found, auto-bootstrapping...');
      const bootstrapResult = await bootstrapManagedPi();
      console.log('[Agent] Bootstrap complete:', bootstrapResult.managedRoot);

      // Re-detect after bootstrap
      resolution = await detectPiRuntimeStrategy();
      if (!resolution.sdkPath) {
        throw new Error('Auto-bootstrap completed but SDK still not available. Check npm install logs.');
      }
    }

    const managedAgentDir = resolution.agentDir;
    await ensureManagedPiSettings(managedAgentDir);
    process.env.PI_CODING_AGENT_DIR = managedAgentDir;

    // Dynamically load the PI SDK
    const { pathToFileURL } = await import('node:url');
    const sdk = await import(/* webpackIgnore: true */ pathToFileURL(resolution.sdkPath).href);

    const authStorage = new sdk.AuthStorage(path.join(managedAgentDir, 'auth.json'));
    const modelRegistry = new sdk.ModelRegistry(authStorage, path.join(managedAgentDir, 'models.json'));
    const settingsManager = sdk.SettingsManager.create(projectRoot, managedAgentDir);
    const sessionManager = sdk.SessionManager.create(projectRoot);

    const dynamicPrompt = await buildBeadBoardSystemPrompt(projectRoot, `You are a headless orchestrator for the BeadBoard system.`);

    const res = await sdk.createAgentSession({
      cwd: projectRoot,
      agentDir: managedAgentDir,
      authStorage,
      modelRegistry,
      settingsManager,
      sessionManager,
      systemPrompt: dynamicPrompt,
      tools: [
        sdk.createReadTool(projectRoot),
        sdk.createBashTool(projectRoot),
        sdk.createEditTool(projectRoot),
        sdk.createWriteTool(projectRoot),
      ],
      hooks: [],
      skills: [],
      contextFiles: [],
      slashCommands: [],
      customTools: [
        { tool: createDoltReadTool(projectRoot) },
        { tool: createDeviationTool(projectRoot) },
        { tool: createSpawnWorkerTool(projectRoot) },
        { tool: createSpawnTemplateTool(projectRoot) },
        { tool: createWorkerStatusTool(projectRoot) },
        { tool: createAssignAgentTool(projectRoot) },
        // Agent CRUD tools
        { tool: createListAgentsTool(projectRoot) },
        { tool: createCreateAgentTool(projectRoot) },
        { tool: createUpdateAgentTool(projectRoot) },
        { tool: createDeleteAgentTool(projectRoot) },
        // Template CRUD tools
        { tool: createListTemplatesTool(projectRoot) },
        { tool: createCreateTemplateTool(projectRoot) },
        { tool: createUpdateTemplateTool(projectRoot) },
        { tool: createDeleteTemplateTool(projectRoot) },
        // Bead CRUD tools
        ...createBeadCrudTools(projectRoot).map((tool) => ({ tool: tool as any })),
        // Worker results tool
        { tool: createWorkerResultsTool(projectRoot) },
        ...createMailboxTools().map((tool) => ({ tool: tool as any })),
        ...createPresenceTools().map((tool) => ({ tool: tool as any })),
      ],
    });

    const session = res.session;

    // Helper: deduplicate and emit events
    const emitEvent = (kind: RuntimeConsoleEvent['kind'], title: string, detail: string, status?: RuntimeConsoleEvent['status']) => {
      const normalizedDetail = detail.trim();
      const eventKey = `${kind}:${title}:${status || 'none'}:${normalizedDetail}`;
      if (this.recentEventKeys.has(eventKey)) {
        return;
      }
      this.recentEventKeys.add(eventKey);
      setTimeout(() => this.recentEventKeys.delete(eventKey), 1000);

      embeddedPiDaemon.appendEvent(projectRoot, {
        kind,
        title,
        detail,
        status,
      });
    };

    session.subscribe((event: any) => {
      console.log('[Pi SDK Event]', event.type, event);

      // --- Runtime console events (unchanged) ---
      if (event.type === 'message_start' && event.message.role === 'assistant') {
        emitEvent('orchestrator.message', 'Orchestrator Responding', 'Processing request...', 'working');
      }

      if (event.type === 'tool_execution_start') {
        emitEvent('orchestrator.message', `Tool: ${event.toolName}`, `Executing ${event.toolName}...`, 'working');
      }

      if (event.type === 'tool_execution_end') {
        emitEvent('orchestrator.message', `Tool Complete: ${event.toolName}`, `Finished ${event.toolName}`, 'completed');
      }

      // --- Conversation turn store (first-class, no string-matching) ---

      if (event.type === 'message_start' && event.message.role === 'assistant') {
        // Create a new streaming assistant turn
        embeddedPiDaemon.appendTurn(projectRoot, {
          id: makeTurnId('asst'),
          role: 'assistant',
          text: '',
          timestamp: new Date().toISOString(),
          status: 'streaming',
        });
      }

      if (event.type === 'message_update') {
        const ame = event.assistantMessageEvent;

        if (ame.type === 'error') {
          // Emit runtime event for console
          emitEvent('orchestrator.message', 'Error', ame.error.errorMessage, 'failed');
          // Mark current turn as error
          embeddedPiDaemon.updateCurrentTurn(projectRoot, (turn) => ({
            ...turn,
            text: ame.error.errorMessage || 'An error occurred.',
            status: 'error',
            timestamp: new Date().toISOString(),
          }));
        } else if (ame.type === 'thinking_delta') {
          // Thinking deltas go only to the runtime console, not to chat turns
          const delta = ame.delta || '';
          if (delta) {
            emitEvent('orchestrator.message', 'Orchestrator Thinking', delta, 'working');
          }
        } else if (ame.type === 'text_delta') {
          // Append delta to the current streaming turn
          const delta = ame.delta || '';
          if (delta) {
            embeddedPiDaemon.updateCurrentTurn(projectRoot, (turn) => ({
              ...turn,
              text: turn.text + delta,
              timestamp: new Date().toISOString(),
            }));
          }
        } else if (ame.type === 'text_done') {
          // Mark the current turn complete with the final, authoritative text.
          // Do NOT create a second turn — this is the fix for the double-reply bug.
          const text = ame.text || '';
          if (text) {
            embeddedPiDaemon.updateCurrentTurn(projectRoot, (turn) => ({
              ...turn,
              text,
              status: 'complete',
              timestamp: new Date().toISOString(),
            }));
          }
        }
      }

      if (event.type === 'agent_end') {
        const lastMsg = event.messages?.[event.messages.length - 1];
        if (lastMsg?.role === 'assistant') {
          if (lastMsg.stopReason === 'error' && lastMsg.errorMessage) {
            emitEvent('orchestrator.message', 'Execution Failed', lastMsg.errorMessage, 'failed');
            embeddedPiDaemon.updateCurrentTurn(projectRoot, (turn) => ({
              ...turn,
              text: turn.status === 'streaming' && !turn.text
                ? lastMsg.errorMessage
                : turn.text,
              status: 'error',
              timestamp: new Date().toISOString(),
            }));
          } else {
            // Mark current turn complete if still streaming (fallback if text_done was missed)
            embeddedPiDaemon.updateCurrentTurn(projectRoot, (turn) => {
              if (turn.status !== 'streaming') return turn;
              const fallbackText = lastMsg.content
                ?.filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('\n') || turn.text || 'Completed.';
              return {
                ...turn,
                text: fallbackText,
                status: 'complete',
                timestamp: new Date().toISOString(),
              };
            });
          }
        }
      }
    });

    this.activeSessions.set(projectRoot, session);
    return session;
  }

  private async getOrCreateSession(projectRoot: string): Promise<any> {
    // Return existing session if already established
    const existing = this.activeSessions.get(projectRoot);
    if (existing) return existing;

    // Return in-flight creation promise to prevent concurrent duplicate sessions
    const inFlight = this.sessionCreationPromises.get(projectRoot);
    if (inFlight) return inFlight;

    // Create new session with a per-project lock
    const promise = this._createSession(projectRoot);
    this.sessionCreationPromises.set(projectRoot, promise);
    try {
      const session = await promise;
      return session;
    } finally {
      this.sessionCreationPromises.delete(projectRoot);
    }
  }

  async ensureProjectOrchestrator(projectRoot: string): Promise<PiDaemonBinding> {
    const runtime = embeddedPiDaemon.ensureOrchestrator(projectRoot);
    // eager initialize the session if we can
    this.getOrCreateSession(projectRoot).catch(() => {});

    return {
      id: runtime.id,
      backend: 'pi',
      kind: runtime.kind,
      projectRoot,
      attachMode: 'in-process',
      launchTarget: 'embedded-pi-daemon',
      runtime,
    };
  }

  listEvents(projectRoot: string): RuntimeConsoleEvent[] {
    return embeddedPiDaemon.listEvents(projectRoot);
  }

  listTurns(projectRoot: string): import('./orchestrator-chat').ConversationTurn[] {
    return embeddedPiDaemon.listTurns(projectRoot);
  }

  async launchFromIssue(params: {
    projectRoot: string;
    issue: BeadIssue;
    origin: LaunchSurface;
    swarmId?: string | null;
  }): Promise<{ orchestrator: RuntimeInstance; events: RuntimeConsoleEvent[] }> {
    const result = embeddedPiDaemon.launchFromIssue(params);
    // Send it to the orchestrator as a prompt
    const text = `I am launching a task from the UI.\n\nTask: ${params.issue.title}\nID: ${params.issue.id}\n\nPlease read the current state of the project using your tools and proceed with the necessary steps to orchestrate this task.`;
    this.prompt(params.projectRoot, text).catch(() => {});
    return result;
  }

  async restartSession(projectRoot: string): Promise<void> {
    // Stop the existing session if one is active
    const existing = this.activeSessions.get(projectRoot);
    if (existing && typeof existing.stop === 'function') {
      try {
        await existing.stop();
      } catch (error) {
        console.error('[Pi Daemon] Error stopping session during restart:', error);
      }
    }

    // Remove the session so next prompt creates a fresh one
    this.activeSessions.delete(projectRoot);

    // Clear in-memory events and turns so the UI resets to clean state
    const state = embeddedPiDaemon.ensureProject(projectRoot);
    state.events = [];
    state.turns.reset();
    state.updatedAt = new Date().toISOString();

    // Emit a restart event so the console shows it happened
    embeddedPiDaemon.appendEvent(projectRoot, {
      kind: 'launch.started',
      title: 'Orchestrator Restarted',
      detail: 'Session was cleared by user. Send a message to start a fresh session.',
      status: 'idle',
    });
  }

  async prompt(projectRoot: string, text: string): Promise<void> {
    console.log('[Pi Daemon] Prompt called for projectRoot:', projectRoot, 'text:', text);

    // Emit user message to runtime console for operator visibility
    embeddedPiDaemon.appendEvent(projectRoot, {
      kind: 'orchestrator.message',
      title: 'User Prompt',
      detail: text,
      actorLabel: 'human',
      status: 'idle',
    });

    // Directly append a user turn to the conversation store
    embeddedPiDaemon.appendTurn(projectRoot, {
      id: makeTurnId('user'),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
      status: 'complete',
    });

    // Fire-and-forget the session prompt - SDK subscription handles real-time event emission
    this.getOrCreateSession(projectRoot)
      .then((session) => {
        console.log('[Pi Daemon] Session obtained, calling session.prompt()');
        return session.prompt(text);
      })
      .then(() => {
        console.log('[Pi Daemon] Session prompt completed');
      })
      .catch((e) => {
        console.error('[Pi Daemon] Session error:', e);
        embeddedPiDaemon.appendEvent(projectRoot, {
          kind: 'orchestrator.message',
          title: 'Session Error',
          detail: e instanceof Error ? e.message : String(e),
          status: 'failed',
        });
      });
  }
}

export function createPiDaemonAdapter(): PiDaemonAdapter {
  return new InProcessPiDaemonAdapter();
}
