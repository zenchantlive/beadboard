import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { deleteAgentType, getAgentTypes } from '../../lib/server/beads-fs';

export function createDeleteAgentTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_delete_agent',
    label: 'Delete Agent Type',
    description: 'Delete an agent type. Built-in agent types cannot be deleted.',
    parameters: Type.Object({
      id: Type.String({ description: 'Agent type ID to delete' }),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const { id } = params;

        if (!id || typeof id !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: id is required.' }],
            isError: true,
            details: {},
          };
        }

        // Check if agent type exists
        const agentTypes = await getAgentTypes(projectRoot);
        const existing = agentTypes.find(a => a.id === id);

        if (!existing) {
          return {
            content: [{ type: 'text', text: `Error: Agent type "${id}" not found.` }],
            isError: true,
            details: {},
          };
        }

        await deleteAgentType(id);

        return {
          content: [{
            type: 'text',
            text: `Agent type "${existing.name}" (${id}) deleted successfully.`,
          }],
          details: { deletedId: id },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to delete agent type: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
