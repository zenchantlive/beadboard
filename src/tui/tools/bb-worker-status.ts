import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { workerSessionManager } from '../../lib/worker-session-manager';

export function createWorkerStatusTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_worker_status',
    label: 'Check Worker Status',
    description: 'Check the status of a spawned worker agent. Use this to see if a worker is still working, completed successfully, or failed.',
    parameters: Type.Object({
      worker_id: Type.String({ description: 'The ID of the worker to check (returned by bb_spawn_worker)' }),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const { worker_id } = params;

        console.log(`[bb_worker_status] Checking status for worker ${worker_id}`);

        // Validate required param
        if (!worker_id || typeof worker_id !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: worker_id is required and must be a string.' }],
            isError: true,
            details: {},
          };
        }

        // Get worker from manager
        const worker = workerSessionManager.getWorker(worker_id);

        if (!worker) {
          return {
            content: [{ type: 'text', text: `Worker ${worker_id} not found. It may not exist or has already been cleaned up.` }],
            isError: true,
            details: { workerId: worker_id },
          };
        }

        // Build status report
        const statusEmoji = {
          spawning: '🔄',
          working: '🔨',
          completed: '✅',
          failed: '❌',
        };

        let statusMessage = `${statusEmoji[worker.status]} ${worker.status.toUpperCase()}`;

        let details = `Task: ${worker.taskId}
Created: ${worker.createdAt}
`;

        if (worker.completedAt) {
          details += `Completed: ${worker.completedAt}
`;
        }

        if (worker.result) {
          details += `
Result:
${worker.result}
`;
        }

        if (worker.error) {
          details += `
Error: ${worker.error}
`;
        }

        // If working, add hint about waiting
        if (worker.status === 'working') {
          details += `
Worker is currently executing. Check again later for completion status.`;
        }

        // If completed, offer to get more details
        if (worker.status === 'completed') {
          details += `
Use this worker's result in your orchestration decisions. The worker has reported back and is no longer active.`;
        }

        return {
          content: [{ type: 'text', text: statusMessage }],
          details: {
            workerId: worker.id,
            taskId: worker.taskId,
            status: worker.status,
            createdAt: worker.createdAt,
            completedAt: worker.completedAt,
            hasResult: !!worker.result,
            hasError: !!worker.error,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[bb_worker_status] Error:`, message);

        return {
          content: [{ type: 'text', text: `Failed to check worker status: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
