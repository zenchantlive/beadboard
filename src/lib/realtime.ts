import { canonicalizeWindowsPath, windowsPathKey } from './pathing';
import type { ActivityEvent } from './activity';

export type IssuesChangeKind = 'changed' | 'renamed' | 'telemetry';

export interface IssuesChangedEvent {
  id: number;
  projectRoot: string;
  changedPath?: string;
  kind: IssuesChangeKind;
  at: string;
}

export interface ActivityDispatchedEvent {
  id: number;
  event: ActivityEvent;
}

interface Subscriber {
  projectKey?: string;
  listener: (event: IssuesChangedEvent) => void;
}

interface ActivitySubscriber {
  projectKey?: string;
  listener: (event: ActivityDispatchedEvent) => void;
}

export interface SubscribeOptions {
  projectRoot?: string;
}

export class IssuesEventBus {
  private nextEventId = 1;

  private readonly subscribers = new Map<number, Subscriber>();

  private nextSubscriberId = 1;

  emit(projectRoot: string, changedPath?: string, kind: IssuesChangeKind = 'changed'): IssuesChangedEvent {
    const canonicalProjectRoot = canonicalizeWindowsPath(projectRoot);
    const projectKey = windowsPathKey(canonicalProjectRoot);
    console.log(`[IssuesBus] Emitting event: ${kind} for ${projectKey} (path: ${changedPath}, subscribers: ${this.subscribers.size})`);
    const event: IssuesChangedEvent = {
      id: this.nextEventId,
      projectRoot: canonicalProjectRoot,
      changedPath: changedPath ? canonicalizeWindowsPath(changedPath) : undefined,
      kind,
      at: new Date().toISOString(),
    };
    this.nextEventId += 1;

    let delivered = 0;
    for (const subscriber of this.subscribers.values()) {
      if (!subscriber.projectKey || subscriber.projectKey === projectKey) {
        subscriber.listener(event);
        delivered++;
      }
    }
    console.log(`[IssuesBus] Delivered to ${delivered} subscribers`);

    return event;
  }

  subscribe(listener: (event: IssuesChangedEvent) => void, options: SubscribeOptions = {}): () => void {
    const id = this.nextSubscriberId;
    this.nextSubscriberId += 1;
    const canonicalRoot = options.projectRoot ? canonicalizeWindowsPath(options.projectRoot) : undefined;

    this.subscribers.set(id, {
      listener,
      projectKey: canonicalRoot ? windowsPathKey(canonicalRoot) : undefined,
    });

    return () => {
      this.subscribers.delete(id);
    };
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  resetForTests(): void {
    this.subscribers.clear();
    this.nextSubscriberId = 1;
    this.nextEventId = 1;
  }
}

import { loadActivityHistory, saveActivityHistory } from './activity-persistence';

export class ActivityEventBus {
  private nextEventId = 1;

  private readonly subscribers = new Map<number, ActivitySubscriber>();
  private readonly history: ActivityEvent[] = [];
  private readonly MAX_HISTORY = 100;
  private initialized = false;

  private nextSubscriberId = 1;

  constructor() {
    this.init();
  }

  private async init() {
    const history = await loadActivityHistory();
    this.history.push(...history);
    this.initialized = true;
  }

  emit(activity: ActivityEvent): ActivityDispatchedEvent {
    const projectKey = windowsPathKey(activity.projectId);
    const event: ActivityDispatchedEvent = {
      id: this.nextEventId,
      event: activity,
    };
    this.nextEventId += 1;

    // Buffer history
    this.history.unshift(activity);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.pop();
    }

    // Persist async
    void saveActivityHistory(this.history);

    for (const subscriber of this.subscribers.values()) {
      if (!subscriber.projectKey || subscriber.projectKey === projectKey) {
        subscriber.listener(event);
      }
    }

    return event;
  }

  getHistory(projectRoot?: string): ActivityEvent[] {
    if (!projectRoot) {
      return [...this.history];
    }
    const key = windowsPathKey(canonicalizeWindowsPath(projectRoot));
    return this.history.filter(e => windowsPathKey(e.projectId) === key);
  }

  subscribe(listener: (event: ActivityDispatchedEvent) => void, options: SubscribeOptions = {}): () => void {
    const id = this.nextSubscriberId;
    this.nextSubscriberId += 1;
    const projectKey = options.projectRoot ? windowsPathKey(canonicalizeWindowsPath(options.projectRoot)) : undefined;

    this.subscribers.set(id, {
      listener,
      projectKey,
    });

    return () => {
      this.subscribers.delete(id);
    };
  }

  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  resetForTests(): void {
    this.subscribers.clear();
    this.history.length = 0;
    this.nextSubscriberId = 1;
    this.nextEventId = 1;
  }
}

const globalRegistry = globalThis as typeof globalThis & {
  __beadboardIssuesEventBus?: IssuesEventBus;
  __beadboardActivityEventBus?: ActivityEventBus;
};

export const issuesEventBus = globalRegistry.__beadboardIssuesEventBus ?? new IssuesEventBus();
if (!globalRegistry.__beadboardIssuesEventBus) {
  globalRegistry.__beadboardIssuesEventBus = issuesEventBus;
}

export const activityEventBus = globalRegistry.__beadboardActivityEventBus ?? new ActivityEventBus();
if (!globalRegistry.__beadboardActivityEventBus) {
  globalRegistry.__beadboardActivityEventBus = activityEventBus;
}

export function toSseFrame(event: IssuesChangedEvent): string {
  const eventName = event.kind === 'telemetry' ? 'telemetry' : 'issues';
  return `id: ${event.id}\nevent: ${eventName}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function toActivitySseFrame(event: ActivityDispatchedEvent): string {
  return `id: ${event.id}\nevent: activity\ndata: ${JSON.stringify(event.event)}\n\n`;
}

export const SSE_HEARTBEAT_FRAME = ': heartbeat\n\n';
export const SSE_CONNECTED_FRAME = ': connected\n\n';
