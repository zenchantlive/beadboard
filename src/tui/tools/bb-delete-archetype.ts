import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { deleteArchetype, getArchetypes } from '../../lib/server/beads-fs';

export function createDeleteArchetypeTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_delete_archetype',
    label: 'Delete Archetype',
    description: 'Delete an archetype. Cannot delete built-in archetypes. Workers currently using this archetype will continue but new workers cannot be spawned with it.',
    parameters: Type.Object({
      id: Type.String({ description: 'Archetype ID to delete' }),
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

        // Check if it exists first for better error message
        const archetypes = await getArchetypes();
        const existing = archetypes.find(a => a.id === id);

        if (!existing) {
          return {
            content: [{ type: 'text', text: `Error: Archetype "${id}" not found.` }],
            isError: true,
            details: {},
          };
        }

        if (existing.isBuiltIn) {
          return {
            content: [{ type: 'text', text: `Error: Cannot delete built-in archetype "${id}". Built-in archetypes are protected.` }],
            isError: true,
            details: {},
          };
        }

        await deleteArchetype(id);

        return {
          content: [{
            type: 'text',
            text: `Archetype "${id}" deleted successfully.`,
          }],
          details: { deletedId: id },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to delete archetype: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
