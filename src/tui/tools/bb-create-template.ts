import { Type } from '@sinclair/typebox';
import type { ToolDefinition } from '@mariozechner/pi-coding-agent';
import { saveTemplate, getArchetypes } from '../../lib/server/beads-fs';

const TeamMemberSchema = Type.Object({
  archetypeId: Type.String({ description: 'Archetype ID for this team member type' }),
  count: Type.Number({ description: 'Number of workers with this archetype (minimum 1)' }),
});

export function createCreateTemplateTool(projectRoot: string): ToolDefinition {
  return {
    name: 'bb_create_template',
    label: 'Create Swarm Template',
    description: 'Create a new swarm template. Defines team composition by specifying which archetypes and how many workers of each.',
    parameters: Type.Object({
      name: Type.String({ description: 'Display name for the template (e.g., "Full Stack Team")' }),
      description: Type.String({ description: 'What this template is for (e.g., "General feature development with review")' }),
      team: Type.Array(TeamMemberSchema, { description: 'Team composition. Each entry specifies an archetype ID and worker count.' }),
      color: Type.Optional(Type.String({ description: 'Hex color for display. Default: amber' })),
    }),
    async execute(_toolCallId, params: any) {
      try {
        const { name, description, team, color } = params;

        // Validate required params
        if (!name || typeof name !== 'string') {
          return {
            content: [{ type: 'text', text: 'Error: name is required.' }],
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

        if (!Array.isArray(team) || team.length === 0) {
          return {
            content: [{ type: 'text', text: 'Error: team must be a non-empty array.' }],
            isError: true,
            details: {},
          };
        }

        // Validate archetype IDs exist
        const archetypes = await getArchetypes();
        const validIds = new Set(archetypes.map(a => a.id));

        for (const member of team) {
          if (!validIds.has(member.archetypeId)) {
            return {
              content: [{ type: 'text', text: `Error: Unknown archetype "${member.archetypeId}". Valid archetypes: ${Array.from(validIds).join(', ')}` }],
              isError: true,
              details: {},
            };
          }
          if (member.count < 1) {
            return {
              content: [{ type: 'text', text: `Error: count must be at least 1 for archetype "${member.archetypeId}".` }],
              isError: true,
              details: {},
            };
          }
        }

        const template = await saveTemplate({
          name,
          description,
          team,
          color: color || '#f59e0b',
          isBuiltIn: false,
        });

        const teamDesc = team.map(m => `${m.count}x ${m.archetypeId}`).join(', ');

        return {
          content: [{
            type: 'text',
            text: `Swarm template created successfully!

ID: ${template.id}
Name: ${template.name}
Description: ${template.description}
Team: ${teamDesc}
Color: ${template.color}

Use this template when spawning swarms for coordinated multi-agent work.`,
          }],
          details: { template },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to create template: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
