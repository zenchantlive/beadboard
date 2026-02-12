import { canonicalizeWindowsPath, windowsPathKey } from './pathing';

export type IssuesChangeKind = 'changed' | 'renamed';

export interface IssuesChangedEvent {
  id: number;
  projectRoot: string;
  changedPath?: string;
  kind: IssuesChangeKind;
  at: string;
}

interface Subscriber {
  projectKey?: string;
  listener: (event: IssuesChangedEvent) => void;
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
    const event: IssuesChangedEvent = {
      id: this.nextEventId,
      projectRoot: canonicalProjectRoot,
      changedPath: changedPath ? canonicalizeWindowsPath(changedPath) : undefined,
      kind,
      at: new Date().toISOString(),
    };
    this.nextEventId += 1;

    for (const subscriber of this.subscribers.values()) {
      if (!subscriber.projectKey || subscriber.projectKey === projectKey) {
        subscriber.listener(event);
      }
    }

    return event;
  }

  subscribe(listener: (event: IssuesChangedEvent) => void, options: SubscribeOptions = {}): () => void {
    const id = this.nextSubscriberId;
    this.nextSubscriberId += 1;

    this.subscribers.set(id, {
      listener,
      projectKey: options.projectRoot ? windowsPathKey(options.projectRoot) : undefined,
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

export const issuesEventBus = new IssuesEventBus();

export function toSseFrame(event: IssuesChangedEvent): string {
  return `id: ${event.id}\nevent: issues\ndata: ${JSON.stringify(event)}\n\n`;
}

export const SSE_HEARTBEAT_FRAME = ': heartbeat\n\n';
export const SSE_CONNECTED_FRAME = ': connected\n\n';
