import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { saveAgentType } from '../../lib/server/beads-fs';

export function createCreateAgentTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_create_agent',
    label: 'Create Agent Type',
    description: 'Create a new agent type. Requires name, description, systemPrompt, and capabilities. The systemPrompt will be injected into workers spawned with this agent type.',
    parameters: Type.Object({
      name: Type.String({ description: 'Display name for the agent type (e.g., "Code Reviewer")' }),
      description: Type.String({ description: 'What this agent type does (e.g., "Reviews code for quality and bugs")' }),
      systemPrompt: Type.String({ description: 'System prompt injected into workers with this agent type. Define their focus and behavior.' }),
      capabilities: Type.Array(Type.String(), { description: 'List of capabilities. Options: coding, implementation, planning, design_docs, review, arch_review, testing, research, debugging, ci_cd' }),
      color: Type.Optional(Type.String({ description: 'Hex color for display (e.g., "#3b82f6"). Default: blue' })),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const { name, description, systemPrompt, capabilities, color } = params;

        // Validate required params
        if (!name || typeof name !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: name is required and must be a string.' }],
            isError: true,
            details: {},
          };
        }

        if (!description || typeof description !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: description is required.' }],
            isError: true,
            details: {},
          };
        }

        if (!systemPrompt || typeof systemPrompt !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: systemPrompt is required.' }],
            isError: true,
            details: {},
          };
        }

        if (!Array.isArray(capabilities)) {
          return {
            content: [{ type: 'text', text: 'Error: capabilities must be an array of strings.' }],
            isError: true,
            details: {},
          };
        }

        const agentType = await saveAgentType({
          name,
          description,
          systemPrompt,
          capabilities,
          color: color || '#3b82f6',
          isBuiltIn: false,
        });

        return {
          content: [{
            type: 'text',
            text: `Agent type created successfully!

ID: ${agentType.id}
Name: ${agentType.name}
Description: ${agentType.description}
Capabilities: ${agentType.capabilities.join(', ')}
Color: ${agentType.color}

Workers spawned with this agent type will receive the custom system prompt and tool access based on capabilities.`,
          }],
          details: { agentType },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to create agent type: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
