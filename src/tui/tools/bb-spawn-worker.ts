import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { workerSessionManager } from '../../lib/worker-session-manager';
import { embeddedPiDaemon } from '../../lib/embedded-daemon';

export function createSpawnWorkerTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_spawn_worker',
    label: 'Spawn Worker Agent',
    description: 'Spawn a worker agent to execute a specific task in parallel. The worker will work independently and report back results. Use this when you want to parallelize work or delegate a specific task to a focused agent.',
    parameters: Type.Object({
      task_id: Type.String({ description: 'The ID of the task for the worker to work on (e.g., bead ID, issue ID)' }),
      task_context: Type.String({ description: 'Detailed context/instructions for the worker. Include what needs to be done, any relevant file paths, constraints, and expected output.' }),
      agent_type: Type.Optional(Type.String({ description: 'Agent type to spawn. Options: "architect" (system design), "engineer" (coding/implementation), "reviewer" (code review, read-only), "tester" (testing), "investigator" (debugging/research, read-only), "shipper" (deployments). Default: engineer.' })),
      archetype: Type.Optional(Type.String({ description: 'DEPRECATED: Use agent_type instead' })),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const { task_id, task_context, agent_type, archetype } = params;
        // Support both old and new param names
        const agentType = agent_type || archetype;

        console.log(`[bb_spawn_worker] Spawning worker for task ${task_id}`);

        // Validate required params
        if (!task_id || typeof task_id !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: task_id is required and must be a string.' }],
            isError: true,
            details: {},
          };
        }

        if (!task_context || typeof task_context !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: task_context is required and must be a string.' }],
            isError: true,
            details: {},
          };
        }

        // Validate agent type if provided
        const validAgentTypes = ['architect', 'engineer', 'reviewer', 'tester', 'investigator', 'shipper'];
        if (agentType && !validAgentTypes.includes(agentType)) {
          return {
            content: [{ type: 'text', text: `Error: Invalid agent type "${agentType}". Valid options: ${validAgentTypes.join(', ')}` }],
            isError: true,
            details: {},
          };
        }

        // Spawn the worker
        const worker = await workerSessionManager.spawnWorker({
          projectRoot,
          taskId: task_id,
          taskContext: task_context,
          agentType: agentType,
        });

        const agentMsg = agentType ? ` with agent type "${agentType}"` : '';
        const message = `Worker spawned successfully!

Worker ID: ${worker.id}
Display Name: ${worker.displayName || worker.id}
Task: ${task_id}
Status: ${worker.status}${agentMsg}

The worker is now starting up. Use bb_worker_status to check its progress and get results when it completes.

Events will appear in the runtime console showing the worker's progress.`;

        return {
          content: [{ type: 'text', text: message }],
          details: {
            workerId: worker.id,
            taskId: task_id,
            status: worker.status,
            agentType: agentType || null,
            displayName: worker.displayName,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[bb_spawn_worker] Error:`, message);

        // Emit failure event
        embeddedPiDaemon.appendEvent(projectRoot, {
          kind: 'worker.failed',
          title: 'Worker spawn failed',
          detail: message,
          status: 'failed',
        });

        return {
          content: [{ type: 'text', text: `Failed to spawn worker: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
