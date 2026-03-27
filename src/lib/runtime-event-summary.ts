import type { RuntimeConsoleEvent } from './embedded-runtime';

const DEFAULT_RECENT_COMPLETION_WINDOW_MS = 15 * 60 * 1000;

function getWorkerIdentity(event: RuntimeConsoleEvent): string | null {
  const workerId = typeof event.metadata?.workerId === 'string' ? event.metadata.workerId : null;
  if (workerId) {
    return workerId;
  }

  const agentInstanceId = typeof event.metadata?.agentInstanceId === 'string'
    ? event.metadata.agentInstanceId
    : null;
  if (agentInstanceId) {
    return agentInstanceId;
  }

  return event.taskId ?? null;
}

function getLatestTerminalEventsByWorker(events: readonly RuntimeConsoleEvent[]): Map<string, RuntimeConsoleEvent> {
  const latestTerminalByWorker = new Map<string, RuntimeConsoleEvent>();

  for (const event of events) {
    if (event.kind !== 'worker.completed' && event.kind !== 'worker.failed') {
      continue;
    }

    const workerIdentity = getWorkerIdentity(event);
    if (!workerIdentity) {
      continue;
    }

    const current = latestTerminalByWorker.get(workerIdentity);
    const currentTimestamp = current ? new Date(current.timestamp).getTime() : -Infinity;
    const nextTimestamp = new Date(event.timestamp).getTime();

    if (!current || nextTimestamp >= currentTimestamp) {
      latestTerminalByWorker.set(workerIdentity, event);
    }
  }

  return latestTerminalByWorker;
}

export interface RecentCompletedWorker {
  dedupeKey: string;
  workerIdentity: string;
  taskId: string | null;
  swarmId: string | null;
  title: string;
  detail: string;
  timestamp: string;
  event: RuntimeConsoleEvent;
}

export function listRecentCompletedWorkers(
  events: readonly RuntimeConsoleEvent[],
  options: { now?: number; windowMs?: number } = {},
): RecentCompletedWorker[] {
  const now = options.now ?? Date.now();
  const windowMs = options.windowMs ?? DEFAULT_RECENT_COMPLETION_WINDOW_MS;

  return [...getLatestTerminalEventsByWorker(events).values()]
    .filter((event) => event.kind === 'worker.completed')
    .map((event) => ({
      dedupeKey: `${getWorkerIdentity(event) ?? event.id}:${event.timestamp}`,
      workerIdentity: getWorkerIdentity(event) ?? event.id,
      taskId: event.taskId ?? null,
      swarmId: event.swarmId ?? null,
      title: event.title,
      detail: event.detail,
      timestamp: event.timestamp,
      event,
    }))
    .filter((item) => {
      const timestamp = new Date(item.timestamp).getTime();
      if (Number.isNaN(timestamp)) {
        return false;
      }

      return now - timestamp <= windowMs;
    })
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime());
}

export function countRecentCompletedWorkers(
  events: readonly RuntimeConsoleEvent[],
  options: { now?: number; windowMs?: number } = {},
): number {
  return listRecentCompletedWorkers(events, options).length;
}
