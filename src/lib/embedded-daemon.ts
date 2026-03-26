import { buildLaunchRequest, createLaunchConsoleEvents, createOrchestratorInstance, type LaunchSurface, type RuntimeConsoleEvent, type RuntimeInstance } from './embedded-runtime';
import { ConversationTurnStore, type ConversationTurn } from './orchestrator-chat';
import { appendJsonl, readJsonl, writeJsonl, writeJsonlAtomic } from './runtime-persistence';
import type { BeadIssue } from './types';

/** Maximum runtime console events kept in memory per project */
const MAX_EVENTS = 1000;

export interface ProjectRuntimeState {
  projectRoot: string;
  orchestrator: RuntimeInstance;
  events: RuntimeConsoleEvent[];
  turns: ConversationTurnStore;
  updatedAt: string;
  dismissedBlockedIds: Set<string>;
}

export interface HostDaemonStatus {
  ok: true;
  daemon: {
    backend: 'pi';
    status: 'online';
    projectCount: number;
  };
  projects: Array<{
    projectRoot: string;
    orchestratorId: string;
    orchestratorStatus: RuntimeInstance['status'];
    eventCount: number;
    updatedAt: string;
  }>;
}

export class EmbeddedPiDaemon {
  private readonly projects = new Map<string, ProjectRuntimeState>();
  private readonly orchestratorBooted = new Set<string>();

  ensureProject(projectRoot: string): ProjectRuntimeState {
    const existing = this.projects.get(projectRoot);
    if (existing) {
      return existing;
    }

    const orchestrator = createOrchestratorInstance(projectRoot);

    // Restore events from disk if present, capped to MAX_EVENTS
    const persistedEvents = readJsonl<RuntimeConsoleEvent>(projectRoot, 'events.jsonl')
      .slice(0, MAX_EVENTS);

    // Restore turns from disk if present
    const turnStore = new ConversationTurnStore();
    const persistedTurns = readJsonl<ConversationTurn>(projectRoot, 'turns.jsonl');
    for (const turn of persistedTurns) {
      turnStore.appendTurn(turn);
    }

    const state: ProjectRuntimeState = {
      projectRoot,
      orchestrator,
      events: persistedEvents,
      turns: turnStore,
      updatedAt: new Date().toISOString(),
      dismissedBlockedIds: new Set<string>(),
    };
    this.projects.set(projectRoot, state);
    return state;
  }

