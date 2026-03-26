import { detectPiRuntimeStrategy } from './pi-runtime-detection';
import { ensureManagedPiSettings } from './bb-pi-bootstrap';
import { embeddedPiDaemon } from './embedded-daemon';
import { getProjectRuntimeId } from './embedded-runtime';
import { getAgentTypes } from './server/beads-fs';
import { readJsonl, writeJsonl } from './runtime-persistence';
import {
  bootstrapAgentStatesFromWorkers,
  createAgentStateFromWorkerSnapshot,
  reduceAgentState,
  type AgentState,
  type AgentStateBootstrapWorkerSnapshot,
  type AgentStateEvent,
} from './agent/state';
import type { AgentType } from './types-swarm';
import path from 'node:path';

export type WorkerStatus = 'spawning' | 'working' | 'completed' | 'failed';

export interface WorkerSession {
  id: string;
  projectId: string;
  projectRoot: string;
  taskId: string;
  beadId?: string;  // Bead ID the worker is assigned to
  status: WorkerStatus;
  session: any; // Pi SDK session
  createdAt: string;
  completedAt: string | null;
  result: string | null;
  error: string | null;
  /** @deprecated Use agentTypeId instead */
  archetypeId?: string;
  /** Agent type ID (e.g., "engineer", "architect") */
  agentTypeId?: string;
  /** Unique instance ID (e.g., "engineer-01-abc123") */
  agentInstanceId?: string;
  /** Display name for UI (e.g., "Engineer 01") */
  displayName?: string;
}

/**
 * Map capabilities to tool access.
 * Full access: coding, implementation, testing
 * Read-only: planning, design_docs, review, arch_review, research, all others
 */
export function getToolsForCapabilities(capabilities: string[]): {
  allowEdit: boolean;
  allowWrite: boolean;
  allowBash: boolean;
} {
  // Full tool access: agent types that write/implement code
  const fullAccessCapabilities = [
    'coding', 'implementation', 'testing',
    'test_design', 'test_implementation',  // tester
    'refactoring', 'debugging',             // engineer
    'ci_cd', 'deployment',                  // shipper
  ];
  const hasFullAccess = capabilities.some(c => fullAccessCapabilities.includes(c));

  if (hasFullAccess) {
    return { allowEdit: true, allowWrite: true, allowBash: true };
  }

  // Read-only: architect, reviewer, investigator
  return { allowEdit: false, allowWrite: false, allowBash: false };
}

/**
 * Generate a unique agent instance ID.
 * Format: {agentTypeId}-{number}-{random}
 */
function generateAgentInstanceId(agentTypeId: string, instanceNumber: number): string {
  const suffix = String(instanceNumber).padStart(2, '0');
  const random = Math.random().toString(36).slice(2, 8);
  return `${agentTypeId}-${suffix}-${random}`;
}

/**
 * Get display name for an agent instance.
 * Format: "{AgentTypeName} {number}" (e.g., "Engineer 01")
 */
function getAgentDisplayName(agentTypeName: string, instanceNumber: number): string {
  const num = String(instanceNumber).padStart(2, '0');
  return `${agentTypeName} ${num}`;
}

export interface SpawnWorkerParams {
  projectRoot: string;
  taskId: string;
  taskContext: string;
  /** @deprecated Use agentType instead */
  archetype?: string;
  /** Agent type ID to spawn (e.g., "engineer", "architect") */
  agentType?: string;
  /** Bead ID for the worker to claim and work on */
  beadId?: string;
}

/**
 * Serializable representation of a WorkerSession (Pi SDK `session` field stripped).
 */
export type SerializedWorker = Omit<WorkerSession, 'session'>;

/**
 * Strip the non-serializable Pi SDK session object from a WorkerSession.
 */
function serializeWorker(worker: WorkerSession): SerializedWorker {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { session: _session, ...rest } = worker;
  return rest;
}

class WorkerSessionManagerImpl {
  private workers = new Map<string, WorkerSession>();
  private agentStates = new Map<string, AgentState>();
  private bootstrappedProjects = new Set<string>();
  private nextWorkerId = 1;

