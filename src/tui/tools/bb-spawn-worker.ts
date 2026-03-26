import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { workerSessionManager } from '../../lib/worker-session-manager';
import { embeddedPiDaemon } from '../../lib/embedded-daemon';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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

/**
 * Create a bead for the worker to work on.
 * Returns the bead ID.
 */
async function createBeadForTask(projectRoot: string, title: string, description: string): Promise<string> {
  const { stdout: output } = await execFileAsync('bd', [
    'create',
    title,
    '--description', description,
    '--type', 'task',
    '--priority', '2',
  ], {
    cwd: projectRoot,
    encoding: 'utf-8',
    timeout: 10000,
  });

  // bd create outputs the bead ID on the last line
  const beadId = output.trim().split('\n').pop()?.trim();
  if (!beadId) {
    throw new Error('Failed to parse bead ID from bd create output');
  }
  return beadId;
}

export function createSpawnWorkerTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_spawn_worker',
    label: 'Spawn Worker Agent',
    description: `Spawn an agent to work on a task. Just describe what you want done in natural language.

IMPORTANT: Every worker MUST have a bead to track their work. If no bead_id is provided, one will be created automatically.

Examples:
- "Review the authentication module for security issues"
- "Fix the failing test in user-service.test.ts"
- "Implement the password reset feature"
- "Debug why the payment webhook is failing"

The agent will:
1. Claim the bead (status: in_progress)
2. Work on the task
3. Update the bead with progress notes
4. Close the bead when done (with summary)

Check the right panel (Agent Status) to see active agents.`,
    parameters: Type.Object({
      description: Type.String({ 
        description: 'What you want the agent to accomplish. Be specific about files, context, and expected outcome.' 
      }),
      agent_type: Type.Optional(Type.String({ 
        description: 'Agent type: architect (design), engineer (code), reviewer (review), tester (tests), investigator (debug), shipper (deploy). Default: engineer.' 
      })),
      bead_id: Type.Optional(Type.String({ 
        description: 'Optional: existing bead ID to assign this agent to. If not provided, a new bead will be created.' 
      })),
    }),
    async execute(_toolCallId: string, params: unknown): Promise<any> {
      const { description, agent_type, bead_id: providedBeadId } = params as {
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

      // Validate agent type
      const validAgentTypes = ['architect', 'engineer', 'reviewer', 'tester', 'investigator', 'shipper'];
      if (agent_type && !validAgentTypes.includes(agent_type)) {
        return {
          content: [{ type: 'text', text: `Unknown agent type "${agent_type}". Options: ${validAgentTypes.join(', ')}` }],
          isError: true,
        };
      }

      try {
        // Step 1: Create a bead if one wasn't provided
        let beadId = providedBeadId;
        if (!beadId) {
          // Use first 60 chars of description as title
          const title = description.length > 60 
            ? description.slice(0, 57) + '...'
            : description;
          
          beadId = await createBeadForTask(projectRoot, title, description);
          
          embeddedPiDaemon.appendEvent(projectRoot, {
            kind: 'worker.spawned',
            title: `Created bead: ${beadId}`,
            detail: title,
            status: 'launching',
          });
        }

        // Step 2: Spawn the worker
        const worker = await workerSessionManager.spawnWorker({
          projectRoot,
          taskId: beadId!, // Use bead ID as task ID
          taskContext: description,
          agentType: agent_type,
          beadId: beadId!, // Pass bead ID to worker
        });

        const typeMsg = agent_type ? ` (${agent_type})` : '';
        const beadMsg = providedBeadId 
          ? `Working on existing bead: ${beadId}`
          : `Created bead: ${beadId}`;
        
        return {
          content: [{ 
            type: 'text', 
            text: `✓ Spawned ${worker.displayName}${typeMsg}

${beadMsg}
Task: "${description.slice(0, 80)}${description.length > 80 ? '...' : ''}"

The agent will claim this bead, work on it, and close it when done. Watch the right panel for status.` 
          }],
          details: {
            workerId: worker.id,
            displayName: worker.displayName,
            beadId,
            agentType: agent_type || 'engineer',
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
