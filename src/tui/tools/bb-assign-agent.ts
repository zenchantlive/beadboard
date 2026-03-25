import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';

export function createAssignAgentTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_assign_agent',
    label: 'Assign Agent to Bead',
    description: 'Assign an agent type to a bead. This signals which kind of agent should work on this task. Does NOT spawn the agent - use bb_spawn_worker for that.',
    parameters: Type.Object({
      bead_id: Type.String({ description: 'Bead ID to assign agent type to' }),
      agent_type: Type.String({ description: 'Agent type ID (e.g., "engineer", "architect", "reviewer", "tester", "investigator", "shipper")' }),
    }),
    async execute(_toolCallId: string, params: unknown): Promise<any> {
      const { bead_id, agent_type } = params as { bead_id: string; agent_type: string };

      // Validate agent type
      const validAgentTypes = ['architect', 'engineer', 'reviewer', 'tester', 'investigator', 'shipper'];
      if (!validAgentTypes.includes(agent_type)) {
        return {
          content: [{ 
            type: 'text', 
            text: `Error: Invalid agent type "${agent_type}". Valid options: ${validAgentTypes.join(', ')}` 
          }],
          isError: true,
        };
      }

      // Note: In a full implementation, this would update the bead in the database
      // For now, we just return success and the orchestrator should remember this assignment
      
      return {
        content: [{
          type: 'text',
          text: `Assigned agent type "${agent_type}" to bead ${bead_id}.

When ready to work on this bead, spawn an agent with:
\`\`\`
bb_spawn_worker(task_id: "${bead_id}", agent_type: "${agent_type}", task_context: "...")
\`\`\``,
        }],
        details: { bead_id, agent_type },
      };
    },
  };
}
