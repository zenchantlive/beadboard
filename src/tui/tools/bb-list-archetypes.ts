import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { getArchetypes } from '../../lib/server/beads-fs';

export function createListArchetypesTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_list_archetypes',
    label: 'List Archetypes',
    description: 'List all available archetypes. Returns id, name, description, capabilities, and color for each archetype.',
    parameters: Type.Object({}),
    async execute() {
      try {
        const archetypes = await getArchetypes();

        const summary = archetypes.map(a =>
          `- ${a.name} (${a.id}): ${a.description}\n  Capabilities: ${a.capabilities.join(', ')}`
        ).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${archetypes.length} archetypes:\n\n${summary}`,
          }],
          details: {
            archetypes: archetypes.map(a => ({
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
          content: [{ type: 'text', text: `Failed to list archetypes: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