  /**
   * Persist all current worker states to .beadboard/runtime/workers.jsonl.
   * Called after any status-changing operation. Best-effort — does not throw.
   */
  private persistWorkers(projectRoot: string): void {
    try {
      const all = [...this.workers.values()]
        .filter((w) => w.projectRoot === projectRoot)
        .map(serializeWorker);
      writeJsonl(projectRoot, 'workers.jsonl', all);
    } catch {
      // Best-effort: directory may not exist in test environments
    }
  }

  private toBootstrapWorkerSnapshot(worker: SerializedWorker): AgentStateBootstrapWorkerSnapshot {
    return {
      id: worker.id,
      projectId: worker.projectId,
      agentTypeId: worker.agentTypeId ?? worker.archetypeId ?? null,
      agentInstanceId: worker.agentInstanceId ?? null,
      displayName: worker.displayName ?? null,
      taskId: worker.taskId ?? null,
      status: worker.status,
      result: worker.result,
      error: worker.error,
      createdAt: worker.createdAt,
      completedAt: worker.completedAt,
    };
  }

  private ensureProjectBootstrapped(projectRoot: string): void {
    if (this.bootstrappedProjects.has(projectRoot)) {
      return;
    }

    embeddedPiDaemon.ensureProject(projectRoot);
    this.restoreWorkers(projectRoot);
    this.bootstrappedProjects.add(projectRoot);
  }

  private bootstrapAgentStates(projectRoot: string, workers: readonly SerializedWorker[]): void {
    const workerStates = bootstrapAgentStatesFromWorkers(
      workers.map((worker) => this.toBootstrapWorkerSnapshot(worker)),
      embeddedPiDaemon.listEvents(projectRoot).filter((event) =>
        event.kind === 'worker.spawned' ||
        event.kind === 'worker.updated' ||
        event.kind === 'worker.blocked' ||
        event.kind === 'worker.completed' ||
        event.kind === 'worker.failed'
      ) as AgentStateEvent[],
    );

    workers.forEach((worker, index) => {
      const state = workerStates[index];
      if (state) {
        this.agentStates.set(worker.id, state);
      }
    });
  }

  private recordAgentEvent(worker: WorkerSession, event: AgentStateEvent): void {
    const stateKey = worker.id;
    const existing = this.agentStates.get(stateKey);
    const seed =
      existing ??
      createAgentStateFromWorkerSnapshot({
        id: worker.id,
        projectId: worker.projectId,
        agentTypeId: worker.agentTypeId ?? worker.archetypeId ?? null,
        agentInstanceId: worker.agentInstanceId ?? null,
        displayName: worker.displayName ?? null,
        taskId: worker.taskId ?? null,
        status: worker.status,
        result: worker.result,
        error: worker.error,
        createdAt: worker.createdAt,
        completedAt: worker.completedAt,
      });

    this.agentStates.set(stateKey, reduceAgentState(seed, event));
  }

  /**
   * Restore worker sessions from disk on startup.
   * Pi SDK sessions are gone; in-progress workers are marked failed.
   */
  restoreWorkers(projectRoot: string): void {
    embeddedPiDaemon.ensureProject(projectRoot);
    const serialized = readJsonl<SerializedWorker>(projectRoot, 'workers.jsonl');
    this.bootstrapAgentStates(projectRoot, serialized);

    for (const record of serialized) {
      const status: WorkerStatus =
        record.status === 'spawning' || record.status === 'working'
          ? 'failed'
          : record.status;

      const worker: WorkerSession = {
        ...record,
        status,
        session: null,
        error:
          status === 'failed' && record.status !== 'failed'
            ? 'Server restarted'
            : record.error,
        completedAt:
          status === 'failed' && !record.completedAt
            ? new Date().toISOString()
            : record.completedAt,
      };
      this.workers.set(worker.id, worker);

      // Advance nextWorkerId past any restored IDs to avoid collisions
      const numericPart = parseInt(worker.id.replace('worker-', '').split('-')[0], 10);
      if (!isNaN(numericPart) && numericPart >= this.nextWorkerId) {
        this.nextWorkerId = numericPart + 1;
      }
    }
  }

