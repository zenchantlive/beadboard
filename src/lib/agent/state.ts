import type { AgentInstanceKind, RuntimeConsoleEvent, RuntimeEventKind, RuntimeStatus } from '../embedded-runtime';

export type AgentStateEventKind = Extract<
  RuntimeEventKind,
  'worker.spawned' | 'worker.updated' | 'worker.completed' | 'worker.failed' | 'worker.blocked'
>;

export type AgentStateStatus = Extract<
  RuntimeStatus,
  'idle' | 'launching' | 'working' | 'blocked' | 'completed' | 'failed'
>;

export interface AgentStateSeed {
  projectId: string;
  agentId: string;
  kind?: AgentInstanceKind;
  agentTypeId?: string | null;
  label?: string | null;
  taskId?: string | null;
  epicId?: string | null;
  swarmId?: string | null;
}

export interface AgentState {
  projectId: string;
  agentId: string;
  kind: AgentInstanceKind;
  agentTypeId: string | null;
  label: string;
  taskId: string | null;
  epicId: string | null;
  swarmId: string | null;
  status: AgentStateStatus;
  lastEventId: string | null;
  lastEventKind: AgentStateEventKind | null;
  lastEventAt: string | null;
  result: string | null;
  blocker: string | null;
  error: string | null;
  seenEventIds: string[];
}

export interface AgentStateSummary {
  totalCount: number;
  busyCount: number;
  idleCount: number;
  blockedCount: number;
  completedCount: number;
  failedCount: number;
}

export interface AgentStateBootstrapWorkerSnapshot {
  id: string;
  projectId: string;
  agentTypeId?: string | null;
  agentInstanceId?: string | null;
  displayName?: string | null;
  taskId?: string | null;
  status: 'spawning' | 'working' | 'completed' | 'failed' | 'blocked';
  result?: string | null;
  error?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
}

export type AgentStateEvent = Pick<
  RuntimeConsoleEvent,
  'id' | 'kind' | 'projectId' | 'timestamp' | 'status' | 'taskId' | 'swarmId' | 'actorLabel' | 'metadata' | 'detail'
>;

