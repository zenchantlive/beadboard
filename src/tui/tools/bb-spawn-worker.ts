import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { workerSessionManager } from '../../lib/worker-session-manager';
import { embeddedPiDaemon } from '../../lib/embedded-daemon';

/**
 * Generate a task ID from natural language description.
 */
function generateTaskId(description: string): string {
  const slug = description
    .toLowerCase()
    .slice(0, 40)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const ts = Date.now().toString(36).slice(-4);
  return `${slug}-${ts}`;
}

export function createSpawnWorkerTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_spawn_worker',
    label: 'Spawn Worker Agent',
    description: `Spawn an agent to work on a task. Just describe what you want done in natural language.

Examples:
- "Review the authentication module for security issues"
- "Fix the failing test in user-service.test.ts"
- "Implement the password reset feature"
- "Debug why the payment webhook is failing"

The agent will work independently and report results. Check the right panel (Agent Status) to see active agents.`,
    parameters: Type.Object({
      description: Type.String({ 
        description: 'What you want the agent to accomplish. Be specific about files, context, and expected outcome.' 
      }),
      agent_type: Type.Optional(Type.String({ 
        description: 'Agent type: architect (design), engineer (code), reviewer (review), tester (tests), investigator (debug), shipper (deploy). Default: engineer.' 
      })),
      bead_id: Type.Optional(Type.String({ 
        description: 'Optional: existing bead ID to assign this agent to. If not provided, a new task will be created.' 
      })),
    }),
    async execute(_toolCallId: string, params: unknown): Promise<any> {
      const { description, agent_type, bead_id } = params as {
        description: string;
        agent_type?: string;
        bead_id?: string;
      };

      if (!description || typeof description !== 'string') {
        return {
          content: [{ type: 'text', text: 'Please describe what you want the agent to do.' }],
          isError: true,
        };
      }

      // Resolve task ID - prefer bead_id if provided, else generate from description
      const taskId = bead_id || generateTaskId(description);

      // Validate agent type
      const validAgentTypes = ['architect', 'engineer', 'reviewer', 'tester', 'investigator', 'shipper'];
      if (agent_type && !validAgentTypes.includes(agent_type)) {
        return {
          content: [{ type: 'text', text: `Unknown agent type "${agent_type}". Options: ${validAgentTypes.join(', ')}` }],
          isError: true,
        };
      }

      try {
        const worker = await workerSessionManager.spawnWorker({
          projectRoot,
          taskId,
          taskContext: description,
          agentType: agent_type,
        });

        const typeMsg = agent_type ? ` (${agent_type})` : '';
        
        return {
          content: [{ 
            type: 'text', 
            text: `✓ Spawned ${worker.displayName}${typeMsg}

"${description.slice(0, 80)}${description.length > 80 ? '...' : ''}"

The agent is working on this. Watch the right panel for status, or results will appear here when done.` 
          }],
          details: {
            workerId: worker.id,
            displayName: worker.displayName,
            taskId,
            agentType: agent_type || 'engineer',
            beadId: bead_id || null,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        
        embeddedPiDaemon.appendEvent(projectRoot, {
          kind: 'worker.failed',
          title: 'Spawn failed',
          detail: message,
          status: 'failed',
        });

        return {
          content: [{ type: 'text', text: `Failed to spawn agent: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