  async spawnWorker(params: SpawnWorkerParams): Promise<WorkerSession> {
    // Support both old and new param names
    const agentTypeId = params.agentType || params.archetype;
    const { projectRoot, taskId, taskContext, beadId } = params;

    // Generate worker ID
    const workerId = `worker-${Date.now()}-${this.nextWorkerId++}`;

    // Get project ID for events
    const projectId = projectRoot
      .replace(/^[A-Za-z]:/, '')
      .replaceAll('\\', '/')
      .split('/')
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase() || 'root';

    // Load agent type to get name for display
    let agentTypeName = agentTypeId || 'Agent';
    let agentType: AgentType | undefined;
    if (agentTypeId) {
      try {
        const agentTypes = await getAgentTypes(projectRoot);
        agentType = agentTypes.find(a => a.id === agentTypeId);
        if (agentType) {
          agentTypeName = agentType.name;
        }
      } catch (error) {
        console.warn(`[WorkerSessionManager] Failed to load agent types:`, error);
      }
    }

    // Calculate instance number for this agent type
    const existingOfType = [...this.workers.values()]
      .filter(w => w.agentTypeId === agentTypeId)
      .length;
    const instanceNumber = existingOfType + 1;

    // Generate instance ID and display name
    const agentInstanceId = agentTypeId
      ? generateAgentInstanceId(agentTypeId, instanceNumber)
      : undefined;
    const displayName = agentTypeId
      ? getAgentDisplayName(agentTypeName, instanceNumber)
      : undefined;

    // Create initial worker record
    const worker: WorkerSession = {
      id: workerId,
      projectId,
      projectRoot,
      taskId,
      beadId,
      status: 'spawning',
      session: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      result: null,
      error: null,
      archetypeId: agentTypeId, // backward compat
      agentTypeId,
      agentInstanceId,
      displayName,
    };

    this.workers.set(workerId, worker);
    this.persistWorkers(projectRoot);

    // Emit spawning event with agent instance info
    const spawnedEvent = embeddedPiDaemon.appendWorkerEvent(projectRoot, workerId, {
      kind: 'worker.spawned',
      title: displayName ? `${displayName} spawned` : `Worker spawned for ${taskId}`,
      detail: `Agent starting. Type: ${agentTypeId || 'default'}`,
      status: 'working',
      metadata: {
        workerId,
        agentInstanceId,
        agentTypeId,
        displayName,
        taskId,
      },
    });
    this.recordAgentEvent(worker, {
      id: spawnedEvent.id,
      kind: spawnedEvent.kind,
      projectId: spawnedEvent.projectId,
      timestamp: spawnedEvent.timestamp,
      status: spawnedEvent.status,
      taskId: spawnedEvent.taskId ?? worker.taskId,
      swarmId: spawnedEvent.swarmId ?? null,
      actorLabel: spawnedEvent.actorLabel ?? displayName,
      metadata: spawnedEvent.metadata ?? {},
      detail: spawnedEvent.detail,
    });

    // Spawn worker session asynchronously
    this.createWorkerSession(worker, taskContext, agentType, beadId).catch((error) => {
      console.error(`[WorkerSessionManager] Failed to create worker session:`, error);
      worker.status = 'failed';
      worker.error = error instanceof Error ? error.message : String(error);
      worker.completedAt = new Date().toISOString();
      this.persistWorkers(projectRoot);

      const failedEvent = embeddedPiDaemon.appendEvent(projectRoot, {
        kind: 'worker.failed',
        title: displayName ? `${displayName} failed` : `Worker ${workerId} failed`,
        detail: worker.error,
        status: 'failed',
        metadata: { workerId, agentInstanceId, taskId },
      });
      this.recordAgentEvent(worker, {
        id: failedEvent.id,
        kind: failedEvent.kind,
        projectId: failedEvent.projectId,
        timestamp: failedEvent.timestamp,
        status: failedEvent.status,
        taskId: failedEvent.taskId ?? worker.taskId,
        swarmId: failedEvent.swarmId ?? null,
        actorLabel: failedEvent.actorLabel ?? displayName,
        metadata: failedEvent.metadata ?? {},
        detail: failedEvent.detail,
      });
    });

    return worker;
  }

