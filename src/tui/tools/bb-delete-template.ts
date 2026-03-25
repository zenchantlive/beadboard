import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { deleteTemplate, getTemplates } from '../../lib/server/beads-fs';

export function createDeleteTemplateTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_delete_template',
    label: 'Delete Swarm Template',
    description: 'Delete a swarm template. Cannot delete built-in templates.',
    parameters: Type.Object({
      id: Type.String({ description: 'Template ID to delete' }),
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

        // Check if it exists first
        const templates = await getTemplates();
        const existing = templates.find(t => t.id === id);

        if (!existing) {
          return {
            content: [{ type: 'text', text: `Error: Template "${id}" not found.` }],
            isError: true,
            details: {},
          };
        }

        if (existing.isBuiltIn) {
          return {
            content: [{ type: 'text', text: `Error: Cannot delete built-in template "${id}". Built-in templates are protected.` }],
            isError: true,
            details: {},
          };
        }

        await deleteTemplate(id);

        return {
          content: [{
            type: 'text',
            text: `Swarm template "${id}" deleted successfully.`,
          }],
          details: { deletedId: id },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to delete template: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
