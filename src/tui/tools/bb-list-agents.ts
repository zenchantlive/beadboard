import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { getAgentTypes } from '../../lib/server/beads-fs';

export function createListAgentsTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_list_agents',
    label: 'List Agent Types',
    description: 'List all available agent types. Returns id, name, description, capabilities, and color for each. Agent types are the kinds of workers the orchestrator can spawn.',
    parameters: Type.Object({}),
    async execute() {
      try {
        const agentTypes = await getAgentTypes(projectRoot);

        const summary = agentTypes.map(a =>
          `- ${a.name} (${a.id}): ${a.description}\n  Capabilities: ${a.capabilities.join(', ')}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${agentTypes.length} agent types:\n\n${summary}`,
          }],
          details: {
            agentTypes: agentTypes.map(a => ({
              id: a.id,
              name: a.name,
              description: a.description,
              capabilities: a.capabilities,
              color: a.color,
              isBuiltIn: a.isBuiltIn,
            })),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to list agent types: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
