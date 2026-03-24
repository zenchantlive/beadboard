import { buildLaunchRequest, createLaunchConsoleEvents, createOrchestratorInstance, type LaunchSurface, type RuntimeConsoleEvent, type RuntimeInstance } from './embedded-runtime';
import type { BeadIssue } from './types';

export interface ProjectRuntimeState {
  projectRoot: string;
  orchestrator: RuntimeInstance;
  events: RuntimeConsoleEvent[];
  updatedAt: string;
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
    const state: ProjectRuntimeState = {
      projectRoot,
      orchestrator,
      events: [],
      updatedAt: new Date().toISOString(),
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

  appendEvent(projectRoot: string, event: Omit<RuntimeConsoleEvent, 'id' | 'timestamp' | 'projectId'>): void {
    const state = this.ensureProject(projectRoot);
    const fullEvent: RuntimeConsoleEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      projectId: state.orchestrator.projectId,
      timestamp: new Date().toISOString(),
    };
    state.events.unshift(fullEvent);
    state.updatedAt = new Date().toISOString();
  }

  appendWorkerEvent(projectRoot: string, workerId: string, event: {
    kind: 'worker.spawned' | 'worker.updated' | 'worker.completed' | 'worker.failed';
    title: string;
    detail: string;
    status?: RuntimeConsoleEvent['status'];
    metadata?: Record<string, unknown>;
  }): void {
    this.appendEvent(projectRoot, {
      ...event,
      metadata: { workerId, ...(event.metadata || {}) },
    });
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
