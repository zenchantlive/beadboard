import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { getTemplates } from '../../lib/server/beads-fs';

export function createListTemplatesTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_list_templates',
    label: 'List Swarm Templates',
    description: 'List all available swarm templates. Returns team composition showing which archetypes and how many workers of each.',
    parameters: Type.Object({}),
    async execute() {
      try {
        const templates = await getTemplates();

        const summary = templates.map(t => {
          const teamDesc = t.team.map(m => `${m.count}x ${m.agentTypeId}`).join(', ');
          return `- ${t.name} (${t.id}): ${t.description}\n  Team: ${teamDesc}`;
        }).join('\n\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${templates.length} swarm templates:\n\n${summary}`,
          }],
          details: {
            templates: templates.map(t => ({
              id: t.id,
              name: t.name,
              description: t.description,
              team: t.team,
              isBuiltIn: t.isBuiltIn,
            })),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Failed to list templates: ${message}` }],
          isError: true,
          details: { error: message },
        };
      }
    },
  };
}
