import { runBdCommand, type RunBdCommandResult } from './bridge';
import { workerSessionManager, type WorkerSession } from './worker-session-manager';
import { buildSwarmBulkCancelConfirmation } from './swarm-bulk-cancel-shared';
export { buildSwarmBulkCancelConfirmation } from './swarm-bulk-cancel-shared';

export interface SwarmBulkCancelMatchedWorker {
  workerId: string;
  taskId: string;
  status: WorkerSession['status'];
  displayName: string | null;
}

export interface SwarmBulkCancelResult {
  swarmId: string;
  activeTaskIds: string[];
  confirmationPhrase: string;
  matchedWorkers: SwarmBulkCancelMatchedWorker[];
  stoppedWorkerIds: string[];
  failedWorkers: Array<{ workerId: string; error: string }>;
}

export interface SwarmBulkCancelDeps {
  runBd?: typeof runBdCommand;
  listWorkers?: (projectRoot: string) => WorkerSession[];
  terminateWorker?: (workerId: string) => Promise<void>;
}

function parseSwarmStatusActiveTaskIds(stdout: string): string[] {
  const parsed = JSON.parse(stdout) as { active?: Array<{ id?: string }> };
  if (!parsed || !Array.isArray(parsed.active)) {
    throw new Error('Failed to parse swarm status output');
  }

  return parsed.active
    .map((task) => (typeof task.id === 'string' ? task.id.trim() : ''))
    .filter((taskId): taskId is string => Boolean(taskId));
}

export function selectActiveSwarmWorkers(workers: readonly WorkerSession[], activeTaskIds: readonly string[]): SwarmBulkCancelMatchedWorker[] {
  const activeTaskSet = new Set(activeTaskIds.map((taskId) => taskId.trim()).filter(Boolean));

  return workers
    .filter((worker) => (worker.status === 'spawning' || worker.status === 'working') && activeTaskSet.has(worker.taskId))
    .map((worker) => ({
      workerId: worker.id,
      taskId: worker.taskId,
      status: worker.status,
      displayName: worker.displayName ?? null,
    }));
}

async function fetchActiveTaskIds(projectRoot: string, swarmId: string, runBd = runBdCommand): Promise<string[]> {
  const result: RunBdCommandResult = await runBd({
    projectRoot,
    args: ['swarm', 'status', swarmId, '--json'],
  });

  if (!result.success) {
    const error = result.error || result.stderr || 'Failed to fetch swarm status';
    throw new Error(error);
  }

  return parseSwarmStatusActiveTaskIds(result.stdout);
}

export async function stopActiveSwarmWorkers(
  projectRoot: string,
  swarmId: string,
  confirmation: string,
  deps: SwarmBulkCancelDeps = {},
): Promise<SwarmBulkCancelResult> {
  const runBd = deps.runBd ?? runBdCommand;
  const listWorkers = deps.listWorkers ?? workerSessionManager.listWorkers.bind(workerSessionManager);
  const terminateWorker = deps.terminateWorker ?? workerSessionManager.terminateWorker.bind(workerSessionManager);

  const activeTaskIds = await fetchActiveTaskIds(projectRoot, swarmId, runBd);
  const confirmationPhrase = buildSwarmBulkCancelConfirmation(swarmId, activeTaskIds.length);

  if (confirmation.trim() !== confirmationPhrase) {
    throw new Error(`Confirmation must exactly match "${confirmationPhrase}"`);
  }

  const matchedWorkers = selectActiveSwarmWorkers(listWorkers(projectRoot), activeTaskIds);
  const stoppedWorkerIds: string[] = [];
  const failedWorkers: Array<{ workerId: string; error: string }> = [];

  for (const worker of matchedWorkers) {
    try {
      await terminateWorker(worker.workerId);
      stoppedWorkerIds.push(worker.workerId);
    } catch (error) {
      failedWorkers.push({
        workerId: worker.workerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    swarmId,
    activeTaskIds,
    confirmationPhrase,
    matchedWorkers,
    stoppedWorkerIds,
    failedWorkers,
  };
}
