import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { saveAgentType, getAgentTypes } from '../../lib/server/beads-fs';

export function createUpdateAgentTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_update_agent',
    label: 'Update Agent Type',
    description: 'Update an existing agent type. Provide the ID and fields to update.',
    parameters: Type.Object({
      id: Type.String({ description: 'Agent type ID to update' }),
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

        // Merge with existing values
        const updated = await saveAgentType({
          id,
          name: name ?? existing.name,
          description: description ?? existing.description,
          systemPrompt: systemPrompt ?? existing.systemPrompt,
          capabilities: capabilities ?? existing.capabilities,
          color: color ?? existing.color,
          isBuiltIn: existing.isBuiltIn,
        });

        return {
          content: [{
            type: 'text',
            text: `Agent type updated successfully!

ID: ${updated.id}
Name: ${updated.name}
Capabilities: ${updated.capabilities.join(', ')}`,
          }],
          details: { agentType: updated },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to update agent type: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
