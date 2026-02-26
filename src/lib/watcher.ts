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
  handlers?: {
    onAdd: (changedPath: string) => void;
    onChange: (changedPath: string) => void;
    onUnlink: (changedPath: string) => void;
  };
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
    const debounceMs = options.debounceMs ?? 450;
    this.eventBus = options.eventBus ?? issuesEventBus;
    this.activityBus = options.activityBus ?? activityEventBus;
    this.coalescer = new ProjectEventCoalescer(debounceMs, async ({ projectRoot, payload }) => {
      console.log(`[Watcher] Processing event for ${projectRoot}: ${payload.kind} (${payload.changedPath})`);

      // 1. Emit basic file change event
      // If it's just last-touched or a DB file change, we treat it as telemetry initially
      const changedPath = payload.changedPath || '';
      const isIssuesJsonl = changedPath.endsWith('issues.jsonl') || changedPath.endsWith('issues.jsonl.new');
      const isLastTouched = changedPath.includes('last-touched');
      const isDbPulse = changedPath.includes('beads.db');
      const isArchetype = changedPath.includes('.beads') && changedPath.includes('archetypes');
      const isTemplate = changedPath.includes('.beads') && changedPath.includes('templates');

      const isBaseTelemetry = (isLastTouched || isDbPulse) && !isIssuesJsonl && !isArchetype && !isTemplate;

      console.log(`[Watcher] Base Telemetry Emit -> ${isBaseTelemetry ? 'telemetry' : payload.kind}`);
      this.eventBus.emit(projectRoot, payload.changedPath, isBaseTelemetry ? 'telemetry' : payload.kind);

      // 2. Perform snapshot diffing if issues.jsonl changed
      const isBeadsDb = changedPath.includes('beads.db') || isLastTouched;
      const isGlobalMessages = changedPath.includes('.beadboard') && changedPath.includes('messages');

      if (isIssuesJsonl || isBeadsDb) {
        console.log(`[Watcher] Issues changed. Syncing activity for ${projectRoot}...`);
        const hadMutations = await this.syncActivity(projectRoot);

        // If it was just a telemetry pulse, but we discovered actual structural changes, emit an issues event to refresh UI
        if (hadMutations && isBaseTelemetry) {
          console.log(`[Watcher] Structural changes found in telemetry pulse. Upgrading to issues event.`);
          this.eventBus.emit(projectRoot, payload.changedPath, payload.kind);
        }
      } else if (isGlobalMessages) {
        console.log(`[Watcher] Global agent messages changed. Triggering refresh for ${projectRoot}.`);
        // No need to syncActivity (diff issues) if only messages changed, 
        // the 'issues' event emitted above will trigger client refresh.
      }
    });
  }

  private async syncActivity(projectRoot: string): Promise<boolean> {
    const projectKey = windowsPathKey(projectRoot);
    const previous = this.snapshots.get(projectKey) ?? null;

    try {
      const current = await readIssuesFromDisk({ projectRoot, preferBd: true, skipAgentFilter: true });
      const events = diffSnapshots(previous, current);

      console.log(`[Watcher] syncActivity for ${projectRoot}: generated ${events.length} events (prev: ${previous?.length ?? 0}, current: ${current.length})`);

      this.snapshots.set(projectKey, current);

      events.forEach(event => {
        this.activityBus.emit(event);
      });

      return events.length > 0;
    } catch (error) {
      console.error(`[Watcher] Failed to sync activity for ${projectRoot}:`, error);
      return false;
    }
  }

  async startWatch(projectRoot: string): Promise<void> {
    const projectKey = windowsPathKey(projectRoot);
    if (this.registrations.has(projectKey)) {
      console.log(`[Watcher] Already watching: ${projectKey}`);
      return;
    }

    console.log(`[Watcher] Starting watch for: ${projectRoot} (key: ${projectKey})`);

    // Pre-populate snapshot to avoid "all created" burst on first change
    try {
      const initial = await readIssuesFromDisk({ projectRoot, preferBd: true, skipAgentFilter: true });
      this.snapshots.set(projectKey, initial);
      console.log(`[Watcher] Initial snapshot: ${initial.length} issues`);
    } catch (err) {
      console.log(`[Watcher] Initial snapshot failed:`, err);
      // Ignore initial read failure, will retry on first change
    }

    const watchedPaths = resolveIssuesJsonlPathCandidates(projectRoot);
    watchedPaths.push(path.join(projectRoot, '.beads', 'beads.db'));
    watchedPaths.push(path.join(projectRoot, '.beads', 'beads.db-wal'));
    watchedPaths.push(path.join(projectRoot, '.beads', 'last-touched'));
    
    // Watch archetypes and templates directories for real-time updates
    watchedPaths.push(path.join(projectRoot, '.beads', 'archetypes'));
    watchedPaths.push(path.join(projectRoot, '.beads', 'templates'));

    // Add global agent messages to enable cross-project communication real-time updates
    watchedPaths.push(getGlobalAgentMessagesPath());

    console.log(`[Watcher] Watching paths:`, watchedPaths);

    const watcher = chokidar.watch(watchedPaths, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 80,
        pollInterval: 15,
      },
    });

    const onFileEvent = (eventName: FileEventName, changedPath: string) => {
      console.log(`[Watcher] File event: ${eventName} on ${changedPath}`);
      const kind: IssuesChangeKind = eventName === 'unlink' ? 'renamed' : 'changed';
      this.queueCoalescedEvent(projectRoot, changedPath, kind);
    };

    // Store references to event handlers for proper cleanup
    const onAdd = (changedPath: string) => onFileEvent('add', changedPath);
    const onChange = (changedPath: string) => onFileEvent('change', changedPath);
    const onUnlink = (changedPath: string) => onFileEvent('unlink', changedPath);

    watcher.on('add', onAdd);
    watcher.on('change', onChange);
    watcher.on('unlink', onUnlink);

    this.registrations.set(projectKey, {
      projectRoot,
      watcher,
      handlers: { onAdd, onChange, onUnlink },
    });
  }

  async stopWatch(projectRoot: string): Promise<void> {
    const projectKey = windowsPathKey(projectRoot);
    const registration = this.registrations.get(projectKey);
    if (!registration) {
      return;
    }

    this.coalescer.cancel(projectRoot);
    
    // Explicitly remove event listeners before closing to prevent memory leaks
    if (registration.handlers) {
      registration.watcher.removeListener('add', registration.handlers.onAdd);
      registration.watcher.removeListener('change', registration.handlers.onChange);
      registration.watcher.removeListener('unlink', registration.handlers.onUnlink);
    }
    
    this.registrations.delete(projectKey);
    await registration.watcher.close();
  }

  async stopAll(): Promise<void> {
    const closeOps: Promise<void>[] = [];

    for (const registration of this.registrations.values()) {
      // Explicitly remove event listeners before closing to prevent memory leaks
      if (registration.handlers) {
        registration.watcher.removeListener('add', registration.handlers.onAdd);
        registration.watcher.removeListener('change', registration.handlers.onChange);
        registration.watcher.removeListener('unlink', registration.handlers.onUnlink);
      }
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