  private async createWorkerSession(
    worker: WorkerSession,
    taskContext: string,
    agentType?: AgentType,
    beadId?: string
  ): Promise<void> {
    const { projectRoot, taskId, id: workerId, displayName } = worker;
    const agentTypeId = worker.agentTypeId;

    // Resolve Pi SDK
    const resolution = await detectPiRuntimeStrategy();
    if (!resolution.sdkPath || resolution.installState === 'bootstrap-required') {
      throw new Error('Pi SDK not available. Run bootstrap first.');
    }

    const managedAgentDir = resolution.agentDir;
    await ensureManagedPiSettings(managedAgentDir);
    process.env.PI_CODING_AGENT_DIR = managedAgentDir;

    // Dynamically load Pi SDK
    const { pathToFileURL } = await import('node:url');
    const sdk = await import(/* webpackIgnore: true */ pathToFileURL(resolution.sdkPath).href);

    const authStorage = new sdk.AuthStorage(path.join(managedAgentDir, 'auth.json'));
    const modelRegistry = new sdk.ModelRegistry(authStorage, path.join(managedAgentDir, 'models.json'));
    const settingsManager = sdk.SettingsManager.create(projectRoot, managedAgentDir);

    // Create unique session directory for worker
    const workerSessionDir = path.join(managedAgentDir, 'worker-sessions', workerId);
    const sessionManager = sdk.SessionManager.create(workerSessionDir);

    const capabilities = agentType?.capabilities ?? [];
    const toolAccess = getToolsForCapabilities(capabilities);

    // Build worker-specific system prompt with agent type
    const systemPrompt = this.buildWorkerPrompt(taskId, taskContext, agentType, beadId, displayName);

    // Import worker-safe tools (no spawn tool for workers)
    const { createDoltReadTool } = await import('../tui/tools/bb-dolt-read');
    const { createMailboxTools } = await import('../tui/tools/bb-mailbox');
    const { createPresenceTools } = await import('../tui/tools/bb-presence');
    const { createBeadCrudTools } = await import('../tui/tools/bb-bead-crud');

    // Build tools based on agent type capabilities
    const tools = [sdk.createReadTool(projectRoot)];

    if (toolAccess.allowBash) {
      tools.push(sdk.createBashTool(projectRoot));
    }
    if (toolAccess.allowEdit) {
      tools.push(sdk.createEditTool(projectRoot));
    }
    if (toolAccess.allowWrite) {
      tools.push(sdk.createWriteTool(projectRoot));
    }

    const res = await sdk.createAgentSession({
      cwd: projectRoot,
      agentDir: managedAgentDir,
      authStorage,
      modelRegistry,
      settingsManager,
      sessionManager,
      systemPrompt,
      tools,
      hooks: [],
      skills: [],
      contextFiles: [],
      slashCommands: [],
      customTools: [
        { tool: createDoltReadTool(projectRoot) },
        ...createMailboxTools().map((tool) => ({ tool: tool as any })),
        ...createPresenceTools().map((tool) => ({ tool: tool as any })),
        ...createBeadCrudTools(projectRoot).map((tool) => ({ tool: tool as any })),
      ],
    });

    const session = res.session;
    worker.session = session;
    worker.status = 'working';
    this.persistWorkers(projectRoot);

    // Subscribe to worker events
    session.subscribe((event: any) => {
      this.handleWorkerEvent(worker, event);
    });

    // Emit working event
    const workingEvent = embeddedPiDaemon.appendEvent(projectRoot, {
      kind: 'worker.updated',
      title: displayName ? `${displayName} started` : `Worker ${workerId} started`,
      detail: `Agent is now executing task ${taskId}`,
      status: 'working',
      metadata: { workerId, agentInstanceId: worker.agentInstanceId, taskId },
    });
    this.recordAgentEvent(worker, {
      id: workingEvent.id,
      kind: workingEvent.kind,
      projectId: workingEvent.projectId,
      timestamp: workingEvent.timestamp,
      status: workingEvent.status,
      taskId: workingEvent.taskId ?? worker.taskId,
      swarmId: workingEvent.swarmId ?? null,
      actorLabel: workingEvent.actorLabel ?? displayName,
      metadata: workingEvent.metadata ?? {},
      detail: workingEvent.detail,
    });

    // Send the task as initial prompt
    try {
      await session.prompt(taskContext);
    } catch (error) {
      console.error(`[WorkerSessionManager] Worker prompt failed:`, error);
      worker.status = 'failed';
      worker.error = error instanceof Error ? error.message : String(error);
      worker.completedAt = new Date().toISOString();
      this.persistWorkers(projectRoot);

      const failedEvent = embeddedPiDaemon.appendWorkerEvent(projectRoot, workerId, {
        kind: 'worker.failed',
        title: displayName ? `${displayName} failed` : `Worker ${workerId} failed`,
        detail: worker.error,
        status: 'failed',
      });
      this.recordAgentEvent(worker, {
        id: failedEvent.id,
        kind: failedEvent.kind,
        projectId: failedEvent.projectId,
        timestamp: failedEvent.timestamp,
        status: failedEvent.status,
        taskId: failedEvent.taskId ?? worker.taskId,
        swarmId: failedEvent.swarmId ?? null,
        actorLabel: failedEvent.actorLabel ?? displayName,
        metadata: failedEvent.metadata ?? {},
        detail: failedEvent.detail,
      });
    }
  }

