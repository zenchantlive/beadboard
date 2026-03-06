import { buildLaunchRequest, createLaunchConsoleEvents, createOrchestratorInstance, type LaunchSurface, type RuntimeConsoleEvent, type RuntimeInstance } from './embedded-runtime';
import type { BeadIssue } from './types';

interface ProjectRuntimeState {
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
    if (state.events.length === 0) {
      state.events.unshift({
        id: `${state.orchestrator.id}:boot`,
        projectId: state.orchestrator.projectId,
        kind: 'launch.started',
        title: 'Host daemon attached project orchestrator',
        detail: 'BeadBoard host bridge registered the project orchestrator.',
        timestamp: new Date().toISOString(),
        status: 'idle',
        actorLabel: state.orchestrator.label,
      });
      state.updatedAt = new Date().toISOString();
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
  }
}

const globalRegistry = globalThis as typeof globalThis & {
  __beadboardEmbeddedPiDaemon?: EmbeddedPiDaemon;
};

export const embeddedPiDaemon = globalRegistry.__beadboardEmbeddedPiDaemon ?? new EmbeddedPiDaemon();
if (!globalRegistry.__beadboardEmbeddedPiDaemon) {
  globalRegistry.__beadboardEmbeddedPiDaemon = embeddedPiDaemon;
}
