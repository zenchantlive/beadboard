import { windowsPathKey } from './pathing';

export interface CoalescedEventInput<T> {
  projectRoot: string;
  payload: T;
}

interface PendingEvent<T> {
  timer: NodeJS.Timeout;
  projectRoot: string;
  payload: T;
}

export class ProjectEventCoalescer<T> {
  private readonly pending = new Map<string, PendingEvent<T>>();

  private readonly debounceMs: number;

  private readonly onFlush: (event: CoalescedEventInput<T>) => void;

  constructor(debounceMs: number, onFlush: (event: CoalescedEventInput<T>) => void) {
    this.debounceMs = debounceMs;
    this.onFlush = onFlush;
  }

  queue(projectRoot: string, payload: T): void {
    const projectKey = windowsPathKey(projectRoot);
    const existing = this.pending.get(projectKey);
    if (existing) {
      clearTimeout(existing.timer);
      existing.projectRoot = projectRoot;
      existing.payload = payload;
      existing.timer = setTimeout(() => this.flush(projectKey), this.debounceMs);
      return;
    }

    this.pending.set(projectKey, {
      projectRoot,
      payload,
      timer: setTimeout(() => this.flush(projectKey), this.debounceMs),
    });
  }

  cancel(projectRoot: string): void {
    const projectKey = windowsPathKey(projectRoot);
    const pending = this.pending.get(projectKey);
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    this.pending.delete(projectKey);
  }

  cancelAll(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
    }
    this.pending.clear();
  }

  pendingCount(): number {
    return this.pending.size;
  }

  private flush(projectKey: string): void {
    const pending = this.pending.get(projectKey);
    if (!pending) {
      return;
    }
    this.pending.delete(projectKey);
    this.onFlush({
      projectRoot: pending.projectRoot,
      payload: pending.payload,
    });
  }
}