const MAX_SEEN_EVENT_IDS = 32;

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string): string | null {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getAgentIdFromEvent(event: AgentStateEvent): string | null {
  return (
    getMetadataString(event.metadata, 'workerId') ??
    getMetadataString(event.metadata, 'agentInstanceId') ??
    event.actorLabel?.trim() ??
    null
  );
}

function getAgentTypeIdFromEvent(event: AgentStateEvent): string | null {
  return getMetadataString(event.metadata, 'agentTypeId');
}

function getLabelFromEvent(event: AgentStateEvent): string | null {
  return getMetadataString(event.metadata, 'displayName') ?? event.actorLabel?.trim() ?? null;
}

function getTaskIdFromEvent(event: AgentStateEvent): string | null {
  return event.taskId ?? getMetadataString(event.metadata, 'taskId');
}

function getEpicIdFromEvent(event: AgentStateEvent): string | null {
  return getMetadataString(event.metadata, 'epicId');
}

function getSwarmIdFromEvent(event: AgentStateEvent): string | null {
  return event.swarmId ?? getMetadataString(event.metadata, 'swarmId');
}

function getDetailFromEvent(event: AgentStateEvent): string | null {
  return typeof event.detail === 'string' && event.detail.trim() ? event.detail : null;
}

function hasAgentIdentity(state: AgentState, event: AgentStateEvent): boolean {
  const workerId = getMetadataString(event.metadata, 'workerId');
  const agentInstanceId = getMetadataString(event.metadata, 'agentInstanceId');
  const eventTaskId = getTaskIdFromEvent(event);

  if (workerId && state.agentId === workerId) {
    return true;
  }

  if (agentInstanceId && state.agentId === agentInstanceId) {
    return true;
  }

  return Boolean(eventTaskId && state.taskId === eventTaskId);
}

function appendSeenEventId(seenEventIds: readonly string[], eventId: string): string[] {
  const next = [...seenEventIds, eventId];
  return next.length > MAX_SEEN_EVENT_IDS ? next.slice(next.length - MAX_SEEN_EVENT_IDS) : next;
}

function snapshotEventKindForStatus(status: AgentStateBootstrapWorkerSnapshot['status']): AgentStateEventKind {
  switch (status) {
    case 'spawning':
      return 'worker.spawned';
    case 'working':
      return 'worker.updated';
    case 'blocked':
      return 'worker.blocked';
    case 'completed':
      return 'worker.completed';
    case 'failed':
      return 'worker.failed';
  }
}

function snapshotEventDetailForWorker(worker: AgentStateBootstrapWorkerSnapshot): string {
  return (
    worker.error?.trim() ||
    worker.result?.trim() ||
    worker.displayName?.trim() ||
    worker.agentInstanceId?.trim() ||
    worker.id
  );
}

function deriveStatus(kind: AgentStateEventKind): AgentStateStatus {
  switch (kind) {
    case 'worker.spawned':
      return 'launching';
    case 'worker.updated':
      return 'working';
    case 'worker.blocked':
      return 'blocked';
    case 'worker.completed':
      return 'completed';
    case 'worker.failed':
      return 'failed';
  }
}

function createBaseState(seed: AgentStateSeed): AgentState {
  return {
    projectId: seed.projectId,
    agentId: seed.agentId,
    kind: seed.kind ?? 'worker',
    agentTypeId: seed.agentTypeId ?? null,
    label: seed.label?.trim() || seed.agentId,
    taskId: seed.taskId ?? null,
    epicId: seed.epicId ?? null,
    swarmId: seed.swarmId ?? null,
    status: 'idle',
    lastEventId: null,
    lastEventKind: null,
    lastEventAt: null,
    result: null,
    blocker: null,
    error: null,
    seenEventIds: [],
  };
}

function mergeIdentity(state: AgentState, event: AgentStateEvent): AgentState {
  return {
    ...state,
    projectId: event.projectId || state.projectId,
    agentId: getAgentIdFromEvent(event) ?? state.agentId,
    agentTypeId: getAgentTypeIdFromEvent(event) ?? state.agentTypeId,
    label: getLabelFromEvent(event) ?? state.label,
    taskId: getTaskIdFromEvent(event) ?? state.taskId,
    epicId: getEpicIdFromEvent(event) ?? state.epicId,
    swarmId: getSwarmIdFromEvent(event) ?? state.swarmId,
  };
}

export function createAgentState(seed: AgentStateSeed): AgentState {
  return createBaseState(seed);
}

export function createAgentStateFromWorkerSnapshot(worker: AgentStateBootstrapWorkerSnapshot): AgentState {
  const state = createAgentState({
    projectId: worker.projectId,
    agentId: worker.agentInstanceId?.trim() || worker.id,
    kind: 'worker',
    agentTypeId: worker.agentTypeId ?? null,
    label: worker.displayName?.trim() || worker.agentInstanceId?.trim() || worker.id,
    taskId: worker.taskId ?? null,
  });

  const event: AgentStateEvent = {
    id: `${worker.id}:bootstrap`,
    kind: snapshotEventKindForStatus(worker.status),
    projectId: worker.projectId,
    timestamp: worker.completedAt ?? worker.createdAt ?? new Date().toISOString(),
    status:
      worker.status === 'spawning'
        ? 'launching'
        : worker.status === 'blocked'
          ? 'blocked'
          : worker.status,
    taskId: worker.taskId ?? null,
    swarmId: null,
    actorLabel: worker.displayName?.trim() || worker.agentInstanceId?.trim() || worker.id,
    metadata: {
      workerId: worker.id,
      agentInstanceId: worker.agentInstanceId ?? null,
      agentTypeId: worker.agentTypeId ?? null,
      displayName: worker.displayName ?? null,
      taskId: worker.taskId ?? null,
    },
    detail: snapshotEventDetailForWorker(worker),
  };

  return reduceAgentState(state, event);
}

export function bootstrapAgentStatesFromWorkers(
  workers: readonly AgentStateBootstrapWorkerSnapshot[],
  events: readonly AgentStateEvent[] = [],
): AgentState[] {
  const sortedEvents = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return workers.map((worker) => {
    let state = createAgentStateFromWorkerSnapshot(worker);

    for (const event of sortedEvents) {
      if (
        event.kind !== 'worker.spawned' &&
        event.kind !== 'worker.updated' &&
        event.kind !== 'worker.blocked' &&
        event.kind !== 'worker.completed' &&
        event.kind !== 'worker.failed'
      ) {
        continue;
      }

      const metadataWorkerId = typeof event.metadata?.workerId === 'string' ? event.metadata.workerId : null;
      const metadataAgentInstanceId = typeof event.metadata?.agentInstanceId === 'string' ? event.metadata.agentInstanceId : null;
      const matchesWorker =
        metadataWorkerId === worker.id ||
        metadataAgentInstanceId === worker.agentInstanceId ||
        event.taskId === worker.taskId;

      if (!matchesWorker) {
        continue;
      }

      state = reduceAgentState(state, event);
    }

    return state;
  });
}

function getAgentStateSummaryKey(state: Pick<AgentState, 'projectId' | 'agentId'>): string {
  return `${state.projectId}:${state.agentId}`;
}

export function summarizeAgentStates(states: readonly AgentState[]): AgentStateSummary {
  const latestByIdentity = new Map<string, AgentState>();

  for (const state of states) {
    latestByIdentity.set(getAgentStateSummaryKey(state), state);
  }

  let busyCount = 0;
  let idleCount = 0;
  let blockedCount = 0;
  let completedCount = 0;
  let failedCount = 0;

  for (const state of latestByIdentity.values()) {
    switch (state.status) {
      case 'idle':
        idleCount += 1;
        break;
      case 'launching':
      case 'working':
        busyCount += 1;
        break;
      case 'blocked':
        blockedCount += 1;
        break;
      case 'completed':
        completedCount += 1;
        break;
      case 'failed':
        failedCount += 1;
        break;
    }
  }

  return {
    totalCount: latestByIdentity.size,
    busyCount,
    idleCount,
    blockedCount,
    completedCount,
    failedCount,
  };
}

export function isAgentStateEventKind(kind: RuntimeEventKind): kind is AgentStateEventKind {
  return (
    kind === 'worker.spawned' ||
    kind === 'worker.updated' ||
    kind === 'worker.blocked' ||
    kind === 'worker.completed' ||
    kind === 'worker.failed'
  );
}

export function reduceAgentStates(states: readonly AgentState[], event: AgentStateEvent): AgentState[] {
  if (!isAgentStateEventKind(event.kind)) {
    return [...states];
  }

  const existingIndex = states.findIndex(
    (state) => state.projectId === event.projectId && hasAgentIdentity(state, event),
  );

  if (existingIndex >= 0) {
    return states.map((state, index) => (
      index === existingIndex
        ? reduceAgentState(state, event)
        : state
    ));
  }

  const agentId = getAgentIdFromEvent(event);
  if (!agentId) {
    return [...states];
  }

  const seed = createAgentState({
    projectId: event.projectId,
    agentId,
    label: getLabelFromEvent(event) ?? agentId,
    agentTypeId: getAgentTypeIdFromEvent(event),
    taskId: getTaskIdFromEvent(event),
    epicId: getEpicIdFromEvent(event),
    swarmId: getSwarmIdFromEvent(event),
  });

  return [...states, reduceAgentState(seed, event)];
}

export function reduceAgentState(state: AgentState, event: AgentStateEvent): AgentState {
  if (state.seenEventIds.includes(event.id)) {
    return state;
  }

  const identity = mergeIdentity(state, event);
  const lastEventAt = event.timestamp || identity.lastEventAt;
  const seenEventIds = appendSeenEventId(identity.seenEventIds, event.id);

  switch (event.kind as AgentStateEventKind) {
    case 'worker.spawned':
      return {
        ...identity,
        status: deriveStatus('worker.spawned'),
        lastEventId: event.id,
        lastEventKind: 'worker.spawned',
        lastEventAt,
        result: null,
        blocker: null,
        error: null,
        seenEventIds,
      };
    case 'worker.updated':
      return {
        ...identity,
        status: deriveStatus('worker.updated'),
        lastEventId: event.id,
        lastEventKind: 'worker.updated',
        lastEventAt,
        seenEventIds,
      };
    case 'worker.blocked':
      return {
        ...identity,
        status: deriveStatus('worker.blocked'),
        lastEventId: event.id,
        lastEventKind: 'worker.blocked',
        lastEventAt,
        blocker: getDetailFromEvent(event),
        error: null,
        seenEventIds,
      };
    case 'worker.completed':
      return {
        ...identity,
        status: deriveStatus('worker.completed'),
        lastEventId: event.id,
        lastEventKind: 'worker.completed',
        lastEventAt,
        result: getDetailFromEvent(event),
        blocker: null,
        error: null,
        seenEventIds,
      };
    case 'worker.failed':
      return {
        ...identity,
        status: deriveStatus('worker.failed'),
        lastEventId: event.id,
        lastEventKind: 'worker.failed',
        lastEventAt,
        result: null,
        blocker: null,
        error: getDetailFromEvent(event) ?? 'Worker failed',
        seenEventIds,
      };
    default:
      return state;
  }
}

export function reduceAgentEventSequence(seed: AgentStateSeed, events: readonly AgentStateEvent[]): AgentState {
  return events.reduce((current, event) => reduceAgentState(current, event), createAgentState(seed));
}
