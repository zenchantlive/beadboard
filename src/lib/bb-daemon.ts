import { embeddedPiDaemon, type HostDaemonStatus } from './embedded-daemon';
import type { LaunchSurface, RuntimeConsoleEvent, RuntimeInstance } from './embedded-runtime';
import type { ConversationTurn } from './orchestrator-chat';
import { createPiDaemonAdapter, type PiDaemonAdapter } from './pi-daemon-adapter';
import { detectPiRuntimeStrategy, type PiRuntimeResolution } from './pi-runtime-detection';
import type { BeadIssue } from './types';

export type BbDaemonLifecycleStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'failed';

export interface BbDaemonLifecycle {
  status: BbDaemonLifecycleStatus;
  startedAt: string | null;
  stoppedAt: string | null;
  lastError: string | null;
}

export interface RuntimeEventSubscriptionOptions {
  projectRoot?: string;
}

export interface BbDaemonStatus extends HostDaemonStatus {
  lifecycle: BbDaemonLifecycle;
  piRuntime: PiRuntimeResolution | null;
}

export interface BbDaemon {
  start(): Promise<BbDaemonLifecycle>;
  stop(): Promise<BbDaemonLifecycle>;
  ensureRunning(): Promise<BbDaemonLifecycle>;
  getLifecycle(): BbDaemonLifecycle;
  getStatus(): BbDaemonStatus;
  getPiRuntime(): PiRuntimeResolution | null;
  ensureProject(projectRoot: string): { projectRoot: string; orchestratorId: string };
  ensureOrchestrator(projectRoot: string): Promise<RuntimeInstance>;
  listEvents(projectRoot: string): RuntimeConsoleEvent[];
  listTurns(projectRoot: string): ConversationTurn[];
  subscribeRuntimeEvents(listener: (event: RuntimeConsoleEvent) => void, options?: RuntimeEventSubscriptionOptions): () => void;
  launchFromIssue(params: {
    projectRoot: string;
    issue: BeadIssue;
    origin: LaunchSurface;
    swarmId?: string | null;
  }): Promise<{ orchestrator: RuntimeInstance; events: RuntimeConsoleEvent[] }>;
  prompt(projectRoot: string, text: string): Promise<void>;
  restartOrchestrator(projectRoot: string): Promise<void>;
  getBlockedCount(projectRoot: string): number;
  listBlockedEvents(projectRoot: string): RuntimeConsoleEvent[];
  dismissBlocked(projectRoot: string, eventId: string): void;
  resetForTests(): void;
}

function createInitialLifecycle(): BbDaemonLifecycle {
  return {
    status: 'stopped',
    startedAt: null,
    stoppedAt: null,
    lastError: null,
  };
}

interface RuntimeEventSubscriber {
  projectRoot?: string;
  listener: (event: RuntimeConsoleEvent) => void;
}

class InProcessBbDaemon implements BbDaemon {
  private lifecycle: BbDaemonLifecycle = createInitialLifecycle();
  private readonly adapter: PiDaemonAdapter;
  private readonly subscribers = new Map<number, RuntimeEventSubscriber>();
  private nextSubscriberId = 1;
  private piRuntime: PiRuntimeResolution | null = null;

  constructor(adapter: PiDaemonAdapter = createPiDaemonAdapter()) {
    this.adapter = adapter;
  }

  async start(): Promise<BbDaemonLifecycle> {
    if (this.lifecycle.status === 'running') {
      return this.getLifecycle();
    }

    this.lifecycle = {
      ...this.lifecycle,
      status: 'starting',
      lastError: null,
    };

    this.piRuntime = await detectPiRuntimeStrategy();

    this.lifecycle = {
      status: 'running',
      startedAt: this.lifecycle.startedAt ?? new Date().toISOString(),
      stoppedAt: null,
      lastError: null,
    };

    return this.getLifecycle();
  }

  async ensureRunning(): Promise<BbDaemonLifecycle> {
    return this.lifecycle.status === 'running' ? this.getLifecycle() : this.start();
  }

  async stop(): Promise<BbDaemonLifecycle> {
    if (this.lifecycle.status === 'stopped') {
      return this.getLifecycle();
    }

    this.lifecycle = {
      ...this.lifecycle,
      status: 'stopping',
    };

    this.lifecycle = {
      status: 'stopped',
      startedAt: this.lifecycle.startedAt,
      stoppedAt: new Date().toISOString(),
      lastError: null,
    };

    return this.getLifecycle();
  }