  private buildWorkerPrompt(
    taskId: string, 
    taskContext: string, 
    agentType?: AgentType, 
    beadId?: string,
    displayName?: string
  ): string {
    const agentSection = agentType
      ? `## Your Role

${agentType.systemPrompt}

`
      : '';

    const beadWorkflow = beadId ? `
## IMPORTANT: Bead Workflow

You are working on bead: ${beadId}
Your display name: ${displayName || 'Worker'}

**You MUST follow this workflow:**

1. **Claim the bead** (first thing you do):
   \`\`\`
   bb_update(id="${beadId}", status="in_progress", assignee="${displayName || 'Worker'}")
   \`\`\`

2. **Update progress** (add notes as you work):
   \`\`\`
   bb_update(id="${beadId}", notes="Found the issue in auth.ts...")
   \`\`\`

3. **When blocked**, update status:
   \`\`\`
   bb_update(id="${beadId}", status="blocked", notes="Waiting for API key from infra team")
   \`\`\`

4. **When complete**, close the bead:
   \`\`\`
   bb_close(id="${beadId}", reason="Fixed by updating auth.ts line 42. Tests passing.")
   \`\`\`

**Never skip this workflow.** The bead tracks your work for coordination.

` : '';

    return `You are a worker agent for BeadBoard. Your job is to execute a specific task.

Task ID: ${taskId}
${beadId ? `Bead ID: ${beadId}` : ''}

Task Context:
${taskContext}

${agentSection}${beadWorkflow}## Instructions

- Focus ONLY on this specific task
- Report progress using the bb_update tool on your bead
- When complete, close the bead with a clear summary
- If you encounter blockers, set the bead status to "blocked" and explain what is blocking you
- You CANNOT spawn more workers - execute this task yourself
- Be thorough but efficient
- If you need to read project files, use bb_dolt_read
- If you need to send messages to other agents, use bb_mailbox_send`;
  }

  private handleWorkerEvent(worker: WorkerSession, event: any): void {
    const { projectRoot, taskId, id: workerId, displayName } = worker;

    // Track completion
    if (event.type === 'agent_end') {
      const lastMsg = event.messages?.[event.messages.length - 1];
      if (lastMsg?.role === 'assistant') {
        worker.status = 'completed';
        worker.completedAt = new Date().toISOString();

        if (lastMsg.stopReason === 'error' && lastMsg.errorMessage) {
          worker.status = 'failed';
          worker.error = lastMsg.errorMessage;
          this.persistWorkers(projectRoot);

          const failedEvent = embeddedPiDaemon.appendWorkerEvent(projectRoot, workerId, {
            kind: 'worker.failed',
            title: displayName ? `${displayName} failed` : `Worker ${workerId} failed`,
            detail: worker.error || 'Unknown error',
            status: 'failed',
          });
          this.recordAgentEvent(worker, {
            id: failedEvent.id,
            kind: failedEvent.kind,
            projectId: failedEvent.projectId,
            timestamp: failedEvent.timestamp,
            status: failedEvent.status,
            taskId: failedEvent.taskId ?? worker.taskId,
            swarmId: failedEvent.swarmId ?? null,
            actorLabel: failedEvent.actorLabel ?? displayName,
            metadata: failedEvent.metadata ?? {},
            detail: failedEvent.detail,
          });
        } else {
          // Extract result text
          const text = lastMsg.content
            ?.filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n') || 'Completed';
          worker.result = text.substring(0, 1000);
          this.persistWorkers(projectRoot);

          const completedEvent = embeddedPiDaemon.appendWorkerEvent(projectRoot, workerId, {
            kind: 'worker.completed',
            title: displayName ? `${displayName} completed` : `Worker ${workerId} completed`,
            detail: (worker.result || 'Completed').substring(0, 200),
            status: 'completed',
          });
          this.recordAgentEvent(worker, {
            id: completedEvent.id,
            kind: completedEvent.kind,
            projectId: completedEvent.projectId,
            timestamp: completedEvent.timestamp,
            status: completedEvent.status,
            taskId: completedEvent.taskId ?? worker.taskId,
            swarmId: completedEvent.swarmId ?? null,
            actorLabel: completedEvent.actorLabel ?? displayName,
            metadata: completedEvent.metadata ?? {},
            detail: completedEvent.detail,
          });
        }
      }
    }
  }

