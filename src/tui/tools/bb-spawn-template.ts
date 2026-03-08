import { Type } from '@sinclair/typebox';
import type { CustomAgentTool } from '@mariozechner/pi-coding-agent';
import { getTemplates, getAgentTypes } from '../../lib/server/beads-fs';
import { workerSessionManager } from '../../lib/worker-session-manager';

export function createSpawnTemplateTool(projectRoot: string): CustomAgentTool {
  return {
    name: 'bb_spawn_template',
    label: 'Spawn Template Team',
    description: 'Spawn a team of agents based on a template. Creates multiple workers assigned to the task. Use for larger efforts that need multiple agent types working together.',
    parameters: Type.Object({
      template_id: Type.String({ description: 'Template ID to use (e.g., "feature-dev", "bug-fix", "greenfield", "full-squad")' }),
      task_title: Type.String({ description: 'Title for the task being worked on' }),
      task_description: Type.Optional(Type.String({ description: 'Detailed description of what needs to be done' })),
    }),
    async execute(_toolCallId: string, params: unknown): Promise<any> {
      const { template_id, task_title, task_description } = params as {
        template_id: string;
        task_title: string;
        task_description?: string;
      };

      // Load template
      const templates = await getTemplates(projectRoot);
      const template = templates.find(t => t.id === template_id);
      
      if (!template) {
        return {
          content: [{ type: 'text', text: `Template "${template_id}" not found. Available templates: ${templates.map(t => t.id).join(', ')}` }],
          isError: true,
        };
      }

      // Load agent types to get names
      const agentTypes = await getAgentTypes(projectRoot);
      const agentTypeMap = new Map(agentTypes.map(a => [a.id, a]));

      // Spawn workers for each team member
      const spawned = [];
      const spawnErrors = [];
      
      for (const member of template.team) {
        const agentType = agentTypeMap.get(member.agentTypeId);
        if (!agentType) {
          spawnErrors.push(`Unknown agent type: ${member.agentTypeId}`);
          continue;
        }
        
        for (let i = 0; i < member.count; i++) {
          try {
            const worker = await workerSessionManager.spawnWorker({
              projectRoot,
              taskId: `${task_title}-${member.agentTypeId}-${i + 1}`,
              taskContext: task_description || `Part of "${task_title}" using ${template.name} template`,
              agentType: member.agentTypeId,
            });
            spawned.push({
              id: worker.id,
              displayName: worker.displayName,
              agentTypeId: member.agentTypeId,
            });
          } catch (error) {
            spawnErrors.push(`Failed to spawn ${member.agentTypeId}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // Build result message
      const teamDesc = template.team.map(m => `${m.count}x ${m.agentTypeId}`).join(', ');
      const spawnedNames = spawned.map(s => s.displayName).join(', ');
      
      let message = `Spawned ${spawned.length} agents from template "${template.name}"!\n\n`;
      message += `Team: ${teamDesc}\n\n`;
      message += `Active agents: ${spawnedNames || 'none'}`;
      
      if (spawnErrors.length > 0) {
        message += `\n\nErrors:\n${spawnErrors.map(e => `- ${e}`).join('\n')}`;
      }

      return {
        content: [{
          type: 'text',
          text: message,
        }],
        details: { 
          template: { id: template.id, name: template.name },
          spawned: spawned.map(s => ({ id: s.id, displayName: s.displayName, agentTypeId: s.agentTypeId })),
          errors: spawnErrors.length > 0 ? spawnErrors : undefined,
        },
      };
    },
  };
}