  getLifecycle(): BbDaemonLifecycle {
    return { ...this.lifecycle };
  }

  getPiRuntime(): PiRuntimeResolution | null {
    return this.piRuntime;
  }

  getStatus(): BbDaemonStatus {
    return {
      ...embeddedPiDaemon.getStatus(),
      lifecycle: this.getLifecycle(),
      piRuntime: this.getPiRuntime(),
    };
  }

  ensureProject(projectRoot: string): { projectRoot: string; orchestratorId: string } {
    const state = embeddedPiDaemon.ensureProject(projectRoot);
    return {
      projectRoot: state.projectRoot,
      orchestratorId: state.orchestrator.id,
    };
  }

  async ensureOrchestrator(projectRoot: string): Promise<RuntimeInstance> {
    await this.ensureRunning();
    const binding = await this.adapter.ensureProjectOrchestrator(projectRoot);
    return binding.runtime;
  }

  listEvents(projectRoot: string): RuntimeConsoleEvent[] {
    return this.adapter.listEvents(projectRoot);
  }

  listTurns(projectRoot: string): ConversationTurn[] {
    return this.adapter.listTurns(projectRoot);
  }

  subscribeRuntimeEvents(listener: (event: RuntimeConsoleEvent) => void, options: RuntimeEventSubscriptionOptions = {}): () => void {
    const id = this.nextSubscriberId;
    this.nextSubscriberId += 1;
    this.subscribers.set(id, {
      projectRoot: options.projectRoot,
      listener,
    });

    return () => {
      this.subscribers.delete(id);
    };
  }

  private emitRuntimeEvents(projectRoot: string, events: RuntimeConsoleEvent[]) {
    for (const event of events) {
      for (const subscriber of this.subscribers.values()) {
        if (!subscriber.projectRoot || subscriber.projectRoot === projectRoot) {
          subscriber.listener(event);
        }
      }
    }
  }

  async launchFromIssue(params: {
    projectRoot: string;
    issue: BeadIssue;
    origin: LaunchSurface;
    swarmId?: string | null;
  }): Promise<{ orchestrator: RuntimeInstance; events: RuntimeConsoleEvent[] }> {
    await this.ensureRunning();
    const result = await this.adapter.launchFromIssue(params);
    this.emitRuntimeEvents(params.projectRoot, result.events);
    return result;
  }

  async prompt(projectRoot: string, text: string): Promise<void> {
    await this.ensureRunning();

    // Fire-and-forget the adapter prompt - adapter stores user message immediately,
    // SDK subscription handles real-time events, SSE poller picks up from embeddedPiDaemon
    if (typeof this.adapter.prompt === 'function') {
      this.adapter.prompt(projectRoot, text).catch((e) => {
        console.error('[BbDaemon] Adapter prompt error:', e);
      });
    }
  }

  async restartOrchestrator(projectRoot: string): Promise<void> {
    if (typeof this.adapter.restartSession === 'function') {
      await this.adapter.restartSession(projectRoot);
    }
  }

  getBlockedCount(projectRoot: string): number {
    return embeddedPiDaemon.getBlockedCount(projectRoot);
  }

  listBlockedEvents(projectRoot: string): RuntimeConsoleEvent[] {
    return embeddedPiDaemon.listBlockedEvents(projectRoot);
  }

  dismissBlocked(projectRoot: string, eventId: string): void {
    embeddedPiDaemon.dismissBlocked(projectRoot, eventId);
  }

  resetForTests(): void {
    this.lifecycle = createInitialLifecycle();
    this.piRuntime = null;
    embeddedPiDaemon.resetForTests();
    this.subscribers.clear();
    this.nextSubscriberId = 1;
  }
}

export function createBbDaemon(adapter?: PiDaemonAdapter): BbDaemon {
  return new InProcessBbDaemon(adapter);
}

const globalRegistry = globalThis as typeof globalThis & {
  __beadboardBbDaemon?: BbDaemon;
};

export const bbDaemon = globalRegistry.__beadboardBbDaemon ?? createBbDaemon();
if (!globalRegistry.__beadboardBbDaemon) {
  globalRegistry.__beadboardBbDaemon = bbDaemon;
}