  ensureOrchestrator(projectRoot: string): RuntimeInstance {
    const state = this.ensureProject(projectRoot);
    const projectId = state.orchestrator.projectId;

    // Only add boot event once per project (track via Set)
    if (!this.orchestratorBooted.has(projectId)) {
      state.events.unshift({
        id: `${projectId}:boot:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        projectId,
        kind: 'launch.started',
        title: 'Host daemon attached project orchestrator',
        detail: 'BeadBoard host bridge registered project orchestrator.',
        timestamp: new Date().toISOString(),
        status: 'idle',
        actorLabel: state.orchestrator.label,
      });
      state.updatedAt = new Date().toISOString();
      this.orchestratorBooted.add(projectId);
    }
    return state.orchestrator;
  }

  launchFromIssue(params: {
    projectRoot: string;
    issue: BeadIssue;
    origin: LaunchSurface;
    swarmId?: string | null;
  }): { orchestrator: RuntimeInstance; events: RuntimeConsoleEvent[] } {
    const state = this.ensureProject(params.projectRoot);
    state.orchestrator.status = 'planning';

    const request = buildLaunchRequest({
      issue: params.issue,
      origin: params.origin,
      projectRoot: params.projectRoot,
      swarmId: params.swarmId ?? null,
    });

    const launchEvents = createLaunchConsoleEvents(request);
    state.events.unshift(...launchEvents);
    state.updatedAt = new Date().toISOString();

    return {
      orchestrator: state.orchestrator,
      events: launchEvents,
    };
  }

  listEvents(projectRoot: string): RuntimeConsoleEvent[] {
    return [...(this.projects.get(projectRoot)?.events ?? [])];
  }

  appendEvent(projectRoot: string, event: Omit<RuntimeConsoleEvent, 'id' | 'timestamp' | 'projectId'>): RuntimeConsoleEvent {
    const state = this.ensureProject(projectRoot);
    const fullEvent: RuntimeConsoleEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: state.orchestrator.projectId,
      timestamp: new Date().toISOString(),
    };
    state.events.unshift(fullEvent);
    if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
    state.updatedAt = new Date().toISOString();
    try {
      appendJsonl(projectRoot, 'events.jsonl', fullEvent);
    } catch {
      // Best-effort: directory may not exist in test environments
    }
    return fullEvent;
  }

  appendWorkerEvent(projectRoot: string, workerId: string, event: {
    kind: 'worker.spawned' | 'worker.updated' | 'worker.completed' | 'worker.failed';
    title: string;
    detail: string;
    status?: RuntimeConsoleEvent['status'];
    metadata?: Record<string, unknown>;
  }): RuntimeConsoleEvent {
    return this.appendEvent(projectRoot, {
      ...event,
      metadata: { workerId, ...(event.metadata || {}) },
    });
  }

  // --- Conversation turn store methods ---

  appendTurn(projectRoot: string, turn: ConversationTurn): void {
    const state = this.ensureProject(projectRoot);
    state.turns.appendTurn(turn);
    state.updatedAt = new Date().toISOString();
    try {
      appendJsonl(projectRoot, 'turns.jsonl', turn);
    } catch {
      // Best-effort: directory may not exist in test environments
    }
  }

  updateCurrentTurn(projectRoot: string, updater: (turn: ConversationTurn) => ConversationTurn): void {
    const state = this.ensureProject(projectRoot);
    state.turns.updateLastTurn(updater);
    state.updatedAt = new Date().toISOString();
    // Only flush to disk when a turn reaches a terminal state (complete/error).
    // Streaming deltas update in-memory only — SSE reads from memory, not disk.
    const turns = state.turns.listTurns();
    const lastTurn = turns[turns.length - 1];
    if (lastTurn && (lastTurn.status === 'complete' || lastTurn.status === 'error')) {
      try {
        writeJsonlAtomic(projectRoot, 'turns.jsonl', turns);
      } catch {
        // Best-effort: directory may not exist in test environments
      }
    }
  }

  listTurns(projectRoot: string): ConversationTurn[] {
    return this.projects.get(projectRoot)?.turns.listTurns() ?? [];
  }

  // --- Blocked event methods ---

  getBlockedCount(projectRoot: string): number {
    const state = this.projects.get(projectRoot);
    if (!state) return 0;
    return state.events.filter(
      (e) =>
        (e.status === 'blocked' || e.kind === 'worker.blocked' || e.kind === 'orchestrator.blocked') &&
        !state.dismissedBlockedIds.has(e.id)
    ).length;
  }

  dismissBlocked(projectRoot: string, eventId: string): void {
    const state = this.projects.get(projectRoot);
    if (!state) return;
    state.dismissedBlockedIds.add(eventId);
    state.updatedAt = new Date().toISOString();
  }

  listBlockedEvents(projectRoot: string): RuntimeConsoleEvent[] {
    const state = this.projects.get(projectRoot);
    if (!state) return [];
    return state.events.filter(
      (e) =>
        (e.status === 'blocked' || e.kind === 'worker.blocked' || e.kind === 'orchestrator.blocked') &&
        !state.dismissedBlockedIds.has(e.id)
    );
  }

  getStatus(): HostDaemonStatus {
    return {
      ok: true,
      daemon: {
        backend: 'pi',
        status: 'online',
        projectCount: this.projects.size,
      },
      projects: [...this.projects.values()].map((state) => ({
        projectRoot: state.projectRoot,
        orchestratorId: state.orchestrator.id,
        orchestratorStatus: state.orchestrator.status,
        eventCount: state.events.length,
        updatedAt: state.updatedAt,
      })),
    };
  }

  resetProject(projectRoot: string): void {
    const state = this.projects.get(projectRoot);
    if (!state) return;
    state.events = [];
    state.turns.reset();
    state.dismissedBlockedIds.clear();
    state.updatedAt = new Date().toISOString();
    // Clear persisted state on disk
    try {
      writeJsonl(projectRoot, 'events.jsonl', []);
      writeJsonl(projectRoot, 'turns.jsonl', []);
    } catch {
      // Best-effort
    }
  }

  resetForTests(): void {
    this.projects.clear();
    this.orchestratorBooted.clear();
  }

}

const globalRegistry = globalThis as typeof globalThis & {
  __beadboardEmbeddedPiDaemon?: EmbeddedPiDaemon;
};

export const embeddedPiDaemon = globalRegistry.__beadboardEmbeddedPiDaemon ?? new EmbeddedPiDaemon();
if (!globalRegistry.__beadboardEmbeddedPiDaemon) {
  globalRegistry.__beadboardEmbeddedPiDaemon = embeddedPiDaemon;
}
