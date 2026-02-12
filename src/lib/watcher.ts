import chokidar, { type FSWatcher } from 'chokidar';

import { ProjectEventCoalescer } from './coalescer';
import { windowsPathKey } from './pathing';
import { issuesEventBus, type IssuesChangeKind, type IssuesEventBus } from './realtime';
import { resolveIssuesJsonlPathCandidates } from './read-issues';

type FileEventName = 'add' | 'change' | 'unlink';

interface WatchRegistration {
  projectRoot: string;
  watcher: FSWatcher;
}

export interface WatchManagerOptions {
  debounceMs?: number;
  eventBus?: IssuesEventBus;
}

export class IssuesWatchManager {
  private readonly registrations = new Map<string, WatchRegistration>();

  private readonly eventBus: IssuesEventBus;

  private readonly coalescer: ProjectEventCoalescer<{
    changedPath?: string;
    kind: IssuesChangeKind;
  }>;

  constructor(options: WatchManagerOptions = {}) {
    const debounceMs = options.debounceMs ?? 150;
    this.eventBus = options.eventBus ?? issuesEventBus;
    this.coalescer = new ProjectEventCoalescer(debounceMs, ({ projectRoot, payload }) => {
      this.eventBus.emit(projectRoot, payload.changedPath, payload.kind);
    });
  }

  startWatch(projectRoot: string): void {
    const projectKey = windowsPathKey(projectRoot);
    if (this.registrations.has(projectKey)) {
      return;
    }

    const watchedPaths = resolveIssuesJsonlPathCandidates(projectRoot);
    const watcher = chokidar.watch(watchedPaths, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 15,
      },
    });

    const onFileEvent = (eventName: FileEventName, changedPath: string) => {
      const kind: IssuesChangeKind = eventName === 'unlink' ? 'renamed' : 'changed';
      this.queueCoalescedEvent(projectRoot, changedPath, kind);
    };

    watcher.on('add', (changedPath) => onFileEvent('add', changedPath));
    watcher.on('change', (changedPath) => onFileEvent('change', changedPath));
    watcher.on('unlink', (changedPath) => onFileEvent('unlink', changedPath));

    this.registrations.set(projectKey, {
      projectRoot,
      watcher,
    });
  }

  async stopWatch(projectRoot: string): Promise<void> {
    const projectKey = windowsPathKey(projectRoot);
    const registration = this.registrations.get(projectKey);
    if (!registration) {
      return;
    }

    this.coalescer.cancel(projectRoot);
    this.registrations.delete(projectKey);
    await registration.watcher.close();
  }

  async stopAll(): Promise<void> {
    const closeOps: Promise<void>[] = [];

    for (const registration of this.registrations.values()) {
      closeOps.push(registration.watcher.close());
    }

    this.coalescer.cancelAll();
    this.registrations.clear();
    await Promise.all(closeOps);
  }

  getWatchedProjectCount(): number {
    return this.registrations.size;
  }

  private queueCoalescedEvent(projectRoot: string, changedPath: string, kind: IssuesChangeKind): void {
    this.coalescer.queue(projectRoot, {
      changedPath,
      kind,
    });
  }
}

const globalRegistry = globalThis as typeof globalThis & {
  __beadboardWatchManager?: IssuesWatchManager;
};

export function getIssuesWatchManager(): IssuesWatchManager {
  if (!globalRegistry.__beadboardWatchManager) {
    globalRegistry.__beadboardWatchManager = new IssuesWatchManager();
  }

  return globalRegistry.__beadboardWatchManager;
}
