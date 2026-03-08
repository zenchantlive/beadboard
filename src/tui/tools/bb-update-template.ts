import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { saveTemplate, getTemplates, getAgentTypes } from '../../lib/server/beads-fs';

const TeamMemberSchema = Type.Object({
  agentTypeId: Type.Optional(Type.String({ description: 'Agent type ID for this team member' })),
  archetypeId: Type.Optional(Type.String({ description: 'DEPRECATED: Use agentTypeId instead' })),
  count: Type.Number({ description: 'Number of workers of this type' }),
});

export function createUpdateTemplateTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_update_template',
    label: 'Update Swarm Template',
    description: 'Update an existing swarm template. Provide the ID and fields to update.',
    parameters: Type.Object({
      id: Type.String({ description: 'Template ID to update' }),
      name: Type.Optional(Type.String({ description: 'New display name' })),
      description: Type.Optional(Type.String({ description: 'New description' })),
      team: Type.Optional(Type.Array(TeamMemberSchema, { description: 'New team composition' })),
      color: Type.Optional(Type.String({ description: 'New hex color' })),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const { id, name, description, team, color } = params;

        if (!id || typeof id !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: id is required.' }],
            isError: true,
            details: {},
          };
        }

        // Check if template exists
        const templates = await getTemplates();
        const existing = templates.find(t => t.id === id);

        if (!existing) {
          return {
            content: [{ type: 'text', text: `Error: Template "${id}" not found.` }],
            isError: true,
            details: {},
          };
        }

        // Validate agent type IDs if team is being updated
        if (team) {
          const agentTypes = await getAgentTypes();
          const validIds = new Set(agentTypes.map(a => a.id));

          for (const member of team) {
            const agentTypeId = member.agentTypeId || member.archetypeId;
            if (!agentTypeId || !validIds.has(agentTypeId)) {
              return {
                content: [{ type: 'text', text: `Error: Unknown agent type "${agentTypeId}".` }],
                isError: true,
                details: {},
              };
            }
          }
        }

        // Merge with existing values
        const updated = await saveTemplate({
          id,
          name: name ?? existing.name,
          description: description ?? existing.description,
          team: team ?? existing.team,
          color: color ?? existing.color,
        });

        const teamDesc = updated.team.map(m => `${m.count}x ${m.agentTypeId}`).join(', ');

        return {
          content: [{
            type: 'text',
            text: `Swarm template updated successfully!

ID: ${updated.id}
Name: ${updated.name}
Team: ${teamDesc}`,
          }],
          details: { template: updated },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to update template: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
