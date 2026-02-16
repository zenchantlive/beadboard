import chokidar, { type FSWatcher } from 'chokidar';
import path from 'node:path';
import os from 'node:os';

import { ProjectEventCoalescer } from './coalescer';
import { windowsPathKey } from './pathing';
import { issuesEventBus, activityEventBus, type IssuesChangeKind, type IssuesEventBus, type ActivityEventBus } from './realtime';
import { readIssuesFromDisk, resolveIssuesJsonlPathCandidates } from './read-issues';
import { diffSnapshots } from './snapshot-differ';
import type { BeadIssueWithProject } from './types';

type FileEventName = 'add' | 'change' | 'unlink';

function getGlobalAgentMessagesPath(): string {
  const userProfile = process.env.USERPROFILE?.trim() || os.homedir();
  return path.join(userProfile, '.beadboard', 'agent', 'messages');
}

interface WatchRegistration {
  projectRoot: string;
  watcher: FSWatcher;
}

export interface WatchManagerOptions {
  debounceMs?: number;
  eventBus?: IssuesEventBus;
  activityBus?: ActivityEventBus;
}

export class IssuesWatchManager {
  private readonly registrations = new Map<string, WatchRegistration>();

  private readonly snapshots = new Map<string, BeadIssueWithProject[]>();

  private readonly eventBus: IssuesEventBus;
  private readonly activityBus: ActivityEventBus;

  private readonly coalescer: ProjectEventCoalescer<{
    changedPath?: string;
    kind: IssuesChangeKind;
  }>;

  constructor(options: WatchManagerOptions = {}) {
    const debounceMs = options.debounceMs ?? 150;
    this.eventBus = options.eventBus ?? issuesEventBus;
    this.activityBus = options.activityBus ?? activityEventBus;
    this.coalescer = new ProjectEventCoalescer(debounceMs, async ({ projectRoot, payload }) => {
      console.log(`[Watcher] Processing event for ${projectRoot}: ${payload.kind} (${payload.changedPath})`);
      
      // 1. Emit basic file change event
      // If it's just last-touched or a DB file change, we treat it as telemetry
      const changedPath = payload.changedPath || '';
      const isIssuesJsonl = changedPath.endsWith('issues.jsonl') || changedPath.endsWith('issues.jsonl.new');
      const isLastTouched = changedPath.includes('last-touched');
      const isDbPulse = changedPath.includes('beads.db');

      const kind = (isLastTouched || isDbPulse) && !isIssuesJsonl ? 'telemetry' : payload.kind;
      this.eventBus.emit(projectRoot, payload.changedPath, kind);

      // 2. Perform snapshot diffing if issues.jsonl changed
      const isBeadsDb = changedPath.includes('beads.db') || isLastTouched;
      const isGlobalMessages = changedPath.includes('.beadboard') && changedPath.includes('messages');
      
      if (isIssuesJsonl || isBeadsDb) {
        console.log(`[Watcher] Issues changed. Syncing activity for ${projectRoot}...`);
        await this.syncActivity(projectRoot);
      } else if (isGlobalMessages) {
        console.log(`[Watcher] Global agent messages changed. Triggering refresh for ${projectRoot}.`);
        // No need to syncActivity (diff issues) if only messages changed, 
        // the 'issues' event emitted above will trigger client refresh.
      }
    });
  }

  private async syncActivity(projectRoot: string): Promise<void> {
    const projectKey = windowsPathKey(projectRoot);
    const previous = this.snapshots.get(projectKey) ?? null;
    
    try {
      const current = await readIssuesFromDisk({ projectRoot, preferBd: true, skipAgentFilter: true });
      const events = diffSnapshots(previous, current);
      
      this.snapshots.set(projectKey, current);
      
      events.forEach(event => {
        this.activityBus.emit(event);
      });
    } catch (error) {
      console.error(`[Watcher] Failed to sync activity for ${projectRoot}:`, error);
    }
  }

  async startWatch(projectRoot: string): Promise<void> {
    const projectKey = windowsPathKey(projectRoot);
    if (this.registrations.has(projectKey)) {
      return;
    }

    // Pre-populate snapshot to avoid "all created" burst on first change
    try {
      const initial = await readIssuesFromDisk({ projectRoot, preferBd: true, skipAgentFilter: true });
      this.snapshots.set(projectKey, initial);
    } catch {
      // Ignore initial read failure, will retry on first change
    }

    const watchedPaths = resolveIssuesJsonlPathCandidates(projectRoot);
    watchedPaths.push(path.join(projectRoot, '.beads', 'beads.db'));
    watchedPaths.push(path.join(projectRoot, '.beads', 'beads.db-wal'));
    watchedPaths.push(path.join(projectRoot, '.beads', 'last-touched'));
    
    // Add global agent messages to enable cross-project communication real-time updates
    watchedPaths.push(getGlobalAgentMessagesPath());

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

const WATCHER_VERSION = 4; // Bump this to force re-creation on HMR (v4: fix beads.db telemetry classification)

const globalRegistry = globalThis as typeof globalThis & {
  __beadboardWatchManager?: IssuesWatchManager;
  __beadboardWatcherVersion?: number;
};

export function getIssuesWatchManager(): IssuesWatchManager {
  if (!globalRegistry.__beadboardWatchManager || globalRegistry.__beadboardWatcherVersion !== WATCHER_VERSION) {
    if (globalRegistry.__beadboardWatchManager) {
      console.log('[Watcher] Stopping stale watcher instance...');
      // Best effort stop of old instance
      void globalRegistry.__beadboardWatchManager.stopAll();
    }
    console.log(`[Watcher] Initializing new manager (v${WATCHER_VERSION})...`);
    globalRegistry.__beadboardWatchManager = new IssuesWatchManager();
    globalRegistry.__beadboardWatcherVersion = WATCHER_VERSION;
  }

  return globalRegistry.__beadboardWatchManager;
}