  getWorker(workerId: string): WorkerSession | undefined {
    return this.workers.get(workerId);
  }

  listWorkers(projectRoot: string): WorkerSession[] {
    this.ensureProjectBootstrapped(projectRoot);
    return [...this.workers.values()].filter((w) => w.projectRoot === projectRoot);
  }

  getAllWorkers(): WorkerSession[] {
    return [...this.workers.values()];
  }

  listAgentStates(projectRoot: string): AgentState[] {
    this.ensureProjectBootstrapped(projectRoot);
    const projectId = getProjectRuntimeId(projectRoot);
    return [...this.agentStates.values()].filter((state) => state.projectId === projectId);
  }

  async terminateWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    if (worker.session && typeof worker.session.stop === 'function') {
      try {
        await worker.session.stop();
      } catch (error) {
        console.error(`[WorkerSessionManager] Error stopping worker session:`, error);
      }
    }

    worker.status = 'failed';
    worker.error = 'Terminated by user';
    worker.completedAt = new Date().toISOString();
    this.persistWorkers(worker.projectRoot);

    const failedEvent = embeddedPiDaemon.appendEvent(worker.projectRoot, {
      kind: 'worker.failed',
      title: worker.displayName ? `${worker.displayName} terminated` : `Worker ${workerId} terminated`,
      detail: 'Worker was manually terminated',
      status: 'failed',
      metadata: { workerId, agentInstanceId: worker.agentInstanceId, taskId: worker.taskId },
    });
    this.recordAgentEvent(worker, {
      id: failedEvent.id,
      kind: failedEvent.kind,
      projectId: failedEvent.projectId,
      timestamp: failedEvent.timestamp,
      status: failedEvent.status,
      taskId: failedEvent.taskId ?? worker.taskId,
      swarmId: failedEvent.swarmId ?? null,
      actorLabel: failedEvent.actorLabel ?? worker.displayName ?? worker.id,
      metadata: failedEvent.metadata ?? {},
      detail: failedEvent.detail,
    });
  }

  async waitForWorker(workerId: string, timeoutMs = 300000): Promise<string> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const w = this.workers.get(workerId);
        if (!w) {
          clearInterval(checkInterval);
          reject(new Error(`Worker ${workerId} not found`));
          return;
        }

        if (w.status === 'completed') {
          clearInterval(checkInterval);
          resolve(w.result || 'Completed with no result');
          return;
        }

        if (w.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(w.error || 'Worker failed'));
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error('Worker timeout'));
        }
      }, 1000);
    });
  }

  // For testing
  reset(): void {
    this.workers.clear();
    this.agentStates.clear();
    this.bootstrappedProjects.clear();
    this.nextWorkerId = 1;
  }
}

// Singleton
const globalRegistry = globalThis as typeof globalThis & {
  __beadboardWorkerSessionManager?: WorkerSessionManagerImpl;
};

export const workerSessionManager = globalRegistry.__beadboardWorkerSessionManager ?? new WorkerSessionManagerImpl();
if (!globalRegistry.__beadboardWorkerSessionManager) {
  globalRegistry.__beadboardWorkerSessionManager = workerSessionManager;
}
