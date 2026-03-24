import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { saveArchetype, getArchetypes } from '../../lib/server/beads-fs';

export function createUpdateArchetypeTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_update_archetype',
    label: 'Update Archetype',
    description: 'Update an existing archetype. Provide the ID and fields to update. Cannot modify built-in archetypes.',
    parameters: Type.Object({
      id: Type.String({ description: 'Archetype ID to update' }),
      name: Type.Optional(Type.String({ description: 'New display name' })),
      description: Type.Optional(Type.String({ description: 'New description' })),
      systemPrompt: Type.Optional(Type.String({ description: 'New system prompt for workers' })),
      capabilities: Type.Optional(Type.Array(Type.String(), { description: 'New capabilities list' })),
      color: Type.Optional(Type.String({ description: 'New hex color' })),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const { id, name, description, systemPrompt, capabilities, color } = params;

        if (!id || typeof id !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: id is required.' }],
            isError: true,
            details: {},
          };
        }

        // Check if archetype exists and get current values
        const archetypes = await getArchetypes();
        const existing = archetypes.find(a => a.id === id);

        if (!existing) {
          return {
            content: [{ type: 'text', text: `Error: Archetype "${id}" not found.` }],
            isError: true,
            details: {},
          };
        }

        // Merge with existing values
        const updated = await saveArchetype({
          id,
          name: name ?? existing.name,
          description: description ?? existing.description,
          systemPrompt: systemPrompt ?? existing.systemPrompt,
          capabilities: capabilities ?? existing.capabilities,
          color: color ?? existing.color,
        });

        return {
          content: [{
            type: 'text',
            text: `Archetype updated successfully!

ID: ${updated.id}
Name: ${updated.name}
Description: ${updated.description}
Capabilities: ${updated.capabilities.join(', ')}`,
          }],
          details: { archetype: updated },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to update archetype: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
