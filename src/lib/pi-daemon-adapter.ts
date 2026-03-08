import { embeddedPiDaemon } from './embedded-daemon';
import type { LaunchSurface, RuntimeConsoleEvent, RuntimeInstance } from './embedded-runtime';
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
  launchFromIssue(params: {
    projectRoot: string;
    issue: BeadIssue;
    origin: LaunchSurface;
    swarmId?: string | null;
  }): Promise<{ orchestrator: RuntimeInstance; events: RuntimeConsoleEvent[] }>;
  prompt?(projectRoot: string, text: string): Promise<void>;
}

class InProcessPiDaemonAdapter implements PiDaemonAdapter {
  private activeSessions = new Map<string, any>(); // Map<projectRoot, AgentSession>
  private recentEventKeys = new Set<string>(); // Deduplicate events within same second

  private async getOrCreateSession(projectRoot: string): Promise<any> {
    if (this.activeSessions.has(projectRoot)) {
      return this.activeSessions.get(projectRoot);
    }

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

      // Map PI SDK events to BeadBoard runtime console events
      if (event.type === 'message_start' && event.message.role === 'assistant') {
        emitEvent('orchestrator.message', 'Orchestrator Responding', 'Processing request...', 'working');
      }

      if (event.type === 'tool_execution_start') {
        emitEvent('orchestrator.message', `Tool: ${event.toolName}`, `Executing ${event.toolName}...`, 'working');
      }

      if (event.type === 'tool_execution_end') {
        emitEvent('orchestrator.message', `Tool Complete: ${event.toolName}`, `Finished ${event.toolName}`, 'completed');
      }

      if (event.type === 'message_update') {
        const ame = event.assistantMessageEvent;
        if (ame.type === 'error') {
          emitEvent('orchestrator.message', 'Error', ame.error.errorMessage, 'failed');
        } else if (ame.type === 'thinking_delta') {
          const delta = ame.delta || '';
          if (delta) {
            emitEvent('orchestrator.message', 'Orchestrator Thinking', delta, 'working');
          }
        } else if (ame.type === 'text_delta') {
          const delta = ame.delta || '';
          if (delta) {
            emitEvent('orchestrator.message', 'Orchestrator Reply', delta, 'completed');
          }
        } else if (ame.type === 'text_done') {
          const text = ame.text || '';
          if (text) {
            emitEvent('orchestrator.message', 'Orchestrator Reply', text, 'completed');
          }
        }
      }

      if (event.type === 'agent_end') {
        const lastMsg = event.messages?.[event.messages.length - 1];
        if (lastMsg?.role === 'assistant') {
          if (lastMsg.stopReason === 'error' && lastMsg.errorMessage) {
            emitEvent('orchestrator.message', 'Execution Failed', lastMsg.errorMessage, 'failed');
          } else {
            const txt = lastMsg.content?.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n') || 'Completed.';
            emitEvent('orchestrator.message', 'Orchestrator Reply', txt.substring(0, 500), 'completed');
          }
        }
      }
    });

    this.activeSessions.set(projectRoot, session);
    return session;
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

  async prompt(projectRoot: string, text: string): Promise<void> {
    console.log('[Pi Daemon] Prompt called for projectRoot:', projectRoot, 'text:', text);

    // Emit user message immediately so UI shows it
    embeddedPiDaemon.appendEvent(projectRoot, {
      kind: 'orchestrator.message',
      title: 'User Prompt',
      detail: text,
      actorLabel: 'human',
      status: 'idle',
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
